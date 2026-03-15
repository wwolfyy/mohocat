/**
 * Script to enforce YouTube read-only field restrictions
 * This script validates that YouTube-sourced fields are not being edited directly in Firebase
 * and provides utilities to prevent such updates.
 */

const admin = require('firebase-admin');
const path = require('path');

// Load service account key
const serviceAccountPath = path.join(
  __dirname,
  '..',
  '..',
  'config',
  'firebase',
  'mountaincats-61543-7329e795c352.json'
);

if (!require('fs').existsSync(serviceAccountPath)) {
  console.error('Service account key file not found:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
  });
}

const db = admin.firestore();

// YouTube read-only fields that CANNOT be edited in Firebase
const YOUTUBE_READONLY_FIELDS = [
  'tags', // YouTube tags - must be edited in YouTube Studio
  'videoUrl', // YouTube video URL - generated from videoId
  'createdTime', // Mapped from YouTube recordingDate
  'location', // YouTube video location data
];

// Fields that are allowed to be updated in Firebase
const FIREBASE_EDITABLE_FIELDS = [
  'description', // Firestore-specific description (can differ from YouTube)
  'catName', // Our custom cat identification
  'needsTagging', // Our internal flag
  'autoTagged', // Our internal flag
  'uploadedBy', // Who added it to our system
  'uploadDate', // When added to our system
  'lastMetadataRefresh', // Tracking field
  'allPlaylists', // While sourced from YouTube, this is our processed version
];

/**
 * Validates an update object to ensure no YouTube read-only fields are being modified
 * @param {Object} updateData - The data being updated
 * @param {string} videoId - The video ID for logging
 * @returns {Object} - { isValid: boolean, violations: string[], sanitizedData: Object }
 */
function validateVideoUpdate(updateData, videoId = 'unknown') {
  const violations = [];
  const sanitizedData = { ...updateData };

  // Check for violations
  YOUTUBE_READONLY_FIELDS.forEach((field) => {
    if (updateData.hasOwnProperty(field)) {
      violations.push(`Attempted to update read-only field '${field}' for video ${videoId}`);
      delete sanitizedData[field]; // Remove the violating field
    }
  });

  return {
    isValid: violations.length === 0,
    violations,
    sanitizedData,
  };
}

/**
 * Creates a Firestore security function that prevents updates to read-only fields
 * This can be used in security rules or middleware
 */
function createSecurityRule() {
  return `
// Firestore Security Rule for cat_videos collection
// Add this to your firestore.rules file

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /cat_videos/{videoId} {
      allow read: if true; // Adjust based on your auth requirements

      allow create: if true; // Adjust based on your auth requirements

      allow update: if
        // Prevent updates to YouTube read-only fields
        !('tags' in request.resource.data.diff(resource.data).affectedKeys()) &&
        !('videoUrl' in request.resource.data.diff(resource.data).affectedKeys()) &&
        !('createdTime' in request.resource.data.diff(resource.data).affectedKeys()) &&
        !('location' in request.resource.data.diff(resource.data).affectedKeys());

      allow delete: if false; // Adjust based on your requirements
    }
  }
}
`;
}

/**
 * Audits the cat_videos collection for any potential violations
 */
async function auditVideoCollection() {
  console.log('=== Auditing cat_videos Collection for Read-Only Field Compliance ===\n');

  try {
    const snapshot = await db.collection('cat_videos').get();

    if (snapshot.empty) {
      console.log('No videos found in collection');
      return;
    }

    console.log(`Auditing ${snapshot.size} videos...\n`);

    let youtubeVideos = 0;
    let storageVideos = 0;
    let violations = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const docId = doc.id;

      // Check if this is a YouTube video
      if (data.youtubeId || data.videoType === 'youtube') {
        youtubeVideos++; // Verify YouTube read-only fields are present and properly sourced
        YOUTUBE_READONLY_FIELDS.forEach((field) => {
          if (field === 'location') {
            // Location is optional - it can be null if not available from YouTube
            // We just check that the field exists (even if null)
            if (!data.hasOwnProperty(field)) {
              violations.push({
                docId,
                type: 'missing_field',
                field,
                message: `YouTube video missing location field (should be null if no location data from YouTube)`,
              });
            }
          } else if (!data.hasOwnProperty(field)) {
            violations.push({
              docId,
              type: 'missing_field',
              field,
              message: `YouTube video missing required field '${field}'`,
            });
          }
        });

        // Check for inconsistencies
        if (data.youtubeId && data.videoUrl && !data.videoUrl.includes(data.youtubeId)) {
          violations.push({
            docId,
            type: 'inconsistent_data',
            field: 'videoUrl',
            message: `Video URL does not match YouTube ID: ${data.videoUrl} vs ${data.youtubeId}`,
          });
        }
      } else {
        storageVideos++;
        // Storage videos don't need YouTube read-only fields
      }
    });

    console.log(`📊 Audit Results:`);
    console.log(`   YouTube videos: ${youtubeVideos}`);
    console.log(`   Storage videos: ${storageVideos}`);
    console.log(`   Total videos: ${snapshot.size}`);
    console.log(`   Violations found: ${violations.length}\n`);

    if (violations.length > 0) {
      console.log('🚨 VIOLATIONS FOUND:');
      violations.forEach((violation, index) => {
        console.log(`   ${index + 1}. Document ${violation.docId}`);
        console.log(`      Type: ${violation.type}`);
        console.log(`      Field: ${violation.field}`);
        console.log(`      Message: ${violation.message}\n`);
      });
    } else {
      console.log('✅ No violations found - all videos comply with read-only field requirements');
    }

    return {
      youtubeVideos,
      storageVideos,
      violations,
      totalVideos: snapshot.size,
    };
  } catch (error) {
    console.error('Error during audit:', error);
    throw error;
  }
}

/**
 * Creates a middleware function for Express/Next.js to validate updates
 */
function createValidationMiddleware() {
  return function validateVideoUpdateMiddleware(req, res, next) {
    // Check if this is an update to cat_videos
    if (req.method === 'PUT' || req.method === 'PATCH') {
      const updateData = req.body;
      const videoId = req.params.videoId || req.query.videoId || 'unknown';

      const validation = validateVideoUpdate(updateData, videoId);

      if (!validation.isValid) {
        console.error('Video update validation failed:', validation.violations);
        return res.status(403).json({
          error: 'Forbidden: Cannot update YouTube read-only fields',
          violations: validation.violations,
          readOnlyFields: YOUTUBE_READONLY_FIELDS,
          message: 'To update these fields, edit them in YouTube Studio and refresh metadata',
        });
      }

      // Replace request body with sanitized data
      req.body = validation.sanitizedData;
    }

    next();
  };
}

/**
 * Safely updates a video document, automatically filtering out read-only fields
 */
async function safeUpdateVideo(docId, updateData) {
  console.log(`Attempting to update video document: ${docId}`);

  const validation = validateVideoUpdate(updateData, docId);

  if (validation.violations.length > 0) {
    console.warn('Update contains read-only fields that will be ignored:');
    validation.violations.forEach((violation) => console.warn(`  - ${violation}`));
  }

  if (Object.keys(validation.sanitizedData).length === 0) {
    console.log('No valid fields to update after filtering');
    return false;
  }

  try {
    const docRef = db.collection('cat_videos').doc(docId);
    await docRef.update(validation.sanitizedData);

    console.log(
      '✅ Video updated successfully with sanitized data:',
      Object.keys(validation.sanitizedData)
    );
    return true;
  } catch (error) {
    console.error('Error updating video:', error);
    return false;
  }
}

// Export functions for use in other modules
module.exports = {
  YOUTUBE_READONLY_FIELDS,
  FIREBASE_EDITABLE_FIELDS,
  validateVideoUpdate,
  createSecurityRule,
  auditVideoCollection,
  createValidationMiddleware,
  safeUpdateVideo,
};

// Run audit if this script is executed directly
if (require.main === module) {
  auditVideoCollection()
    .then((results) => {
      console.log('\n=== RECOMMENDATIONS ===');
      console.log('1. Use the refresh-video-metadata API to sync YouTube data');
      console.log('2. Only edit Firestore-specific fields in the admin UI');
      console.log('3. Edit tags, video details, and location in YouTube Studio');
      console.log('4. Add the generated security rule to your firestore.rules file');
      console.log('\nGenerated Security Rule:');
      console.log(createSecurityRule());
      process.exit(results.violations.length > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Audit failed:', error);
      process.exit(1);
    });
}

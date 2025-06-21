/**
 * Script to examine the current structure of cat_videos documents in Firestore
 * This will help us understand which fields are YouTube-sourced vs Firestore-only
 */

const admin = require('firebase-admin');
const path = require('path');

// Load service account key
const serviceAccountPath = path.join(__dirname, '..', 'mountaincats-61543-7329e795c352.json');

if (!require('fs').existsSync(serviceAccountPath)) {
  console.error('Service account key file not found:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });
}

const db = admin.firestore();

// Fields that come from YouTube API
const YOUTUBE_SOURCED_FIELDS = [
  'title',
  'description', // YouTube description
  'thumbnailUrl',
  'publishedAt',
  'recordingDate',
  'duration',
  'channelTitle',
  'youtubeId',
  'allPlaylists', // Derived from YouTube playlists
  'tags' // Could be from YouTube or user-added
];

// Fields that are Firestore-only (not available in YouTube)
const FIRESTORE_ONLY_FIELDS = [
  'id', // Firestore document ID
  'videoUrl', // YouTube URL constructed
  'storagePath', // Same as videoUrl for YouTube videos
  'uploadDate', // When added to our system
  'createdTime', // Mapped from YouTube recordingDate but could be manually set
  'uploadedBy', // Our system field
  'location', // Manual location tagging
  'autoTagged', // Our system flag
  'fileSize', // Not available for YouTube videos
  'videoType', // Our classification
  'lastMetadataRefresh' // Our system timestamp
];

async function examineVideoStructure() {
  try {
    console.log('Examining cat_videos collection structure...\n');

    // Get a few sample documents
    const snapshot = await db.collection('cat_videos').limit(3).get();

    if (snapshot.empty) {
      console.log('No documents found in cat_videos collection');
      return;
    }

    console.log(`Found ${snapshot.size} sample documents. Analyzing structure...\n`);

    const allFields = new Set();
    const documents = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      documents.push({ id: doc.id, data });
      Object.keys(data).forEach(field => allFields.add(field));
    });

    console.log('=== FIELD ANALYSIS ===\n');

    console.log('🔵 YOUTUBE-SOURCED FIELDS (should sync from YouTube):');
    YOUTUBE_SOURCED_FIELDS.forEach(field => {
      const hasField = allFields.has(field);
      console.log(`  ${hasField ? '✅' : '❌'} ${field}`);
    });

    console.log('\n🟢 FIRESTORE-ONLY FIELDS (local to our system):');
    FIRESTORE_ONLY_FIELDS.forEach(field => {
      const hasField = allFields.has(field);
      console.log(`  ${hasField ? '✅' : '❌'} ${field}`);
    });

    console.log('\n🟡 UNEXPECTED FIELDS (not in our categories):');
    const categorizedFields = new Set([...YOUTUBE_SOURCED_FIELDS, ...FIRESTORE_ONLY_FIELDS]);
    allFields.forEach(field => {
      if (!categorizedFields.has(field)) {
        console.log(`  ⚠️  ${field}`);
      }
    });

    console.log('\n=== SAMPLE DOCUMENT STRUCTURE ===\n');
    documents.forEach((doc, index) => {
      console.log(`Document ${index + 1} (${doc.id}):`);
      Object.keys(doc.data).sort().forEach(field => {
        const value = doc.data[field];
        const type = Array.isArray(value) ? 'array' : typeof value;
        const preview = type === 'string' && value.length > 50
          ? value.substring(0, 50) + '...'
          : type === 'object' && value !== null
          ? Array.isArray(value)
            ? `[${value.length} items]`
            : '{object}'
          : String(value);

        const category = YOUTUBE_SOURCED_FIELDS.includes(field) ? '🔵' :
                        FIRESTORE_ONLY_FIELDS.includes(field) ? '🟢' : '🟡';

        console.log(`  ${category} ${field}: (${type}) ${preview}`);
      });
      console.log('');
    });

    console.log('=== DATA FLOW ANALYSIS ===\n');
    console.log('Based on this analysis:');
    console.log('');
    console.log('🔵 YOUTUBE-SOURCED fields should be:');
    console.log('   - Read-only in the admin UI (or sync changes back to YouTube)');
    console.log('   - Refreshed when metadata sync runs');
    console.log('   - NOT directly editable unless we also update YouTube');
    console.log('');
    console.log('🟢 FIRESTORE-ONLY fields can be:');
    console.log('   - Freely edited in admin UI');
    console.log('   - Stored only in Firestore');
    console.log('   - Not affected by YouTube metadata sync');
    console.log('');
    console.log('🟡 UNEXPECTED fields need investigation');

  } catch (error) {
    console.error('Error examining video structure:', error);
    process.exit(1);
  }
}

// Run the analysis if this script is executed directly
if (require.main === module) {
  examineVideoStructure()
    .then(() => {
      console.log('\nAnalysis completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { examineVideoStructure, YOUTUBE_SOURCED_FIELDS, FIRESTORE_ONLY_FIELDS };

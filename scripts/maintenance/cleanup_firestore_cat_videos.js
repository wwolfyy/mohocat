/**
 * Script to clean up Firestore cat_videos collection by removing unused/redundant fields
 *
 * Fields to remove:
 * - catName: not used in the app logic
 * - fileName: redundant with title field
 * - needsTagging: not used in the app logic
 * - playlist: replaced by allPlaylists field
 * - playlistTitle: replaced by allPlaylists field
 */

const admin = require('firebase-admin');
const fs = require('fs');
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

if (!fs.existsSync(serviceAccountPath)) {
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

// Fields to remove from all documents
const FIELDS_TO_REMOVE = ['catName', 'fileName', 'needsTagging', 'playlist', 'playlistTitle'];

async function cleanupCatVideosCollection() {
  try {
    console.log('Starting cleanup of cat_videos collection...');
    console.log('Fields to remove:', FIELDS_TO_REMOVE);

    // Get all documents in the cat_videos collection
    const collectionRef = db.collection('cat_videos');
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
      console.log('No documents found in cat_videos collection');
      return;
    }

    console.log(`Found ${snapshot.size} documents in cat_videos collection`);

    let updatedCount = 0;
    let skipCount = 0;
    const batch = db.batch();

    snapshot.forEach((doc) => {
      const data = doc.data();
      let needsUpdate = false;
      const fieldsToRemove = [];

      // Check which fields exist and need to be removed
      FIELDS_TO_REMOVE.forEach((field) => {
        if (data.hasOwnProperty(field)) {
          fieldsToRemove.push(field);
          needsUpdate = true;
        }
      });

      if (needsUpdate) {
        console.log(`Document ${doc.id}: removing fields [${fieldsToRemove.join(', ')}]`);

        // Create update object with FieldValue.delete() for each field to remove
        const updateData = {};
        fieldsToRemove.forEach((field) => {
          updateData[field] = admin.firestore.FieldValue.delete();
        });

        batch.update(doc.ref, updateData);
        updatedCount++;
      } else {
        console.log(`Document ${doc.id}: no cleanup needed`);
        skipCount++;
      }
    });

    if (updatedCount > 0) {
      console.log(`\nCommitting batch update for ${updatedCount} documents...`);
      await batch.commit();
      console.log('✅ Batch update completed successfully!');
    } else {
      console.log('No documents needed updating');
    }

    console.log('\n=== CLEANUP SUMMARY ===');
    console.log(`Total documents processed: ${snapshot.size}`);
    console.log(`Documents updated: ${updatedCount}`);
    console.log(`Documents skipped (no cleanup needed): ${skipCount}`);
    console.log(`Fields removed: ${FIELDS_TO_REMOVE.join(', ')}`);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupCatVideosCollection()
    .then(() => {
      console.log('\nCleanup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupCatVideosCollection, FIELDS_TO_REMOVE };

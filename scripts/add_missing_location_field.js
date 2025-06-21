/**
 * Script to add missing location field to existing YouTube videos
 * This sets location to null for videos that don't have location data
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

async function addMissingLocationField() {
  console.log('=== Adding Missing Location Field to YouTube Videos ===\n');

  try {
    const snapshot = await db.collection('cat_videos').get();

    if (snapshot.empty) {
      console.log('No videos found in collection');
      return;
    }

    console.log(`Processing ${snapshot.size} videos...\n`);

    let updated = 0;
    let skipped = 0;

    const batch = db.batch();

    snapshot.forEach(doc => {
      const data = doc.data();
      const docId = doc.id;

      // Only process YouTube videos
      if (data.youtubeId || data.videoType === 'youtube') {
        // Check if location field is missing
        if (!data.hasOwnProperty('location')) {
          console.log(`Adding location field to video: ${docId} (${data.title || 'Untitled'})`);
          batch.update(doc.ref, { location: null });
          updated++;
        } else {
          console.log(`Video ${docId} already has location field:`, data.location);
          skipped++;
        }
      } else {
        console.log(`Skipping non-YouTube video: ${docId}`);
        skipped++;
      }
    });

    if (updated > 0) {
      console.log(`\nCommitting batch update for ${updated} videos...`);
      await batch.commit();
      console.log('✅ Batch update completed successfully');
    } else {
      console.log('\nNo updates needed - all videos already have location field');
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Videos updated: ${updated}`);
    console.log(`   Videos skipped: ${skipped}`);
    console.log(`   Total processed: ${snapshot.size}`);

  } catch (error) {
    console.error('Error adding missing location field:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  addMissingLocationField()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addMissingLocationField };

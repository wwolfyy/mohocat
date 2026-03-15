const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  const serviceAccount = require('../../config/firebase/mountaincats-61543-7329e795c352.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://mountaincats-61543-default-rtdb.firebaseio.com',
  });
}

const db = admin.firestore();

async function removeRecordingDateField() {
  try {
    console.log('Starting removal of recordingDate field from cat_videos collection...');

    // Get all documents from cat_videos collection
    const collectionRef = db.collection('cat_videos');
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
      console.log('No documents found in cat_videos collection.');
      return;
    }

    console.log(`Found ${snapshot.size} documents to process.`);

    let processed = 0;
    let updated = 0;
    let errors = 0;

    // Process documents in batches
    const batch = db.batch();
    const batchSize = 500; // Firestore batch limit
    let currentBatchSize = 0;

    for (const doc of snapshot.docs) {
      try {
        processed++;
        const data = doc.data();

        // Check if document has recordingDate field
        if (data.hasOwnProperty('recordingDate')) {
          console.log(`Document ${doc.id} has recordingDate field, removing it...`);

          // Add update operation to batch
          batch.update(doc.ref, {
            recordingDate: admin.firestore.FieldValue.delete(),
          });

          updated++;
          currentBatchSize++;

          // Commit batch when it reaches the limit
          if (currentBatchSize >= batchSize) {
            await batch.commit();
            console.log(`Committed batch of ${currentBatchSize} updates.`);
            currentBatchSize = 0;
          }
        } else {
          console.log(`Document ${doc.id} does not have recordingDate field, skipping.`);
        }

        // Log progress every 50 documents
        if (processed % 50 === 0) {
          console.log(`Progress: ${processed}/${snapshot.size} documents processed`);
        }
      } catch (error) {
        console.error(`Error processing document ${doc.id}:`, error);
        errors++;
      }
    }

    // Commit any remaining updates in the batch
    if (currentBatchSize > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${currentBatchSize} updates.`);
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total documents processed: ${processed}`);
    console.log(`Documents updated (recordingDate field removed): ${updated}`);
    console.log(`Errors encountered: ${errors}`);
    console.log('recordingDate field removal completed successfully!');
  } catch (error) {
    console.error('Error during recordingDate field removal:', error);
    throw error;
  }
}

// Check for dry-run flag
const isDryRun = process.argv.includes('--dry-run');

async function dryRunRemoveRecordingDateField() {
  try {
    console.log('=== DRY RUN MODE ===');
    console.log('This will show what would be changed without making actual changes.');
    console.log(
      'Starting dry run for removing recordingDate field from cat_videos collection...\n'
    );

    // Get all documents from cat_videos collection
    const collectionRef = db.collection('cat_videos');
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
      console.log('No documents found in cat_videos collection.');
      return;
    }

    console.log(`Found ${snapshot.size} documents to analyze.\n`);

    let processed = 0;
    let wouldUpdate = 0;

    for (const doc of snapshot.docs) {
      processed++;
      const data = doc.data();

      // Check if document has recordingDate field
      if (data.hasOwnProperty('recordingDate')) {
        console.log(`Document ${doc.id}:`);
        console.log(`  - Has recordingDate: ${data.recordingDate}`);
        console.log(`  - Has createdTime: ${data.createdTime || 'No'}`);
        console.log(`  - Would remove recordingDate field`);
        console.log('');
        wouldUpdate++;
      }

      // Log progress every 20 documents
      if (processed % 20 === 0) {
        console.log(`Progress: ${processed}/${snapshot.size} documents analyzed`);
      }
    }

    console.log('\n=== DRY RUN SUMMARY ===');
    console.log(`Total documents analyzed: ${processed}`);
    console.log(`Documents that would be updated: ${wouldUpdate}`);
    console.log(`Documents that would remain unchanged: ${processed - wouldUpdate}`);
    console.log('\nTo execute the actual removal, run this script without the --dry-run flag.');
  } catch (error) {
    console.error('Error during dry run:', error);
    throw error;
  }
}

// Run the appropriate function
if (isDryRun) {
  dryRunRemoveRecordingDateField()
    .then(() => {
      console.log('Dry run completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Dry run failed:', error);
      process.exit(1);
    });
} else {
  removeRecordingDateField()
    .then(() => {
      console.log('Migration completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

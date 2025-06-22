const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
}
const serviceAccount = require(path.join(__dirname, '..', serviceAccountPath));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'mountaincats-61543'
});

const db = admin.firestore();

async function removeNeedsTaggingField() {
  try {
    console.log('🔍 Starting removal of needsTagging field from cat_images collection...');

    // Get all documents in the cat_images collection
    const snapshot = await db.collection('cat_images').get();

    if (snapshot.empty) {
      console.log('⚠️ No documents found in cat_images collection.');
      return;
    }

    console.log(`📊 Found ${snapshot.size} documents in cat_images collection.`);

    let updatedCount = 0;
    let skippedCount = 0;
    const batch = db.batch();
    let batchCount = 0;
    const maxBatchSize = 500; // Firestore batch limit

    // Process each document
    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Check if the document has the needsTagging field
      if (data.hasOwnProperty('needsTagging')) {
        // Remove the needsTagging field using FieldValue.delete()
        batch.update(doc.ref, {
          needsTagging: admin.firestore.FieldValue.delete()
        });

        updatedCount++;
        batchCount++;

        console.log(`🗑️ Queued removal of needsTagging field from document: ${doc.id} (fileName: ${data.fileName || 'unknown'})`);

        // Commit batch if we reach the limit
        if (batchCount >= maxBatchSize) {
          console.log(`💾 Committing batch of ${batchCount} updates...`);
          await batch.commit();
          console.log(`✅ Batch committed successfully.`);

          // Create a new batch for the next set of updates
          const newBatch = db.batch();
          Object.setPrototypeOf(batch, Object.getPrototypeOf(newBatch));
          Object.assign(batch, newBatch);
          batchCount = 0;
        }
      } else {
        skippedCount++;
        console.log(`⏭️ Document ${doc.id} doesn't have needsTagging field, skipping.`);
      }
    }

    // Commit any remaining updates in the batch
    if (batchCount > 0) {
      console.log(`💾 Committing final batch of ${batchCount} updates...`);
      await batch.commit();
      console.log(`✅ Final batch committed successfully.`);
    }

    console.log('\n📈 Summary:');
    console.log(`   Total documents processed: ${snapshot.size}`);
    console.log(`   Documents updated (needsTagging field removed): ${updatedCount}`);
    console.log(`   Documents skipped (no needsTagging field): ${skippedCount}`);

    if (updatedCount > 0) {
      console.log('\n🎉 Successfully removed needsTagging field from all relevant documents!');
    } else {
      console.log('\n✨ No documents had the needsTagging field to remove.');
    }

  } catch (error) {
    console.error('❌ Error removing needsTagging field:', error);
    throw error;
  }
}

// Run the script
removeNeedsTaggingField()
  .then(() => {
    console.log('\n🏁 Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

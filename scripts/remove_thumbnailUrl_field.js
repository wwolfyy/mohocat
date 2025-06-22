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

async function removeThumbnailUrlField() {
  try {
    console.log('🔍 Starting thumbnailUrl field removal from cat_images collection...');

    // Get all documents in the cat_images collection
    const snapshot = await db.collection('cat_images').get();

    if (snapshot.empty) {
      console.log('❌ No documents found in cat_images collection.');
      return;
    }

    console.log(`📊 Found ${snapshot.size} documents in cat_images collection.`);

    let documentsWithThumbnailUrl = 0;
    let documentsUpdated = 0;
    let errors = 0;

    // Process documents in batches to avoid overwhelming Firestore
    const batchSize = 10;
    const docs = snapshot.docs;

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize);

      await Promise.all(batch.map(async (doc) => {
        try {
          const data = doc.data();

          // Check if the document has the thumbnailUrl field
          if ('thumbnailUrl' in data) {
            documentsWithThumbnailUrl++;
            console.log(`🔧 Removing thumbnailUrl from document: ${doc.id} (fileName: ${data.fileName || 'unknown'})`);

            // Remove the thumbnailUrl field
            await doc.ref.update({
              thumbnailUrl: admin.firestore.FieldValue.delete()
            });

            documentsUpdated++;
            console.log(`✅ Successfully removed thumbnailUrl from document: ${doc.id}`);
          }
        } catch (error) {
          errors++;
          console.error(`❌ Error processing document ${doc.id}:`, error.message);
        }
      }));

      // Add a small delay between batches to be gentle on Firestore
      if (i + batchSize < docs.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('\n📈 Summary:');
    console.log(`   Total documents processed: ${snapshot.size}`);
    console.log(`   Documents with thumbnailUrl field: ${documentsWithThumbnailUrl}`);
    console.log(`   Documents successfully updated: ${documentsUpdated}`);
    console.log(`   Errors encountered: ${errors}`);

    if (documentsUpdated > 0) {
      console.log('✅ thumbnailUrl field removal completed successfully!');
    } else if (documentsWithThumbnailUrl === 0) {
      console.log('ℹ️  No documents had the thumbnailUrl field - nothing to remove.');
    } else {
      console.log('⚠️  Some documents could not be updated due to errors.');
    }

  } catch (error) {
    console.error('❌ Fatal error during thumbnailUrl field removal:', error);
    process.exit(1);
  } finally {
    // Clean up
    admin.app().delete();
  }
}

// Run the script
if (require.main === module) {
  removeThumbnailUrlField()
    .then(() => {
      console.log('🏁 Script execution completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { removeThumbnailUrlField };

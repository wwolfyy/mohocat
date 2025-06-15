const admin = require('firebase-admin');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS 
  ? path.join(__dirname, '../', process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : null;

if (!serviceAccountPath) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS not found in .env.local');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mountaincats-61543'
  });
}

const db = admin.firestore();

async function removeThumbnailUrls() {
  console.log('Starting to remove thumbnailUrl fields from cats collection...');
  
  try {
    // Get all documents in the cats collection
    const catsSnapshot = await db.collection('cats').get();
    
    if (catsSnapshot.empty) {
      console.log('No documents found in cats collection.');
      return;
    }

    console.log(`Found ${catsSnapshot.size} documents in cats collection.`);
    
    const batch = db.batch();
    let updateCount = 0;

    catsSnapshot.forEach(doc => {
      const data = doc.data();
      
      // Check if the document has a thumbnailUrl field
      if (data.hasOwnProperty('thumbnailUrl')) {
        console.log(`Removing thumbnailUrl from cat: ${data.name || doc.id}`);
        
        // Use FieldValue.delete() to remove the field
        batch.update(doc.ref, {
          thumbnailUrl: admin.firestore.FieldValue.delete()
        });
        
        updateCount++;
      } else {
        console.log(`Cat ${data.name || doc.id} doesn't have thumbnailUrl field - skipping`);
      }
    });

    if (updateCount === 0) {
      console.log('No documents had thumbnailUrl field to remove.');
      return;
    }

    // Commit the batch
    console.log(`Committing batch update for ${updateCount} documents...`);
    await batch.commit();
    
    console.log(`✅ Successfully removed thumbnailUrl field from ${updateCount} documents.`);
    
  } catch (error) {
    console.error('❌ Error removing thumbnailUrl fields:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('=== Remove thumbnailUrl Fields from Cats Collection ===');
  
  // Ask for confirmation
  console.log('\n⚠️  WARNING: This will permanently remove the thumbnailUrl field from all documents in the cats collection.');
  console.log('This action cannot be undone without a backup.');
  console.log('\nIf you want to proceed, the script will continue in 5 seconds...');
  console.log('Press Ctrl+C to cancel.');
  
  // Wait 5 seconds for user to cancel if needed
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  await removeThumbnailUrls();
  
  console.log('\n=== Operation Complete ===');
  process.exit(0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { removeThumbnailUrls };

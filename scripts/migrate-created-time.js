/**
 * Migration script to add createdTime field to Firebase collections
 * Run with: node scripts/migrate-created-time.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Try to use the service account key file
const serviceAccountPath = path.join(__dirname, '..', 'mountaincats-61543-769df223a745.json');

try {
  // Initialize Firebase Admin SDK
  if (!admin.apps.length) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    console.log(`🔥 Connected to Firebase project: ${serviceAccount.project_id}`);
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK');
  console.error('Make sure the service account file exists:', serviceAccountPath);
  console.error('Error:', error.message);
  process.exit(1);
}

const db = admin.firestore();

async function migrateCollection(collectionName, stats) {
  console.log(`🔄 Starting migration for ${collectionName} collection...`);
  
  try {
    const collectionRef = db.collection(collectionName);
    const snapshot = await collectionRef.get();
    
    console.log(`📊 Found ${snapshot.docs.length} documents in ${collectionName}`);
    
    if (snapshot.docs.length === 0) {
      console.log(`⏭️  No documents found in ${collectionName}, skipping...`);
      return;
    }
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const docId = docSnapshot.id;
      
      // Update stats
      if (collectionName === 'cat_images' || collectionName === 'images') {
        stats.imagesProcessed++;
      } else {
        stats.videosProcessed++;
      }
      
      try {
        // Check if createdTime already exists
        if (data.createdTime !== undefined) {
          console.log(`⏭️  Skipping ${docId} - createdTime field already exists`);
          continue;
        }
        
        // Simply add an empty createdTime field
        const updateData = {
          createdTime: null
        };
        
        // Update the document
        await docSnapshot.ref.update(updateData);
        
        // Update stats
        if (collectionName === 'cat_images' || collectionName === 'images') {
          stats.imagesUpdated++;
        } else {
          stats.videosUpdated++;
        }
        
        console.log(`✅ Added empty createdTime field to ${docId}`);
        
      } catch (error) {
        const errorMsg = `Failed to update ${docId}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }
    
    console.log(`✨ Completed migration for ${collectionName}`);
    
  } catch (error) {
    const errorMsg = `Failed to migrate ${collectionName}: ${error}`;
    console.error(`💥 ${errorMsg}`);
    stats.errors.push(errorMsg);
  }
}

async function runMigration() {
  console.log('🚀 Starting createdTime field migration...');
  console.log('⏰ Started at:', new Date().toISOString());
  
  const stats = {
    imagesProcessed: 0,
    videosProcessed: 0,
    imagesUpdated: 0,
    videosUpdated: 0,
    errors: []
  };
  
  try {
    // Migrate images collection (used by tag-images interface)
    await migrateCollection('images', stats);
    
    // Migrate cat_images collection (if it exists)
    await migrateCollection('cat_images', stats);
    
    // Migrate cat_videos collection  
    await migrateCollection('cat_videos', stats);
    
    // Print final stats
    console.log('\n📈 Migration Summary:');
    console.log('='.repeat(50));
    console.log(`📸 Images processed: ${stats.imagesProcessed}`);
    console.log(`📸 Images updated: ${stats.imagesUpdated}`);
    console.log(`🎥 Videos processed: ${stats.videosProcessed}`);
    console.log(`🎥 Videos updated: ${stats.videosUpdated}`);
    console.log(`❌ Errors: ${stats.errors.length}`);
    
    if (stats.errors.length > 0) {
      console.log('\n🚨 Errors encountered:');
      stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('⏰ Finished at:', new Date().toISOString());
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  runMigration().then(() => {
    console.log('👋 Migration script finished');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { runMigration };

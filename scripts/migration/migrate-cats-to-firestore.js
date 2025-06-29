/**
 * Migration Script: Populate Firestore with Cat Data
 *
 * This script migrates cat data from the static JSON file to Firestore
 * to support the new service-based architecture.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Load environment variables (Next.js automatically loads .env.local in development)
require('dotenv').config({ path: '.env.local' });

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Load cat data from JSON file
const catsDataPath = path.join(__dirname, '..', 'src', 'lib', 'cats-static-data.json');
const catsData = JSON.parse(fs.readFileSync(catsDataPath, 'utf8'));

async function migrateCatsToFirestore() {
  try {
    console.log('🚀 Starting cat data migration to Firestore...');
    console.log('🔧 Firebase Project:', firebaseConfig.projectId);
    console.log('📦 Cat data loaded:', catsData.length, 'cats');

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Check if cats collection already exists and has data
    const existingCatsSnapshot = await getDocs(collection(db, 'cats'));
    if (!existingCatsSnapshot.empty) {
      console.log(`✅ Cats collection already contains ${existingCatsSnapshot.size} documents.`);
      console.log('🔄 Skipping migration. To force re-migration, manually delete the collection first.');
      return;
    }

    console.log('📝 Migrating cats to Firestore...');

    let successCount = 0;
    let errorCount = 0;

    // Migrate each cat
    for (const cat of catsData) {
      try {
        // Use the cat's existing ID as the document ID
        await setDoc(doc(db, 'cats', cat.id), cat);
        console.log(`✅ Migrated: ${cat.name} (${cat.id})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to migrate ${cat.name} (${cat.id}):`, error.message);
        errorCount++;
      }
    }

    console.log('\n🎉 Migration completed!');
    console.log(`✅ Successfully migrated: ${successCount} cats`);
    if (errorCount > 0) {
      console.log(`❌ Failed migrations: ${errorCount} cats`);
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateCatsToFirestore()
  .then(() => {
    console.log('🏁 Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });

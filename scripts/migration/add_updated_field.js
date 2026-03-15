/**
 * Script to add "updated" timestamp field to all existing documents in cat_images collection
 * Run this script using: npm run script:add-updated-field
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');
const path = require('path');

// Load environment variables from .env.local first, then fallback to .env
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

console.log('🔧 Environment check:');
console.log(`📁 Current working directory: ${process.cwd()}`);
console.log(`🗂️  Script directory: ${__dirname}`);

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate configuration
console.log('🔑 Firebase config validation:');
Object.entries(firebaseConfig).forEach(([key, value]) => {
  console.log(`   ${key}: ${value ? '✅ Set' : '❌ Missing'}`);
});

if (!firebaseConfig.projectId) {
  console.error(
    '❌ Firebase configuration is incomplete. Please check your environment variables.'
  );
  process.exit(1);
}

console.log(`🎯 Target Firebase Project: ${firebaseConfig.projectId}`);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addUpdatedFieldToAllDocuments() {
  try {
    console.log('\n🔍 Fetching all documents from cat_images collection...');

    // Test connection and get all documents from cat_images collection
    const querySnapshot = await getDocs(collection(db, 'cat_images'));

    console.log(`📊 Found ${querySnapshot.docs.length} documents to update`);

    if (querySnapshot.docs.length === 0) {
      console.log('⚠️  No documents found in cat_images collection');
      console.log('🔍 This could mean:');
      console.log('   1. The collection is empty');
      console.log('   2. There are connection issues');
      console.log('   3. Wrong Firebase project or database');
      console.log('   4. Insufficient permissions');

      // Try to list all collections to debug
      console.log('\n🧪 Testing basic Firestore connection...');
      try {
        const testCollection = collection(db, 'cats'); // Try a different collection
        const testSnapshot = await getDocs(testCollection);
        console.log(`   Found ${testSnapshot.docs.length} documents in 'cats' collection`);
      } catch (testError) {
        console.error('   ❌ Failed to access Firestore:', testError.message);
      }

      return;
    }

    console.log('📋 Sample document structure:');
    const firstDoc = querySnapshot.docs[0];
    console.log(`   Document ID: ${firstDoc.id}`);
    console.log(`   Document data keys: ${Object.keys(firstDoc.data()).join(', ')}`);

    const currentTimestamp = new Date();
    let updatedCount = 0;
    let skippedCount = 0;

    console.log('\n🔄 Starting to update documents...');

    for (const docSnapshot of querySnapshot.docs) {
      const docData = docSnapshot.data();

      // Check if the document already has an "updated" field
      if (docData.updated) {
        console.log(`⏭️  Skipping document ${docSnapshot.id} - already has "updated" field`);
        skippedCount++;
        continue;
      }

      try {
        // Update the document with the "updated" field
        await updateDoc(doc(db, 'cat_images', docSnapshot.id), {
          updated: currentTimestamp,
        });

        console.log(
          `✅ Updated document ${docSnapshot.id} (${docData.fileName || 'unknown file'})`
        );
        updatedCount++;

        // Add a small delay to avoid overwhelming Firestore
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Failed to update document ${docSnapshot.id}:`, error);
      }
    }

    console.log('\n📈 Summary:');
    console.log(`✅ Successfully updated: ${updatedCount} documents`);
    console.log(`⏭️  Skipped (already had field): ${skippedCount} documents`);
    console.log(`📊 Total processed: ${querySnapshot.docs.length} documents`);
    console.log(`🕐 Timestamp used: ${currentTimestamp.toISOString()}`);
  } catch (error) {
    console.error('❌ Error adding updated field to documents:', error);
    console.error('Error details:', error.code, error.message);
    process.exit(1);
  }
}

// Run the script
addUpdatedFieldToAllDocuments()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

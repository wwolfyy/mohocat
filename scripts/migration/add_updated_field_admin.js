/**
 * Script to add "updated" timestamp field to all existing documents in cat_images collection
 * Run this script using: npm run script:add-updated-field-admin
 *
 * Uses Firebase Admin SDK to bypass security rules
 */

const admin = require('firebase-admin');
const path = require('path');

console.log('🔧 Environment check:');
console.log(`📁 Current working directory: ${process.cwd()}`);
console.log(`🗂️  Script directory: ${__dirname}`);

// Check for service account key file
const serviceAccountPath = path.resolve(
  __dirname,
  '../../config/firebase/mountaincats-61543-7329e795c352.json'
);

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = require(serviceAccountPath);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('🔐 Firebase Admin initialized with service account');
    console.log(`🎯 Target Firebase Project: ${serviceAccount.project_id}`);
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    console.log('\n📋 To fix this issue:');
    console.log(
      '1. Make sure the service account key file exists: config/firebase/mountaincats-61543-7329e795c352.json'
    );
    console.log('2. Place it in the root directory of your project');
    process.exit(1);
  }
}

const db = admin.firestore();

async function addUpdatedFieldToAllDocuments() {
  try {
    console.log('\n🔍 Fetching all documents from cat_images collection...');

    // Get all documents from cat_images collection
    const querySnapshot = await db.collection('cat_images').get();

    console.log(`📊 Found ${querySnapshot.docs.length} documents to update`);

    if (querySnapshot.docs.length === 0) {
      console.log('✅ No documents found in cat_images collection');
      return;
    }

    const currentTimestamp = admin.firestore.Timestamp.now();
    let updatedCount = 0;
    let skippedCount = 0;

    console.log('🔄 Starting to update documents...');

    for (const docSnapshot of querySnapshot.docs) {
      const docData = docSnapshot.data();

      // Check if the document already has an "updated" field
      if (docData.updated) {
        console.log(`⏭️  Skipping document ${docSnapshot.id} - already has "updated" field`);
        skippedCount++;
        continue;
      }

      try {
        // Update the document with the "updated" field using Admin SDK
        await docSnapshot.ref.update({
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
    console.log(`🕐 Timestamp used: ${currentTimestamp.toDate().toISOString()}`);
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

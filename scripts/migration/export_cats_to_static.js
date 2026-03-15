/**
 * Export cats data from Firebase to static JSON file
 * This script fetches all cats from the Firestore collection and saves them as static data
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { cert } = require('firebase-admin/app');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
// Try multiple paths to find the service account file
const possiblePaths = [
  path.join(process.cwd(), 'config/firebase/mountaincats-61543-7329e795c352.json'),
  path.join(__dirname, '../../config/firebase/mountaincats-61543-7329e795c352.json'),
  path.resolve(process.cwd(), 'config/firebase/mountaincats-61543-7329e795c352.json'),
];

let serviceAccountPath = null;
for (const tryPath of possiblePaths) {
  if (fs.existsSync(tryPath)) {
    serviceAccountPath = tryPath;
    break;
  }
}

if (!serviceAccountPath) {
  console.error('Firebase service account file not found. Tried paths:', possiblePaths);
  process.exit(1);
}

console.log('Using service account file at:', serviceAccountPath);

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function exportCatsToStaticData() {
  console.log('Starting export of cats data to static JSON...');

  try {
    const catsRef = db.collection('cats');
    const snapshot = await catsRef.get();

    console.log(`Found ${snapshot.size} cat documents`);

    const cats = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      cats.push({
        id: doc.id,
        ...data,
      });
    });

    // Sort cats by name for consistent ordering
    cats.sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });

    // Write to static JSON file
    const outputPath = path.join(__dirname, '../../src/lib/cats-static-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(cats, null, 2));

    console.log(`Successfully exported ${cats.length} cats to ${outputPath}`);

    // Display summary of exported data
    console.log('\n=== Exported Cats Summary ===');
    cats.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name || 'Unnamed'} (${cat.id})`);
    });
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  }
}

// Run the export
exportCatsToStaticData()
  .then(() => {
    console.log('\nCats export completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Cats export failed:', error);
    process.exit(1);
  });

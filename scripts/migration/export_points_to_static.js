/**
 * Export points data from Firebase to static JSON file
 * This script fetches all points from the Firestore collection and saves them as static data
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

async function exportPointsToStaticData() {
  console.log('Starting export of points data to static JSON...');

  try {
    const pointsRef = db.collection('points');
    const snapshot = await pointsRef.get();

    console.log(`Found ${snapshot.size} point documents`);

    const points = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      points.push({
        id: doc.id,
        ...data,
      });
    });

    // Sort points by ID for consistent ordering
    points.sort((a, b) => {
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });

    // Write to static JSON file
    const outputPath = path.join(__dirname, '../../src/lib/points-static-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(points, null, 2));

    console.log(`Successfully exported ${points.length} points to ${outputPath}`);

    // Display summary of exported data
    console.log('\n=== Exported Points Summary ===');
    points.forEach((point, index) => {
      console.log(`${index + 1}. ${point.id} - ${point.name || 'Unnamed'}`);
    });
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  }
}

// Run the export
exportPointsToStaticData()
  .then(() => {
    console.log('\nExport completed successfully!');
    console.log('You can now update the static-data.ts file to use this JSON data.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Export failed:', error);
    process.exit(1);
  });

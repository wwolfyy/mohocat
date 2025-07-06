/**
 * Export feeding spots names data to static JSON file
 * This script fetches feeding spots from Firestore and extracts just the names for static data
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
  path.resolve(process.cwd(), 'config/firebase/mountaincats-61543-7329e795c352.json')
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

async function exportFeedingSpotsToStaticData() {
  console.log('Starting export of feeding spots names to static JSON...');

  try {
    const feedingSpotsRef = db.collection('feeding_spots');
    const snapshot = await feedingSpotsRef.get();

    console.log(`Found ${snapshot.size} feeding spot documents`);

    const feedingSpots = [];
    const uniqueNames = new Set();

    snapshot.forEach((doc) => {
      const data = doc.data();

      // Extract the name/id for the feeding spot
      const spotName = data.name || data.id || doc.id;

      if (spotName && !uniqueNames.has(spotName)) {
        uniqueNames.add(spotName);
        feedingSpots.push({
          id: doc.id,
          name: spotName,
          ...(data.description && { description: data.description }),
          ...(data.location && { location: data.location })
        });
      }
    });

    // Sort feeding spots by name for consistent ordering
    feedingSpots.sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });

    // Write to static JSON file
    const outputPath = path.join(__dirname, '../../src/lib/feeding-spots-static-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(feedingSpots, null, 2));

    console.log(`Successfully exported ${feedingSpots.length} unique feeding spots to ${outputPath}`);

    // Display summary of exported data
    console.log('\n=== Exported Feeding Spots Summary ===');
    feedingSpots.forEach((spot, index) => {
      console.log(`${index + 1}. ${spot.name} (${spot.id})`);
    });

  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  }
}

// Run the export
exportFeedingSpotsToStaticData()
  .then(() => {
    console.log('\nFeeding spots export completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Feeding spots export failed:', error);
    process.exit(1);
  });

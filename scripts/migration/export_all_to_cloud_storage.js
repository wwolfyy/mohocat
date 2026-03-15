/**
 * Export all static data from Firebase to Cloud Storage
 * This script fetches data from Firestore and uploads JSON files to Cloud Storage
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin only if not already initialized
let serviceAccount;

if (process.env.SERVICE_ACCOUNT_KEY) {
  console.log('Using SERVICE_ACCOUNT_KEY from environment variables.');
  try {
    let rawStr = process.env.SERVICE_ACCOUNT_KEY;
    // 1. Replace single quotes with double quotes
    rawStr = rawStr.replace(/'/g, '"');
    // 2. Escape any actual unescaped line breaks that might have been interpreted by the env
    rawStr = rawStr.replace(/\n/g, '\\n');
    // 3. Escape carriage returns too just in case
    rawStr = rawStr.replace(/\r/g, '\\r');

    serviceAccount = JSON.parse(rawStr);
  } catch (error) {
    console.error('Failed to parse SERVICE_ACCOUNT_KEY from environment:', error);
    process.exit(1);
  }
} else {
  // Try multiple paths to find the service account file locally
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
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
}

// Only initialize if no apps exist
if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: 'mountaincats-61543.firebasestorage.app', // Use the correct bucket name
  });
}

const db = getFirestore();
const storage = getStorage();

async function uploadToCloudStorage(data, filename) {
  console.log(`Uploading ${filename} to Cloud Storage...`);

  const bucket = storage.bucket();
  const file = bucket.file(`static-data/${filename}`);

  const jsonContent = JSON.stringify(data, null, 2);

  await file.save(jsonContent, {
    metadata: {
      contentType: 'application/json',
      cacheControl: 'public, max-age=300', // Cache for 5 minutes
    },
  });

  // Get a signed URL that doesn't expire (for public access)
  const [downloadUrl] = await file.getSignedUrl({
    action: 'read',
    expires: '03-09-2491', // Far future expiry date
  });

  console.log(`✅ ${filename} uploaded successfully to: ${downloadUrl}`);

  return downloadUrl;
}

async function exportCatsToCloudStorage() {
  console.log('Exporting cats data...');

  const catsRef = db.collection('cats');
  const snapshot = await catsRef.get();

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

  console.log(`Found ${cats.length} cats`);
  await uploadToCloudStorage(cats, 'cats-static-data.json');

  return cats;
}

async function exportPointsToCloudStorage() {
  console.log('Exporting points data...');

  const pointsRef = db.collection('points');
  const snapshot = await pointsRef.get();

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

  console.log(`Found ${points.length} points`);
  await uploadToCloudStorage(points, 'points-static-data.json');

  return points;
}

async function exportFeedingSpotsToCloudStorage() {
  console.log('Exporting feeding spots data...');

  const feedingSpotsRef = db.collection('feeding_spots');
  const snapshot = await feedingSpotsRef.get();

  // Extract unique names for the static list
  const uniqueNames = new Set();

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.name && typeof data.name === 'string') {
      uniqueNames.add(data.name.trim());
    }
  });

  const feedingSpotNames = Array.from(uniqueNames).sort();

  console.log(`Found ${feedingSpotNames.length} unique feeding spot names`);
  await uploadToCloudStorage(feedingSpotNames, 'feeding-spots-static-data.json');

  return feedingSpotNames;
}

async function exportAllToCloudStorage() {
  console.log('🚀 Starting export of all static data to Cloud Storage...\n');

  try {
    const [cats, points, feedingSpots] = await Promise.all([
      exportCatsToCloudStorage(),
      exportPointsToCloudStorage(),
      exportFeedingSpotsToCloudStorage(),
    ]);

    console.log('\n✅ All data exported successfully to Cloud Storage!');
    console.log('\n📊 Summary:');
    console.log(`- ${cats.length} cats`);
    console.log(`- ${points.length} points`);
    console.log(`- ${feedingSpots.length} feeding spot names`);

    return { cats, points, feedingSpots };
  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
}

// Run the export if this script is called directly
if (require.main === module) {
  exportAllToCloudStorage()
    .then(() => {
      console.log('\n🎉 Export completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Export failed:', error);
      process.exit(1);
    });
}

module.exports = {
  exportAllToCloudStorage,
  exportCatsToCloudStorage,
  exportPointsToCloudStorage,
  exportFeedingSpotsToCloudStorage,
  uploadToCloudStorage,
};

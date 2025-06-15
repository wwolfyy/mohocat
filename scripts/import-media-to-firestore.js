// Script to import existing images and videos from Firebase Storage into Firestore
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? path.join(__dirname, '../', process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : null;

const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

if (!storageBucket) {
  throw new Error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable is required');
}

let app;
if (serviceAccountPath) {
  console.log(`Using service account: ${serviceAccountPath}`);
  console.log(`Storage bucket: ${storageBucket}`);
  app = initializeApp({
    credential: cert(require(serviceAccountPath)),
    storageBucket: storageBucket
  });
} else {
  console.log('Using default Firebase credentials');
  console.log(`Storage bucket: ${storageBucket}`);
  app = initializeApp({
    storageBucket: storageBucket
  });
}

const db = getFirestore(app);
const storage = getStorage(app).bucket();

console.log('Firebase Admin SDK initialized successfully');

// Configuration
const SCAN_FOLDERS = ['images/', 'uploads/', 'videos/']; // Folders to scan for both images and videos
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'];
const VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'];

// Helper function to check if a file is an image
function isImageFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

// Helper function to check if a file is a video
function isVideoFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return VIDEO_EXTENSIONS.includes(ext);
}

// Helper function to get file metadata
async function getFileMetadata(file) {
  try {
    const [metadata] = await file.getMetadata();
    return {
      size: parseInt(metadata.size) || 0,
      contentType: metadata.contentType || 'unknown',
      timeCreated: metadata.timeCreated ? new Date(metadata.timeCreated) : new Date(),
      updated: metadata.updated ? new Date(metadata.updated) : new Date()
    };
  } catch (error) {
    console.warn(`Could not get metadata for ${file.name}:`, error.message);
    return {
      size: 0,
      contentType: 'unknown',
      timeCreated: new Date(),
      updated: new Date()
    };
  }
}

// Function to get public URL for a file
async function getPublicUrl(file) {
  try {
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 10 // 10 years
    });
    return url;
  } catch (error) {
    console.warn(`Could not get public URL for ${file.name}:`, error.message);
    return null;
  }
}

// Function to check if a file exists in Firebase Storage
async function fileExists(storagePath) {
  try {
    const file = storage.file(storagePath);
    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    console.warn(`Could not check existence of ${storagePath}:`, error.message);
    return false;
  }
}

// Function to clean up orphaned database entries
async function cleanupOrphanedEntries() {
  console.log('\n=== Cleaning Up Orphaned Database Entries ===');

  let totalChecked = 0;
  let deletedEntries = 0;

  // Clean up orphaned images
  console.log('\nChecking orphaned image entries...');
  try {
    const imagesSnapshot = await db.collection('cat_images').get();
    console.log(`Found ${imagesSnapshot.size} image entries in database`);

    for (const doc of imagesSnapshot.docs) {
      const data = doc.data();
      totalChecked++;

      if (data.storagePath) {
        const exists = await fileExists(data.storagePath);
        if (!exists) {
          console.log(`🗑️  Deleting orphaned image entry: ${data.fileName} (${data.storagePath})`);
          await doc.ref.delete();
          deletedEntries++;
        }
      } else {
        console.log(`⚠️  Image entry missing storagePath: ${doc.id}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up orphaned image entries:', error.message);
  }

  // Clean up orphaned videos
  console.log('\nChecking orphaned video entries...');
  try {
    const videosSnapshot = await db.collection('cat_videos').get();
    console.log(`Found ${videosSnapshot.size} video entries in database`);

    for (const doc of videosSnapshot.docs) {
      const data = doc.data();
      totalChecked++;

      // Only check storage-based videos, not YouTube videos
      if (data.storagePath && data.videoType === 'storage') {
        const exists = await fileExists(data.storagePath);
        if (!exists) {
          console.log(`🗑️  Deleting orphaned video entry: ${data.fileName} (${data.storagePath})`);
          await doc.ref.delete();
          deletedEntries++;
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up orphaned video entries:', error.message);
  }

  console.log(`\n📊 Cleanup Summary: ${deletedEntries}/${totalChecked} orphaned entries deleted`);
}

// Import images from storage folders
async function importImages() {
  console.log('\n=== Importing Images ===');

  let totalImages = 0;
  let importedImages = 0;

  for (const folder of SCAN_FOLDERS) {
    console.log(`\nScanning folder for images: ${folder}`);

    try {
      const [files] = await storage.getFiles({ prefix: folder });

      // Filter for actual image files
      const imageFiles = files.filter(file => {
        const fileName = file.name;
        return !fileName.endsWith('/') && // Not a directory
               fileName !== folder.slice(0, -1) && // Not the folder itself
               isImageFile(fileName);
      });

      console.log(`Found ${imageFiles.length} image files in ${folder}`);
      totalImages += imageFiles.length;

      for (const file of imageFiles) {
        try {
          const fileName = path.basename(file.name);
          const metadata = await getFileMetadata(file);
          const publicUrl = await getPublicUrl(file);

          if (!publicUrl) {
            console.warn(`Skipping ${fileName} - could not get public URL`);
            continue;
          }

          // Check if already exists in Firestore
          const existingQuery = await db.collection('cat_images')
            .where('storagePath', '==', file.name)
            .get();

          if (!existingQuery.empty) {
            console.log(`Skipping ${fileName} - already exists in database`);
            continue;
          }

          // Create Firestore document
          const imageData = {
            imageUrl: publicUrl,
            fileName: fileName,
            storagePath: file.name,
            tags: [], // Empty initially - needs manual tagging
            uploadDate: metadata.timeCreated,
            uploadedBy: 'system_import',
            needsTagging: true,
            fileSize: metadata.size,
            autoTagged: false
          };

          await db.collection('cat_images').add(imageData);
          console.log(`✅ Imported: ${fileName}`);
          importedImages++;

        } catch (error) {
          console.error(`❌ Failed to import ${file.name}:`, error.message);
        }
      }
    } catch (error) {
      console.error(`Error scanning folder ${folder}:`, error.message);
    }
  }

  console.log(`\n📊 Images Summary: ${importedImages}/${totalImages} imported successfully`);
}

// Import videos from storage folders
async function importVideos() {
  console.log('\n=== Importing Videos ===');

  let totalVideos = 0;
  let importedVideos = 0;

  for (const folder of SCAN_FOLDERS) {
    console.log(`\nScanning folder for videos: ${folder}`);

    try {
      const [files] = await storage.getFiles({ prefix: folder });

      // Filter for actual video files
      const videoFiles = files.filter(file => {
        const fileName = file.name;
        return !fileName.endsWith('/') && // Not a directory
               fileName !== folder.slice(0, -1) && // Not the folder itself
               isVideoFile(fileName);
      });

      console.log(`Found ${videoFiles.length} video files in ${folder}`);
      totalVideos += videoFiles.length;

      for (const file of videoFiles) {
        try {
          const fileName = path.basename(file.name);
          const metadata = await getFileMetadata(file);
          const publicUrl = await getPublicUrl(file);

          if (!publicUrl) {
            console.warn(`Skipping ${fileName} - could not get public URL`);
            continue;
          }

          // Check if already exists in Firestore
          const existingQuery = await db.collection('cat_videos')
            .where('storagePath', '==', file.name)
            .get();

          if (!existingQuery.empty) {
            console.log(`Skipping ${fileName} - already exists in database`);
            continue;
          }

          // Create Firestore document
          const videoData = {
            videoUrl: publicUrl,
            fileName: fileName,
            storagePath: file.name,
            tags: [], // Empty initially - needs manual tagging
            uploadDate: metadata.timeCreated,
            uploadedBy: 'system_import',
            needsTagging: true,
            fileSize: metadata.size,
            autoTagged: false,
            videoType: 'storage'
          };

          await db.collection('cat_videos').add(videoData);
          console.log(`✅ Imported: ${fileName}`);
          importedVideos++;

        } catch (error) {
          console.error(`❌ Failed to import ${file.name}:`, error.message);
        }
      }
    } catch (error) {
      console.error(`Error scanning folder ${folder}:`, error.message);
    }
  }

  console.log(`\n📊 Videos Summary: ${importedVideos}/${totalVideos} imported successfully`);
}

// Main function
async function main() {
  console.log('=== Firebase Storage to Firestore Import & Cleanup ===');
  console.log(`Scanning storage bucket: ${storageBucket}`);
  console.log(`Folders to scan: ${SCAN_FOLDERS.join(', ')}`);

  // Step 1: Clean up orphaned database entries
  await cleanupOrphanedEntries();

  // Step 2: Import new images
  await importImages();

  // Step 3: Import new videos
  await importVideos();

  console.log('\n=== Import & Cleanup Complete ===');
  process.exit(0);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error during import:', error);
    process.exit(1);
  });
}

module.exports = {
  importImages,
  importVideos,
  cleanupOrphanedEntries,
  main
};

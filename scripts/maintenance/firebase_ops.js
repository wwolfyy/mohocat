// Codebase for various Firebase operations

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');

// Initialize Firebase Admin with environment variables
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
    storageBucket: storageBucket,
  });
} else {
  console.log('Using default Firebase credentials');
  console.log(`Storage bucket: ${storageBucket}`);
  app = initializeApp({
    storageBucket: storageBucket,
  });
}

console.log('Firebase Admin SDK initialized successfully');

// Helper function to check if a storage object is a file or directory
function isActualFile(fileName, baseDir = '') {
  // Skip if it's a directory (ends with /)
  if (fileName.endsWith('/')) {
    return false;
  }

  // Skip if it's just a directory marker
  if (fileName === baseDir.slice(0, -1)) {
    return false;
  }

  // For root directory, skip files that are inside subfolders
  if (baseDir === '' && fileName.includes('/')) {
    return false;
  }

  return true;
}

// function to move files in Firebase storage
async function moveFileInStorage(oldPath, newPath, deleteOriginal = true) {
  const bucket = getStorage(app).bucket(); // Use the configured bucket

  const sourceFile = bucket.file(oldPath);
  const destinationFile = bucket.file(newPath);

  try {
    // Check if source file exists
    const [exists] = await sourceFile.exists();
    if (!exists) {
      console.log(`Source file '${oldPath}' does not exist. Skipping.`);
      return { success: true, skipped: true };
    }

    // Check if destination already exists
    const [destExists] = await destinationFile.exists();
    if (destExists) {
      console.log(`Destination file '${newPath}' already exists. Skipping.`);
      return { success: true, skipped: true };
    }

    // 1. Copy the file to the new location
    console.log(`Attempting to copy '${oldPath}' to '${newPath}'...`);
    await sourceFile.copy(destinationFile);
    console.log('File copied successfully.');

    // 2. Delete the original file
    if (!deleteOriginal) {
      console.log('Skipping deletion of the original file.');
      return { success: true };
    }
    console.log(`Attempting to delete original file '${oldPath}'...`);
    await sourceFile.delete();
    console.log('Original file deleted successfully.');

    console.log(`Successfully moved file from '${oldPath}' to '${newPath}'.`);
    return { success: true };
  } catch (error) {
    console.error('Error moving file:', error);
    // Important: Handle cases where the copy succeeds but the delete fails.
    // You might end up with two copies of the file.
    // Your logic should be robust enough to handle this (e.g., by retrying the delete).
    return { success: false, error: error.message };
  }
}

// function to apply the move file function to a directory in Firebase
async function moveFilesInDirectory(oldDir, newDir, deleteOriginal = true) {
  const bucket = getStorage(app).bucket(); // Use the configured bucket

  // Normalize directory paths
  const normalizedOldDir = oldDir.endsWith('/') || oldDir === '' ? oldDir : oldDir + '/';
  const normalizedNewDir = newDir.endsWith('/') ? newDir : newDir + '/';
  const [files] = await bucket.getFiles({ prefix: normalizedOldDir });

  if (files.length === 0) {
    console.log(`No files found in directory '${oldDir}'.`);
    return { success: true };
  }
  // Filter out directories and only keep actual files
  const actualFiles = files.filter((file) => {
    const fileName = file.name;
    const isFile = isActualFile(fileName, normalizedOldDir);

    if (!isFile) {
      if (fileName.endsWith('/')) {
        console.log(`Skipping directory: ${fileName}`);
      } else if (fileName.includes('/') && normalizedOldDir === '') {
        console.log(`Skipping file in subfolder: ${fileName}`);
      } else {
        console.log(`Skipping directory marker: ${fileName}`);
      }
    }

    return isFile;
  });

  if (actualFiles.length === 0) {
    console.log(`No actual files found in directory '${oldDir}' (only directories).`);
    return { success: true };
  }

  console.log(
    `Found ${actualFiles.length} files to process (${files.length - actualFiles.length} directories/subfolders skipped)`
  );

  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (const file of actualFiles) {
    const oldPath = file.name;

    // Better path replacement logic
    let newPath;
    if (normalizedOldDir === '') {
      // Handle root directory case
      newPath = normalizedNewDir + oldPath;
    } else {
      // Replace only the first occurrence at the beginning
      newPath = oldPath.replace(new RegExp(`^${normalizedOldDir}`), normalizedNewDir);
    }

    const result = await moveFileInStorage(oldPath, newPath, deleteOriginal);
    results.push({ oldPath, newPath, result });

    if (result.success) {
      successCount++;
      if (result.skipped) {
        console.log(`Skipped: ${oldPath}`);
      }
    } else {
      errorCount++;
      console.error(`Failed to move file '${oldPath}':`, result.error);
      // Continue processing other files instead of stopping
    }
  }

  console.log(`Processing complete. Success: ${successCount}, Errors: ${errorCount}`);

  if (errorCount > 0) {
    console.log(`${errorCount} files failed to move from '${oldDir}' to '${newDir}'.`);
    return { success: false, results, successCount, errorCount };
  }

  console.log(`All files moved from '${oldDir}' to '${newDir}'.`);
  return { success: true, results, successCount, errorCount };
}

// run the function to move files in root to 'thumbnails', without deleting originals
async function moveRootFilesToThumbnails() {
  const oldDir = ''; // Root directory
  const newDir = 'thumbnails/'; // Target directory

  try {
    const result = await moveFilesInDirectory(oldDir, newDir, false);
    if (result.success) {
      console.log("All files moved to 'thumbnails' successfully.");
    } else {
      console.error('Error moving files:', result.error);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Execute the function if this script is run directly
if (require.main === module) {
  moveRootFilesToThumbnails();
}

// Export functions for use in other modules
module.exports = {
  moveFileInStorage,
  moveFilesInDirectory,
  moveRootFilesToThumbnails,
};

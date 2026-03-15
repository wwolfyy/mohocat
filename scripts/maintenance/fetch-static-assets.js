const admin = require('firebase-admin');
const fsPromises = require('fs').promises; // Using promises version of fs
const fs = require('fs'); // Standard fs for createWriteStream
const path = require('path');
const axios = require('axios'); // For downloading images

// --- Configuration ---
const SERVICE_ACCOUNT_KEY_PATH = 'config/firebase/mountaincats-61543-7329e795c352.json'; // Updated to use the actual service account file
const FIREBASE_PROJECT_ID = 'mountaincats-61543'; // Your Firebase Project ID
const STORAGE_BUCKET = 'mountaincats-61543.firebasestorage.app'; // Your storage bucket
const THUMBNAILS_FOLDER = 'thumbnails/'; // Folder in Firebase Storage where thumbnails are stored
const ABOUT_PHOTOS_FOLDER = 'about-photos/'; // Folder in Firebase Storage where about photos are stored
const CATS_COLLECTION = 'cats';
const LOCAL_THUMBNAILS_DIR_RELATIVE = 'public/images/thumbnails'; // Relative to project root
const LOCAL_ABOUT_PHOTOS_DIR_RELATIVE = 'public/images/about-photos'; // Relative to project root
const STATIC_DATA_JSON_PATH_RELATIVE = 'src/lib/cats-static-data.json'; // Relative to project root
const MOUNTAINS_CONFIG_PATH_RELATIVE = 'config/mountains/mountains.json'; // Relative to project root

// Absolute paths resolved from project root
const PROJECT_ROOT = path.resolve(__dirname, '..', '..'); // Assuming script is in 'scripts/maintenance' directory
const SERVICE_ACCOUNT_FULL_PATH = path.join(PROJECT_ROOT, SERVICE_ACCOUNT_KEY_PATH);
const LOCAL_THUMBNAILS_DIR = path.join(PROJECT_ROOT, LOCAL_THUMBNAILS_DIR_RELATIVE);
const LOCAL_ABOUT_PHOTOS_DIR = path.join(PROJECT_ROOT, LOCAL_ABOUT_PHOTOS_DIR_RELATIVE);
const STATIC_DATA_JSON_PATH = path.join(PROJECT_ROOT, STATIC_DATA_JSON_PATH_RELATIVE);
const MOUNTAINS_CONFIG_PATH = path.join(PROJECT_ROOT, MOUNTAINS_CONFIG_PATH_RELATIVE);
// ---

async function initializeFirebase() {
  console.log('Initializing Firebase Admin SDK...');
  try {
    // Check if service account key exists before requiring it
    await fsPromises.access(SERVICE_ACCOUNT_FULL_PATH, fs.constants.F_OK);
    const serviceAccountKey = require(SERVICE_ACCOUNT_FULL_PATH);

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountKey),
        projectId: FIREBASE_PROJECT_ID,
        storageBucket: STORAGE_BUCKET,
      });
      console.log(`Firebase App initialized successfully for project '${FIREBASE_PROJECT_ID}'.`);
    } else {
      console.log('Using existing Firebase App.');
    }
    return {
      db: admin.firestore(),
      storage: admin.storage().bucket(),
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`ERROR: Service account key not found at ${SERVICE_ACCOUNT_FULL_PATH}.`);
      console.error('Please ensure the path is correct and the file exists.');
    } else {
      console.error('ERROR: Firebase Admin SDK initialization failed.', error.message);
    }
    return null;
  }
}

async function fetchCatsData(db) {
  if (!db) return [];
  console.log(`Fetching cat data from Firestore collection: '${CATS_COLLECTION}'...`);
  try {
    const catsSnapshot = await db.collection(CATS_COLLECTION).get();
    const allCatsData = [];
    catsSnapshot.forEach((doc) => {
      allCatsData.push({ id: doc.id, ...doc.data() });
    });
    if (allCatsData.length === 0) {
      console.log('No cat data found in Firestore.');
    } else {
      console.log(`Fetched ${allCatsData.length} cat(s) from Firestore.`);
    }
    return allCatsData;
  } catch (error) {
    console.error('Error fetching cats data from Firestore:', error);
    return [];
  }
}

async function fetchThumbnailsFromStorage(bucket) {
  console.log(`Fetching thumbnails from Firebase Storage folder: '${THUMBNAILS_FOLDER}'...`);
  try {
    const [files] = await bucket.getFiles({ prefix: THUMBNAILS_FOLDER });

    // Filter out directories and get actual image files
    const imageFiles = files.filter((file) => {
      const fileName = file.name;
      // Skip directories and non-image files
      return (
        !fileName.endsWith('/') &&
        fileName !== THUMBNAILS_FOLDER.slice(0, -1) &&
        /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)
      );
    });
    console.log(`Found ${imageFiles.length} thumbnail images in storage.`);

    // Debug: Show some example filenames
    if (imageFiles.length > 0) {
      const exampleFiles = imageFiles.slice(0, 3).map((f) => path.basename(f.name));
      console.log(
        `Example filenames: ${exampleFiles.join(', ')}${imageFiles.length > 3 ? '...' : ''}`
      );
    }

    // Create a map of filename (without path) to download URL
    const thumbnailMap = {};
    for (const file of imageFiles) {
      try {
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
        });

        // Extract just the filename without the thumbnails/ prefix
        const fileName = path.basename(file.name);
        thumbnailMap[fileName] = url;

        // Debug: Show the parts for the first few files
        if (Object.keys(thumbnailMap).length <= 3) {
          const nameWithoutExt = path.parse(fileName).name;
          const parts = nameWithoutExt.split('_');
          console.log(`File: '${fileName}' -> Parts: [${parts.join(', ')}]`);
        }
      } catch (error) {
        console.error(`Failed to get download URL for ${file.name}:`, error.message);
      }
    }

    return thumbnailMap;
  } catch (error) {
    console.error('Error fetching thumbnails from storage:', error);
    return {};
  }
}

async function fetchAboutPhotosFromStorage(bucket) {
  console.log(`Fetching about photos from Firebase Storage folder: '${ABOUT_PHOTOS_FOLDER}'...`);
  try {
    const [files] = await bucket.getFiles({ prefix: ABOUT_PHOTOS_FOLDER });

    // Filter out directories and get actual image files
    const imageFiles = files.filter((file) => {
      const fileName = file.name;
      // Skip directories and non-image files
      return (
        !fileName.endsWith('/') &&
        fileName !== ABOUT_PHOTOS_FOLDER.slice(0, -1) &&
        /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)
      );
    });

    console.log(`Found ${imageFiles.length} about photo images in storage.`);

    // Debug: Show some example filenames
    if (imageFiles.length > 0) {
      const exampleFiles = imageFiles.slice(0, 3).map((f) => path.basename(f.name));
      console.log(
        `Example about photo filenames: ${exampleFiles.join(', ')}${imageFiles.length > 3 ? '...' : ''}`
      );
    }

    // Create a map of full path to download URL for about photos
    const aboutPhotosMap = {};
    for (const file of imageFiles) {
      try {
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
        });

        // Keep the full path structure for about photos (e.g., about-photos/geyang/about-main-geyang.jpg)
        aboutPhotosMap[file.name] = url;

        // Debug: Show the paths for the first few files
        if (Object.keys(aboutPhotosMap).length <= 3) {
          console.log(`About photo: '${file.name}' -> URL ready`);
        }
      } catch (error) {
        console.error(`Failed to get download URL for ${file.name}:`, error.message);
      }
    }

    return aboutPhotosMap;
  } catch (error) {
    console.error('Error fetching about photos from storage:', error);
    return {};
  }
}

async function downloadImage(url, localPath) {
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 15000, // 15 seconds timeout
    });

    const writer = response.data.pipe(fs.createWriteStream(localPath));

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', (err) => {
        console.error(`Error writing image to ${localPath}:`, err);
        reject(err);
      });
    });
  } catch (error) {
    if (error.response) {
      console.error(`HTTP error ${error.response.status} downloading ${url}`);
    } else {
      console.error(`Error downloading image ${url}:`, error.message);
    }
    throw error; // Re-throw to be caught by the caller
  }
}

async function downloadAndUpdateThumbnails(catsData, thumbnailMap) {
  console.log(`Ensuring local thumbnail directory exists: '${LOCAL_THUMBNAILS_DIR}'`);
  await fsPromises.mkdir(LOCAL_THUMBNAILS_DIR, { recursive: true });

  const updatedCatsList = [];

  for (const cat of catsData) {
    const catId = cat.id;
    const catName = cat.name || `ID: ${catId}`;
    let updatedCatEntry = { ...cat };

    if (!catId) {
      console.warn(`WARNING: Cat data missing 'id'. Skipping image processing for: ${catName}`);
      updatedCatEntry.thumbnailUrl = '';
      updatedCatsList.push(updatedCatEntry);
      continue;
    } // Look for thumbnail files that contain this cat's ID
    // More robust matching: remove extension, split by underscore, check if cat ID is in the parts
    let foundThumbnail = null;
    let downloadUrl = null;

    for (const [fileName, url] of Object.entries(thumbnailMap)) {
      // Remove file extension
      const nameWithoutExt = path.parse(fileName).name;

      // Split by underscore and check if any part matches the cat ID
      const nameParts = nameWithoutExt.split('_');

      if (nameParts.includes(catId)) {
        foundThumbnail = fileName;
        downloadUrl = url;
        console.log(
          `Matched cat '${catName}' (ID: ${catId}) to file: '${fileName}' via parts: [${nameParts.join(', ')}]`
        );
        break;
      }
    }

    if (!foundThumbnail) {
      console.warn(
        `WARNING: No thumbnail found in storage for cat '${catName}' (ID: ${catId}). No files contained '${catId}' in their underscore-separated parts.`
      );

      // Debug: show available files for troubleshooting
      const availableFiles = Object.keys(thumbnailMap).slice(0, 5); // Show first 5 files
      console.log(
        `Available files (first 5): ${availableFiles.join(', ')}${Object.keys(thumbnailMap).length > 5 ? '...' : ''}`
      );

      updatedCatEntry.thumbnailUrl = '';
      updatedCatsList.push(updatedCatEntry);
      continue;
    }

    try {
      console.log(`Processing cat: '${catName}'. Found thumbnail: '${foundThumbnail}'`);

      const localImageFilename = foundThumbnail; // Use the same filename as in storage
      const localImageFullPath = path.join(LOCAL_THUMBNAILS_DIR, localImageFilename);

      await downloadImage(downloadUrl, localImageFullPath);

      // Generate web-accessible path
      const relativePath = path.relative(path.join(PROJECT_ROOT, 'public'), localImageFullPath);
      const standardizedPath = relativePath.replace(/\\/g, '/'); // Ensure forward slashes for web
      const webAccessiblePath = `/${standardizedPath}`;

      console.log(
        `Successfully downloaded and saved to: '${localImageFullPath}'. Web path: '${webAccessiblePath}'`
      );
      updatedCatEntry.thumbnailUrl = webAccessiblePath;
    } catch (error) {
      console.error(`Failed to download thumbnail for cat '${catName}':`, error.message);
      updatedCatEntry.thumbnailUrl = '';
    }
    updatedCatsList.push(updatedCatEntry);
  }
  return updatedCatsList;
}

async function downloadAndUpdateAboutPhotos(aboutPhotosMap, mountainsConfig) {
  console.log(`Ensuring local about photos directory exists: '${LOCAL_ABOUT_PHOTOS_DIR}'`);
  await fsPromises.mkdir(LOCAL_ABOUT_PHOTOS_DIR, { recursive: true });

  const updatedMountainsConfig = { ...mountainsConfig };

  for (const [mountainId, mountainConfig] of Object.entries(mountainsConfig)) {
    if (!mountainConfig.about || !mountainConfig.about.mainPhoto) {
      console.log(`No main photo configured for mountain: ${mountainId}`);
      continue;
    }

    const mainPhoto = mountainConfig.about.mainPhoto;
    const expectedStoragePath = `${ABOUT_PHOTOS_FOLDER}${mountainId}/${mainPhoto.filename}`;

    console.log(
      `Processing mountain: '${mountainId}', looking for photo: '${expectedStoragePath}'`
    );

    // Find the photo in storage
    const downloadUrl = aboutPhotosMap[expectedStoragePath];

    if (!downloadUrl) {
      console.warn(
        `WARNING: About photo not found in storage for mountain '${mountainId}': ${expectedStoragePath}`
      );

      // Debug: show available about photos
      const availablePhotos = Object.keys(aboutPhotosMap).filter((path) =>
        path.startsWith(`${ABOUT_PHOTOS_FOLDER}${mountainId}/`)
      );
      console.log(`Available photos for ${mountainId}:`, availablePhotos);
      continue;
    }

    try {
      // Create mountain-specific directory
      const mountainAboutDir = path.join(LOCAL_ABOUT_PHOTOS_DIR, mountainId);
      await fsPromises.mkdir(mountainAboutDir, { recursive: true });

      const localImagePath = path.join(mountainAboutDir, mainPhoto.filename);
      await downloadImage(downloadUrl, localImagePath);

      // Generate web-accessible path
      const relativePath = path.relative(path.join(PROJECT_ROOT, 'public'), localImagePath);
      const standardizedPath = relativePath.replace(/\\/g, '/'); // Ensure forward slashes for web
      const webAccessiblePath = `/${standardizedPath}`;

      console.log(
        `Successfully downloaded about photo for '${mountainId}' to: '${localImagePath}'. Web path: '${webAccessiblePath}'`
      );

      // Update the mountain config with the local path
      if (!updatedMountainsConfig[mountainId].about.mainPhoto.localPath) {
        updatedMountainsConfig[mountainId] = {
          ...updatedMountainsConfig[mountainId],
          about: {
            ...updatedMountainsConfig[mountainId].about,
            mainPhoto: {
              ...updatedMountainsConfig[mountainId].about.mainPhoto,
              localPath: webAccessiblePath,
            },
          },
        };
      }
    } catch (error) {
      console.error(`Failed to download about photo for mountain '${mountainId}':`, error.message);
    }
  }

  return updatedMountainsConfig;
}

async function saveStaticDataJson(catsData) {
  console.log(`Saving updated cat data to JSON: '${STATIC_DATA_JSON_PATH}'...`);
  try {
    const jsonData = JSON.stringify(catsData, null, 2);
    await fsPromises.writeFile(STATIC_DATA_JSON_PATH, jsonData, 'utf-8');
    console.log(`Successfully created static data JSON: '${STATIC_DATA_JSON_PATH}'`);
  } catch (error) {
    console.error(`ERROR: Could not write static data JSON to '${STATIC_DATA_JSON_PATH}':`, error);
  }
}

async function loadMountainsConfig() {
  try {
    console.log(`Loading mountains configuration from: '${MOUNTAINS_CONFIG_PATH}'`);
    const configData = await fsPromises.readFile(MOUNTAINS_CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configData);

    // Extract mountains (excluding _meta)
    const mountains = {};
    for (const [key, value] of Object.entries(config)) {
      if (key !== '_meta' && value && typeof value === 'object') {
        mountains[key] = value;
      }
    }

    console.log(`Loaded ${Object.keys(mountains).length} mountain configurations`);
    return mountains;
  } catch (error) {
    console.error('Error loading mountains configuration:', error);
    return {};
  }
}

async function saveUpdatedMountainsConfig(updatedConfig) {
  try {
    // Read the original config to preserve _meta and structure
    const originalConfigData = await fsPromises.readFile(MOUNTAINS_CONFIG_PATH, 'utf-8');
    const originalConfig = JSON.parse(originalConfigData);

    // Merge with updated mountain configs
    const finalConfig = {
      ...originalConfig,
      ...updatedConfig,
    };

    const jsonData = JSON.stringify(finalConfig, null, 2);
    await fsPromises.writeFile(MOUNTAINS_CONFIG_PATH, jsonData, 'utf-8');
    console.log(`Successfully updated mountains configuration: '${MOUNTAINS_CONFIG_PATH}'`);
  } catch (error) {
    console.error(
      `ERROR: Could not write updated mountains configuration to '${MOUNTAINS_CONFIG_PATH}':`,
      error
    );
  }
}

async function main() {
  console.log('--- Starting Static Asset Fetching Process (Node.js) ---');

  const firebaseServices = await initializeFirebase();
  if (!firebaseServices) {
    console.error('Firebase initialization failed. Exiting.');
    process.exit(1); // Exit if Firebase can't be initialized
  }

  const { db, storage } = firebaseServices;

  const rawCatsData = await fetchCatsData(db);
  if (rawCatsData.length === 0 && !(await db.collection(CATS_COLLECTION).limit(1).get()).empty) {
    // If fetchCatsData returns empty but the collection is not actually empty, it implies an error during fetch
    console.log(
      'No data returned from fetchCatsData, possibly due to an error during fetch. Exiting.'
    );
    process.exit(1);
  } else if (rawCatsData.length === 0) {
    console.log(
      'No cat data found in Firestore. Process will complete, but no images will be downloaded.'
    );
  }

  const thumbnailMap = await fetchThumbnailsFromStorage(storage);
  if (Object.keys(thumbnailMap).length === 0) {
    console.log('No thumbnails found in Firebase Storage. Images may not be available.');
  }

  const updatedCatsData = await downloadAndUpdateThumbnails(rawCatsData, thumbnailMap);
  await saveStaticDataJson(updatedCatsData);

  const aboutPhotosMap = await fetchAboutPhotosFromStorage(storage);
  if (Object.keys(aboutPhotosMap).length === 0) {
    console.log('No about photos found in Firebase Storage. About images may not be available.');
  }

  const mountainsConfig = await loadMountainsConfig();
  const updatedMountainsConfig = await downloadAndUpdateAboutPhotos(
    aboutPhotosMap,
    mountainsConfig
  );
  await saveUpdatedMountainsConfig(updatedMountainsConfig);

  console.log('--- Static Asset Fetching Process (Node.js) Completed ---');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error in main execution:', error);
    process.exit(1);
  });
}

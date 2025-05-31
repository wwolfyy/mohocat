const admin = require('firebase-admin');
const fsPromises = require('fs').promises; // Using promises version of fs
const fs = require('fs'); // Standard fs for createWriteStream
const path = require('path');
const axios = require('axios'); // For downloading images

// --- Configuration ---
const SERVICE_ACCOUNT_KEY_PATH = './google_svs_account.json'; // Path to your Firebase service account key from project root
const FIREBASE_PROJECT_ID = 'mountaincats-61543'; // Your Firebase Project ID
const CATS_COLLECTION = 'cats';
const LOCAL_THUMBNAILS_DIR_RELATIVE = 'public/images/thumbnails'; // Relative to project root
const STATIC_DATA_JSON_PATH_RELATIVE = 'src/lib/cats-static-data.json'; // Relative to project root

// Absolute paths resolved from project root
const PROJECT_ROOT = path.resolve(__dirname, '..'); // Assuming script is in 'scripts' directory
const SERVICE_ACCOUNT_FULL_PATH = path.join(PROJECT_ROOT, SERVICE_ACCOUNT_KEY_PATH);
const LOCAL_THUMBNAILS_DIR = path.join(PROJECT_ROOT, LOCAL_THUMBNAILS_DIR_RELATIVE);
const STATIC_DATA_JSON_PATH = path.join(PROJECT_ROOT, STATIC_DATA_JSON_PATH_RELATIVE);
// ---

async function initializeFirebase() {
    console.log("Initializing Firebase Admin SDK...");
    try {
        // Check if service account key exists before requiring it
        await fsPromises.access(SERVICE_ACCOUNT_FULL_PATH, fs.constants.F_OK);
        const serviceAccountKey = require(SERVICE_ACCOUNT_FULL_PATH);

        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccountKey),
                projectId: FIREBASE_PROJECT_ID,
            });
            console.log(`Firebase App initialized successfully for project '${FIREBASE_PROJECT_ID}'.`);
        } else {
            console.log("Using existing Firebase App.");
        }
        return admin.firestore();
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`ERROR: Service account key not found at ${SERVICE_ACCOUNT_FULL_PATH}.`);
            console.error("Please ensure the path is correct and the file exists.");
        } else {
            console.error("ERROR: Firebase Admin SDK initialization failed.", error.message);
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
        catsSnapshot.forEach(doc => {
            allCatsData.push({ id: doc.id, ...doc.data() });
        });
        if (allCatsData.length === 0) {
            console.log("No cat data found in Firestore.");
        } else {
            console.log(`Fetched ${allCatsData.length} cat(s) from Firestore.`);
        }
        return allCatsData;
    } catch (error) {
        console.error("Error fetching cats data from Firestore:", error);
        return [];
    }
}

async function downloadImage(url, localPath) {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            timeout: 15000 // 15 seconds timeout
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


async function downloadAndUpdateThumbnails(catsData) {
    console.log(`Ensuring local thumbnail directory exists: '${LOCAL_THUMBNAILS_DIR}'`);
    await fsPromises.mkdir(LOCAL_THUMBNAILS_DIR, { recursive: true });

    const updatedCatsList = [];

    for (const cat of catsData) {
        const catId = cat.id;
        const originalThumbnailUrl = cat.thumbnailUrl;
        const catName = cat.name || `ID: ${catId}`;
        let updatedCatEntry = { ...cat };

        if (!catId) {
            console.warn(`WARNING: Cat data missing 'id'. Skipping image processing for: ${catName}`);
            updatedCatEntry.thumbnailUrl = '';
            updatedCatsList.push(updatedCatEntry);
            continue;
        }

        if (!originalThumbnailUrl || !originalThumbnailUrl.startsWith('http')) {
            console.warn(`WARNING: Cat '${catName}' has an invalid or missing 'thumbnailUrl': '${originalThumbnailUrl}'. Skipping download.`);
            updatedCatEntry.thumbnailUrl = ''; 
            updatedCatsList.push(updatedCatEntry);
            continue;
        }

        try {
            console.log(`Processing cat: '${catName}'. Original URL: '${originalThumbnailUrl}'`);
            
            let fileExtension = '';
            try {
                fileExtension = path.extname(new URL(originalThumbnailUrl).pathname);
            } catch (urlError) {
                console.warn(`Could not parse URL to get extension for ${originalThumbnailUrl}. Defaulting extension.`);
            }
            
            if (!fileExtension || fileExtension.length > 5 || fileExtension.length < 3) { 
                fileExtension = '.jpg'; // Default extension
            }
            
            const localImageFilename = `${catId}${fileExtension}`;
            const localImageFullPath = path.join(LOCAL_THUMBNAILS_DIR, localImageFilename);
            
            await downloadImage(originalThumbnailUrl, localImageFullPath);
            
            // Refactored path generation
            const relativePath = path.relative(path.join(PROJECT_ROOT, 'public'), localImageFullPath);
            const standardizedPath = relativePath.replace(/\\/g, '/'); // Ensure forward slashes for web
            const webAccessiblePath = `/${standardizedPath}`;
            
            console.log(`Successfully downloaded and saved to: '${localImageFullPath}'. Web path: '${webAccessiblePath}'`);
            updatedCatEntry.thumbnailUrl = webAccessiblePath;

        } catch (error) {
            console.error(`Failed to download image for cat '${catName}'.`);
            updatedCatEntry.thumbnailUrl = ''; 
        }
        updatedCatsList.push(updatedCatEntry);
    }
    return updatedCatsList;
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

async function main() {
    console.log("--- Starting Static Asset Fetching Process (Node.js) ---");
    
    const db = await initializeFirebase();
    if (!db) {
        console.error("Firebase initialization failed. Exiting.");
        process.exit(1); // Exit if Firebase can't be initialized
    }

    const rawCatsData = await fetchCatsData(db);
    if (rawCatsData.length === 0 && !(await db.collection(CATS_COLLECTION).limit(1).get()).empty) {
        // If fetchCatsData returns empty but the collection is not actually empty, it implies an error during fetch
        console.log("No data returned from fetchCatsData, possibly due to an error during fetch. Exiting.");
        process.exit(1);
    } else if (rawCatsData.length === 0) {
        console.log("No cat data found in Firestore. Process will complete, but no images will be downloaded.");
    }

    const updatedCatsData = await downloadAndUpdateThumbnails(rawCatsData);
    await saveStaticDataJson(updatedCatsData);
    console.log("--- Static Asset Fetching Process (Node.js) Completed ---");
}

if (require.main === module) {
    main().catch(error => {
        console.error("Unhandled error in main execution:", error);
        process.exit(1);
    });
}

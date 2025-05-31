const admin = require('firebase-admin');
const { google } = require('googleapis');

async function updateCatData() {
  try {
    // Firebase Authentication
    // Use the same service account key file as the Python script
    const serviceAccount = require('../google_svs_account.json');

    // Initialize Firebase App
    // Use the same options as the Python script
    let firebaseApp;
    try {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        options: {
            projectId: 'mountaincats-61543',
            databaseURL: 'mountaincats-61543.firebaseio.com',
            storageBucket: 'mountaincats-61543.appspot.com',
            serviceAccountId: '104983902960398669570'
        }
      }, 'mtcat-app'); // Use the same app name
    } catch (error) {
        // If the app is already initialized, get it
        if (error.code === 'app/duplicate-app') {
            firebaseApp = admin.app('mtcat-app');
        } else {
            throw error; // Re-throw other errors
        }
    }

    const db = admin.firestore(firebaseApp);

    // Google Sheets Authentication
    // Use the same service account credentials file as the Python script
    const credentials = require('../google_svs_account.json'); // Assuming the same file is used
    const scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      scopes
    );

    const sheets = google.sheets({ version: 'v4', auth });

    // Spreadsheet ID and Sheet Range - Use the same as the Python script
    const spreadsheetId = '1W__SbgDNa_avKW27V-3r0-Ez1PTGRGOrhaq0oq5xHyc';
    const sheetRange = 'cat_metadata!A1:Z';

    // Get spreadsheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetRange,
    });

    const values = response.data.values;

    if (!values || values.length === 0) {
      console.log('No data found in the sheet.');
      return;
    }

    // Assuming the first row is headers
    const headers = values[0];
    const rows = values.slice(1); // Skip header row

    // Convert rows to an array of objects (similar to pandas DataFrame rows to dict)
    const dataToImport = rows.map(row => {
        const data = {};
        headers.forEach((header, colIndex) => {
            // Ensure header exists and row has value at colIndex
            if (header !== undefined && row.length > colIndex) {
                 data[header] = row[colIndex];
            }
        });
        return data;
    });

    // Write to Firestore using batch writes for efficiency
    const batch = db.batch();
    const collectionRef = db.collection('cats'); // Use the same collection name 'cats'

    dataToImport.forEach((data) => {
      // Use the 'id' field from the data as the document ID, converting it to a string
      if (data.id !== undefined) {
        const docRef = collectionRef.doc(String(data.id));
        batch.set(docRef, data);
      } else {
        console.warn('Skipping row due to missing "id" field:', data);
      }
    });

    await batch.commit();

    console.log("Data successfully written to Firestore!");

  } catch (err) {
    console.error('Error updating data:', err);
  }
}

// Run the update function
updateCatData();

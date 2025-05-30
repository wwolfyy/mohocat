# %% imports
import pandas as pd
from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials
import firebase_admin
from firebase_admin import credentials, storage
from firebase_admin import firestore

# %%
def upload_gs_2_firestore(Credentials, build, credentials, firebase_admin, firestore, pd):
    # Firebase Authentication
    cred = credentials.Certificate('./google_svs_account.json')  # Replace with your service account key file
    # initialize Firebase App
    try:
        firebase_app = firebase_admin.initialize_app(
            credential=cred,
            options={
                'projectId': 'mountaincats-61543',
                'databaseURL': 'mountaincats-61543.firebaseio.com',
                'storageBucket': 'mountaincats-61543.appspot.com',
                'serviceAccountId': '104983902960398669570'
                # databaseAuthVariableOverride
                # httpTimeout
            },
            name='mtcat-app'  # Replace with your app name
        )
    except ValueError:
        firebase_app = firebase_admin.get_app(name='mtcat-app')
    # if app has already been initialized, get the app
    # firebase_admin.get_app('mountaincats')

    db = firestore.client(app=firebase_app)

    # get the storage bucket
    # bucket = storage.bucket()

    # Google Sheets Authentication
    scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly']
    creds = Credentials.from_service_account_file('./google_svs_account.json', scopes=scopes)
    service = build('sheets', 'v4', credentials=creds)

    # Spreadsheet ID
    spreadsheet_id = '1W__SbgDNa_avKW27V-3r0-Ez1PTGRGOrhaq0oq5xHyc'  

    # Get spreadsheet data
    sheet_range = 'cat_metadata!A1:Z'  # Replace with your sheet name and range
    result = service.spreadsheets().values().get(spreadsheetId=spreadsheet_id, range=sheet_range).execute()
    values = result.get('values', [])

    # Create Pandas DataFrame
    df = pd.DataFrame(values[1:], columns=values[0])  # Skip header row

    # Write to Firestore
    for index, row in df.iterrows():
        data = row.to_dict()
        db.collection('cats').document(str(data['id'])).set(data)

    print("Data successfully written to Firestore!")
    return (
        cred,
        creds,
        data,
        db,
        df,
        index,
        result,
        row,
        scopes,
        service,
        sheet_range,
        spreadsheet_id,
        values,
    )

# %% main function
if __name__ == '__main__':
    upload_gs_2_firestore(Credentials, build, credentials, firebase_admin, firestore, pd)
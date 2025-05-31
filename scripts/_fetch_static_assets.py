import firebase_admin
from firebase_admin import credentials, firestore
import os
import requests
import json

# Configuration
SERVICE_ACCOUNT_KEY_PATH = './google_svs_account.json'  # Path to your Firebase service account key
FIREBASE_PROJECT_ID = 'mountaincats-61543'  # Your Firebase Project ID
# FIREBASE_STORAGE_BUCKET = 'mountaincats-61543.appspot.com' # Not strictly needed if only using Firestore and public URLs
CATS_COLLECTION = 'cats'
LOCAL_THUMBNAILS_DIR = 'public/images/thumbnails'
STATIC_DATA_JSON_PATH = 'src/lib/cats-static-data.json'
# ---

def initialize_firebase():
    """Initializes the Firebase Admin SDK."""
    if not os.path.exists(SERVICE_ACCOUNT_KEY_PATH):
        print(f"ERROR: Service account key not found at {SERVICE_ACCOUNT_KEY_PATH}.")
        print("Please ensure the path is correct and the file exists.")
        return None

    cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
    try:
        app = firebase_admin.initialize_app(
            credential=cred,
            options={'projectId': FIREBASE_PROJECT_ID},
            name='fetchStaticAssetsScript' # Unique name for this app instance
        )
        print(f"Firebase App '{app.name}' initialized successfully for project '{FIREBASE_PROJECT_ID}'.")
    except ValueError: # App already initialized
        app = firebase_admin.get_app(name='fetchStaticAssetsScript')
        print(f"Using existing Firebase App '{app.name}'.")
    return firestore.client(app=app)

def fetch_cats_data(db):
    """Fetches all documents from the cats collection in Firestore."""
    if not db:
        return []
    print(f"Fetching cat data from Firestore collection: '{CATS_COLLECTION}'...")
    cats_ref = db.collection(CATS_COLLECTION)
    docs = cats_ref.stream()
    
    all_cats_data = []
    for doc in docs:
        cat_data = doc.to_dict()
        cat_data['id'] = doc.id  # Ensure the document ID is included
        all_cats_data.append(cat_data)
    
    if not all_cats_data:
        print("No cat data found in Firestore.")
    else:
        print(f"Fetched {len(all_cats_data)} cat(s) from Firestore.")
    return all_cats_data

def download_and_update_thumbnails(cats_data):
    """
    Downloads thumbnails for each cat and updates the thumbnailUrl to a local path.
    Returns a new list with updated cat data.
    """
    os.makedirs(LOCAL_THUMBNAILS_DIR, exist_ok=True)
    print(f"Ensured local thumbnail directory exists: '{LOCAL_THUMBNAILS_DIR}'")

    updated_cats_list = []
    for cat in cats_data:
        cat_id = cat.get('id')
        original_thumbnail_url = cat.get('thumbnailUrl')
        cat_name = cat.get('name', f"ID: {cat_id}") # For logging

        updated_cat_entry = cat.copy() # Start with a copy

        if not cat_id:
            print(f"WARNING: Cat data missing 'id'. Skipping image processing for: {cat_name}")
            updated_cat_entry['thumbnailUrl'] = '' # Or some placeholder for missing ID
            updated_cats_list.append(updated_cat_entry)
            continue
        
        if not original_thumbnail_url or not original_thumbnail_url.startswith('http'):
            print(f"WARNING: Cat '{cat_name}' has an invalid or missing 'thumbnailUrl': '{original_thumbnail_url}'. Skipping download.")
            updated_cat_entry['thumbnailUrl'] = '' # Or keep original if it's a non-HTTP placeholder
            updated_cats_list.append(updated_cat_entry)
            continue

        try:
            print(f"Processing cat: '{cat_name}'. Original URL: '{original_thumbnail_url}'")
            response = requests.get(original_thumbnail_url, stream=True, timeout=15)
            response.raise_for_status()  # Raises HTTPError for bad responses (4XX or 5XX)

            # Determine file extension, default to .jpg
            file_extension = os.path.splitext(original_thumbnail_url.split('?')[0])[1]
            if not file_extension or len(file_extension) > 5 or len(file_extension) < 3: # Basic check
                file_extension = '.jpg'
            
            local_image_filename = f"{cat_id}{file_extension}"
            local_image_full_path = os.path.join(LOCAL_THUMBNAILS_DIR, local_image_filename)
            
            with open(local_image_full_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            web_accessible_path = f"/{LOCAL_THUMBNAILS_DIR}/{local_image_filename}"
            print(f"Successfully downloaded and saved to: '{local_image_full_path}'. Web path: '{web_accessible_path}'")
            updated_cat_entry['thumbnailUrl'] = web_accessible_path

        except requests.exceptions.RequestException as e:
            print(f"ERROR: Downloading image for cat '{cat_name}' from {original_thumbnail_url}: {e}")
            updated_cat_entry['thumbnailUrl'] = '' # Or a placeholder indicating download failure
        except Exception as e:
            print(f"ERROR: An unexpected error occurred processing cat '{cat_name}': {e}")
            updated_cat_entry['thumbnailUrl'] = '' # Or a placeholder

        updated_cats_list.append(updated_cat_entry)
    return updated_cats_list

def save_static_data_json(cats_data):
    """Saves the list of cat data to a JSON file."""
    print(f"Saving updated cat data to JSON: '{STATIC_DATA_JSON_PATH}'...")
    try:
        with open(STATIC_DATA_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(cats_data, f, ensure_ascii=False, indent=2)
        print(f"Successfully created static data JSON: '{STATIC_DATA_JSON_PATH}'")
    except IOError as e:
        print(f"ERROR: Could not write static data JSON to '{STATIC_DATA_JSON_PATH}': {e}")

def main():
    print("--- Starting Static Asset Fetching Process ---")
    db = initialize_firebase()
    if not db:
        print("Firebase initialization failed. Exiting.")
        return

    raw_cats_data = fetch_cats_data(db)
    if not raw_cats_data:
        print("No data fetched. Exiting.")
        return

    updated_cats_data = download_and_update_thumbnails(raw_cats_data)
    save_static_data_json(updated_cats_data)
    print("--- Static Asset Fetching Process Completed ---")

if __name__ == '__main__':
    # Ensure required libraries are installed:
    # pip install firebase-admin requests
    main()

# Scripts

This directory contains utility scripts for various project operations, organized by purpose:

## Subdirectories

- **`migration/`** - Database and data migration scripts
  - `add_missing_location_field.js` - Adds location field to existing records
  - `add_updated_field.js` - Adds updated timestamp field
  - `add_updated_field_admin.js` - Admin version of updated field addition
  - `migrate-cats-to-firestore.js` - Migrates cat data to Firestore
  - `migrate-created-time.js` - Migrates created time fields
  - `import-media-to-firestore.js` - Imports media files to Firestore
  - `remove_needsTagging_field.js` - Removes needsTagging field
  - `remove_recordingDate_field.js` - Removes recordingDate field
  - `README-migration.md` - Migration scripts documentation

- **`maintenance/`** - Regular maintenance and data management scripts
  - `cleanup_firestore_cat_videos.js` - Cleans up video data in Firestore
  - `data_updater.js` - General data update utility
  - `_data_updater.py` - Python version of data updater
  - `enforce_youtube_readonly_fields.js` - Enforces YouTube readonly constraints
  - `examine_video_structure.js` - Analyzes video data structure
  - `fetch-static-assets.js` - Fetches static assets
  - `_fetch_static_assets.py` - Python version of asset fetcher
  - `firebase_ops.js` - General Firebase operations

- **`auth/`** - Authentication and authorization scripts
  - `exchange_code.js` - OAuth code exchange
  - `generate_refresh_token.js` - Generates refresh tokens
  - `generate_youtube_refresh_token.js` - YouTube-specific refresh token generation
  - `get_auth_url.js` - Generates authentication URLs
  - `simple_auth.js` - Simple authentication utility

- **`deployment/`** - Deployment and build scripts (empty - for future use)

## Usage

Each script is self-contained and includes its own documentation. Run scripts from the project root directory to ensure proper path resolution for configuration files and dependencies.

**Example:**
```bash
node scripts/maintenance/data_updater.js
node scripts/auth/generate_refresh_token.js
```

## Notes

- Scripts reference configuration files in `config/` directory
- Migration scripts should be run carefully and in the correct order
- Authentication scripts require proper environment variables to be set

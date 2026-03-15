# Scripts

This directory contains utility scripts for various project operations, organized by purpose:

## Subdirectories

- **`migration/`** - Database and data migration scripts
  - **Static Data Cloud Storage Migration (NEW)**:
    - `export_all_to_cloud_storage.js` - ✅ Master export script for all static data
    - `export_cats_to_static.js` - ✅ Export cats data to Cloud Storage
    - `export_points_to_static.js` - ✅ Export points data to Cloud Storage
    - `export_feeding_spots_to_static.js` - ✅ Export feeding spots to Cloud Storage
    - `update_all_static_data.js` - ✅ Batch update all static data
    - `README_cloud_storage_migration.md` - ✅ Complete migration documentation
  - **Legacy Database Migrations**:
    - `add_missing_location_field.js` - Adds location field to existing records
    - `add_updated_field.js` - Adds updated timestamp field
    - `add_updated_field_admin.js` - Admin version of updated field addition
    - `migrate-cats-to-firestore.js` - Migrates cat data to Firestore
    - `migrate-created-time.js` - Migrates created time fields
    - `import-media-to-firestore.js` - Imports media files to Firestore
    - `remove_needsTagging_field.js` - Removes needsTagging field
    - `remove_recordingDate_field.js` - Removes recordingDate field
    - `README-migration.md` - Legacy migration scripts documentation

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

## 🚀 **Key Features**

### **Static Data Management**

The platform now uses Google Cloud Storage for all static data with significant performance benefits:

- **Build Integration**: `npm run build` automatically exports data to Cloud Storage
- **Admin Control**: Web interface buttons for instant data refresh
- **Performance**: ~40% faster page loads with CDN caching
- **Cost Optimization**: ~90% reduction in Firebase database reads

### **Available Scripts**

#### **Static Data Operations** (Recommended)

```bash
npm run update:static-data    # Update all static data
npm run update:cats          # Update cats data only
npm run update:points        # Update points data only
npm run update:feeding-spots # Update feeding spots only
```

#### **Direct Script Execution**

```bash
node scripts/migration/export_all_to_cloud_storage.js    # Export all to Cloud Storage
node scripts/migration/export_cats_to_static.js         # Export cats to Cloud Storage
node scripts/migration/update_all_static_data.js        # Batch update with progress
```

## Usage

Each script is self-contained and includes robust error handling. Scripts automatically detect and use the correct Firebase service account path for different execution contexts (terminal, Next.js API routes, etc.).

**Example:**

```bash
# Static data updates (recommended)
npm run update:static-data

# Legacy maintenance
node scripts/maintenance/data_updater.js
node scripts/auth/generate_refresh_token.js
```

## Notes

- Scripts reference configuration files in `config/` directory
- Migration scripts should be run carefully and in the correct order
- Authentication scripts require proper environment variables to be set

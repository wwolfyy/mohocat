# Scripts

This directory contains utility scripts for various project operations, organized by purpose:

## Subdirectories

- **`migration/`** - Database and data migration scripts
  - **Legacy Database Migrations**:
    - `add_missing_location_field.js` - Adds location field to existing records
    - `add_updated_field.js` - Adds updated timestamp field
    - `add_updated_field_admin.js` - Admin version of updated field addition
    - `migrate-created-time.js` - Migrates created time fields
    - `import-media-to-firestore.js` - Imports media files to Firestore
    - `remove_needsTagging_field.js` - Removes needsTagging field
    - `remove_recordingDate_field.js` - Removes recordingDate field
    - `README-migration.md` - Legacy migration scripts documentation

- **`maintenance/`** - Regular maintenance and data management scripts
  - `cleanup_firestore_cat_videos.js` - Cleans up video data in Firestore
  - `enforce_youtube_readonly_fields.js` - Enforces YouTube readonly constraints
  - `examine_video_structure.js` - Analyzes video data structure
  - `fetch-static-assets.js` - Fetches static assets
  - `_fetch_static_assets.py` - Python version of asset fetcher
  - `firebase_ops.js` - General Firebase operations

- **`auth/`** - _Removed 2026-07-26._ These were the manual YouTube OAuth workflow
  (generate a refresh token on the command line, paste it into `.env`, redeploy). The
  admin panel's 「토큰 갱신」 button now runs the whole flow and stores the token in Firestore
  (`admin_config/youtube_auth`) — there is no `YOUTUBE_REFRESH_TOKEN` env var any more.
  See `src/lib/youtube/credentials.ts`.

- **`deployment/`** - Deployment and build scripts (empty - for future use)

## Usage

Each script is self-contained and includes robust error handling. Scripts automatically detect and use the correct Firebase service account path for different execution contexts (terminal, Next.js API routes, etc.).

**Example:**

```bash
# Build-time asset fetch
npm run fetch:assets

# Legacy maintenance
node scripts/auth/generate_refresh_token.js
```

## Notes

- Scripts reference configuration files in `config/` directory
- Migration scripts should be run carefully and in the correct order
- Authentication scripts require proper environment variables to be set

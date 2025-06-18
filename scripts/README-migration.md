# Migration Script for createdTime Field

This script adds an empty `createdTime` field to all existing documents in the following Firestore collections:
- `images` (used by image tagging interface)
- `cat_images` (if it exists)
- `cat_videos` (used by video tagging interface)

## Prerequisites

1. Make sure the Firebase service account file exists:
   `mountaincats-61543-769df223a745.json` in the project root directory

2. Install dependencies if not already done:
   ```bash
   npm install firebase-admin
   ```

## Running the Migration

**Option 1: JavaScript version (recommended)**
```bash
node scripts/migrate-created-time.js
```

**Option 2: TypeScript version (requires ts-node)**
```bash
npx ts-node scripts/migrate-created-time-new.ts
```

## What the Migration Does

1. **Checks each document**: The script examines every document in the target collections
2. **Skips existing**: If a document already has a `createdTime` field, it's skipped
3. **Adds empty field**: Sets `createdTime` to `null` for manual entry later
4. **Provides statistics**: Shows how many documents were processed and updated

## Migration Logic

- **For all documents**: Creates an empty `createdTime` field set to `null`
- **Safe operation**: Only adds the field if it doesn't already exist
- **No data loss**: Preserves all existing data
- **Manual entry**: Allows admins to manually set creation timestamps later

## After Migration

Once the migration is complete:

1. The image tagging interface (`/admin/tag-images`) will show "Not set" for empty `createdTime` fields
2. The video tagging interface (`/admin/tag-videos`) will only display `createdTime` when it has a value
3. Both interfaces are ready for manual entry of creation timestamps

## Example Output

```
🚀 Starting createdTime field migration...
⏰ Started at: 2025-06-19T10:30:00.000Z
🔄 Starting migration for images collection...
📊 Found 25 documents in images
✅ Added empty createdTime field to img_001
✅ Added empty createdTime field to img_002
...
✨ Completed migration for images

📈 Migration Summary:
==================================================
📸 Images processed: 25
📸 Images updated: 25
🎥 Videos processed: 15
🎥 Videos updated: 15
❌ Errors: 0

✅ Migration completed successfully!
⏰ Finished at: 2025-06-19T10:30:15.000Z
```

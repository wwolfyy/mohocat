# Feeding Spots Field Standardization Migration

## Overview
This migration standardizes the field names in the `feeding_spots` collection to eliminate confusion between `last_attended` and `last_attended_at`.

## What it does
- Ensures all documents use `last_attended` as the field name
- Removes any `last_attended_at` fields from existing documents
- Preserves the most recent timestamp if both fields exist
- Provides detailed logging of all changes made

## How to run
```bash
cd scripts/migration
node standardize_feeding_spots_fields.js
```

## Result
After running this migration:
- All feeding spot documents will use `last_attended` consistently
- No more confusion between field names
- Services will work reliably without checking multiple field names

## Safety
- The script performs updates document by document
- Detailed logging shows exactly what changes are made
- No data is lost - if both fields exist, the more recent timestamp is preserved

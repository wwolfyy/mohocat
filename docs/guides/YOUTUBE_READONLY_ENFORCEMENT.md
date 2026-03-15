# YouTube Read-Only Fields Enforcement

## Overview

This document describes the data update logic for the `cat_videos` collection, specifically how YouTube serves as the single source of truth for certain fields, making editing in Firebase impossible.

## YouTube Read-Only Fields

The following fields are **ALWAYS** sourced from YouTube and **CANNOT be edited** in Firebase:

### 1. `tags` (Array of strings)

- **Source**: YouTube video tags set in YouTube Studio
- **Update Method**: Only editable in YouTube Studio, then refresh metadata via API
- **Firebase Behavior**: Any manual edits in Firebase will be overwritten during metadata refresh

### 2. `videoUrl` (String)

- **Source**: Generated from YouTube video ID
- **Format**: `https://www.youtube.com/watch?v={videoId}`
- **Update Method**: Automatic when video is published on YouTube
- **Firebase Behavior**: Cannot be edited - always reflects current YouTube video URL

### 3. `createdTime` (Date/Timestamp)

- **Source**: YouTube `recordingDate` from video metadata
- **Update Method**: Set in YouTube Studio via recording date
- **Firebase Behavior**: Always mapped from YouTube's `recordingDate` field to `createdTime`
- **Note**: Can be `null` if no recording date is set in YouTube

### 4. `location` (Object with coordinates)

- **Source**: YouTube video location data (GPS coordinates)
- **Structure**: `{ latitude: number, longitude: number, altitude?: number }`
- **Update Method**: Set during video upload or in YouTube Studio
- **Firebase Behavior**: Always reflects YouTube location data, `null` if not available

## Enforcement Mechanisms

### 1. API Level Enforcement

- **File**: `src/app/api/refresh-video-metadata/route.ts`
- **Behavior**: Always overwrites read-only fields from YouTube, ignoring any Firebase edits
- **Logging**: Logs when read-only fields are being enforced from YouTube

### 2. Admin UI Restrictions

- **File**: `src/app/admin/tag-videos-new/page.tsx`
- **Behavior**: Read-only fields are disabled in forms with explanatory messages
- **Tags Field**: Shows "Tags are managed in YouTube Studio" message

### 3. Service Layer Protection

- **File**: `src/services/media-albums.ts`
- **Function**: `updateVideoTags` is deprecated and returns false
- **Behavior**: Prevents direct tag updates with warning message

### 4. Database Security Rules

- **File**: `firestore.rules`
- **Enforcement**: Firestore rules prevent updates to read-only fields at database level
- **Behavior**: Database rejects any attempts to modify protected fields

### 5. Validation Scripts

- **File**: `scripts/enforce_youtube_readonly_fields.js`
- **Features**:
  - Audits collection for compliance
  - Validates update operations
  - Provides middleware for API protection
  - Generates security rules

## Editable Fields in Firebase

These fields can be freely edited in the admin UI and are not affected by YouTube metadata sync:

- `description` (Firestore-specific description, can differ from YouTube)
- `catName` (Custom cat identification)
- `needsTagging` (Internal flag)
- `autoTagged` (Internal flag)
- `uploadedBy` (Who added to our system)
- `uploadDate` (When added to our system)
- `lastMetadataRefresh` (Tracking timestamp)

## Data Flow

### New Video Upload

1. Video uploaded to YouTube via `upload-youtube` API
2. Initial Firestore record created with YouTube-sourced data
3. Subsequent metadata refreshes ensure YouTube remains source of truth

### Metadata Refresh Process

1. Call `refresh-video-metadata` API with video IDs
2. Fetch fresh data from YouTube API (including `recordingDetails` for location)
3. **Force overwrite** all read-only fields in Firebase
4. Preserve Firebase-only fields (description, catName, etc.)
5. Log enforcement actions

### Admin UI Updates

1. Admin can only edit Firebase-only fields
2. Read-only fields are disabled with explanatory text
3. Changes to read-only fields are rejected client-side

## Scripts and Tools

### Audit Compliance

```bash
node scripts/enforce_youtube_readonly_fields.js
```

### Fix Missing Fields

```bash
node scripts/add_missing_location_field.js
```

### Examine Structure

```bash
node scripts/examine_video_structure.js
```

## Warning Messages

When users attempt to edit read-only fields:

- **Tags**: "Tags are managed in YouTube Studio. Edit tags there and refresh metadata."
- **Video URL**: Field is not editable in UI
- **Created Time**: Field is not editable in UI
- **Location**: Field is not editable in UI

## Technical Implementation

### Refresh API Key Features

- Always includes `recordingDetails` in YouTube API calls for location data
- Explicitly overwrites read-only fields with comments explaining enforcement
- Logs YouTube-sourced data for verification
- Updates `lastMetadataRefresh` timestamp

### Security Rule Example

```javascript
allow update: if
  !('tags' in request.resource.data.diff(resource.data).affectedKeys()) &&
  !('videoUrl' in request.resource.data.diff(resource.data).affectedKeys()) &&
  !('createdTime' in request.resource.data.diff(resource.data).affectedKeys()) &&
  !('location' in request.resource.data.diff(resource.data).affectedKeys());
```

## Best Practices

1. **Edit YouTube Data in YouTube Studio**: Always edit tags, titles, descriptions, and location in YouTube Studio
2. **Refresh Metadata**: After editing in YouTube, call the refresh API to sync changes
3. **Use Firebase for Local Data**: Only use Firebase admin UI for app-specific fields
4. **Regular Audits**: Run enforcement scripts to ensure compliance
5. **Monitor Logs**: Check API logs to verify read-only field enforcement

## Troubleshooting

### Q: My tag edits in Firebase keep getting overwritten

**A**: Tags are YouTube-only. Edit them in YouTube Studio and refresh metadata.

### Q: Video location is always null

**A**: YouTube videos may not have location data. Set location during upload or in YouTube Studio.

### Q: Changes aren't appearing after YouTube edits

**A**: Call the `refresh-video-metadata` API to sync the latest YouTube data.

This system ensures YouTube remains the authoritative source for video metadata while allowing Firebase to store additional application-specific data.

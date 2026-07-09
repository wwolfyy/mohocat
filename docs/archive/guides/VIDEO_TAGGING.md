# Video Tagging System

## Overview

The video tagging system allows administrators to tag YouTube videos using their thumbnails. This is particularly useful when you don't have actual video files stored in Firebase Storage but want to organize and tag videos from your YouTube channel.

## How It Works

### 1. YouTube Integration

- Fetches videos from your YouTube channel using the YouTube Data API v3
- Can also search for specific videos using keywords
- Downloads video metadata including titles, descriptions, thumbnails, and publish dates

### 2. Thumbnail-Based Tagging

- Uses YouTube's automatic thumbnail generation for visual identification
- Displays video thumbnails in a grid layout for easy browsing
- Allows clicking on thumbnails to select videos for tagging

### 3. Metadata Storage

- Stores video metadata in Firestore under the 'videos' collection
- Links YouTube video IDs to your tagging system
- Maintains tags, descriptions, and cat associations

## Features

### Video Management

- **Channel Videos**: Load all videos from your configured YouTube channel
- **Video Search**: Search for specific videos using keywords
- **Batch Operations**: Tag multiple videos at once
- **Status Tracking**: Visual indicators for tagged vs untagged videos

### Tagging Interface

- **Individual Tagging**: Click any video to open the tagging panel
- **Batch Tagging**: Select multiple videos and apply tags in bulk
- **Metadata Editing**: Edit titles, descriptions, and cat associations
- **Tag Management**: Add comma-separated tags for easy categorization

### Data Structure

Each video entry in Firestore contains:

```javascript
{
  videoId: "YouTube_Video_ID",
  youtubeId: "YouTube_Video_ID", // Backup field
  title: "Video Title",
  videoUrl: "https://www.youtube.com/watch?v=...",
  thumbnailUrl: "https://img.youtube.com/vi/.../maxresdefault.jpg",
  publishedAt: "2025-01-01T00:00:00Z",
  duration: "PT5M30S", // ISO 8601 duration format
  channelTitle: "Your Channel Name",
  tags: ["cat1", "cat2", "playing"],
  description: "Video description...",
  catName: "Primary cat featured",
  needsTagging: false,
  uploadDate: "2025-01-01T00:00:00Z",
  uploadedBy: "admin",
  videoType: "youtube",
  fileName: "video_id.mp4",
  storagePath: "https://www.youtube.com/watch?v=..." // YouTube URL
}
```

## Setup Requirements

### Environment Variables

Add these to your `.env.local` file:

```bash
NEXT_PUBLIC_YOUTUBE_API_KEY=your_youtube_api_key
NEXT_PUBLIC_YOUTUBE_CHANNEL_ID=your_channel_id
```

### YouTube API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the YouTube Data API v3
4. Create credentials (API Key)
5. Optionally restrict the API key to YouTube Data API

### Finding Your Channel ID

1. Go to your YouTube channel
2. Look at the URL - if it's `youtube.com/channel/UCxxxxx`, the ID is `UCxxxxx`
3. Or if it's a custom URL, use [this tool](https://commentpicker.com/youtube-channel-id.php)

## Usage Guide

### Basic Tagging Workflow

1. **Navigate** to Admin Panel → Tag Videos
2. **Load Videos** using either "Channel Videos" or "Search Videos"
3. **Select Video** by clicking on any thumbnail
4. **Add Tags** in the right panel (comma-separated)
5. **Set Cat Name** for the primary cat featured
6. **Save Tags** to store in Firestore

### Batch Tagging Workflow

1. **Select Videos** using the checkboxes on each video
2. **Enter Batch Tags** in the batch actions panel
3. **Optionally Add Description** that applies to all selected videos
4. **Save Batch Tags** to apply to all selected videos

### Search and Filter

- **Channel Videos**: Shows all videos from your configured channel
- **Search Videos**: Enter keywords to find specific videos
- **Status Filter**: Visual indicators show tagged vs untagged videos

## Integration with Existing System

### Cat Gallery Integration

Videos tagged with cat names will automatically appear in the cat profile system when you implement video display components.

### Media Albums

The video metadata integrates with the existing media album system in `src/services/media-albums.ts`.

### Admin Dashboard

Video statistics are already integrated into the admin dashboard showing total and tagged video counts.

## Benefits of This Approach

1. **No Storage Costs**: Videos remain on YouTube, no Firebase Storage usage
2. **Easy Management**: Visual thumbnail interface for quick identification
3. **Flexible Tagging**: Support for multiple tags per video
4. **Batch Operations**: Efficient bulk tagging workflows
5. **Search Integration**: Find videos by keywords without manual browsing
6. **Metadata Preservation**: Keeps original YouTube metadata while adding custom tags

## Future Enhancements

- **Auto-tagging**: Use AI to detect cats in video thumbnails
- **Playlist Integration**: Import videos from specific YouTube playlists
- **Advanced Search**: Filter by upload date, duration, or existing tags
- **Preview Integration**: Embed YouTube player for preview before tagging
- **Export Features**: Export tagged video lists for external use

## Troubleshooting

### Common Issues

1. **"YouTube API key not configured"**: Check your environment variables
2. **"Channel not found"**: Verify your YouTube channel ID
3. **"No videos found"**: Check if your channel has public videos
4. **API quota exceeded**: YouTube API has daily limits, try again later

### API Limits

- YouTube Data API v3 has a quota of 10,000 units per day by default
- Each video fetch uses approximately 1-3 units
- Consider requesting quota increase for heavy usage

### Performance Tips

- Use search functionality to find specific videos instead of loading entire channel
- Process videos in smaller batches for better performance
- Consider caching video data locally for frequently accessed videos

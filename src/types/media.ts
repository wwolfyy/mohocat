// Types for media album system

export interface CatImage {
  id: string;
  /** Owning mountain (multi-mountain plan §2.3). Optional until the M4 backfill
   *  stamps every existing doc; M5 tightens reads/rules around it. */
  mountainId?: string;
  imageUrl: string; // Firebase Storage URL (public URL)
  fileName: string; // Original file name in storage
  storagePath: string; // Full path in Firebase Storage (e.g., "images/photo.jpg")
  tags: string[]; // Array of cat names/tags
  uploadDate: Date;
  createdTime?: Date; // When the image was originally taken/created
  updated?: Date; // When the image metadata was last updated
  uploadedBy: string; // User ID or name
  description?: string; // Optional description
  location?: string; // Optional location where photo was taken
  thumbnailUrl?: string; // Optional smaller thumbnail version
  autoTagged?: boolean; // Flag indicating if tags were auto-generated
  fileSize?: number; // File size in bytes
  dimensions?: {
    // Image dimensions
    width: number;
    height: number;
  };
}

export interface CatVideo {
  id: string;
  /** Owning mountain — see `CatImage.mountainId`. */
  mountainId?: string;
  title?: string; // Video title (from YouTube or user-defined)
  videoUrl: string; // Firebase Storage URL or YouTube URL
  storagePath: string; // Full path in Firebase Storage
  tags: string[]; // Array of cat names/tags
  uploadDate: Date;
  createdTime?: Date; // When the video was originally created/recorded
  updated?: Date; // When the video metadata was last updated
  uploadedBy: string; // User ID or name
  description?: string; // Optional description
  location?: string; // Optional location where video was taken
  thumbnailUrl?: string; // Video thumbnail
  duration?: number | string; // Video length in seconds (number) or YouTube ISO 8601 format (string)
  autoTagged?: boolean; // Flag indicating if tags were auto-generated
  fileSize?: number; // File size in bytes
  videoType: 'storage' | 'youtube'; // Where the video is hosted
  youtubeId?: string; // YouTube video ID (for YouTube videos)
  allPlaylists?: Array<{ id: string; title: string }>; // All playlists the video belongs to
  /**
   * Whether the video still exists on YouTube, as of the last availability check
   * (`POST /api/admin/video-availability`, run by the 동기화 flow).
   *
   * `missing` = YouTube no longer has it; `private` = it exists but the public
   * cannot watch it. Both are hidden from public surfaces; only `missing` is
   * offered for deletion in the CMS. **Absent** on records checked before this
   * existed — treated as available, so nothing disappears until a check has run.
   */
  youtubeStatus?: 'available' | 'private' | 'missing';
  /** When `youtubeStatus` was last established. */
  youtubeCheckedAt?: Date;
}

export interface MediaCollection {
  images: CatImage[];
  videos: CatVideo[];
}

export interface TaggingSession {
  id: string;
  mediaIds: string[]; // IDs of media being tagged
  mediaType: 'image' | 'video';
  userId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'in_progress' | 'completed' | 'cancelled';
}

// Utility types for API responses
export interface MediaQueryOptions {
  catName?: string;
  tags?: string[];
  limit?: number;
  orderBy?: 'uploadDate' | 'fileName';
  orderDirection?: 'asc' | 'desc';
  /**
   * Include videos the public cannot watch — `youtubeStatus` `missing` (deleted
   * from YouTube) or `private`. Off by default so public surfaces never show a
   * dead tile; the CMS passes it, since removing such records is its job.
   */
  includeUnavailable?: boolean;
}

export interface MediaUploadRequest {
  file: File;
  tags: string[];
  description?: string;
  location?: string;
  uploadedBy: string;
}

export interface MediaUpdateRequest {
  id: string;
  tags?: string[];
  description?: string;
  location?: string;
}

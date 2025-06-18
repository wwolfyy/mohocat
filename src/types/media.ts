// Types for media album system

export interface CatImage {
  id: string;
  imageUrl: string;           // Firebase Storage URL (public URL)
  fileName: string;           // Original file name in storage
  storagePath: string;        // Full path in Firebase Storage (e.g., "images/photo.jpg")
  tags: string[];            // Array of cat names/tags
  uploadDate: Date;
  createdTime?: Date;         // When the image was originally taken/created
  uploadedBy: string;        // User ID or name
  description?: string;      // Optional description
  location?: string;         // Optional location where photo was taken
  thumbnailUrl?: string;     // Optional smaller thumbnail version
  needsTagging: boolean;     // Flag indicating if image needs manual tagging
  autoTagged?: boolean;      // Flag indicating if tags were auto-generated
  fileSize?: number;         // File size in bytes
  dimensions?: {             // Image dimensions
    width: number;
    height: number;
  };
}

export interface CatVideo {
  id: string;
  videoUrl: string;          // Firebase Storage URL or YouTube URL
  fileName: string;          // Original file name
  storagePath: string;       // Full path in Firebase Storage
  tags: string[];            // Array of cat names/tags
  uploadDate: Date;
  createdTime?: Date;        // When the video was originally created/recorded
  uploadedBy: string;        // User ID or name
  description?: string;      // Optional description
  location?: string;         // Optional location where video was taken
  thumbnailUrl?: string;     // Video thumbnail
  duration?: number;         // Video length in seconds
  needsTagging: boolean;     // Flag indicating if video needs manual tagging
  autoTagged?: boolean;      // Flag indicating if tags were auto-generated
  fileSize?: number;         // File size in bytes
  videoType: 'storage' | 'youtube'; // Where the video is hosted
}

export interface MediaCollection {
  images: CatImage[];
  videos: CatVideo[];
}

export interface TaggingSession {
  id: string;
  mediaIds: string[];        // IDs of media being tagged
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
  needsTagging?: boolean;
  limit?: number;
  orderBy?: 'uploadDate' | 'fileName';
  orderDirection?: 'asc' | 'desc';
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

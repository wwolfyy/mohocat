// Admin-specific types for the tagging interface

import { CatImage, CatVideo } from './media';
import { Cat } from './index';

export interface AdminUser {
  id: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'moderator';
  lastLogin?: Date;
  permissions: AdminPermission[];
}

export interface AdminPermission {
  resource: 'images' | 'videos' | 'cats' | 'users';
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

export interface TaggingBatch {
  id: string;
  mediaIds: string[];
  mediaType: 'image' | 'video';
  selectedTags: string[];
  adminUserId: string;
  createdAt: Date;
  completedAt?: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
}

export interface MediaWithTags extends CatImage {
  // Extension of CatImage with admin-specific fields
  lastTaggedBy?: string;
  lastTaggedAt?: Date;
  tagHistory?: TagChange[];
  isSelected?: boolean; // For batch operations
}

export interface VideoWithTags extends CatVideo {
  // Extension of CatVideo with admin-specific fields
  lastTaggedBy?: string;
  lastTaggedAt?: Date;
  tagHistory?: TagChange[];
  isSelected?: boolean; // For batch operations
}

export interface TagChange {
  timestamp: Date;
  userId: string;
  action: 'added' | 'removed' | 'modified';
  previousTags: string[];
  newTags: string[];
  reason?: string;
}

export interface AdminDashboardStats {
  totalImages: number;
  totalVideos: number;
  untaggedImages: number;
  untaggedVideos: number;
  totalCats: number;
  recentlyTagged: number;
  adminUsers: number;
}

export interface TagSuggestion {
  catName: string;
  confidence: number;
  reason: 'filename_match' | 'ai_detection' | 'location_based' | 'manual_suggestion';
}

// React-Admin resource interfaces
export interface AdminImageResource {
  id: string;
  imageUrl: string;
  fileName: string;
  tags: string[];
  uploadDate: string; // ISO string for React-Admin
  dimensions?: string; // e.g., "1920x1080"
  fileSize?: number;
}

export interface AdminVideoResource {
  id: string;
  videoUrl: string;
  fileName: string;
  tags: string[];
  uploadDate: string; // ISO string for React-Admin
  duration?: number;
  fileSize?: number;
  videoType: 'storage' | 'youtube';
}

export interface AdminCatResource {
  id: string;
  name: string;
  alt_name?: string;
  description?: string;
  thumbnailUrl: string;
  dwelling?: string;
  prev_dwelling?: string;
  status?: string;
}

// Filter and search interfaces
export interface MediaFilter {
  tags?: string[];
  uploadDateFrom?: Date;
  uploadDateTo?: Date;
  cats?: string[];
  fileType?: string[];
}

export interface AdminSettings {
  autoTaggingEnabled: boolean;
  batchSize: number;
  thumbnailQuality: 'low' | 'medium' | 'high';
  defaultTags: string[];
  tagSuggestions: boolean;
}

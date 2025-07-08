export interface Point {
  id: string;
  x: number;
  y: number;
  title: string;
  description?: string;
}

export interface Cat {
  id: string;
  name: string;
  alt_name?: string;
  description?: string;
  thumbnailUrl: string;
  dwelling?: string;
  prev_dwelling?: string;
  date_of_birth?: number;
  dob_certainty?: string;
  sex?: string;
  status?: string;
  character?: string;
  sickness?: string;
  parents?: string;
  offspring?: string;
  isNeutered?: boolean;
  note?: string;
}

// Post and Reply interfaces
export interface Post {
  id: string;
  title: string;
  message: string;
  thumbnailUrl?: string;
  mediaType?: 'video' | 'image';
  videoUrls?: string[];
  videoUrl?: string; // Keep for backward compatibility
  imageUrls?: string[];
  username: string;
  date: string;
  time: string;

  // Reply functionality
  parentId?: string;          // null for root posts, postId for replies
  replyCount?: number;        // cached count for performance
  depth?: number;             // 0 for root, 1+ for replies
  threadId?: string;          // root post ID for entire thread
  isReply?: boolean;          // true for replies, false/undefined for root posts
}
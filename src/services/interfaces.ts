/**
 * Service Layer Interfaces
 *
 * These interfaces define the contracts for all data services,
 * allowing different implementations (Firebase, mock, etc.) while
 * keeping components decoupled from specific backend implementations.
 */

import type { Cat, Point } from '../types';

// Cat-related service interface
export interface ICatService {
  getAllCats(): Promise<Cat[]>;
  getCatById(id: string): Promise<Cat | null>;
  getCatsByPointId(pointId: string): Promise<{ current: Cat[]; former: Cat[] }>;
  createCat(cat: Omit<Cat, 'id'>): Promise<Cat>;
  updateCat(id: string, updates: Partial<Cat>): Promise<Cat>;
  deleteCat(id: string): Promise<void>;
}

// Point-related service interface
export interface IPointService {
  getAllPoints(): Promise<Point[]>;
  getPointById(id: string): Promise<Point | null>;
  createPoint(point: Omit<Point, 'id'>): Promise<Point>;
  updatePoint(id: string, updates: Partial<Point>): Promise<Point>;
  deletePoint(id: string): Promise<void>;
}

// Post/Blog service interface
export interface IPostService {
  getAllPosts(): Promise<any[]>;
  getAllPostsIncludingReplies(): Promise<any[]>;
  getTopLevelPosts(): Promise<any[]>;
  getPostById(id: string): Promise<any | null>;
  createPost(post: any): Promise<any>;

  // Reply functionality
  getReplies(postId: string): Promise<any[]>;
  createReply(reply: any): Promise<any>;
  getPostWithReplies(postId: string): Promise<{ post: any; replies: any[] }>;
  updateReplyCount(postId: string): Promise<void>;

  // Delete functionality
  deletePost(postId: string): Promise<void>;
  deleteReply(replyId: string): Promise<void>;
}

// Contact service interface
export interface IContactService {
  createContact(contact: any): Promise<any>;
}

// Image service interface
export interface IImageService {
  // Existing read-only methods
  getAllImages(options?: any): Promise<any[]>;
  getCatImages(catName: string): Promise<any[]>;
  updateImageTags(imageId: string, tags: string[]): Promise<boolean>;
  addImageRecord(imageData: any): Promise<string | null>;

  // Extended admin methods
  getImageById(id: string): Promise<any | null>;
  createImage(imageData: any): Promise<string>;
  updateImage(id: string, updates: Partial<any>): Promise<void>;
  deleteImage(id: string): Promise<void>;
  batchUpdateImages(updates: Array<{id: string, updates: Partial<any>}>): Promise<void>;
  batchDeleteImages(ids: string[]): Promise<void>;
  syncWithStorage(): Promise<any[]>; // Returns StorageImage[] with metadata sync
}

// Video service interface
export interface IVideoService {
  // Existing read-only methods
  getAllVideos(options?: any): Promise<any[]>;
  getCatVideos(catName: string): Promise<any[]>;
  updateVideoTags(videoId: string, tags: string[]): Promise<boolean>;
  addVideoRecord(videoData: any): Promise<string | null>;

  // Extended admin methods
  getVideoById(id: string): Promise<any | null>;
  createVideo(videoData: any): Promise<string>;
  updateVideo(id: string, updates: Partial<any>): Promise<void>;
  deleteVideo(id: string): Promise<void>;
  batchUpdateVideos(updates: Array<{id: string, updates: Partial<any>}>): Promise<void>;
  batchDeleteVideos(ids: string[]): Promise<void>;
  syncWithYouTube?(): Promise<any[]>; // Optional YouTube sync
}

// Storage service interface
export interface IStorageService {
  uploadFile(file: File, path: string): Promise<string>;
  deleteFile(path: string): Promise<void>;
  getDownloadUrl(path: string): Promise<string>;
}

// Authentication service interface
export interface IAuthService {
  getCurrentUser(): any | null;
  signIn(email: string, password: string): Promise<any>;
  signOut(): Promise<void>;
  createUser(email: string, password: string): Promise<any>;
  onAuthStateChanged(callback: (user: any) => void): () => void;
}

// Feeding spots service interface
export interface IFeedingSpotsService {
  getAllFeedingSpots(): Promise<Array<{
    id: number;
    name: string;
    last_attended: string;
    last_attended_by: string;
  }>>;
}
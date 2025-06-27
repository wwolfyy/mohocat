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
  getPostById(id: string): Promise<any | null>;
  createPost(post: any): Promise<any>;
}

// Contact service interface
export interface IContactService {
  createContact(contact: any): Promise<any>;
}

// Image service interface
export interface IImageService {
  getAllImages(options?: any): Promise<any[]>;
  getCatImages(catName: string): Promise<any[]>;
  updateImageTags(imageId: string, tags: string[]): Promise<boolean>;
  addImageRecord(imageData: any): Promise<string | null>;
}

// Video service interface
export interface IVideoService {
  getAllVideos(options?: any): Promise<any[]>;
  getCatVideos(catName: string): Promise<any[]>;
  updateVideoTags(videoId: string, tags: string[]): Promise<boolean>;
  addVideoRecord(videoData: any): Promise<string | null>;
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
  onAuthStateChanged(callback: (user: any) => void): () => void;
}
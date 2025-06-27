/**
 * Service Factory - Central service provider for the application
 *
 * This file exports service getter functions that return the appropriate
 * service implementation based on the current mountain configuration.
 * This makes it easy to switch implementations or add new service types.
 */

import {
  ICatService,
  IPointService,
  IImageService,
  IVideoService,
  IPostService,
  IContactService,
  IStorageService,
  IAuthService
} from './interfaces';

import { FirebaseCatService } from './cat-service';
import { FirebasePointService } from './point-service';
import { FirebaseImageService } from './image-service';
import { FirebaseVideoService } from './video-service';
import { FirebasePostService } from './post-service';
import { FirebaseContactService } from './contact-service';
import { FirebaseStorageService } from './storage-service';
import { FirebaseAuthService } from './auth-service';

// Service instances - lazy initialized
let catServiceInstance: ICatService | null = null;
let pointServiceInstance: IPointService | null = null;
let imageServiceInstance: IImageService | null = null;
let videoServiceInstance: IVideoService | null = null;
let postServiceInstance: IPostService | null = null;
let contactServiceInstance: IContactService | null = null;
let storageServiceInstance: IStorageService | null = null;
let authServiceInstance: IAuthService | null = null;

/**
 * Get the cat service instance
 */
export function getCatService(): ICatService {
  if (!catServiceInstance) {
    catServiceInstance = new FirebaseCatService();
  }
  return catServiceInstance;
}

/**
 * Get the point service instance
 */
export function getPointService(): IPointService {
  if (!pointServiceInstance) {
    pointServiceInstance = new FirebasePointService();
  }
  return pointServiceInstance;
}

/**
 * Get the image service instance
 */
export function getImageService(): IImageService {
  if (!imageServiceInstance) {
    imageServiceInstance = new FirebaseImageService();
  }
  return imageServiceInstance;
}

/**
 * Get the video service instance
 */
export function getVideoService(): IVideoService {
  if (!videoServiceInstance) {
    videoServiceInstance = new FirebaseVideoService();
  }
  return videoServiceInstance;
}

/**
 * Get the post service instance
 */
export function getPostService(): IPostService {
  if (!postServiceInstance) {
    postServiceInstance = new FirebasePostService();
  }
  return postServiceInstance;
}

/**
 * Get the contact service instance
 */
export function getContactService(): IContactService {
  if (!contactServiceInstance) {
    contactServiceInstance = new FirebaseContactService();
  }
  return contactServiceInstance;
}

/**
 * Get the storage service instance
 */
export function getStorageService(): IStorageService {
  if (!storageServiceInstance) {
    storageServiceInstance = new FirebaseStorageService();
  }
  return storageServiceInstance;
}

/**
 * Get the auth service instance
 */
export function getAuthService(): IAuthService {
  if (!authServiceInstance) {
    authServiceInstance = new FirebaseAuthService();
  }
  return authServiceInstance;
}

// Export service interfaces for type checking
export type {
  ICatService,
  IPointService,
  IImageService,
  IVideoService,
  IPostService,
  IContactService,
  IStorageService,
  IAuthService
} from './interfaces';

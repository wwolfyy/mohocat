import {
  ICatService,
  IPointService,
  IImageService,
  IVideoService,
  IPostService,
  IContactService,
  IStorageService,
  IAuthService,
} from './interfaces';

import { FirebaseCatService } from './cat-service';
import { FirebasePointService } from './point-service';
import { FirebaseImageService } from './image-service';
import { FirebaseVideoService } from './video-service';
import { FirebasePostService } from './post-service';
import { FirebaseButlerTalkService } from './butler-talk-service';
import { FirebaseAnnouncementService } from './announcement-service';
import { FirebaseContactService } from './contact-service';
import { FirebaseStorageService } from './storage-service';
import { FirebaseAuthService } from './auth-service';
import { FirebaseFeedingSpotsService, IFeedingSpotsService } from './feeding-spots-service';
import { aboutContentService } from './about-content-service';
import { PermissionService } from './permission-service';

// Service instances - lazy initialized
let catServiceInstance: ICatService | null = null;
let pointServiceInstance: IPointService | null = null;
let imageServiceInstance: IImageService | null = null;
let videoServiceInstance: IVideoService | null = null;
let postServiceInstance: IPostService | null = null;
let butlerTalkServiceInstance: IPostService | null = null;
let announcementServiceInstance: IPostService | null = null;
let contactServiceInstance: IContactService | null = null;
let storageServiceInstance: IStorageService | null = null;
let authServiceInstance: IAuthService | null = null;
let feedingSpotsServiceInstance: IFeedingSpotsService | null = null;

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
 * Get the butler talk service instance
 */
export function getButlerTalkService(): IPostService {
  if (!butlerTalkServiceInstance) {
    butlerTalkServiceInstance = new FirebaseButlerTalkService();
  }
  return butlerTalkServiceInstance;
}

/**
 * Get the announcement service instance
 */
export function getAnnouncementService(): IPostService {
  if (!announcementServiceInstance) {
    announcementServiceInstance = new FirebaseAnnouncementService();
  }
  return announcementServiceInstance;
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

/**
 * Get the feeding spots service instance
 */
export function getFeedingSpotsService(): IFeedingSpotsService {
  if (!feedingSpotsServiceInstance) {
    feedingSpotsServiceInstance = new FirebaseFeedingSpotsService();
  }
  return feedingSpotsServiceInstance;
}

/**
 * Get the about content service instance
 */
export function getAboutContentService() {
  return aboutContentService;
}

// Export permission service getter
export function getPermissionService() {
  return new PermissionService();
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
  IAuthService,
  IFeedingSpotsService,
} from './interfaces';

// Also export the FeedingSpot type
export type { FeedingSpot } from './feeding-spots-service';

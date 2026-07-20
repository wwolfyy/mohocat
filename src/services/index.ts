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
import { FirebaseAdoptionService } from './adoption-service';
import { FirebaseContactService } from './contact-service';
import { FirebaseStorageService } from './storage-service';
import { FirebaseAuthService } from './auth-service';
import { FirebaseFeedingSpotsService, IFeedingSpotsService } from './feeding-spots-service';
import { AboutContentService } from './about-content-service';
import { PermissionService } from './permission-service';

/**
 * Per-tenant lazy singleton cache (multi-mountain plan §2.3).
 *
 * Content services are tenant-scoped: every getter takes the active mountain ID
 * (client components read it from `useMountain()`, server code from
 * `params.mountain` / `getRequestMountainId`) and caches one instance per
 * tenant. The instance stamps `mountainId` on its creates; M5 adds the scoped
 * reads. Identity/infra services (auth, storage, permissions) stay tenant-free.
 */
function perTenant<T>(create: (mountainId: string) => T): (mountainId: string) => T {
  const instances = new Map<string, T>();
  return (mountainId: string): T => {
    let instance = instances.get(mountainId);
    if (!instance) {
      instance = create(mountainId);
      instances.set(mountainId, instance);
    }
    return instance;
  };
}

// Tenant-free service instances - lazy initialized
let storageServiceInstance: IStorageService | null = null;
let authServiceInstance: IAuthService | null = null;

/**
 * Get the cat service instance for a mountain
 */
export const getCatService: (mountainId: string) => ICatService = perTenant(
  (mountainId) => new FirebaseCatService(mountainId)
);

/**
 * Get the point service instance for a mountain
 */
export const getPointService: (mountainId: string) => IPointService = perTenant(
  (mountainId) => new FirebasePointService(mountainId)
);

/**
 * Get the image service instance for a mountain
 */
export const getImageService: (mountainId: string) => IImageService = perTenant(
  (mountainId) => new FirebaseImageService(mountainId)
);

/**
 * Get the video service instance for a mountain
 */
export const getVideoService: (mountainId: string) => IVideoService = perTenant(
  (mountainId) => new FirebaseVideoService(mountainId)
);

/**
 * Get the post service instance for a mountain
 */
export const getPostService: (mountainId: string) => IPostService = perTenant(
  (mountainId) => new FirebasePostService(mountainId)
);

/**
 * Get the butler talk service instance for a mountain
 */
export const getButlerTalkService: (mountainId: string) => IPostService = perTenant(
  (mountainId) => new FirebaseButlerTalkService(mountainId)
);

/**
 * Get the announcement service instance for a mountain
 */
export const getAnnouncementService: (mountainId: string) => IPostService = perTenant(
  (mountainId) => new FirebaseAnnouncementService(mountainId)
);

/**
 * Get the adoption-promotion (입양홍보) service instance for a mountain
 */
export const getAdoptionService: (mountainId: string) => IPostService = perTenant(
  (mountainId) => new FirebaseAdoptionService(mountainId)
);

/**
 * Get the contact service instance for a mountain
 */
export const getContactService: (mountainId: string) => IContactService = perTenant(
  (mountainId) => new FirebaseContactService(mountainId)
);

/**
 * Get the feeding spots service instance for a mountain
 */
export const getFeedingSpotsService: (mountainId: string) => IFeedingSpotsService = perTenant(
  (mountainId) => new FirebaseFeedingSpotsService(mountainId)
);

/**
 * Get the about content service instance for a mountain
 */
export const getAboutContentService: (mountainId: string) => AboutContentService = perTenant(
  (mountainId) => new AboutContentService(mountainId)
);

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

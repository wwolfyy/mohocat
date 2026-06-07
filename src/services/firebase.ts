import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import {
  initializeAuth,
  getAuth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  inMemoryPersistence,
  Auth,
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, Analytics, isSupported } from 'firebase/analytics';
import { getFirebaseConfig } from '@/utils/config';

/**
 * Lazy Firebase initialization.
 *
 * Firebase is initialized on first access rather than at module import time.
 * This prevents a missing or not-yet-synced configuration from throwing during
 * module evaluation, which would otherwise crash the entire server component
 * render tree (page -> services -> firebase) for every route, even ones that
 * never touch Firebase. Errors are now contained to the code paths that
 * actually use Firebase, where they are already wrapped in try/catch.
 */

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;
let analyticsInstance: Analytics | null = null;

function getFirebaseApp(): FirebaseApp {
  if (appInstance) return appInstance;

  const firebaseConfig = getFirebaseConfig();

  if (!firebaseConfig || !firebaseConfig.apiKey) {
    throw new Error(
      'Firebase configuration is missing or invalid. Please check your environment variables.'
    );
  }

  appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  return appInstance;
}

function getAuthInstance(): Auth {
  if (authInstance) return authInstance;

  const app = getFirebaseApp();

  // Use initializeAuth to explicitly set persistence.
  // We use browserLocalPersistence (localStorage) because indexedDB was causing
  // massive 48s delays in some environments.
  try {
    if (typeof window === 'undefined') {
      // Server-side (SSR)
      authInstance = initializeAuth(app, {
        persistence: inMemoryPersistence,
      });
    } else {
      // Client-side
      authInstance = initializeAuth(app, {
        persistence: browserLocalPersistence,
        popupRedirectResolver: browserPopupRedirectResolver,
      });
    }
  } catch (e: any) {
    // If auth is already initialized (hot reload), get existing instance
    if (e.code === 'auth/already-initialized') {
      authInstance = getAuth(app);
    } else {
      throw e;
    }
  }

  return authInstance;
}

function getDbInstance(): Firestore {
  if (dbInstance) return dbInstance;
  dbInstance = getFirestore(getFirebaseApp());
  return dbInstance;
}

function getStorageInstance(): FirebaseStorage {
  if (storageInstance) return storageInstance;
  storageInstance = getStorage(getFirebaseApp());
  return storageInstance;
}

function getAnalyticsInstance(): Analytics | null {
  // Analytics is only available in the browser.
  if (typeof window === 'undefined') return null;
  if (analyticsInstance) return analyticsInstance;

  try {
    analyticsInstance = getAnalytics(getFirebaseApp());
  } catch (error) {
    console.error('Failed to initialize Firebase Analytics:', error);
    return null;
  }

  return analyticsInstance;
}

/**
 * Create a lazy proxy that forwards all property access / calls to the
 * underlying Firebase instance, which is initialized on first use. This keeps
 * the existing `import { db, storage, auth } from './firebase'` API intact
 * while deferring initialization until something is actually accessed.
 */
function createLazyProxy<T extends object>(resolver: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop, receiver) {
      const instance = resolver();
      const value = Reflect.get(instance as object, prop, receiver);
      return typeof value === 'function' ? value.bind(instance) : value;
    },
    set(_target, prop, value) {
      const instance = resolver();
      return Reflect.set(instance as object, prop, value);
    },
    has(_target, prop) {
      return Reflect.has(resolver() as object, prop);
    },
  });
}

const storage: FirebaseStorage = createLazyProxy(getStorageInstance);
const auth: Auth = createLazyProxy(getAuthInstance);
const db: Firestore = createLazyProxy(getDbInstance);

// Analytics can legitimately be null (e.g. on the server), so expose it via a
// getter rather than a proxy. Consumers already guard against a null value.
const analytics: Analytics | null =
  typeof window !== 'undefined' ? getAnalyticsInstance() : null;

export { storage, auth, db, analytics };

export async function uploadImageToFirebase(file: File): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    console.error('User is not authenticated. Cannot upload image:', file.name);
    throw new Error('User is not authenticated');
  }

  const storageRef = ref(storage, `images/${Date.now()}_${file.name}`);

  try {
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error uploading image to Firebase:', error);
    throw error;
  }
}

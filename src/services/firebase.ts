import { initializeApp, getApps, getApp, setLogLevel } from 'firebase/app';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  connectStorageEmulator,
} from 'firebase/storage';
import {
  initializeAuth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  indexedDBLocalPersistence,
  inMemoryPersistence,
  connectAuthEmulator,
  Auth,
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getFirebaseConfig } from '@/utils/config';

// E2E test mode only: route the client SDK to the local Firebase Emulator Suite.
// Strictly gated on an explicit `=== 'true'` flag that is NEVER set in the Vercel
// dashboard, so production behaviour is byte-identical. Inlined at build time by
// Next (it is a NEXT_PUBLIC_* var). See docs/planning/playwright-ci-*.
const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

// Get Firebase configuration from the centralized config system
const firebaseConfig = getFirebaseConfig();

if (!firebaseConfig || !firebaseConfig.apiKey) {
  throw new Error(
    'Firebase configuration is missing or invalid. Please check your environment variables.'
  );
}

// Enable verbose logging for debugging auth delays
// setLogLevel('debug'); // Disabled after fixing 48s delay

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const storage = getStorage(app);

// Use initializeAuth to explicitly set persistence.
// We use browserLocalPersistence (localStorage) because indexedDB was causing massive 48s delays in some environments.
// Use initializeAuth to explicitly set persistence.
// We use browserLocalPersistence (localStorage) because indexedDB was causing massive 48s delays in some environments.
const auth: Auth = (() => {
  try {
    if (typeof window === 'undefined') {
      // Server-side (SSR)
      return initializeAuth(app, {
        persistence: inMemoryPersistence,
        // No popupRedirectResolver needed on server
      });
    } else {
      // Client-side
      return initializeAuth(app, {
        persistence: browserLocalPersistence,
        popupRedirectResolver: browserPopupRedirectResolver,
      });
    }
  } catch (e: any) {
    // If auth is already initialized (hot reload), get existing instance
    if (e.code === 'auth/already-initialized') {
      const { getAuth } = require('firebase/auth');
      return getAuth(app);
    } else {
      throw e;
    }
  }
})();

const db = getFirestore(app);

// E2E test mode: connect every client-SDK service to the local emulators. Guarded
// against double-connect (Next hot reload / repeated module eval re-runs this file);
// the connect* calls throw if invoked after the instance is already in use, so the
// flag makes them run exactly once per process.
if (USE_EMULATORS && !(globalThis as any).__FIREBASE_EMULATORS_CONNECTED__) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8088);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  (globalThis as any).__FIREBASE_EMULATORS_CONNECTED__ = true;
}

// Initialize Analytics only on the client-side. Skipped in emulator mode: the fake
// config has no measurementId, so getAnalytics would throw. `null` is already its
// SSR value, so no consumer needs to change.
const analytics = typeof window !== 'undefined' && !USE_EMULATORS ? getAnalytics(app) : null;

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

import { initializeApp, getApps, getApp, setLogLevel } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  initializeAuth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  indexedDBLocalPersistence,
  inMemoryPersistence,
  Auth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getFirebaseConfig } from '@/utils/config';

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

// Initialize Analytics only on the client-side
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

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

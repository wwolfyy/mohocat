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
import { getFirestore, initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';
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

/**
 * Firestore, forced onto the long-polling transport in the browser.
 *
 * 🐛 **Why (2026-08-01, owner-reported 30-second page loads on Safari).** By
 * default the SDK first probes whether something on the network buffers its
 * streamed connection (`detectBufferingProxy`, on unless told otherwise). When
 * that probe gets no answer it does not fail fast — it waits out the transport's
 * timeout, whose ceiling this SDK caps at **30 seconds**, then falls back to
 * polling and completes the read. Measured on Safari: 30,048 ms from issuing the
 * query to receiving 4 documents, of which the query itself was the last 48 ms.
 * Forcing the fallback up front skips the probe, so the stall cannot happen.
 * (Sibling precedent: the auth block above, where indexedDB persistence caused a
 * comparable multi-second stall and was pinned to localStorage for the same
 * reason.)
 *
 * 🔑 **This costs no functionality.** It changes the transport, not the feature —
 * `onSnapshot` still delivers live updates, the server still answers the moment
 * data exists, and the timeout above only bounds an *idle* connection. What it
 * trades away is streaming efficiency for realtime listeners, of which this app
 * has **zero**: every one of its ~47 read sites is a one-shot `getDoc`/`getDocs`.
 * ⚠️ If live listeners are ever added, revisit this — the trade stops being free.
 *
 * Browser-only on purpose: the setting addresses a browser transport, and SSR
 * evaluates this module too. `initializeFirestore` must run before anything
 * touches Firestore and throws if the instance already exists, so a hot reload
 * (module re-eval against a live app) falls back to the existing instance —
 * the same shape as the auth `already-initialized` guard above.
 */
const db = (() => {
  if (typeof window === 'undefined') return getFirestore(app);

  try {
    return initializeFirestore(app, { experimentalForceLongPolling: true });
  } catch (e: any) {
    if (e.code === 'failed-precondition') return getFirestore(app);
    throw e;
  }
})();

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

// Analytics is no longer initialized here. It was decoupled from the Firebase app
// in multi-mountain plan M7 (§2.7): a shared GA4 property loaded via gtag.js in the
// root layout (gated on NEXT_PUBLIC_GA_MEASUREMENT_ID), with page_view + mountain_id
// emitted by AnalyticsTracker. This removes the browser-only `getAnalytics` guard.
export { storage, auth, db };

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

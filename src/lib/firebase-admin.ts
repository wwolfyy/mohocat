import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { getFirebaseAdminServiceAccount, getFirebaseConfig } from '@/utils/config';

// True in the e2e test harness only: `emulators:exec` sets these host vars, and
// the Admin SDK auto-routes Firestore/Auth/Storage traffic to the emulators when
// they are present. Never set by Vercel, so this branch is unreachable in prod.
const USE_EMULATORS =
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' ||
  !!process.env.FIRESTORE_EMULATOR_HOST;

// Initialize Firebase Admin SDK
function initAdmin(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const firebaseConfig = getFirebaseConfig();

  // E2E test mode: initialize credential-less against the emulators. Spike S1
  // confirmed this is sufficient for Firestore R/W, Auth user create, and
  // verifyIdToken of emulator-minted tokens — the `cert()` path must be bypassed
  // (a real-shaped key is neither present nor needed). See docs/planning/
  // playwright-ci-prerequisite-plan.md §3 (S1) / WP3.
  if (USE_EMULATORS) {
    const projectId =
      process.env.FIREBASE_PROJECT_ID_OVERRIDE ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      firebaseConfig?.projectId;
    return initializeApp({
      projectId,
      storageBucket: firebaseConfig?.storageBucket,
    });
  }

  const serviceAccount = getFirebaseAdminServiceAccount();

  if (serviceAccount) {
    return initializeApp({
      credential: cert(serviceAccount),
      storageBucket: firebaseConfig?.storageBucket,
    });
  }

  // Fallback to default credentials (GOOGLE_APPLICATION_CREDENTIALS or Cloud environment)
  return initializeApp();
}

const app = initAdmin();
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };

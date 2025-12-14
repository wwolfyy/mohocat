import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { getFirebaseAdminServiceAccount, getFirebaseConfig } from '@/utils/config';

// Initialize Firebase Admin SDK
function initAdmin(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    const serviceAccount = getFirebaseAdminServiceAccount();
    const firebaseConfig = getFirebaseConfig();

    if (serviceAccount) {
        return initializeApp({
            credential: cert(serviceAccount),
            storageBucket: firebaseConfig?.storageBucket
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

import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const auth = getAuth(app);
const db = getFirestore(app);

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
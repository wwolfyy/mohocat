import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseConfig } from '@/utils/config';

// Get Firebase configuration from the centralized config system
const firebaseConfig = getFirebaseConfig();

if (!firebaseConfig || !firebaseConfig.apiKey) {
  throw new Error('Firebase configuration is missing or invalid. Please check your environment variables.');
}

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
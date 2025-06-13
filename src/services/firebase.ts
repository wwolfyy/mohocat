import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

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

export { storage, auth };

export async function uploadImageToFirebase(file: File): Promise<string> {
  const user = auth.currentUser;
  console.log('Current user:', user);
  if (!user) {
    console.error('User is not authenticated. Cannot upload image:', file.name);
    throw new Error('User is not authenticated');
  }

  console.log('Uploading image to Firebase:', file.name);
  const storageRef = ref(storage, `images/${Date.now()}_${file.name}`);
  console.log('Storage reference path:', storageRef.fullPath);

  try {
    await uploadBytes(storageRef, file);
    console.log('Image uploaded successfully:', file.name);
    return getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error uploading image to Firebase:', error);
    throw error;
  }
}
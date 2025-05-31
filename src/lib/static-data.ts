import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import type { Point, Cat } from '@/types';
import catsData from './cats-static-data.json'; // Import the local JSON data

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Build-time Firebase initialization (server-side only) for points
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export async function getAllPoints(): Promise<Point[]> {
  try {
    const pointsCollection = collection(db, 'points');
    const pointsSnapshot = await getDocs(pointsCollection);
    return pointsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Point[];
  } catch (error) {
    console.error('Error fetching points:', error);
    return [];
  }
}

// Updated getAllCats to use the imported JSON data
export function getAllCats(): Cat[] {
  // The imported catsData is already an array of Cat objects
  // Ensure the structure of cats-static-data.json matches the Cat type,
  // especially the thumbnailUrl.
  return catsData as Cat[];
}

export async function getCatsByPointId(pointId: string, allCatsInput?: Cat[]): Promise<{
  current: Cat[];
  former: Cat[];
}> {
  const catsToFilter = allCatsInput || getAllCats(); // Use imported data if no specific list provided
  const current = catsToFilter.filter(cat => cat.dwelling === pointId);
  const former = catsToFilter.filter(cat => cat.prev_dwelling === pointId);
  
  return { current, former };
}

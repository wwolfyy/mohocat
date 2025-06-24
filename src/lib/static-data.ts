import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getFirebaseConfig } from '@/utils/config';
import type { Point, Cat } from '@/types';
import catsData from './cats-static-data.json'; // Import the local JSON data

// Get Firebase configuration from the centralized config system
const firebaseConfig = getFirebaseConfig();

if (!firebaseConfig || !firebaseConfig.apiKey) {
  throw new Error('Firebase configuration is missing or invalid. Please check your environment variables.');
}

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

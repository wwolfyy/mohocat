import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { getFirebaseConfig } from '@/utils/config';
import type { Point, Cat } from '@/types';

// Get Firebase configuration from the centralized config system
const firebaseConfig = getFirebaseConfig();

if (!firebaseConfig || !firebaseConfig.apiKey) {
  throw new Error('Firebase configuration is missing or invalid. Please check your environment variables.');
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// Data access functions
export async function getPoints(): Promise<Point[]> {
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

export async function getCatsByPointId(pointId: string): Promise<Cat[]> {
  try {
    const catsCollection = collection(db, 'cats');
    const q = query(catsCollection, where('pointId', '==', pointId));
    const catsSnapshot = await getDocs(q);
    return catsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Cat[];
  } catch (error) {
    console.error('Error fetching cats:', error);
    return [];
  }
}

export { app, db };
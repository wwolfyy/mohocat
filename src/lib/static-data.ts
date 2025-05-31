import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import type { Point, Cat } from '@/types';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Build-time Firebase initialization (server-side only)
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

export async function getAllCats(): Promise<Cat[]> {
  try {
    const catsCollection = collection(db, 'cats');
    const catsSnapshot = await getDocs(catsCollection);
    return catsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Cat[];
  } catch (error) {
    console.error('Error fetching cats:', error);
    return [];
  }
}

export async function getCatsByPointId(pointId: string, allCats: Cat[]): Promise<{
  current: Cat[];
  former: Cat[];
}> {
  const current = allCats.filter(cat => cat.dwelling === pointId);
  const former = allCats.filter(cat => cat.prev_dwelling === pointId);
  
  return { current, former };
}
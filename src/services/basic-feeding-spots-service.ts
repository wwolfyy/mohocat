import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirebaseConfig } from '@/utils/config';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin if not already done
if (!getApps().length) {
  const serviceAccountPath = path.join(process.cwd(), 'config/firebase/mountaincats-61543-7329e795c352.json');

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    const firebaseConfig = getFirebaseConfig();

    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: firebaseConfig?.storageBucket,
    });
  } else {
    throw new Error('Firebase service account file not found');
  }
}

export interface BasicFeedingSpot {
  id: number;
  name: string;
}

export class BasicFeedingSpotsService {
  private readonly COLLECTION_NAME = 'feeding_spots';
  private db = getFirestore();

  // Simple method to get just the basic feeding spot info (id and name)
  async getBasicFeedingSpots(): Promise<BasicFeedingSpot[]> {
    try {
      const collectionRef = this.db.collection(this.COLLECTION_NAME);
      const snapshot = await collectionRef.orderBy('id').get();

      const feedingSpots: BasicFeedingSpot[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        feedingSpots.push({
          id: data.id,
          name: data.name,
        });
      });

      return feedingSpots;
    } catch (error) {
      console.error('Error fetching basic feeding spots:', error);
      throw error;
    }
  }
}

export const getBasicFeedingSpotsService = () => new BasicFeedingSpotsService();

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

export interface FeedingSpot {
  id: number;
  name: string;
  last_attended: string;
  last_attended_by: string;
  hoursAgo: number | null;
  lastAttendedDate: Date | null;
}

export class AdminFeedingSpotsService {
  private readonly COLLECTION_NAME = 'feeding_spots';
  private db = getFirestore();

  private formatTimestamp(timestamp: any): string {
    if (!timestamp) return '';

    try {
      // If it's already a string, return it
      if (typeof timestamp === 'string') {
        return timestamp;
      }

      // If it's a Firestore Timestamp, convert it
      if (timestamp && timestamp.toDate) {
        return timestamp.toDate().toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      }

      // If it's a Date object
      if (timestamp instanceof Date) {
        return timestamp.toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      }

      return '';
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return '';
    }
  }

  private calculateHoursAgo(lastAttendedDate: Date | null): number | null {
    if (!lastAttendedDate) return null;

    const now = new Date();
    const diffMs = now.getTime() - lastAttendedDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    return diffHours;
  }

  private parseTimestamp(timestamp: any): Date | null {
    if (!timestamp) return null;

    try {
      // If it's a Firestore Timestamp
      if (timestamp && timestamp.toDate) {
        return timestamp.toDate();
      }

      // If it's already a Date object
      if (timestamp instanceof Date) {
        return timestamp;
      }

      // If it's a string, try to parse it
      if (typeof timestamp === 'string') {
        const parsed = new Date(timestamp);
        return isNaN(parsed.getTime()) ? null : parsed;
      }

      return null;
    } catch (error) {
      console.error('Error parsing timestamp:', error);
      return null;
    }
  }

  async getAllFeedingSpots(): Promise<FeedingSpot[]> {
    try {
      const collectionRef = this.db.collection(this.COLLECTION_NAME);
      const snapshot = await collectionRef.orderBy('id').get();

      const feedingSpots: FeedingSpot[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const lastAttendedDate = this.parseTimestamp(data.last_attended_at);

        feedingSpots.push({
          id: data.id,
          name: data.name,
          last_attended: this.formatTimestamp(data.last_attended_at),
          last_attended_by: data.last_attended_by || '',
          hoursAgo: this.calculateHoursAgo(lastAttendedDate),
          lastAttendedDate: lastAttendedDate,
        });
      });

      return feedingSpots;
    } catch (error) {
      console.error('Error fetching feeding spots:', error);
      throw error;
    }
  }
}

export const getAdminFeedingSpotsService = () => new AdminFeedingSpotsService();

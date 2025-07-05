import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface FeedingSpot {
  id: number;
  name: string;
  last_attended: string;
  last_attended_by: string;
  hoursAgo: number | null;
  lastAttendedDate: Date | null;
}

export interface IFeedingSpotsService {
  getAllFeedingSpots(): Promise<FeedingSpot[]>;
}

export class FirebaseFeedingSpotsService implements IFeedingSpotsService {
  private readonly COLLECTION_NAME = 'feeding_spots';  private formatTimestamp(timestamp: any): string {
    if (!timestamp) return '';

    try {
      // If it's already a string, return it
      if (typeof timestamp === 'string') {
        return timestamp;
      }

      // If it's a Firestore Timestamp, convert it
      if (timestamp instanceof Timestamp) {
        return timestamp.toDate().toLocaleString('ko-KR', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      }

      // If it's a timestamp object with seconds/nanoseconds
      if (timestamp.seconds !== undefined) {
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleString('ko-KR', {
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

  private getDateFromTimestamp(timestamp: any): Date | null {
    if (!timestamp) return null;

    try {
      // If it's a Firestore Timestamp, convert it
      if (timestamp instanceof Timestamp) {
        return timestamp.toDate();
      }

      // If it's a timestamp object with seconds/nanoseconds
      if (timestamp.seconds !== undefined) {
        return new Date(timestamp.seconds * 1000);
      }

      // If it's already a string, try to parse it
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

  private calculateHoursAgo(date: Date | null): number | null {
    if (!date) return null;

    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

    return diffInHours >= 0 ? diffInHours : null;
  }

  async getAllFeedingSpots(): Promise<FeedingSpot[]> {
    try {
      const feedingSpotsRef = collection(db, this.COLLECTION_NAME);
      const q = query(feedingSpotsRef, orderBy('id', 'asc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const lastAttendedDate = this.getDateFromTimestamp(data.last_attended);
        const hoursAgo = this.calculateHoursAgo(lastAttendedDate);

        return {
          id: data.id,
          name: data.name || '',
          last_attended: this.formatTimestamp(data.last_attended),
          last_attended_by: data.last_attended_by || '',
          hoursAgo,
          lastAttendedDate
        };
      });
    } catch (error) {
      console.error('Error fetching feeding spots:', error);
      throw error;
    }
  }
}

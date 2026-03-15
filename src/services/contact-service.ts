/**
 * Firebase Contact Service Implementation
 *
 * Handles all contact-related data operations using Firebase Firestore.
 * Uses the current mountain's configuration for database access.
 */

import type { IContactService } from './interfaces';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export class FirebaseContactService implements IContactService {
  private readonly COLLECTION_NAME = 'contacts';

  async createContact(contact: any): Promise<any> {
    try {
      const contactData = {
        ...contact,
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), contactData);

      return {
        id: docRef.id,
        ...contact,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Error creating contact:', error);
      throw new Error('Failed to create contact');
    }
  }
}

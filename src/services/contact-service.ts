/**
 * Firebase Contact Service Implementation
 *
 * Handles all contact-related data operations using Firebase Firestore.
 * Uses the current mountain's configuration for database access.
 */

import type { IContactService } from './interfaces';
import type { Contact } from '../types';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from './firebase';

export class FirebaseContactService implements IContactService {
  private readonly COLLECTION_NAME = 'contacts';

  // Contact creation happens server-side (`/api/contact`, Admin SDK), which
  // stamps `mountainId`; this client service is read-only, so the tenant id is
  // held for M5's scoped reads.
  constructor(private readonly mountainId: string) {}

  /**
   * Fetch all contact submissions, newest first.
   * Admin-only read (enforced by Firestore rules: requires `manage-users`).
   */
  async getAllContacts(): Promise<Contact[]> {
    try {
      const q = query(collection(db, this.COLLECTION_NAME), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Contact, 'id'>),
      }));
    } catch (error) {
      console.error('Error fetching contacts:', error);
      throw new Error('Failed to fetch contacts');
    }
  }
}

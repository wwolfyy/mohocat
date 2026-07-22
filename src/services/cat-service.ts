/**
 * Firebase Cat Service Implementation
 *
 * Handles all cat-related data operations using Firebase Firestore.
 * Uses the current mountain's configuration for database access.
 */

import type { ICatService } from './interfaces';
import type { Cat } from '../types';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

export class FirebaseCatService implements ICatService {
  private readonly COLLECTION_NAME = 'cats';

  constructor(private readonly mountainId: string) {}

  async getAllCats(): Promise<Cat[]> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, this.COLLECTION_NAME), where('mountainId', '==', this.mountainId))
      );
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Cat[];
    } catch (error) {
      console.error('Error fetching cats:', error);
      throw new Error('Failed to fetch cats');
    }
  }

  async getCatById(id: string): Promise<Cat | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      // Doc-id reads can't be scoped by `where` — check the tenant after the
      // read so a known id from another mountain reads as "not found".
      if (docSnap.exists() && docSnap.data().mountainId === this.mountainId) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as Cat;
      }

      return null;
    } catch (error) {
      console.error('Error fetching cat:', error);
      throw new Error(`Failed to fetch cat with id: ${id}`);
    }
  }

  async getCatByName(name: string): Promise<Cat | null> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('mountainId', '==', this.mountainId),
        where('name', '==', name)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0]; // Get the first match
        return {
          id: doc.id,
          ...doc.data(),
        } as Cat;
      }

      return null;
    } catch (error) {
      console.error('Error fetching cat by name:', error);
      throw new Error(`Failed to fetch cat with name: ${name}`);
    }
  }

  async getCatsByPointId(pointId: string): Promise<{ current: Cat[]; former: Cat[] }> {
    try {
      // Get current cats - those with dwelling matching pointId
      const currentQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('mountainId', '==', this.mountainId),
        where('dwelling', '==', pointId)
      );
      const currentSnapshot = await getDocs(currentQuery);
      const current = currentSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Cat[];

      // Get former cats - those with prev_dwelling matching pointId
      const formerQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('mountainId', '==', this.mountainId),
        where('prev_dwelling', '==', pointId)
      );
      const formerSnapshot = await getDocs(formerQuery);
      const former = formerSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Cat[];

      return { current, former };
    } catch (error) {
      console.error('Error fetching cats by point:', error);
      throw new Error(`Failed to fetch cats for point: ${pointId}`);
    }
  }

  async createCat(cat: Omit<Cat, 'id'>): Promise<Cat> {
    try {
      const catData = { ...cat, mountainId: this.mountainId };
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), catData);
      return {
        id: docRef.id,
        ...catData,
      };
    } catch (error) {
      console.error('Error creating cat:', error);
      throw new Error('Failed to create cat');
    }
  }

  async updateCat(id: string, updates: Partial<Cat>): Promise<Cat> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      await updateDoc(docRef, updates);

      // Fetch and return the updated cat
      const updatedCat = await this.getCatById(id);
      if (!updatedCat) {
        throw new Error('Cat not found after update');
      }

      return updatedCat;
    } catch (error) {
      console.error('Error updating cat:', error);
      throw new Error(`Failed to update cat with id: ${id}`);
    }
  }

  /**
   * Commit several per-cat field patches in a single atomic Firestore batch.
   *
   * Each entry's `updates` is a *partial* patch applied via `batch.update()`,
   * so only the supplied fields are written — fields omitted from the patch
   * (e.g. app-only `adoptable`) are never touched. This is the write path for
   * the spreadsheet grid's "Save all", and structurally avoids the full-doc
   * overwrite hazard of the Sheets importer.
   */
  async batchUpdateCats(updates: Array<{ id: string; updates: Partial<Cat> }>): Promise<void> {
    if (updates.length === 0) {
      return;
    }

    try {
      const batch = writeBatch(db);
      updates.forEach(({ id, updates: patch }) => {
        const docRef = doc(db, this.COLLECTION_NAME, id);
        batch.update(docRef, patch);
      });
      await batch.commit();
    } catch (error) {
      console.error('Error batch updating cats:', error);
      throw new Error('Failed to batch update cats');
    }
  }

  async deleteCat(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting cat:', error);
      throw new Error(`Failed to delete cat with id: ${id}`);
    }
  }
}

/**
 * Firebase Cat Service Implementation
 *
 * Handles all cat-related data operations using Firebase Firestore.
 * Uses the current mountain's configuration for database access.
 */

import type { ICatService } from './interfaces';
import type { Cat } from '../types';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';

export class FirebaseCatService implements ICatService {
  private readonly COLLECTION_NAME = 'cats';

  async getAllCats(): Promise<Cat[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.COLLECTION_NAME));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
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

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as Cat;
      }

      return null;
    } catch (error) {
      console.error('Error fetching cat:', error);
      throw new Error(`Failed to fetch cat with id: ${id}`);
    }
  }  async getCatsByPointId(pointId: string): Promise<{ current: Cat[]; former: Cat[] }> {
    try {
      // Get current cats - those with dwelling matching pointId
      const currentQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('dwelling', '==', pointId)
      );
      const currentSnapshot = await getDocs(currentQuery);
      const current = currentSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Cat[];

      // Get former cats - those with prev_dwelling matching pointId
      const formerQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('prev_dwelling', '==', pointId)
      );
      const formerSnapshot = await getDocs(formerQuery);
      const former = formerSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Cat[];

      return { current, former };
    } catch (error) {
      console.error('Error fetching cats by point:', error);
      throw new Error(`Failed to fetch cats for point: ${pointId}`);
    }
  }

  async createCat(cat: Omit<Cat, 'id'>): Promise<Cat> {
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), cat);
      return {
        id: docRef.id,
        ...cat
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

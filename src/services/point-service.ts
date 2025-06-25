/**
 * Firebase Point Service Implementation
 * 
 * Handles all point-related data operations using Firebase Firestore.
 * Uses the current mountain's configuration for database access.
 */

import type { IPointService } from './interfaces';
import type { Point } from '../types';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export class FirebasePointService implements IPointService {
  private readonly COLLECTION_NAME = 'points';

  async getAllPoints(): Promise<Point[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.COLLECTION_NAME));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Point[];
    } catch (error) {
      console.error('Error fetching points:', error);
      throw new Error('Failed to fetch points');
    }
  }

  async getPointById(id: string): Promise<Point | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as Point;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching point:', error);
      throw new Error(`Failed to fetch point with id: ${id}`);
    }
  }

  async createPoint(point: Omit<Point, 'id'>): Promise<Point> {
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), point);
      return {
        id: docRef.id,
        ...point
      };
    } catch (error) {
      console.error('Error creating point:', error);
      throw new Error('Failed to create point');
    }
  }

  async updatePoint(id: string, updates: Partial<Point>): Promise<Point> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      await updateDoc(docRef, updates);
      
      // Fetch and return the updated point
      const updatedPoint = await this.getPointById(id);
      if (!updatedPoint) {
        throw new Error('Point not found after update');
      }
      
      return updatedPoint;
    } catch (error) {
      console.error('Error updating point:', error);
      throw new Error(`Failed to update point with id: ${id}`);
    }
  }

  async deletePoint(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting point:', error);
      throw new Error(`Failed to delete point with id: ${id}`);
    }
  }
}

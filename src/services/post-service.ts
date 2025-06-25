/**
 * Firebase Post Service Implementation
 *
 * Handles all post-related data operations using Firebase Firestore.
 * Uses the current mountain's configuration for database access.
 */

import type { IPostService } from './interfaces';
import { collection, getDocs, doc, getDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export class FirebasePostService implements IPostService {
  private readonly COLLECTION_NAME = 'posts_feeding';

  async getAllPosts(): Promise<any[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.COLLECTION_NAME));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw new Error('Failed to fetch posts');
    }
  }

  async getPostById(id: string): Promise<any | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching post:', error);
      throw new Error(`Failed to fetch post with id: ${id}`);
    }
  }

  async createPost(post: any): Promise<any> {
    try {
      const postData = {
        ...post,
        createdAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), postData);

      return {
        id: docRef.id,
        ...post,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error creating post:', error);
      throw new Error('Failed to create post');
    }
  }
}
/**
 * Firebase Adoption Promotion Service Implementation
 *
 * Handles all 입양홍보 (adoption promotion) post operations using Firebase
 * Firestore. Mirrors the announcement service (admin-created, public-read); uses
 * the `posts_adoption` collection. Adoption posts have no replies.
 */

import type { IPostService } from './interfaces';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  Timestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';

export class FirebaseAdoptionService implements IPostService {
  private readonly COLLECTION_NAME = 'posts_adoption';

  async getAllPosts(): Promise<any[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.COLLECTION_NAME));

      const allPosts = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      });

      // Sort newest first
      return allPosts.sort((a: any, b: any) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt || 0);
        const bTime = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt || 0);
        return bTime.getTime() - aTime.getTime();
      });
    } catch (error) {
      console.error('Error fetching adoption posts:', error);
      throw new Error('Failed to fetch adoption posts');
    }
  }

  async getAllPostsIncludingReplies(): Promise<any[]> {
    // Adoption posts don't have replies, so this is the same as getAllPosts
    return this.getAllPosts();
  }

  async getTopLevelPosts(): Promise<any[]> {
    // All adoption posts are top-level posts
    return this.getAllPosts();
  }

  async getPostWithReplies(postId: string): Promise<{ post: any; replies: any[] }> {
    const post = await this.getPostById(postId);
    return { post, replies: [] }; // Adoption posts don't have replies
  }

  async getPostById(postId: string): Promise<any> {
    try {
      const postDoc = await getDoc(doc(db, this.COLLECTION_NAME, postId));

      if (!postDoc.exists()) {
        return null;
      }

      const postData = postDoc.data();
      return {
        id: postDoc.id,
        ...postData,
        createdAt: postData.createdAt?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('Error fetching adoption post by ID:', error);
      throw new Error(`Failed to fetch adoption post: ${postId}`);
    }
  }

  async createPost(postData: any): Promise<any> {
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...postData,
        createdAt: Timestamp.now(),
        replyCount: 0, // Adoption posts don't have replies
      });

      return {
        id: docRef.id,
        ...postData,
        createdAt: new Date(),
        replyCount: 0,
      };
    } catch (error) {
      console.error('Error creating adoption post:', error);
      throw new Error('Failed to create adoption post');
    }
  }

  async updatePost(postId: string, postData: any): Promise<any> {
    try {
      const postRef = doc(db, this.COLLECTION_NAME, postId);
      await updateDoc(postRef, {
        ...postData,
        updatedAt: Timestamp.now(),
      });

      return {
        id: postId,
        ...postData,
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('Error updating adoption post:', error);
      throw new Error(`Failed to update adoption post: ${postId}`);
    }
  }

  async deletePost(postId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.COLLECTION_NAME, postId));
    } catch (error) {
      console.error('Error deleting adoption post:', error);
      throw new Error(`Failed to delete adoption post: ${postId}`);
    }
  }

  // Adoption posts don't support replies.
  async getReplies(postId: string): Promise<any[]> {
    return [];
  }

  async createReply(reply: any): Promise<any> {
    throw new Error('Replies are not supported for adoption posts');
  }

  async deleteReply(replyId: string): Promise<void> {
    throw new Error('Replies are not supported for adoption posts');
  }

  async updateReplyCount(postId: string): Promise<void> {
    // No-op for adoption posts since they don't have replies
  }
}

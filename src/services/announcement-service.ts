/**
 * Firebase Announcement Service Implementation
 *
 * Handles all announcement-related data operations using Firebase Firestore.
 * Uses the announcements collection for announcement functionality.
 */

import type { IPostService } from './interfaces';
import { collection, getDocs, doc, getDoc, addDoc, Timestamp, query, where, orderBy, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export class FirebaseAnnouncementService implements IPostService {
  private readonly COLLECTION_NAME = 'announcements';

  async getAllPosts(): Promise<any[]> {
    try {
      console.log('FirebaseAnnouncementService: Starting to fetch announcements from collection:', this.COLLECTION_NAME);

      const querySnapshot = await getDocs(collection(db, this.COLLECTION_NAME));
      console.log('FirebaseAnnouncementService: Query snapshot size:', querySnapshot.size);

      const allPosts = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('FirebaseAnnouncementService: Document data:', { id: doc.id, ...data });
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        };
      });

      // Sort newest first
      const sortedPosts = allPosts.sort((a: any, b: any) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt || 0);
        const bTime = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt || 0);
        return bTime.getTime() - aTime.getTime();
      });

      return sortedPosts;
    } catch (error) {
      console.error('Error fetching announcements:', error);
      throw new Error('Failed to fetch announcements');
    }
  }

  async getAllPostsIncludingReplies(): Promise<any[]> {
    // Announcements don't have replies, so this is the same as getAllPosts
    return this.getAllPosts();
  }

  async getTopLevelPosts(): Promise<any[]> {
    // All announcements are top-level posts
    return this.getAllPosts();
  }

  async getPostWithReplies(postId: string): Promise<{ post: any; replies: any[] }> {
    const post = await this.getPostById(postId);
    return {
      post,
      replies: [] // Announcements don't have replies
    };
  }

  async getPostById(postId: string): Promise<any> {
    try {
      console.log('FirebaseAnnouncementService: Fetching announcement by ID:', postId);

      const postDoc = await getDoc(doc(db, this.COLLECTION_NAME, postId));

      if (!postDoc.exists()) {
        console.log('FirebaseAnnouncementService: Announcement not found');
        return null;
      }

      const postData = postDoc.data();
      console.log('FirebaseAnnouncementService: Retrieved announcement data:', postData);

      return {
        id: postDoc.id,
        ...postData,
        createdAt: postData.createdAt?.toDate() || new Date()
      };
    } catch (error) {
      console.error('Error fetching announcement by ID:', error);
      throw new Error(`Failed to fetch announcement: ${postId}`);
    }
  }

  async createPost(postData: any): Promise<any> {
    try {
      console.log('FirebaseAnnouncementService: Creating new announcement:', postData);

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...postData,
        createdAt: Timestamp.now(),
        replyCount: 0 // Announcements don't have replies
      });

      console.log('FirebaseAnnouncementService: Announcement created with ID:', docRef.id);

      return {
        id: docRef.id,
        ...postData,
        createdAt: new Date(),
        replyCount: 0
      };
    } catch (error) {
      console.error('Error creating announcement:', error);
      throw new Error('Failed to create announcement');
    }
  }

  async updatePost(postId: string, postData: any): Promise<any> {
    try {
      console.log('FirebaseAnnouncementService: Updating announcement:', postId, postData);

      const postRef = doc(db, this.COLLECTION_NAME, postId);
      await updateDoc(postRef, {
        ...postData,
        updatedAt: Timestamp.now()
      });

      console.log('FirebaseAnnouncementService: Announcement updated successfully');

      return {
        id: postId,
        ...postData,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error updating announcement:', error);
      throw new Error(`Failed to update announcement: ${postId}`);
    }
  }

  async deletePost(postId: string): Promise<void> {
    try {
      console.log('FirebaseAnnouncementService: Deleting announcement:', postId);

      const postRef = doc(db, this.COLLECTION_NAME, postId);
      await deleteDoc(postRef);

      console.log('FirebaseAnnouncementService: Successfully deleted announcement');
    } catch (error) {
      console.error('Error deleting announcement:', error);
      throw new Error(`Failed to delete announcement: ${postId}`);
    }
  }

  // Announcements don't support replies, so these methods are not implemented
  async getReplies(postId: string): Promise<any[]> {
    return []; // Announcements don't have replies
  }

  async createReply(reply: any): Promise<any> {
    throw new Error('Replies are not supported for announcements');
  }

  async deleteReply(replyId: string): Promise<void> {
    throw new Error('Replies are not supported for announcements');
  }

  async updateReplyCount(postId: string): Promise<void> {
    // No-op for announcements since they don't have replies
  }
}

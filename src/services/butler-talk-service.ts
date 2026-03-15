/**
 * Firebase Butler Talk Service Implementation
 *
 * Handles all butler talk post-related data operations using Firebase Firestore.
 * Uses the posts_butler collection for butler talk functionality.
 */

import type { IPostService } from './interfaces';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  Timestamp,
  query,
  where,
  orderBy,
  updateDoc,
  increment,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';

export class FirebaseButlerTalkService implements IPostService {
  private readonly COLLECTION_NAME = 'posts_butler';

  async getAllPosts(): Promise<any[]> {
    try {
      console.log(
        'FirebaseButlerTalkService: Starting to fetch posts from collection:',
        this.COLLECTION_NAME
      );

      const querySnapshot = await getDocs(collection(db, this.COLLECTION_NAME));
      console.log('FirebaseButlerTalkService: Query snapshot size:', querySnapshot.size);

      const allPosts = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        console.log('FirebaseButlerTalkService: Document data:', { id: doc.id, ...data });
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      });

      // Filter out replies
      const filteredPosts = allPosts.filter((post: any) => post.isReply !== true);
      console.log('FirebaseButlerTalkService: Posts after filtering out replies:', filteredPosts);

      // Sort newest first
      const sortedPosts = filteredPosts.sort((a: any, b: any) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt || 0);
        const bTime = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt || 0);
        return bTime.getTime() - aTime.getTime();
      });

      return sortedPosts;
    } catch (error) {
      console.error('Error fetching butler talk posts:', error);
      throw new Error('Failed to fetch butler talk posts');
    }
  }

  async getAllPostsIncludingReplies(): Promise<any[]> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, this.COLLECTION_NAME), orderBy('createdAt', 'desc'))
      );
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));
    } catch (error) {
      console.error('Error fetching all butler talk posts including replies:', error);
      throw new Error('Failed to fetch all butler talk posts including replies');
    }
  }

  async getTopLevelPosts(): Promise<any[]> {
    return this.getAllPosts();
  }

  async getPostById(postId: string): Promise<any | null> {
    try {
      console.log('FirebaseButlerTalkService: Getting post by ID:', postId);
      const docRef = doc(db, this.COLLECTION_NAME, postId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching butler talk post by ID:', error);
      throw new Error(`Failed to fetch butler talk post with ID: ${postId}`);
    }
  }

  async createPost(post: any): Promise<string> {
    try {
      console.log('FirebaseButlerTalkService: Creating post:', post);

      const postData = {
        ...post,
        createdAt: Timestamp.now(),
        isReply: false,
        replyCount: 0,
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), postData);
      console.log('FirebaseButlerTalkService: Post created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating butler talk post:', error);
      throw new Error('Failed to create butler talk post');
    }
  }

  async createReply(reply: any): Promise<any> {
    try {
      // Get parent post to determine thread info
      const parentPost = await this.getPostById(reply.parentId);
      if (!parentPost) {
        throw new Error('Parent post not found');
      }

      const replyData = {
        ...reply,
        createdAt: Timestamp.now(),
        isReply: true,
        depth: (parentPost.depth || 0) + 1,
        threadId: parentPost.threadId || parentPost.id,
        replyCount: 0,
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), replyData);

      // Update parent post's reply count
      await this.updateReplyCount(reply.parentId);

      return {
        id: docRef.id,
        ...reply, // Original reply data from the form
        createdAt: new Date(),
        isReply: true,
        depth: (parentPost.depth || 0) + 1,
        threadId: parentPost.threadId || parentPost.id,
        replyCount: 0,
      };
    } catch (error) {
      console.error('Error creating butler talk reply:', error);
      throw new Error('Failed to create butler talk reply');
    }
  }

  async getReplies(postId: string): Promise<any[]> {
    try {
      const q = query(collection(db, this.COLLECTION_NAME), where('parentId', '==', postId));

      const querySnapshot = await getDocs(q);
      const replies = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      });

      // Sort oldest first
      return replies.sort((a: any, b: any) => {
        const aTime = a.createdAt || new Date();
        const bTime = b.createdAt || new Date();
        return aTime.getTime() - bTime.getTime();
      });
    } catch (error) {
      console.error('Error fetching butler talk replies:', error);
      throw new Error(`Failed to fetch butler talk replies for post: ${postId}`);
    }
  }

  async getPostWithReplies(postId: string): Promise<{ post: any; replies: any[] }> {
    try {
      const post = await this.getPostById(postId);
      if (!post) {
        throw new Error(`Butler talk post with ID ${postId} not found`);
      }

      const replies = await this.getReplies(postId);
      return { post, replies };
    } catch (error) {
      console.error('Error getting butler talk post with replies:', error);
      throw new Error(`Failed to get butler talk post with replies: ${postId}`);
    }
  }

  async updateReplyCount(postId: string): Promise<void> {
    try {
      const replies = await this.getReplies(postId);
      const postRef = doc(db, this.COLLECTION_NAME, postId);
      await updateDoc(postRef, { replyCount: replies.length });
    } catch (error) {
      console.error('Error updating butler talk reply count:', error);
    }
  }

  async deletePost(postId: string): Promise<void> {
    try {
      console.log('FirebaseButlerTalkService: Deleting post:', postId);

      // First, delete all replies to this post
      const replies = await this.getReplies(postId);
      for (const reply of replies) {
        await this.deleteReply(reply.id);
      }

      // Then delete the post itself
      const postRef = doc(db, this.COLLECTION_NAME, postId);
      await deleteDoc(postRef);

      console.log('FirebaseButlerTalkService: Successfully deleted post and all replies');
    } catch (error) {
      console.error('Error deleting butler talk post:', error);
      throw new Error(`Failed to delete butler talk post: ${postId}`);
    }
  }

  async deleteReply(replyId: string): Promise<void> {
    try {
      console.log('FirebaseButlerTalkService: Deleting reply:', replyId);

      // Get the reply to find its parent and any nested replies
      const reply = await this.getPostById(replyId);
      if (!reply) {
        throw new Error('Reply not found');
      }

      // Delete any nested replies first
      const nestedReplies = await this.getReplies(replyId);
      for (const nestedReply of nestedReplies) {
        await this.deleteReply(nestedReply.id);
      }

      // Delete the reply itself
      const replyRef = doc(db, this.COLLECTION_NAME, replyId);
      await deleteDoc(replyRef);

      // Update parent post's reply count
      if (reply.parentId) {
        await this.updateReplyCount(reply.parentId);
      }

      console.log('FirebaseButlerTalkService: Successfully deleted reply and nested replies');
    } catch (error) {
      console.error('Error deleting butler talk reply:', error);
      throw new Error(`Failed to delete butler talk reply: ${replyId}`);
    }
  }
}

/**
 * Firebase Post Service Implementation
 *
 * Handles all post-related data operations using Firebase Firestore.
 * Uses the current mountain's configuration for database access.
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

export class FirebasePostService implements IPostService {
  private readonly COLLECTION_NAME = 'posts_feeding';

  async getAllPosts(): Promise<any[]> {
    try {
      console.log(
        'FirebasePostService: Starting to fetch posts from collection:',
        this.COLLECTION_NAME
      );

      // First try without ordering to see if there are any posts at all
      const querySnapshot = await getDocs(collection(db, this.COLLECTION_NAME));

      console.log('FirebasePostService: Query snapshot size:', querySnapshot.size);

      const allPosts = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        console.log('FirebasePostService: Document data:', { id: doc.id, ...data });
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      });

      console.log('FirebasePostService: All posts before filtering:', allPosts);

      // Filter out replies - only return posts that are not replies
      // Be more explicit about the filtering: only exclude posts that are explicitly marked as replies
      const filteredPosts = allPosts.filter((post: any) => post.isReply !== true);
      console.log('FirebasePostService: Posts after filtering out replies:', filteredPosts);

      // Sort in the application layer - newest posts first (reverse chronological)
      const sortedPosts = filteredPosts.sort((a: any, b: any) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt || 0);
        const bTime = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt || 0);
        // Newer posts first: larger timestamp (bTime) minus smaller timestamp (aTime)
        return bTime.getTime() - aTime.getTime();
      });

      return sortedPosts;
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw new Error('Failed to fetch posts');
    }
  }

  // Method to get all posts including replies (for admin use)
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
      console.error('Error fetching all posts including replies:', error);
      throw new Error('Failed to fetch all posts including replies');
    }
  }

  // Method to get only top-level posts (alternative to getAllPosts for clarity)
  async getTopLevelPosts(): Promise<any[]> {
    return this.getAllPosts();
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
          createdAt: data.createdAt?.toDate() || new Date(),
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
        createdAt: Timestamp.now(),
        replyCount: 0,
        depth: 0,
        isReply: false,
        threadId: null, // Will be set to post ID after creation for root posts
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), postData);

      // Update threadId to point to itself for root posts
      if (!post.parentId) {
        await updateDoc(docRef, { threadId: docRef.id });
      }

      return {
        id: docRef.id,
        ...postData,
        threadId: post.parentId ? post.threadId : docRef.id,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Error creating post:', error);
      throw new Error('Failed to create post');
    }
  }

  async getReplies(postId: string): Promise<any[]> {
    try {
      console.log('FirebasePostService: Getting replies for postId:', postId);

      // Remove orderBy to avoid requiring a composite index
      // We'll sort in the application layer instead
      const q = query(collection(db, this.COLLECTION_NAME), where('parentId', '==', postId));

      const querySnapshot = await getDocs(q);
      console.log('FirebasePostService: Reply query snapshot size:', querySnapshot.size);

      const replies = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        console.log('FirebasePostService: Reply document data:', { id: doc.id, ...data });
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      });

      // Sort replies by creation time in ascending order (oldest first)
      const sortedReplies = replies.sort((a: any, b: any) => {
        const aTime = a.createdAt || new Date();
        const bTime = b.createdAt || new Date();
        return aTime.getTime() - bTime.getTime();
      });

      console.log('FirebasePostService: Final sorted replies array:', sortedReplies);
      return sortedReplies;
    } catch (error) {
      console.error('Error fetching replies:', error);
      throw new Error(`Failed to fetch replies for post: ${postId}`);
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
      console.error('Error creating reply:', error);
      throw new Error('Failed to create reply');
    }
  }

  async getPostWithReplies(postId: string): Promise<{ post: any; replies: any[] }> {
    try {
      const [post, replies] = await Promise.all([
        this.getPostById(postId),
        this.getReplies(postId),
      ]);

      if (!post) {
        throw new Error('Post not found');
      }

      return { post, replies };
    } catch (error) {
      console.error('Error fetching post with replies:', error);
      throw new Error(`Failed to fetch post with replies: ${postId}`);
    }
  }

  async updateReplyCount(postId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, postId);
      await updateDoc(docRef, {
        replyCount: increment(1),
      });
    } catch (error) {
      console.error('Error updating reply count:', error);
      throw new Error(`Failed to update reply count for post: ${postId}`);
    }
  }

  async deletePost(postId: string): Promise<void> {
    try {
      console.log('FirebasePostService: Deleting post:', postId);

      // First, delete all replies to this post
      const replies = await this.getReplies(postId);
      for (const reply of replies) {
        await this.deleteReply(reply.id);
      }

      // Then delete the post itself
      const postRef = doc(db, this.COLLECTION_NAME, postId);
      await deleteDoc(postRef);

      console.log('FirebasePostService: Successfully deleted post and all replies');
    } catch (error) {
      console.error('Error deleting post:', error);
      throw new Error(`Failed to delete post: ${postId}`);
    }
  }

  async deleteReply(replyId: string): Promise<void> {
    try {
      console.log('FirebasePostService: Deleting reply:', replyId);

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

      console.log('FirebasePostService: Successfully deleted reply and nested replies');
    } catch (error) {
      console.error('Error deleting reply:', error);
      throw new Error(`Failed to delete reply: ${replyId}`);
    }
  }
}

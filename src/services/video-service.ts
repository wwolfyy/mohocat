/**
 * Firebase Video Service Implementation
 *
 * Handles all video-related data operations using Firebase Firestore.
 * Uses the current mountain's configuration for database access.
 */

import type { IVideoService } from './interfaces';
import {
  getAllVideos as getVideosFromMediaAlbums,
  getCatVideos as getCatVideosFromMediaAlbums,
  updateVideoTags as updateVideoTagsFromMediaAlbums,
  addVideoRecord as addVideoRecordFromMediaAlbums,
  getVideoById as getVideoByIdFromMediaAlbums,
  updateVideoRecord as updateVideoRecordFromMediaAlbums,
  deleteVideoRecord as deleteVideoRecordFromMediaAlbums,
  batchUpdateVideos as batchUpdateVideosFromMediaAlbums,
  batchDeleteVideos as batchDeleteVideosFromMediaAlbums,
  syncVideos as syncVideosFromMediaAlbums
} from './media-albums';

export class FirebaseVideoService implements IVideoService {

  async getAllVideos(options?: any): Promise<any[]> {
    try {
      // Delegate to existing media-albums service
      return await getVideosFromMediaAlbums(options);
    } catch (error) {
      console.error('Error fetching videos:', error);
      throw new Error('Failed to fetch videos');
    }
  }

  async getCatVideos(catName: string): Promise<any[]> {
    try {
      // Delegate to existing media-albums service
      return await getCatVideosFromMediaAlbums(catName);
    } catch (error) {
      console.error('Error fetching cat videos:', error);
      throw new Error('Failed to fetch cat videos');
    }
  }

  async updateVideoTags(videoId: string, tags: string[]): Promise<boolean> {
    try {
      // Delegate to existing media-albums service
      return await updateVideoTagsFromMediaAlbums(videoId, tags);
    } catch (error) {
      console.error('Error updating video tags:', error);
      throw new Error('Failed to update video tags');
    }
  }

  async addVideoRecord(videoData: any): Promise<string | null> {
    try {
      // Delegate to existing media-albums service
      return await addVideoRecordFromMediaAlbums(videoData);
    } catch (error) {
      console.error('Error adding video record:', error);
      throw new Error('Failed to add video record');
    }
  }

  // Admin CRUD methods

  async getVideoById(videoId: string): Promise<any | null> {
    try {
      return await getVideoByIdFromMediaAlbums(videoId);
    } catch (error) {
      console.error('Error fetching video by ID:', error);
      throw new Error('Failed to fetch video by ID');
    }
  }

  async createVideo(videoData: any): Promise<string> {
    try {
      // Create is the same as add for videos
      const result = await addVideoRecordFromMediaAlbums(videoData);
      if (!result) {
        throw new Error('Failed to create video - no ID returned');
      }
      return result;
    } catch (error) {
      console.error('Error creating video:', error);
      throw new Error('Failed to create video');
    }
  }

  async updateVideo(id: string, updates: Partial<any>): Promise<void> {
    try {
      // Automatically set the updated timestamp
      const updatesWithTimestamp = {
        ...updates,
        updated: new Date()
      };

      const success = await updateVideoRecordFromMediaAlbums(id, updatesWithTimestamp);
      if (!success) {
        throw new Error('Failed to update video');
      }
    } catch (error) {
      console.error('Error updating video:', error);
      throw new Error('Failed to update video');
    }
  }

  async deleteVideo(id: string): Promise<void> {
    try {
      const success = await deleteVideoRecordFromMediaAlbums(id);
      if (!success) {
        throw new Error('Failed to delete video');
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      throw new Error('Failed to delete video');
    }
  }

  async batchUpdateVideos(updates: Array<{ id: string; updates: Partial<any> }>): Promise<void> {
    try {
      // Convert the interface format to the media-albums format and add updated timestamp
      const mediaAlbumsUpdates = updates.map(({ id, updates }) => ({
        id,
        data: {
          ...updates,
          updated: new Date()
        }
      }));
      const success = await batchUpdateVideosFromMediaAlbums(mediaAlbumsUpdates);
      if (!success) {
        throw new Error('Failed to batch update videos');
      }
    } catch (error) {
      console.error('Error batch updating videos:', error);
      throw new Error('Failed to batch update videos');
    }
  }

  async batchDeleteVideos(ids: string[]): Promise<void> {
    try {
      const success = await batchDeleteVideosFromMediaAlbums(ids);
      if (!success) {
        throw new Error('Failed to batch delete videos');
      }
    } catch (error) {
      console.error('Error batch deleting videos:', error);
      throw new Error('Failed to batch delete videos');
    }
  }

  async syncWithYouTube(): Promise<any[]> {
    try {
      await syncVideosFromMediaAlbums();
      // Return all videos after sync
      return await this.getAllVideos();
    } catch (error) {
      console.error('Error syncing videos:', error);
      throw new Error('Failed to sync videos');
    }
  }
}

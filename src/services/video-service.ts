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
  addVideoRecord as addVideoRecordFromMediaAlbums
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
}

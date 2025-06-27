/**
 * Firebase Image Service Implementation
 *
 * Handles all image-related data operations using Firebase Firestore.
 * Uses the current mountain's configuration for database access.
 */

import type { IImageService } from './interfaces';
import {
  getAllImages as getImagesFromMediaAlbums,
  getCatImages as getCatImagesFromMediaAlbums,
  updateImageTags as updateImageTagsFromMediaAlbums,
  addImageRecord as addImageRecordFromMediaAlbums
} from './media-albums';

export class FirebaseImageService implements IImageService {

  async getAllImages(options?: any): Promise<any[]> {
    try {
      // Delegate to existing media-albums service
      return await getImagesFromMediaAlbums(options);
    } catch (error) {
      console.error('Error fetching images:', error);
      throw new Error('Failed to fetch images');
    }
  }

  async getCatImages(catName: string): Promise<any[]> {
    try {
      // Delegate to existing media-albums service
      return await getCatImagesFromMediaAlbums(catName);
    } catch (error) {
      console.error('Error fetching cat images:', error);
      throw new Error('Failed to fetch cat images');
    }
  }

  async updateImageTags(imageId: string, tags: string[]): Promise<boolean> {
    try {
      // Delegate to existing media-albums service
      return await updateImageTagsFromMediaAlbums(imageId, tags);
    } catch (error) {
      console.error('Error updating image tags:', error);
      throw new Error('Failed to update image tags');
    }
  }

  async addImageRecord(imageData: any): Promise<string | null> {
    try {
      // Delegate to existing media-albums service
      return await addImageRecordFromMediaAlbums(imageData);
    } catch (error) {
      console.error('Error adding image record:', error);
      throw new Error('Failed to add image record');
    }
  }
}
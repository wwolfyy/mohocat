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
  addImageRecord as addImageRecordFromMediaAlbums,
  getImageById as getImageByIdFromMediaAlbums,
  updateImageRecord as updateImageRecordFromMediaAlbums,
  deleteImageRecord as deleteImageRecordFromMediaAlbums,
  batchUpdateImages as batchUpdateImagesFromMediaAlbums,
  batchDeleteImages as batchDeleteImagesFromMediaAlbums,
  syncImages as syncImagesFromMediaAlbums,
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

  // Admin CRUD methods

  async getImageById(imageId: string): Promise<any | null> {
    try {
      return await getImageByIdFromMediaAlbums(imageId);
    } catch (error) {
      console.error('Error fetching image by ID:', error);
      throw new Error('Failed to fetch image by ID');
    }
  }

  async createImage(imageData: any): Promise<string> {
    try {
      // Create is the same as add for images
      const result = await addImageRecordFromMediaAlbums(imageData);
      if (!result) {
        throw new Error('Failed to create image - no ID returned');
      }
      return result;
    } catch (error) {
      console.error('Error creating image:', error);
      throw new Error('Failed to create image');
    }
  }

  async updateImage(id: string, updates: Partial<any>): Promise<void> {
    try {
      // Automatically set the updated timestamp
      const updatesWithTimestamp = {
        ...updates,
        updated: new Date(),
      };

      const success = await updateImageRecordFromMediaAlbums(id, updatesWithTimestamp);
      if (!success) {
        throw new Error('Failed to update image');
      }
    } catch (error) {
      console.error('Error updating image:', error);
      throw new Error('Failed to update image');
    }
  }

  async deleteImage(id: string): Promise<void> {
    try {
      const success = await deleteImageRecordFromMediaAlbums(id);
      if (!success) {
        throw new Error('Failed to delete image');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      throw new Error('Failed to delete image');
    }
  }

  async batchUpdateImages(updates: Array<{ id: string; updates: Partial<any> }>): Promise<void> {
    try {
      // Convert the interface format to the media-albums format and add updated timestamp
      const mediaAlbumsUpdates = updates.map(({ id, updates }) => ({
        id,
        data: {
          ...updates,
          updated: new Date(),
        },
      }));
      const success = await batchUpdateImagesFromMediaAlbums(mediaAlbumsUpdates);
      if (!success) {
        throw new Error('Failed to batch update images');
      }
    } catch (error) {
      console.error('Error batch updating images:', error);
      throw new Error('Failed to batch update images');
    }
  }

  async batchDeleteImages(ids: string[]): Promise<void> {
    try {
      const success = await batchDeleteImagesFromMediaAlbums(ids);
      if (!success) {
        throw new Error('Failed to batch delete images');
      }
    } catch (error) {
      console.error('Error batch deleting images:', error);
      throw new Error('Failed to batch delete images');
    }
  }

  async syncWithStorage(): Promise<any[]> {
    try {
      await syncImagesFromMediaAlbums();
      // Return all images after sync
      return await this.getAllImages();
    } catch (error) {
      console.error('Error syncing images:', error);
      throw new Error('Failed to sync images');
    }
  }
}

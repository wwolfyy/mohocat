/**
 * Firebase Image Service Implementation
 *
 * Handles all image-related data operations using Firebase Firestore.
 * Uses the current mountain's configuration for database access.
 */

import type { IImageService } from './interfaces';
import { getAllImages as getImagesFromMediaAlbums } from './media-albums';

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
}
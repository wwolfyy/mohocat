/**
 * Firebase Storage Service Implementation
 *
 * Handles all storage-related operations using Firebase Storage.
 * Uses the current mountain's configuration for storage access.
 */

import type { IStorageService } from './interfaces';
import { ref, uploadBytes, deleteObject, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export class FirebaseStorageService implements IStorageService {
  async uploadFile(file: File, path: string): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error(`Failed to upload file to ${path}`);
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file at ${path}`);
    }
  }

  async getDownloadUrl(path: string): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error getting download URL:', error);
      throw new Error(`Failed to get download URL for ${path}`);
    }
  }
}

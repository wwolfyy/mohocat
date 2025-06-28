// Service functions for media album system
import { db, storage } from './firebase';
import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc, getDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { CatImage, CatVideo, MediaQueryOptions } from '@/types/media';

// Helper function to safely convert various date formats to a JavaScript Date
const parseDate = (dateValue: any): Date => {
  if (!dateValue) return new Date();

  try {
    // If it's already a Date object
    if (dateValue instanceof Date) {
      return dateValue;
    }

    // If it's a Firebase Timestamp with seconds property
    if (typeof dateValue === 'object' && dateValue.seconds) {
      return new Date(dateValue.seconds * 1000);
    }

    // If it's a Firebase Timestamp with toDate method
    if (typeof dateValue === 'object' && typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }

    // If it's a string or number, try to parse it
    if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      const parsed = new Date(dateValue);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    // If all else fails, return current date
    console.warn('Unable to parse date value:', dateValue, 'using current date instead');
    return new Date();
  } catch (error) {
    console.error('Error parsing date:', dateValue, error);
    return new Date();
  }
};

// Collection names
export const COLLECTIONS = {
  CAT_IMAGES: 'cat_images',
  CAT_VIDEOS: 'cat_videos',
  TAGGING_SESSIONS: 'tagging_sessions'
} as const;

// Get images for a specific cat
export const getCatImages = async (catName: string): Promise<CatImage[]> => {
  try {
    // Use a simpler query to avoid index requirement
    const q = query(
      collection(db, COLLECTIONS.CAT_IMAGES),
      where('tags', 'array-contains', catName)
    );

    const querySnapshot = await getDocs(q);

    const images = querySnapshot.docs.map(doc => {
      const data = doc.data();

      return {
        id: doc.id,
        ...data,
        uploadDate: parseDate(data.uploadDate),
        createdTime: data.createdTime ? parseDate(data.createdTime) : undefined,
        updated: data.updated ? parseDate(data.updated) : undefined
      };
    }) as CatImage[];

    // Sort client-side by uploadDate descending
    return images.sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime());
  } catch (error) {
    console.error(`Error fetching images for cat "${catName}":`, error);
    return [];
  }
};

// Get videos for a specific cat
export const getCatVideos = async (catName: string): Promise<CatVideo[]> => {
  try {
    // Use a simpler query to avoid index requirement
    const q = query(
      collection(db, COLLECTIONS.CAT_VIDEOS),
      where('tags', 'array-contains', catName)
    );

    const querySnapshot = await getDocs(q);

    const videos = querySnapshot.docs.map(doc => {
      const data = doc.data();

      return {
        id: doc.id,
        ...data,
        uploadDate: parseDate(data.uploadDate),
        createdTime: data.createdTime ? parseDate(data.createdTime) : undefined,
        updated: data.updated ? parseDate(data.updated) : undefined
      };
    }) as CatVideo[];

    // Sort client-side by uploadDate descending
    return videos.sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime());
  } catch (error) {
    console.error(`Error fetching videos for cat "${catName}":`, error);
    return [];
  }
};

// Get all images (with optional filtering)
export const getAllImages = async (options: MediaQueryOptions = {}): Promise<CatImage[]> => {
  try {
    let q = collection(db, COLLECTIONS.CAT_IMAGES);
    const constraints = [];

    // Apply tag filtering if specified
    if (options.tags && options.tags.length > 0) {
      constraints.push(where('tags', 'array-contains-any', options.tags));
    }

    // Create query without orderBy to avoid index issues
    const queryRef = constraints.length > 0 ? query(q, ...constraints) : q;
    const querySnapshot = await getDocs(queryRef);

    let results = querySnapshot.docs.map(doc => {
      const data = doc.data();

      return {
        id: doc.id,
        ...data,
        uploadDate: parseDate(data.uploadDate),
        createdTime: data.createdTime ? parseDate(data.createdTime) : undefined,
        updated: data.updated ? parseDate(data.updated) : undefined
      };
    }) as CatImage[];

    // Sort client-side
    const orderField = options.orderBy || 'uploadDate';
    const direction = options.orderDirection || 'desc';

    results.sort((a, b) => {
      const aValue = orderField === 'uploadDate' ? a.uploadDate.getTime() : (a as any)[orderField];
      const bValue = orderField === 'uploadDate' ? b.uploadDate.getTime() : (b as any)[orderField];

      if (direction === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    // Apply limit if specified
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  } catch (error) {
    console.error('Error fetching all images:', error);
    return [];
  }
};

// Get all videos (with optional filtering)
export const getAllVideos = async (options: MediaQueryOptions = {}): Promise<CatVideo[]> => {
  try {
    let q = collection(db, COLLECTIONS.CAT_VIDEOS);
    const constraints = [];

    // Apply tag filtering if specified
    if (options.tags && options.tags.length > 0) {
      constraints.push(where('tags', 'array-contains-any', options.tags));
    }

    // Create query without orderBy to avoid index issues
    const queryRef = constraints.length > 0 ? query(q, ...constraints) : q;
    const querySnapshot = await getDocs(queryRef);

    let results = querySnapshot.docs.map(doc => {
      const data = doc.data();

      return {
        id: doc.id,
        ...data,
        uploadDate: parseDate(data.uploadDate),
        createdTime: data.createdTime ? parseDate(data.createdTime) : undefined,
        updated: data.updated ? parseDate(data.updated) : undefined
      };
    }) as CatVideo[];

    // Sort client-side
    const orderField = options.orderBy || 'uploadDate';
    const direction = options.orderDirection || 'desc';

    results.sort((a, b) => {
      const aValue = orderField === 'uploadDate' ? a.uploadDate.getTime() : (a as any)[orderField];
      const bValue = orderField === 'uploadDate' ? b.uploadDate.getTime() : (b as any)[orderField];

      if (direction === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    // Apply limit if specified
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  } catch (error) {
    console.error('Error fetching all videos:', error);
    return [];
  }
};

// Update tags for an image
export const updateImageTags = async (imageId: string, tags: string[]): Promise<boolean> => {
  try {
    const imageRef = doc(db, COLLECTIONS.CAT_IMAGES, imageId);
    await updateDoc(imageRef, {
      tags: tags,
      updated: new Date()
    });
    return true;
  } catch (error) {
    console.error('Error updating image tags:', error);
    return false;
  }
};

// Update tags for a video - DEPRECATED: Tags are now YouTube-sourced only
// This function is kept for backwards compatibility but will not actually update tags
export const updateVideoTags = async (videoId: string, tags: string[]): Promise<boolean> => {
  try {
    console.warn('WARNING: Video tags are now YouTube-sourced only. Cannot update tags directly in Firebase.');
    console.warn('To update video tags, please edit them in YouTube Studio and then refresh metadata.');
    console.warn(`Attempted to update video ${videoId} with tags:`, tags);
    return false; // Always return false to indicate the operation is not allowed
  } catch (error) {
    console.error('Error in deprecated updateVideoTags function:', error);
    return false;
  }
};

// Add new image record to Firestore
export const addImageRecord = async (imageData: Omit<CatImage, 'id'>): Promise<string | null> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.CAT_IMAGES), {
      ...imageData,
      uploadDate: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding image record:', error);
    return null;
  }
};

// Add new video record to Firestore
export const addVideoRecord = async (videoData: Omit<CatVideo, 'id'>): Promise<string | null> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.CAT_VIDEOS), {
      ...videoData,
      uploadDate: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding video record:', error);
    return null;
  }
};

// Get public URL for a Firebase Storage file
export const getStorageFileUrl = async (storagePath: string): Promise<string | null> => {
  try {
    const fileRef = ref(storage, storagePath);
    const url = await getDownloadURL(fileRef);
    return url;
  } catch (error) {
    console.error('Error getting storage file URL:', error);
    return null;
  }
};

// Additional CRUD operations for images

export const getImageById = async (imageId: string): Promise<CatImage | null> => {
  try {
    const imageRef = doc(db, COLLECTIONS.CAT_IMAGES, imageId);
    const imageDoc = await getDoc(imageRef);

    if (!imageDoc.exists()) {
      return null;
    }

    const data = imageDoc.data();
    return {
      id: imageDoc.id,
      imageUrl: data.imageUrl || data.url || '',
      fileName: data.fileName || '',
      storagePath: data.storagePath || data.storageFilePath || '',
      tags: data.tags || [],
      uploadDate: parseDate(data.uploadDate || data.uploadedAt),
      uploadedBy: data.uploadedBy || 'admin',
      createdTime: data.createdTime ? parseDate(data.createdTime) : undefined,
      description: data.description,
      location: data.location,
      thumbnailUrl: data.thumbnailUrl,
      autoTagged: data.autoTagged || false,
      fileSize: data.fileSize,
      dimensions: data.dimensions
    };
  } catch (error) {
    console.error('Error getting image by ID:', error);
    return null;
  }
};

export const updateImageRecord = async (imageId: string, updateData: Partial<CatImage>): Promise<boolean> => {
  try {
    const imageRef = doc(db, COLLECTIONS.CAT_IMAGES, imageId);
    const { id, ...dataToUpdate } = updateData; // Remove id from update data
    await updateDoc(imageRef, dataToUpdate);
    return true;
  } catch (error) {
    console.error('Error updating image record:', error);
    return false;
  }
};

export const deleteImageRecord = async (imageId: string): Promise<boolean> => {
  try {
    const imageRef = doc(db, COLLECTIONS.CAT_IMAGES, imageId);
    await deleteDoc(imageRef);
    return true;
  } catch (error) {
    console.error('Error deleting image record:', error);
    return false;
  }
};

export const batchUpdateImages = async (updates: Array<{ id: string; data: Partial<CatImage> }>): Promise<boolean> => {
  try {
    const batch = writeBatch(db);

    updates.forEach(({ id, data }) => {
      const imageRef = doc(db, COLLECTIONS.CAT_IMAGES, id);
      const { id: _, ...dataToUpdate } = data; // Remove id from update data
      batch.update(imageRef, dataToUpdate);
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error batch updating images:', error);
    return false;
  }
};

export const batchDeleteImages = async (imageIds: string[]): Promise<boolean> => {
  try {
    const batch = writeBatch(db);

    imageIds.forEach(id => {
      const imageRef = doc(db, COLLECTIONS.CAT_IMAGES, id);
      batch.delete(imageRef);
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error batch deleting images:', error);
    return false;
  }
};

export const syncImages = async (): Promise<boolean> => {
  try {
    // This is a placeholder for sync operations that might involve
    // reconciling with external sources, cleaning up orphaned records, etc.
    console.log('Syncing images...');
    return true;
  } catch (error) {
    console.error('Error syncing images:', error);
    return false;
  }
};

// Additional CRUD operations for videos

export const getVideoById = async (videoId: string): Promise<CatVideo | null> => {
  try {
    const videoRef = doc(db, COLLECTIONS.CAT_VIDEOS, videoId);
    const videoDoc = await getDoc(videoRef);

    if (!videoDoc.exists()) {
      return null;
    }

    const data = videoDoc.data();
    return {
      id: videoDoc.id,
      videoUrl: data.videoUrl || data.url || '',
      storagePath: data.storagePath || data.storageFilePath || '',
      tags: data.tags || [],
      uploadDate: parseDate(data.uploadDate || data.uploadedAt),
      uploadedBy: data.uploadedBy || 'admin',
      createdTime: data.createdTime ? parseDate(data.createdTime) : undefined,
      description: data.description,
      location: data.location,
      thumbnailUrl: data.thumbnailUrl || '',
      duration: data.duration || 0,
      autoTagged: data.autoTagged || false,
      fileSize: data.fileSize,
      videoType: data.videoType || 'storage',
      allPlaylists: data.allPlaylists || []
    };
  } catch (error) {
    console.error('Error getting video by ID:', error);
    return null;
  }
};

export const updateVideoRecord = async (videoId: string, updateData: Partial<CatVideo>): Promise<boolean> => {
  try {
    const videoRef = doc(db, COLLECTIONS.CAT_VIDEOS, videoId);
    const { id, ...dataToUpdate } = updateData; // Remove id from update data
    await updateDoc(videoRef, dataToUpdate);
    return true;
  } catch (error) {
    console.error('Error updating video record:', error);
    return false;
  }
};

export const deleteVideoRecord = async (videoId: string): Promise<boolean> => {
  try {
    const videoRef = doc(db, COLLECTIONS.CAT_VIDEOS, videoId);
    await deleteDoc(videoRef);
    return true;
  } catch (error) {
    console.error('Error deleting video record:', error);
    return false;
  }
};

export const batchUpdateVideos = async (updates: Array<{ id: string; data: Partial<CatVideo> }>): Promise<boolean> => {
  try {
    const batch = writeBatch(db);

    updates.forEach(({ id, data }) => {
      const videoRef = doc(db, COLLECTIONS.CAT_VIDEOS, id);
      const { id: _, ...dataToUpdate } = data; // Remove id from update data
      batch.update(videoRef, dataToUpdate);
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error batch updating videos:', error);
    return false;
  }
};

export const batchDeleteVideos = async (videoIds: string[]): Promise<boolean> => {
  try {
    const batch = writeBatch(db);

    videoIds.forEach(id => {
      const videoRef = doc(db, COLLECTIONS.CAT_VIDEOS, id);
      batch.delete(videoRef);
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error batch deleting videos:', error);
    return false;
  }
};

export const syncVideos = async (): Promise<boolean> => {
  try {
    // This is a placeholder for sync operations that might involve
    // reconciling with external sources, cleaning up orphaned records, etc.
    console.log('Syncing videos...');
    return true;
  } catch (error) {
    console.error('Error syncing videos:', error);
    return false;
  }
};

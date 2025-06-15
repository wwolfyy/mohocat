// Service functions for media album system
import { db, storage } from './firebase';
import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { CatImage, CatVideo, MediaQueryOptions } from '@/types/media';

// Collection names
export const COLLECTIONS = {
  CAT_IMAGES: 'cat_images',
  CAT_VIDEOS: 'cat_videos',
  TAGGING_SESSIONS: 'tagging_sessions'
} as const;

// Get images for a specific cat
export const getCatImages = async (catName: string): Promise<CatImage[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.CAT_IMAGES),
      where('tags', 'array-contains', catName),
      orderBy('uploadDate', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      uploadDate: doc.data().uploadDate?.toDate() || new Date()
    })) as CatImage[];
  } catch (error) {
    console.error('Error fetching cat images:', error);
    return [];
  }
};

// Get videos for a specific cat
export const getCatVideos = async (catName: string): Promise<CatVideo[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.CAT_VIDEOS),
      where('tags', 'array-contains', catName),
      orderBy('uploadDate', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      uploadDate: doc.data().uploadDate?.toDate() || new Date()
    })) as CatVideo[];
  } catch (error) {
    console.error('Error fetching cat videos:', error);
    return [];
  }
};

// Get all images (with optional filtering)
export const getAllImages = async (options: MediaQueryOptions = {}): Promise<CatImage[]> => {
  try {
    let q = collection(db, COLLECTIONS.CAT_IMAGES);

    const constraints = [];

    if (options.needsTagging !== undefined) {
      constraints.push(where('needsTagging', '==', options.needsTagging));
    }

    if (options.tags && options.tags.length > 0) {
      // For multiple tags, we'll need to filter client-side or use array-contains-any
      constraints.push(where('tags', 'array-contains-any', options.tags));
    }

    const orderField = options.orderBy || 'uploadDate';
    const direction = options.orderDirection || 'desc';
    constraints.push(orderBy(orderField, direction));

    const queryRef = query(q, ...constraints);
    const querySnapshot = await getDocs(queryRef);

    let results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      uploadDate: doc.data().uploadDate?.toDate() || new Date()
    })) as CatImage[];

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

    if (options.needsTagging !== undefined) {
      constraints.push(where('needsTagging', '==', options.needsTagging));
    }

    if (options.tags && options.tags.length > 0) {
      constraints.push(where('tags', 'array-contains-any', options.tags));
    }

    const orderField = options.orderBy || 'uploadDate';
    const direction = options.orderDirection || 'desc';
    constraints.push(orderBy(orderField, direction));

    const queryRef = query(q, ...constraints);
    const querySnapshot = await getDocs(queryRef);

    let results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      uploadDate: doc.data().uploadDate?.toDate() || new Date()
    })) as CatVideo[];

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
      needsTagging: tags.length === 0 // If no tags, it still needs tagging
    });
    return true;
  } catch (error) {
    console.error('Error updating image tags:', error);
    return false;
  }
};

// Update tags for a video
export const updateVideoTags = async (videoId: string, tags: string[]): Promise<boolean> => {
  try {
    const videoRef = doc(db, COLLECTIONS.CAT_VIDEOS, videoId);
    await updateDoc(videoRef, {
      tags: tags,
      needsTagging: tags.length === 0
    });
    return true;
  } catch (error) {
    console.error('Error updating video tags:', error);
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

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
    // Filter out undefined values to avoid Firestore errors
    const cleanedData = Object.fromEntries(
      Object.entries({
        ...imageData,
        uploadDate: new Date()
      }).filter(([_, value]) => value !== undefined)
    );

    const docRef = await addDoc(collection(db, COLLECTIONS.CAT_IMAGES), cleanedData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding image record:', error);
    return null;
  }
};

// Add new video record to Firestore
export const addVideoRecord = async (videoData: Omit<CatVideo, 'id'>): Promise<string | null> => {
  try {
    // Filter out undefined values to avoid Firestore errors
    const cleanedData = Object.fromEntries(
      Object.entries({
        ...videoData,
        uploadDate: new Date()
      }).filter(([_, value]) => value !== undefined)
    );

    const docRef = await addDoc(collection(db, COLLECTIONS.CAT_VIDEOS), cleanedData);
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
    console.log('Starting image sync with Firebase Storage...');

    // Import Firebase Storage
    const { getStorage, ref, listAll, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('./firebase');

    // Folders to scan for images in Firebase Storage - only uploads/ and images/
    const SCAN_FOLDERS = ['uploads/', 'images/'];
    const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'];

    let totalFound = 0;
    let totalImported = 0;

    for (const folder of SCAN_FOLDERS) {
      try {
        console.log(`Scanning storage folder: ${folder}`);
        const folderRef = ref(storage, folder);

        let listResult;
        try {
          listResult = await listAll(folderRef);
          console.log(`Successfully listed contents of ${folder} - found ${listResult.items.length} items`);
        } catch (listError) {
          console.log(`Folder ${folder} does not exist or is empty:`, listError);
          continue;
        }

        // Filter for image files
        const imageFiles = listResult.items.filter(item => {
          const fileName = item.name.toLowerCase();
          const isImage = IMAGE_EXTENSIONS.some(ext => fileName.endsWith(ext));
          if (isImage) {
            console.log(`Found image file: ${item.name} at path: ${item.fullPath}`);
          }
          return isImage;
        });

        console.log(`Found ${imageFiles.length} image files in ${folder}`);
        totalFound += imageFiles.length;

        for (const fileRef of imageFiles) {
          try {
            const storagePath = fileRef.fullPath;
            console.log(`Processing file: ${fileRef.name} at ${storagePath}`);

            // Check if already exists in Firestore
            const q = query(
              collection(db, COLLECTIONS.CAT_IMAGES),
              where('storagePath', '==', storagePath)
            );
            const existingDocs = await getDocs(q);

            if (!existingDocs.empty) {
              console.log(`Skipping ${fileRef.name} - already exists in database`);
              continue;
            }

            // Get download URL
            console.log(`Getting download URL for ${fileRef.name}...`);
            const imageUrl = await getDownloadURL(fileRef);
            console.log(`Got download URL: ${imageUrl}`);

            // Create Firestore entry
            const imageData = {
              imageUrl,
              fileName: fileRef.name,
              storagePath,
              tags: [], // Empty initially - needs manual tagging
              uploadDate: new Date(), // Use current date since we can't get original upload date easily
              uploadedBy: 'system_sync',
              description: '',
              location: '',
              autoTagged: false
              // fileSize and dimensions omitted when undefined to avoid Firestore errors
            };

            console.log(`Creating Firestore entry for ${fileRef.name}:`, imageData);
            const docRef = await addDoc(collection(db, COLLECTIONS.CAT_IMAGES), imageData);
            console.log(`✅ Imported: ${fileRef.name} with ID: ${docRef.id}`);
            totalImported++;

          } catch (error) {
            console.error(`❌ Failed to import ${fileRef.name}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error scanning folder ${folder}:`, error);
      }
    }

    console.log(`Image sync complete: ${totalImported}/${totalFound} new images imported`);
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
    console.log('Starting YouTube video discovery and sync...');

    // Import the fetchChannelVideos function
    const { fetchChannelVideos } = await import('./youtube');

    // Fetch all videos from YouTube channel
    console.log('Fetching videos from YouTube channel...');
    const youtubeVideos = await fetchChannelVideos();
    console.log(`Found ${youtubeVideos.length} videos on YouTube channel`);

    // Get existing videos from Firestore
    const existingVideosQuery = query(collection(db, COLLECTIONS.CAT_VIDEOS));
    const existingVideosSnapshot = await getDocs(existingVideosQuery);
    const existingYouTubeIds = new Set();

    existingVideosSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.youtubeId) {
        existingYouTubeIds.add(data.youtubeId);
      }
    });

    console.log(`Found ${existingYouTubeIds.size} existing videos in Firestore`);

    // Find new videos that aren't in Firestore yet
    const newVideos = youtubeVideos.filter(video => !existingYouTubeIds.has(video.id));
    console.log(`Found ${newVideos.length} new videos to import`);

    // Import new videos to Firestore
    let importedCount = 0;
    for (const video of newVideos) {
      try {
        const videoData = {
          youtubeId: video.id,
          videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
          title: video.title,
          description: video.description || '',
          thumbnailUrl: video.thumbnailUrl || '',
          duration: video.duration || 0,
          publishedAt: video.publishedAt,
          channelTitle: video.channelTitle || 'Mountain Cats',
          tags: [],
          location: '',
          videoType: 'youtube' as const,
          uploadedBy: 'youtube_sync',
          autoTagged: false,
          needsTagging: true,
          catName: ''
        };

        console.log(`Importing new video: ${video.title} (${video.id})`);
        const docRef = await addDoc(collection(db, COLLECTIONS.CAT_VIDEOS), videoData);
        console.log(`✅ Imported video with Firestore ID: ${docRef.id}`);
        importedCount++;
      } catch (error) {
        console.error(`❌ Failed to import video ${video.title}:`, error);
      }
    }

    console.log(`Video sync complete: ${importedCount}/${newVideos.length} new videos imported`);
    console.log(`Total videos on YouTube: ${youtubeVideos.length}`);
    console.log(`Total videos in Firestore: ${existingYouTubeIds.size + importedCount}`);

    return true;
  } catch (error) {
    console.error('Error in video sync:', error);
    return false;
  }
};

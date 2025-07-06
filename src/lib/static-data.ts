import { getFirebaseConfig } from '@/utils/config';
import type { Point, Cat } from '@/types';

// Get Firebase configuration to determine the storage bucket
const firebaseConfig = getFirebaseConfig();

if (!firebaseConfig || !firebaseConfig.projectId) {
  throw new Error('Firebase configuration is missing or invalid. Please check your environment variables.');
}

// Cloud Storage base URL for static data (public access)
const CLOUD_STORAGE_BASE = 'https://firebasestorage.googleapis.com/v0/b/mountaincats-61543.firebasestorage.app/o/static-data%2F';

// Cache for static data to avoid repeated fetches
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchFromCloudStorage<T>(filename: string): Promise<T> {
  const cacheKey = filename;
  const now = Date.now();

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const encodedFilename = encodeURIComponent(filename);
    const response = await fetch(`${CLOUD_STORAGE_BASE}${encodedFilename}?alt=media`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${filename}: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Cache the result
    cache.set(cacheKey, { data, timestamp: now });

    return data;
  } catch (error) {
    console.error(`Error fetching ${filename} from Cloud Storage:`, error);
    throw error;
  }
}

export async function getAllPoints(): Promise<Point[]> {
  return fetchFromCloudStorage<Point[]>('points-static-data.json');
}

export async function getAllCats(): Promise<Cat[]> {
  return fetchFromCloudStorage<Cat[]>('cats-static-data.json');
}

export async function getFeedingSpotNames(): Promise<string[]> {
  return fetchFromCloudStorage<string[]>('feeding-spots-static-data.json');
}

export async function getCatsByPointId(pointId: string, allCatsInput?: Cat[]): Promise<{
  current: Cat[];
  former: Cat[];
}> {
  const catsToFilter = allCatsInput || await getAllCats();
  const current = catsToFilter.filter((cat: Cat) => cat.dwelling === pointId);
  const former = catsToFilter.filter((cat: Cat) => cat.prev_dwelling === pointId);

  return { current, former };
}

'use client';

import { useState, useEffect } from 'react';
import { getMountainAbout, getCurrentMountainId } from '@/utils/config';

interface UseAboutPhotoResult {
  photoUrl: string | null;
  loading: boolean;
  error: string | null;
}

export function useAboutPhoto(filename: string): UseAboutPhotoResult {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filename) {
      setLoading(false);
      return;
    }

    const loadPhoto = async () => {
      try {
        setLoading(true);
        setError(null);

        const aboutConfig = getMountainAbout();

        // Check if we have a local static path from build-time fetching
        if (aboutConfig.mainPhoto?.localPath) {
          console.log('Using static local path for about photo:', aboutConfig.mainPhoto.localPath);
          setPhotoUrl(aboutConfig.mainPhoto.localPath);
          return;
        }

        // Fallback to Firebase Storage if local path not available
        console.log('Local path not available, falling back to Firebase Storage');
        const { getStorageUrl } = await import('@/lib/firebase');
        const mountainId = getCurrentMountainId();
        const storagePath = `about-photos/${mountainId}/${filename}`;
        const url = await getStorageUrl(storagePath);
        setPhotoUrl(url);
      } catch (err) {
        console.error('Error loading about photo:', err);
        setError('Failed to load photo');
      } finally {
        setLoading(false);
      }
    };

    loadPhoto();
  }, [filename]);

  return { photoUrl, loading, error };
}

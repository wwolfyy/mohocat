'use client';

import { useState, useEffect } from 'react';
import { getStorageUrl } from '@/lib/firebase';
import { getCurrentMountainId } from '@/utils/config';

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
    }    const loadPhoto = async () => {
      try {
        setLoading(true);
        setError(null);

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

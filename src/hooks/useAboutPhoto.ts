'use client';

import { useState, useEffect } from 'react';
import { getStorageService } from '@/services';
import { useMountain } from '@/components/MountainProvider';

interface UseAboutPhotoResult {
  photoUrl: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Resolves the about page's 대표 사진 from Firebase Storage, live.
 *
 * The `filename` comes from the CMS (`about_content/{mountainId}.mainPhoto`),
 * which is the sole source of truth for the about page.
 *
 * ⚠️ This used to short-circuit to a `localPath` baked into
 * `mountains.json` at build time, which meant the *image* came from static
 * config while its 제목/설명 came from Firestore — so changing the photo in the
 * CMS silently kept rendering the old one. The build-time leg is gone; the
 * filename entered in the CMS is now what loads.
 */
export function useAboutPhoto(filename: string): UseAboutPhotoResult {
  const mountainId = useMountain();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filename) {
      setPhotoUrl(null);
      setError(null);
      setLoading(false);
      return;
    }

    const loadPhoto = async () => {
      try {
        setLoading(true);
        setError(null);

        const storagePath = `about-photos/${mountainId}/${filename}`;
        const url = await getStorageService().getDownloadUrl(storagePath);
        setPhotoUrl(url);
      } catch (err) {
        console.error(`Error loading about photo '${filename}' for ${mountainId}:`, err);
        setPhotoUrl(null);
        setError('사진을 불러오지 못했어요.');
      } finally {
        setLoading(false);
      }
    };

    loadPhoto();
  }, [filename, mountainId]);

  return { photoUrl, loading, error };
}

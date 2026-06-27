'use client';

import { useState, useEffect } from 'react';
import type { Cat } from '@/types';
import CatCircleGrid from '@/components/CatCircleGrid';
import CatInfo from '@/components/CatInfo';
import Modal from '@/components/ui/Modal';
import { thumbnailPreloader } from '@/services/thumbnailPreloader';

/**
 * Client island for the 입양홍보 gallery (§7a): the adoptable cats are read +
 * filtered server-side and passed in; this only owns the interactive bits —
 * the circular card grid and the `CatInfo` detail modal — plus warming the
 * thumbnail image files into cache (no Firestore).
 */
export default function AdoptionGallery({ cats }: { cats: Cat[] }) {
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);

  useEffect(() => {
    const thumbnailUrls = cats
      .map((cat) => cat.thumbnailUrl)
      .filter((url) => url && url.trim() !== '');
    if (thumbnailUrls.length > 0) {
      thumbnailPreloader.preloadThumbnails(thumbnailUrls).catch((err) => {
        console.warn('Error preloading adoption thumbnails:', err);
      });
    }
  }, [cats]);

  return (
    <>
      <CatCircleGrid cats={cats} onSelect={setSelectedCat} priorityCount={8} />

      {selectedCat && (
        <Modal onClose={() => setSelectedCat(null)} size="xl">
          <CatInfo cat={selectedCat} />
        </Modal>
      )}
    </>
  );
}

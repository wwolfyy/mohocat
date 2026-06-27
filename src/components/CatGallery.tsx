'use client';

import { useState, useEffect } from 'react';
import type { Cat } from '@/types';
import CatInfo from './CatInfo';
import CatCircleGrid from './CatCircleGrid';
import Modal from './ui/Modal';
import { thumbnailPreloader } from '@/services/thumbnailPreloader';

interface CatGalleryProps {
  // §7a: the point's cats are baked upstream (server-read) and passed in — the
  // gallery no longer fetches on open, so there's no spinner on marker click.
  cats: { current: Cat[]; former: Cat[] };
  onClose: () => void;
}

interface CatGridSectionProps {
  title: string;
  cats: Cat[];
  emptyLabel: string;
  priorityCount: number;
  onSelect: (cat: Cat) => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 text-center">
      <h3 className="text-lg font-bold text-gray-900">{children}</h3>
      <div className="mx-auto mt-1.5 h-1 w-10 rounded-full bg-brand-400" />
    </div>
  );
}

function CatGridSection({ title, cats, emptyLabel, priorityCount, onSelect }: CatGridSectionProps) {
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      {cats.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">{emptyLabel}</p>
      ) : (
        <CatCircleGrid cats={cats} onSelect={onSelect} priorityCount={priorityCount} />
      )}
    </div>
  );
}

export default function CatGallery({ cats, onClose }: CatGalleryProps) {
  const { current: currentResidents, former: formerResidents } = cats;
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);

  // Warm the thumbnail image files into cache (no Firestore — data is baked).
  useEffect(() => {
    const thumbnailUrls = [...currentResidents, ...formerResidents]
      .map((cat) => cat.thumbnailUrl)
      .filter((url) => url && url.trim() !== '');

    if (thumbnailUrls.length > 0) {
      thumbnailPreloader.preloadThumbnails(thumbnailUrls).catch((error) => {
        console.warn('Error preloading gallery thumbnails:', error);
      });
    }
  }, [currentResidents, formerResidents]);

  return (
    <Modal onClose={onClose} size="xl">
      <div className="space-y-8">
        <CatGridSection
          title="현재 거주 중"
          cats={currentResidents}
          emptyLabel="현재 거주 중인 냥이가 없어요"
          priorityCount={6}
          onSelect={setSelectedCat}
        />
        <CatGridSection
          title="예전에 거주"
          cats={formerResidents}
          emptyLabel="아직 기록이 없어요"
          priorityCount={3}
          onSelect={setSelectedCat}
        />
      </div>

      {selectedCat && (
        <Modal onClose={() => setSelectedCat(null)} size="xl" zIndexClassName="z-[60]">
          <CatInfo cat={selectedCat} />
        </Modal>
      )}
    </Modal>
  );
}

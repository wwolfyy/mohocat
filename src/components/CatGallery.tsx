'use client';

import { useState, useEffect } from 'react';
import type { Cat } from '@/types';
import CatInfo from './CatInfo';
import CatCircleGrid from './CatCircleGrid';
import Modal from './ui/Modal';
import { getCatService } from '@/services';
import { thumbnailPreloader } from '@/services/thumbnailPreloader';

interface CatGalleryProps {
  pointId: string;
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

export default function CatGallery({ pointId, onClose }: CatGalleryProps) {
  const [currentResidents, setCurrentResidents] = useState<Cat[]>([]);
  const [formerResidents, setFormerResidents] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);
  const [, setThumbnailsPreloaded] = useState(false);
  useEffect(() => {
    const loadCats = async () => {
      try {
        const catService = getCatService();
        const { current, former } = await catService.getCatsByPointId(pointId);
        setCurrentResidents(current);
        setFormerResidents(former);

        // Preload all thumbnails for faster display
        const allCats = [...current, ...former];
        const thumbnailUrls = allCats
          .map((cat) => cat.thumbnailUrl)
          .filter((url) => url && url.trim() !== '');

        if (thumbnailUrls.length > 0) {
          // Start preloading thumbnails in the background
          thumbnailPreloader
            .preloadThumbnails(thumbnailUrls)
            .then(() => {
              setThumbnailsPreloaded(true);
            })
            .catch((error) => {
              console.warn('Error preloading gallery thumbnails:', error);
              setThumbnailsPreloaded(true); // Still allow display even if preloading fails
            });
        } else {
          setThumbnailsPreloaded(true);
        }
      } catch (error) {
        console.error('Error loading cats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCats();
  }, [pointId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-brand-400" />
      </div>
    );
  }

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

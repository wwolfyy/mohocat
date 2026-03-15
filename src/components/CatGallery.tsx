'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { Cat } from '@/types';
import { cn } from '@/utils/cn';
import { XMarkIcon } from '@heroicons/react/24/outline';
import CatInfo from './CatInfo';
import { getCatService } from '@/services';
import { thumbnailPreloader } from '@/services/thumbnailPreloader';

interface CatGalleryProps {
  pointId: string;
  onClose: () => void;
}

export default function CatGallery({ pointId, onClose }: CatGalleryProps) {
  const [currentResidents, setCurrentResidents] = useState<Cat[]>([]);
  const [formerResidents, setFormerResidents] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);
  const [thumbnailsPreloaded, setThumbnailsPreloaded] = useState(false);
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
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        data-oid="n9d2vhr"
      >
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"
          data-oid="i09:49o"
        />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-4"
      onClick={onClose}
      data-oid="mk2ow4y"
    >
      <div
        className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 relative my-auto min-h-fit"
        onClick={(e) => e.stopPropagation()}
        data-oid="jr1uymd"
      >
        {/* Close Button - Top Right Corner */}
        <button
          onClick={onClose}
          className={cn(
            'absolute top-4 right-4 w-8 h-8 bg-red-500 hover:bg-red-600',
            'text-white rounded font-bold hover:shadow-lg transition-all duration-200',
            'flex items-center justify-center z-10'
          )}
          data-oid="va6xhmp"
        >
          <XMarkIcon className="h-5 w-5" data-oid="i0__elx" />
        </button>
        {/* <h2 className="text-2xl font-bold mb-4">{pointId}</h2> */}
        {/* Current Residents Section */}
        <div className="mb-8" data-oid="ogf.fia">
          <h3 className="text-xl font-semibold mb-4 text-center" data-oid="ra..lvx">
            현재 거주 중
          </h3>
          {/* Use flexbox to wrap and center items, including incomplete rows */}{' '}
          <div className="flex flex-wrap justify-center gap-4" data-oid="a4.0aol">
            {currentResidents.map((cat, index) => (
              <div
                key={cat.id}
                onClick={() => setSelectedCat(cat)}
                className={cn(
                  'cursor-pointer', // Removed 'group' and 'relative'
                  'transition-transform duration-200 hover:scale-110 w-28' // Reduced width
                )}
                data-oid=".ze13c3"
              >
                <div
                  className="aspect-square rounded-full overflow-hidden border-4 border-white shadow-lg"
                  data-oid="xy3qc36"
                >
                  {' '}
                  <Image
                    src={cat.thumbnailUrl}
                    alt={cat.name}
                    width={112}
                    height={112}
                    className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                    data-oid="25hbi.n"
                    sizes="112px"
                    quality={85}
                    priority={index < 6} // Prioritize first 6 thumbnails
                  />
                </div>
                {/* Static name display below the thumbnail */}
                <div
                  className="mt-1.5 text-center text-sm font-medium text-gray-700 w-full truncate"
                  data-oid="inf.q28"
                >
                  {cat.name}
                </div>
              </div>
            ))}
          </div>{' '}
          {/* Closes "flex flex-wrap justify-center gap-4" for current residents */}
          {currentResidents.length === 0 && (
            <p className="text-gray-500 text-center py-4" data-oid="ucitfdf">
              ...
            </p>
          )}
          {/* Former Residents Section */}
        </div>{' '}
        {/* Closes "mb-8" for Current Residents section */}
        <div data-oid="-b7bp8j">
          <h3 className="text-xl font-semibold mb-4 text-center" data-oid="ncxfg.l">
            예전에 거주
          </h3>
          {/* Use flexbox to wrap and center items, including incomplete rows */}
          <div className="flex flex-wrap justify-center gap-4" data-oid="aw2-423">
            {formerResidents.map((cat, index) => (
              <div
                key={cat.id}
                onClick={() => setSelectedCat(cat)}
                className={cn(
                  'cursor-pointer', // Removed 'group' and 'relative'
                  'transition-transform duration-200 hover:scale-110 w-28' // Reduced width
                )}
                data-oid="tfme8ni"
              >
                <div
                  className="aspect-square rounded-full overflow-hidden border-4 border-white shadow-lg"
                  data-oid="tmuobxm"
                >
                  {' '}
                  <Image
                    src={cat.thumbnailUrl}
                    alt={cat.name}
                    width={112}
                    height={112}
                    className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                    data-oid="o8z9b:f"
                    sizes="112px"
                    quality={85}
                    priority={index < 3} // Prioritize first 3 former residents
                  />
                </div>
                {/* Static name display below the thumbnail */}
                <div
                  className="mt-1.5 text-center text-sm font-medium text-gray-700 w-full truncate"
                  data-oid=":108ram"
                >
                  {cat.name}
                </div>
              </div>
            ))}
          </div>{' '}
          {/* Closes "flex flex-wrap justify-center gap-4" for former residents */}
          {formerResidents.length === 0 && (
            <p className="text-gray-500 text-center py-4" data-oid="u2ojpec">
              ...
            </p>
          )}
        </div>{' '}
        {/* Closes the main div for Former Residents section */}
        {/* Cat Detail Modal */}
        {selectedCat && (
          <div
            className="fixed inset-0 bg-black/75 flex items-start justify-center z-[60] overflow-y-auto py-4"
            onClick={() => setSelectedCat(null)}
            data-oid="ehcnrgj"
          >
            <div
              className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 relative my-auto min-h-fit"
              onClick={(e) => e.stopPropagation()}
              data-oid="zc8pxsf"
            >
              {/* Close Button - Top Right Corner */}
              <button
                onClick={() => setSelectedCat(null)}
                className={cn(
                  'absolute top-4 right-4 w-8 h-8 bg-red-500 hover:bg-red-600',
                  'text-white rounded font-bold hover:shadow-lg transition-all duration-200',
                  'flex items-center justify-center z-10'
                )}
                data-oid="u-fu.pl"
              >
                <XMarkIcon className="h-5 w-5" data-oid="nsg1:l5" />
              </button>
              <CatInfo cat={selectedCat} data-oid="khjxil3" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

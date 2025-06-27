'use client';

import { useState, useEffect } from 'react';
import type { Cat } from '@/types';
import { cn } from '@/utils/cn';
import { XMarkIcon } from '@heroicons/react/24/outline';
import CatInfo from './CatInfo';
import { getCatService } from '@/services';

interface CatGalleryProps {
  pointId: string;
  onClose: () => void;
}

export default function CatGallery({ pointId, onClose }: CatGalleryProps) {
  const [currentResidents, setCurrentResidents] = useState<Cat[]>([]);
  const [formerResidents, setFormerResidents] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);  useEffect(() => {    const loadCats = async () => {
      try {
        const catService = getCatService();
        const { current, former } = await catService.getCatsByPointId(pointId);
        setCurrentResidents(current);
        setFormerResidents(former);
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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-4">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 relative my-auto min-h-fit">
        {/* Close Button - Top Right Corner */}
        <button
          onClick={onClose}
          className={cn(
            "absolute top-4 right-4 w-8 h-8 bg-red-500 hover:bg-red-600",
            "text-white rounded font-bold hover:shadow-lg transition-all duration-200",
            "flex items-center justify-center z-10"
          )}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        {/* <h2 className="text-2xl font-bold mb-4">{pointId}</h2> */}

        {/* Current Residents Section */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-center">현재 거주 중</h3>
          {/* Use flexbox to wrap and center items, including incomplete rows */}          <div className="flex flex-wrap justify-center gap-4">
              {currentResidents.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCat(cat)}
                  className={cn(
                    "cursor-pointer", // Removed 'group' and 'relative'
                    "transition-transform duration-200 hover:scale-110 w-28" // Reduced width
                  )}
                >
                  <div className="aspect-square rounded-full overflow-hidden border-4 border-white shadow-lg">                    <img
                      src={cat.thumbnailUrl}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                    />
                  </div>
                  {/* Static name display below the thumbnail */}
                  <div className="mt-1.5 text-center text-sm font-medium text-gray-700 w-full truncate">
                    {cat.name}
                  </div>
                </div>
              ))}
          </div> {/* Closes "flex flex-wrap justify-center gap-4" for current residents */}
          {currentResidents.length === 0 && (
            <p className="text-gray-500 text-center py-4">
              ...
            </p>
          )}

        {/* Former Residents Section */}
        </div> {/* Closes "mb-8" for Current Residents section */}
        <div>
          <h3 className="text-xl font-semibold mb-4 text-center">예전에 거주</h3>
          {/* Use flexbox to wrap and center items, including incomplete rows */}
          <div className="flex flex-wrap justify-center gap-4">
              {formerResidents.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCat(cat)}
                  className={cn(
                    "cursor-pointer", // Removed 'group' and 'relative'
                    "transition-transform duration-200 hover:scale-110 w-28" // Reduced width
                  )}
                >
                  <div className="aspect-square rounded-full overflow-hidden border-4 border-white shadow-lg">
                    <img
                      src={cat.thumbnailUrl}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                    />
                  </div>
                  {/* Static name display below the thumbnail */}
                  <div className="mt-1.5 text-center text-sm font-medium text-gray-700 w-full truncate">
                    {cat.name}
                  </div>
                </div>
              ))}
          </div> {/* Closes "flex flex-wrap justify-center gap-4" for former residents */}
          {formerResidents.length === 0 && (
            <p className="text-gray-500 text-center py-4">
              ...
            </p>
          )}
        </div> {/* Closes the main div for Former Residents section */}

        {/* Cat Detail Modal */}
        {selectedCat && (
          <div className="fixed inset-0 bg-black/75 flex items-start justify-center z-[60] overflow-y-auto py-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 relative my-auto min-h-fit">
              {/* Close Button - Top Right Corner */}
              <button
                onClick={() => setSelectedCat(null)}
                className={cn(
                  "absolute top-4 right-4 w-8 h-8 bg-red-500 hover:bg-red-600",
                  "text-white rounded font-bold hover:shadow-lg transition-all duration-200",
                  "flex items-center justify-center z-10"
                )}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              <CatInfo cat={selectedCat} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
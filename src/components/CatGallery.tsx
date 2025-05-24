'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Cat } from '@/types';
import { cn } from '@/utils/cn';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface CatGalleryProps {
  pointId: string;
  onClose: () => void;
}

export default function CatGallery({ pointId, onClose }: CatGalleryProps) {
  const [cats, setCats] = useState<Cat[]>([]);
  const [currentResidents, setCurrentResidents] = useState<Cat[]>([]);
  const [formerResidents, setFormerResidents] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);

  useEffect(() => {
    const loadCats = async () => {
      try {
        console.log('Loading cats for pointId:', pointId);
        const catsCollection = collection(db, 'cats');

        // Query for current residents
        const currentQuery = query(
          catsCollection,
          where('dwelling', '==', pointId)
        );

        // Query for former residents
        const prevQuery = query(
          catsCollection,
          where('prev_dwelling', '==', pointId)
        );

        const [currentCats, prevCats] = await Promise.all([
          getDocs(currentQuery),
          getDocs(prevQuery)
        ]);

        // Process current residents
        const currentResidents = currentCats.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Cat[];

        // Process former residents
        const formerResidents = prevCats.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Cat[];

        setCats([...currentResidents, ...formerResidents]);
        setCurrentResidents(currentResidents);
        setFormerResidents(formerResidents);
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        <h2 className="text-2xl font-bold mb-4">Cats at {pointId}</h2>

        {/* Current Residents Section */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Current Residents</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {currentResidents.map((cat) => (
              <div
                key={cat.id}
                onClick={() => setSelectedCat(cat)}
                className={cn(
                  "cursor-pointer group relative",
                  "transition-transform duration-200 hover:scale-110"
                )}
              >
                <div className="aspect-square rounded-full overflow-hidden border-4 border-white shadow-lg">
                  <img
                    src={cat.thumbnailUrl}
                    alt={cat.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/50 text-white text-sm font-medium px-2 py-1 rounded-full">
                    {cat.name}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {currentResidents.length === 0 && (
            <p className="text-gray-500 text-center py-4">
              No current residents at this location.
            </p>
          )}
        </div>

        {/* Former Residents Section */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Former Residents</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {formerResidents.map((cat) => (
              <div
                key={cat.id}
                onClick={() => setSelectedCat(cat)}
                className={cn(
                  "cursor-pointer group relative",
                  "transition-transform duration-200 hover:scale-110"
                )}
              >
                <div className="aspect-square rounded-full overflow-hidden border-4 border-white shadow-lg">
                  <img
                    src={cat.thumbnailUrl}
                    alt={cat.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/50 text-white text-sm font-medium px-2 py-1 rounded-full">
                    {cat.name}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {formerResidents.length === 0 && (
            <p className="text-gray-500 text-center py-4">
              No former residents at this location.
            </p>
          )}
        </div>

        {/* Cat Detail Modal */}
        {selectedCat && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 relative">
              <button
                onClick={() => setSelectedCat(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>

              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/3">
                  <img
                    src={selectedCat.thumbnailUrl}
                    alt={selectedCat.name}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                </div>
                <div className="w-full md:w-2/3">
                  <h3 className="text-2xl font-bold mb-2">{selectedCat.name}</h3>
                  {selectedCat.alt_name && (
                    <p className="text-gray-600 mb-4">Also known as: {selectedCat.alt_name}</p>
                  )}
                  {selectedCat.description && (
                    <p className="text-gray-700 mb-4">{selectedCat.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {selectedCat.date_of_birth && (
                      <div>
                        <span className="font-semibold">Birth Year:</span> {selectedCat.date_of_birth}
                      </div>
                    )}
                    {selectedCat.sex && (
                      <div>
                        <span className="font-semibold">Sex:</span> {selectedCat.sex}
                      </div>
                    )}
                    {selectedCat.status && (
                      <div>
                        <span className="font-semibold">Status:</span> {selectedCat.status}
                      </div>
                    )}
                    {selectedCat.dwelling && (
                      <div>
                        <span className="font-semibold">Current Location:</span> {selectedCat.dwelling}
                      </div>
                    )}
                    {selectedCat.prev_dwelling && (
                      <div>
                        <span className="font-semibold">Previous Location:</span> {selectedCat.prev_dwelling}
                      </div>
                    )}
                  </div>
                  {selectedCat.character && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Character</h4>
                      <p className="text-gray-700">{selectedCat.character}</p>
                    </div>
                  )}
                  {selectedCat.sickness && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Health Notes</h4>
                      <p className="text-gray-700">{selectedCat.sickness}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
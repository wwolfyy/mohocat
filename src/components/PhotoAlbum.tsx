'use client';

import { useState, useEffect } from 'react';
import { FaSearchPlus } from 'react-icons/fa';
import { getImageService } from '@/services';
import { CatImage } from '@/types/media';
import { parseDate } from '@/utils/parse-date';
import MediaTile from '@/components/album/MediaTile';
import Modal from './ui/Modal';
import Lightbox from './ui/Lightbox';
import { useMountain } from '@/components/MountainProvider';

interface PhotoAlbumProps {
  isOpen: boolean;
  onClose: () => void;
  catName: string;
}

export default function PhotoAlbum({ isOpen, onClose, catName }: PhotoAlbumProps) {
  const mountainId = useMountain();
  const [images, setImages] = useState<CatImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  // Load images when the album opens
  useEffect(() => {
    if (isOpen && catName) {
      loadImages();
    }
  }, [isOpen, catName]);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setSelectedImageIndex(null);
      setError(null);
    }
  }, [isOpen]);
  const loadImages = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`Loading images for cat: ${catName}`);

      // Try to get cat-specific images first
      const imageService = getImageService(mountainId);
      const catImages = await imageService.getCatImages(catName);
      console.log(`Found ${catImages.length} images for ${catName}`);

      if (catImages.length === 0) {
        // If no cat-specific images found, let's try to get all images for debugging
        console.log(
          'No cat-specific images found, checking if there are any images in the database...'
        );
        try {
          const allImages = await imageService.getAllImages({ limit: 10 });
          console.log(`Total images in database: ${allImages.length}`);

          if (allImages.length > 0) {
            console.log('Sample image structure:', allImages[0]);
            console.log(
              'Available tags in first few images:',
              allImages.slice(0, 5).map((img) => ({ fileName: img.fileName, tags: img.tags }))
            );
          }
        } catch (debugError) {
          console.error('Error during debugging query:', debugError);
        }
      }

      setImages(catImages);
    } catch (err) {
      console.error('Error loading cat images:', err);
      setError('사진을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
  };

  const closeLightbox = () => {
    setSelectedImageIndex(null);
  };

  const goToPrevious = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedImageIndex !== null && selectedImageIndex < images.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`${catName}의 사진첩`} size="xl">
        {/* Refresh - top-left mirror of the close button */}
        <button
          onClick={loadImages}
          disabled={loading}
          aria-label="새로고침"
          title="새로고침"
          className="absolute top-4 left-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors duration-200 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-40"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12 text-gray-500">
              사진을 불러오는 중...
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center py-12 text-red-600">{error}</div>
          )}
          {!loading && !error && images.length === 0 && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              아직 등록된 사진이 없어요
            </div>
          )}
          {!loading && !error && images.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
              {images.map((image, index) => {
                const createdDate = parseDate(image.createdTime);
                return (
                  <MediaTile
                    key={image.id}
                    aspect="square"
                    tags={image.tags}
                    thumbnailUrl={image.thumbnailUrl || image.imageUrl}
                    fallbackUrl={image.imageUrl}
                    alt={image.fileName}
                    description={image.description}
                    meta={createdDate ? createdDate.toLocaleDateString('ko-KR') : '날짜 없음'}
                    overlayIcon={<FaSearchPlus className="h-7 w-7" />}
                    onClick={() => openLightbox(index)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* Lightbox */}
      {selectedImageIndex !== null && images[selectedImageIndex] && (
        <Lightbox
          image={images[selectedImageIndex]}
          onClose={closeLightbox}
          onPrevious={goToPrevious}
          onNext={goToNext}
          hasPrevious={selectedImageIndex > 0}
          hasNext={selectedImageIndex < images.length - 1}
        />
      )}
    </>
  );
}

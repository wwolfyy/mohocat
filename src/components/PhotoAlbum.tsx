'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getImageService } from '@/services';
import { CatImage } from '@/types/media';
import { cn } from '@/utils/cn';

// Helper function to safely convert various date formats to a JavaScript Date
const parseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;

  try {
    // If it's already a Date object
    if (dateValue instanceof Date) {
      return dateValue;
    }

    // If it's a Firebase Timestamp with seconds property
    if (typeof dateValue === 'object' && dateValue.seconds) {
      return new Date(dateValue.seconds * 1000);
    }

    // If it's a Firebase Timestamp with toDate method
    if (typeof dateValue === 'object' && typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }

    // If it's a string or number
    if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : date;
    }

    return null;
  } catch (error) {
    console.warn('Error parsing date:', dateValue, error);
    return null;
  }
};

interface PhotoAlbumProps {
  isOpen: boolean;
  onClose: () => void;
  catName: string;
}

interface LightboxProps {
  image: CatImage;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

function Lightbox({ image, onClose, onPrevious, onNext, hasPrevious, hasNext }: LightboxProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasPrevious) onPrevious();
          break;
        case 'ArrowRight':
          if (hasNext) onNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrevious, onNext, hasPrevious, hasNext]);

  // Reset loading state when image changes
  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
  }, [image.imageUrl]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-90 pt-4 pb-4 overflow-y-auto"
      onClick={onClose}
    >
      {/* Close button - fixed to viewport but styled to be clearly visible */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-50 text-white hover:text-red-400 text-3xl font-bold bg-red-600 bg-opacity-90 hover:bg-opacity-100 rounded-full w-12 h-12 flex items-center justify-center shadow-xl border-2 border-white transition-all duration-200"
        aria-label="Close"
      >
        ×
      </button>
      {/* Previous button */}
      {hasPrevious && (
        <button
          onClick={onPrevious}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 text-white hover:text-gray-300 text-3xl font-bold"
          aria-label="Previous image"
        >
          ‹
        </button>
      )}
      {/* Next button */}
      {hasNext && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 text-white hover:text-gray-300 text-3xl font-bold"
          aria-label="Next image"
        >
          ›
        </button>
      )}{' '}
      {/* Main image container */}
      <div className="w-full max-w-4xl max-h-[calc(100vh-2rem)] p-4 relative bg-white bg-opacity-5 rounded-2xl backdrop-blur-sm mx-4">
        {imageLoading && !imageError && (
          <div className="flex items-center justify-center w-full h-64">
            <div className="text-white">이미지를 불러오는 중...</div>
          </div>
        )}

        {imageError && (
          <div className="flex items-center justify-center w-full h-64">
            <div className="text-white">이미지를 불러올 수 없습니다.</div>
          </div>
        )}

        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <Image
            src={image.imageUrl}
            alt={image.fileName}
            width={800}
            height={600}
            className={`max-w-full max-h-full object-contain rounded-xl ${imageLoading ? 'hidden' : ''}`}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
          />
        </div>
        {/* Image info */}
        {!imageLoading && !imageError && (
          <div className="mt-4 text-white text-center">
            {image.description && (
              <p className="text-sm text-black mt-1 bg-white bg-opacity-90 px-3 py-1 rounded">
                {image.description}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {(() => {
                const createdDate = parseDate(image.createdTime);
                return createdDate ? createdDate.toLocaleDateString('ko-KR') : '날짜 없음';
              })()}
            </p>
            {image.tags && image.tags.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">태그: {image.tags.join(', ')}</p>
            )}
          </div>
        )}
      </div>
      {/* Click overlay to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} aria-label="Close lightbox" />
    </div>
  );
}

export default function PhotoAlbum({ isOpen, onClose, catName }: PhotoAlbumProps) {
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
      const imageService = getImageService();
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
      {/* Main modal */}
      <div
        className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-75"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden mx-4 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button - Top Right Corner */}
          <button
            onClick={onClose}
            className={cn(
              'absolute top-4 right-4 w-8 h-8 bg-red-500 hover:bg-red-600',
              'text-white rounded font-bold hover:shadow-lg transition-all duration-200',
              'flex items-center justify-center z-10'
            )}
            aria-label="Close album"
          >
            ×
          </button>

          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b pr-16">
            <h2 className="text-xl font-bold">{catName}의 사진첩</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={loadImages}
                disabled={loading}
                className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 p-1"
                title="새로고침"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-600">사진을 불러오는 중...</div>
              </div>
            )}
            {error && (
              <div className="flex justify-center items-center py-12">
                <div className="text-red-600">{error}</div>
              </div>
            )}
            {!loading && !error && images.length === 0 && (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-600">등록된 사진이 없습니다.</div>
              </div>
            )}{' '}
            {!loading && !error && images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className="aspect-square cursor-pointer group relative overflow-hidden rounded-lg bg-gray-200"
                    onClick={() => openLightbox(index)}
                  >
                    <Image
                      src={image.thumbnailUrl || image.imageUrl}
                      alt={image.fileName}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      onError={(e) => {
                        // Fallback to main image URL if thumbnail fails
                        const target = e.target as HTMLImageElement;
                        if (target.src === image.thumbnailUrl) {
                          target.src = image.imageUrl;
                        }
                      }}
                      sizes="200px"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <svg
                          className="w-8 h-8 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                          />
                        </svg>
                      </div>
                    </div>{' '}
                    {/* Image info overlay */}{' '}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                      <p className="text-white text-xs truncate">
                        {image.description || '설명 없음'}
                      </p>
                      <p className="text-white text-xs opacity-75">
                        {(() => {
                          const createdDate = parseDate(image.createdTime);
                          return createdDate
                            ? createdDate.toLocaleDateString('ko-KR')
                            : '날짜 없음';
                        })()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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

'use client';

import { useState, useEffect } from 'react';
import { FaCamera, FaSearch, FaSearchPlus } from 'react-icons/fa';
import { getImageService } from '@/services';
import { CatImage } from '@/types/media';
import { parseDate } from '@/utils/parse-date';
import { useMediaFilter } from '@/hooks/useMediaFilter';
import AlbumFilterBar from '@/components/album/AlbumFilterBar';
import MediaTile from '@/components/album/MediaTile';
import { AlbumLoading, AlbumMessage, ResultCount } from '@/components/album/AlbumStates';
import Lightbox from '@/components/ui/Lightbox';

export default function PhotoAlbumPage() {
  const [images, setImages] = useState<CatImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const {
    searchQuery,
    setSearchQuery,
    selectedCatNames,
    setSelectedCatNames,
    filtered: filteredImages,
  } = useMediaFilter(images);

  useEffect(() => {
    loadAllImages();
  }, []);

  const loadAllImages = async () => {
    try {
      setLoading(true);
      setError(null);
      const imageService = getImageService();
      const allImages = await imageService.getAllImages({ limit: 100 }); // Get first 100 images
      setImages(allImages);
    } catch (err) {
      console.error('Error loading images:', err);
      setError('이미지를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const closeLightbox = () => setSelectedImageIndex(null);
  const goToPrevious = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };
  const goToNext = () => {
    if (selectedImageIndex !== null && selectedImageIndex < filteredImages.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AlbumFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCatNames={Array.from(selectedCatNames)}
          onCatNamesChange={(names) => setSelectedCatNames(new Set(names))}
        />

        {loading && <AlbumLoading label="사진을 불러오는 중..." />}

        {error && (
          <AlbumMessage tone="error" icon={<FaCamera className="h-6 w-6" />}>
            {error}
          </AlbumMessage>
        )}

        {!loading && !error && filteredImages.length === 0 && images.length > 0 && (
          <AlbumMessage icon={<FaSearch className="h-6 w-6" />}>검색 결과가 없습니다.</AlbumMessage>
        )}

        {!loading && !error && images.length === 0 && (
          <AlbumMessage icon={<FaCamera className="h-6 w-6" />}>
            아직 등록된 사진이 없어요.
          </AlbumMessage>
        )}

        {!loading && !error && filteredImages.length > 0 && (
          <>
            <ResultCount
              count={filteredImages.length}
              unit="장"
              searchQuery={searchQuery}
              catCount={selectedCatNames.size}
            />

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredImages.map((image, index) => {
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
                    onClick={() => setSelectedImageIndex(index)}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>

      {selectedImageIndex !== null && filteredImages[selectedImageIndex] && (
        <Lightbox
          image={filteredImages[selectedImageIndex]}
          onClose={closeLightbox}
          onPrevious={goToPrevious}
          onNext={goToNext}
          hasPrevious={selectedImageIndex > 0}
          hasNext={selectedImageIndex < filteredImages.length - 1}
        />
      )}
    </div>
  );
}

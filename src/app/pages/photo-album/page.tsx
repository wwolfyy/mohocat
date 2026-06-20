'use client';

import { useState, useEffect } from 'react';
import { getImageService } from '@/services';
import { CatImage } from '@/types/media';
import { parseDate } from '@/utils/parse-date';
import CatSelectorModal from '@/components/CatSelectorModal';
import Lightbox from '@/components/ui/Lightbox';
export default function PhotoAlbumPage() {
  const [images, setImages] = useState<CatImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredImages, setFilteredImages] = useState<CatImage[]>([]);
  // Filter states
  const [showCatSelector, setShowCatSelector] = useState(false);
  const [selectedCatNames, setSelectedCatNames] = useState<Set<string>>(new Set());
  // Load all images when component mounts
  useEffect(() => {
    loadAllImages();
  }, []);
  // Filter images based on search query and selected cat names
  useEffect(() => {
    let filtered = images;

    // Apply text search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (image) =>
          image.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          image.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply cat name filter
    if (selectedCatNames.size > 0) {
      filtered = filtered.filter((image) => image.tags.some((tag) => selectedCatNames.has(tag)));
    }

    setFilteredImages(filtered);
  }, [images, searchQuery, selectedCatNames]);
  const loadAllImages = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading all images...');

      const imageService = getImageService();
      const allImages = await imageService.getAllImages({ limit: 100 }); // Get first 100 images
      console.log(`Found ${allImages.length} images`);

      setImages(allImages);
    } catch (err) {
      console.error('Error loading images:', err);
      setError('이미지를 불러오는 중 오류가 발생했습니다.');
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
    if (selectedImageIndex !== null && selectedImageIndex < filteredImages.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };
  // Cat filter handlers
  const removeCatFilter = (catName: string) => {
    setSelectedCatNames((prev) => {
      const next = new Set(prev);
      next.delete(catName);
      return next;
    });
  };

  const clearCatFilter = () => {
    setSelectedCatNames(new Set());
  };

  return (
    <div className="min-h-screen bg-gray-50" data-oid="f:ug0m1">
      {/* Header */}
      <div className="bg-white shadow-sm" data-oid="c-s4cg_">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-oid="4c72572">
          <h1 className="text-3xl font-bold text-gray-900 text-center" data-oid="2ip13qw">
            사진첩
          </h1>
          <p className="text-gray-600 text-center mt-2" data-oid="rzcnaj3">
            {/* 산양이 고양이들의 소중한 순간들 */}
          </p>
        </div>
      </div>{' '}
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-oid="zv_xr.h">
        {/* Search and Filter bar */}
        <div className="mb-8" data-oid="0ixjx:3">
          <div className="max-w-4xl mx-auto" data-oid="nr0l8b.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-oid="1rq4gxf">
              {/* Search input */}
              <div className="relative" data-oid="tpj1u3j">
                <input
                  type="text"
                  placeholder="고양이 이름이나 설명으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  data-oid="fp5yi_."
                />

                <svg
                  className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  data-oid="ds_g5q2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    data-oid="eevgnvu"
                  />
                </svg>
              </div>{' '}
              {/* Filter input */}
              <div className="relative" data-oid="q1t958a">
                {/* Selected cat tags display */}
                {selectedCatNames.size > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1" data-oid="m75u2rw">
                    {Array.from(selectedCatNames).map((catName) => (
                      <span
                        key={catName}
                        className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                        data-oid="bd1r5u4"
                      >
                        {catName}
                        <button
                          onClick={() => removeCatFilter(catName)}
                          className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 text-blue-600 hover:text-blue-800"
                          data-oid="z6poncz"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Click area to open cat selector */}
                <div
                  onClick={() => setShowCatSelector(true)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 cursor-pointer min-h-[40px] flex items-center justify-between bg-gray-50 hover:bg-gray-100"
                  data-oid="xq7gm1z"
                >
                  <span className="text-gray-600 text-sm" data-oid="tvkb9:.">
                    {selectedCatNames.size > 0
                      ? '클릭하여 더 많은 고양이 추가'
                      : '클릭하여 고양이 선택'}
                  </span>
                  <span className="text-blue-500 hover:text-blue-700 text-sm" data-oid="kqbwtb6">
                    🐱 고양이 선택
                  </span>
                </div>

                {/* Clear filter button */}
                {selectedCatNames.size > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearCatFilter();
                    }}
                    className="absolute -top-2 -right-2 text-gray-500 hover:text-red-600 transition-colors bg-white rounded-full p-1 shadow-sm border"
                    title="필터 초기화"
                    data-oid="2zwvijs"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      data-oid="6nk.03r"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                        data-oid="7bhjcyr"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Active filters display */}
            {selectedCatNames.size > 0 && (
              <div className="mt-3" data-oid="jhw0l1n">
                <div className="flex flex-wrap gap-2" data-oid="mf04zqg">
                  <span className="text-sm text-gray-600" data-oid="._23g_d">
                    필터된 고양이:
                  </span>
                  {Array.from(selectedCatNames).map((catName) => (
                    <span
                      key={catName}
                      className="inline-flex items-center bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                      data-oid="sjt2kuh"
                    >
                      {catName}{' '}
                      <button
                        onClick={() => removeCatFilter(catName)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                        data-oid="b60vxw7"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center py-12" data-oid="3z7uiss">
            <div className="text-gray-600" data-oid="cq1845w">
              사진을 불러오는 중...
            </div>
          </div>
        )}
        {/* Error state */}
        {error && (
          <div className="flex justify-center items-center py-12" data-oid="_krhhi9">
            <div className="text-red-600" data-oid="f4g1-lx">
              {error}
            </div>
          </div>
        )}
        {/* Empty state */}
        {!loading && !error && filteredImages.length === 0 && images.length > 0 && (
          <div className="flex justify-center items-center py-12" data-oid="q9cz44j">
            <div className="text-gray-600" data-oid="w73ek5m">
              검색 결과가 없습니다.
            </div>
          </div>
        )}
        {!loading && !error && images.length === 0 && (
          <div className="flex justify-center items-center py-12" data-oid="klvl4sb">
            <div className="text-gray-600" data-oid="avk3ark">
              등록된 사진이 없습니다.
            </div>
          </div>
        )}{' '}
        {/* Image grid */}
        {!loading && !error && filteredImages.length > 0 && (
          <>
            <div className="mb-4 text-center text-gray-600" data-oid="eck5kj9">
              {(() => {
                const hasFilters = searchQuery.trim() || selectedCatNames.size > 0;
                if (hasFilters) {
                  const filterDesc = [];
                  if (searchQuery.trim()) filterDesc.push(`"${searchQuery}"`);
                  if (selectedCatNames.size > 0)
                    filterDesc.push(`${selectedCatNames.size}마리 고양이`);
                  return `${filterDesc.join(' + ')} 검색 결과: ${filteredImages.length}장`;
                } else {
                  return `전체 ${filteredImages.length}장`;
                }
              })()}
            </div>

            <div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
              data-oid="_e.qwdn"
            >
              {filteredImages.map((image, index) => (
                <div
                  key={image.id}
                  className="aspect-square cursor-pointer group relative overflow-hidden rounded-lg bg-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
                  onClick={() => openLightbox(index)}
                  data-oid="r292z7."
                >
                  <img
                    src={image.thumbnailUrl || image.imageUrl}
                    alt={image.fileName}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    onError={(e) => {
                      // Fallback to main image URL if thumbnail fails
                      const target = e.target as HTMLImageElement;
                      if (target.src === image.thumbnailUrl) {
                        target.src = image.imageUrl;
                      }
                    }}
                    data-oid=".6dy8rs"
                  />

                  {/* Hover overlay */}
                  <div
                    className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200 flex items-center justify-center"
                    data-oid="p6j.044"
                  >
                    <div
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      data-oid=":aoia5h"
                    >
                      <svg
                        className="w-8 h-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        data-oid="gk.mv:t"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                          data-oid="6y1.13i"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Image info overlay */}
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2"
                    data-oid="alpiui8"
                  >
                    <p className="text-white text-xs truncate" data-oid="d83rmqg">
                      {image.description || '설명 없음'}
                    </p>
                    <p className="text-white text-xs opacity-75" data-oid="zom4:lg">
                      {(() => {
                        const createdDate = parseDate(image.createdTime);
                        return createdDate ? createdDate.toLocaleDateString('ko-KR') : '날짜 없음';
                      })()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>{' '}
      {/* Lightbox */}
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
      {/* Cat Selector Modal */}
      <CatSelectorModal
        isOpen={showCatSelector}
        onClose={() => setShowCatSelector(false)}
        selectedTags={Array.from(selectedCatNames)}
        onTagsChange={(names) => setSelectedCatNames(new Set(names))}
      />
    </div>
  );
}

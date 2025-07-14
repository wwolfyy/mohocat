"use client";

import { useState, useEffect } from "react";
import { getImageService, getCatService } from "@/services";
import { CatImage } from "@/types/media";
import { Cat } from "@/types";
import { cn } from "@/utils/cn";
import FirebaseDebugger from "@/components/FirebaseDebugger";

// Helper function to safely convert various date formats to a JavaScript Date
const parseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;

  try {
    // If it's already a Date object
    if (dateValue instanceof Date) {
      return dateValue;
    }

    // If it's a Firebase Timestamp with seconds property
    if (typeof dateValue === "object" && dateValue.seconds) {
      return new Date(dateValue.seconds * 1000);
    }

    // If it's a Firebase Timestamp with toDate method
    if (
      typeof dateValue === "object" &&
      typeof dateValue.toDate === "function"
    ) {
      return dateValue.toDate();
    }

    // If it's a string or number
    if (typeof dateValue === "string" || typeof dateValue === "number") {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : date;
    }

    return null;
  } catch (error) {
    console.warn("Error parsing date:", dateValue, error);
    return null;
  }
};

interface LightboxProps {
  image: CatImage;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

// Lightbox component for viewing individual images
function Lightbox({
  image,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: LightboxProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (hasPrevious) onPrevious();
          break;
        case "ArrowRight":
          if (hasNext) onNext();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onPrevious, onNext, hasPrevious, hasNext]);

  // Reset loading state when image changes
  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
  }, [image.imageUrl]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-90 pt-4 pb-4 overflow-y-auto"
      data-oid="raw0dak"
    >
      {/* Close button - fixed to viewport but styled to be clearly visible */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-50 text-white hover:text-red-400 text-3xl font-bold bg-red-600 bg-opacity-90 hover:bg-opacity-100 rounded-full w-12 h-12 flex items-center justify-center shadow-xl border-2 border-white transition-all duration-200"
        aria-label="Close"
        data-oid="oym18wm"
      >
        ×
      </button>

      {/* Previous button */}
      {hasPrevious && (
        <button
          onClick={onPrevious}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 text-white hover:text-gray-300 text-3xl font-bold"
          aria-label="Previous image"
          data-oid="tegsoto"
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
          data-oid="v_82rfe"
        >
          ›
        </button>
      )}

      {/* Main image container */}
      <div
        className="w-full max-w-4xl max-h-[calc(100vh-2rem)] p-4 relative bg-white bg-opacity-5 rounded-2xl backdrop-blur-sm mx-4"
        data-oid="zjdqc9a"
      >
        {imageLoading && !imageError && (
          <div
            className="flex items-center justify-center w-full h-64"
            data-oid="jv9zcuc"
          >
            <div className="text-white" data-oid="qm:-y9u">
              이미지를 불러오는 중...
            </div>
          </div>
        )}

        {imageError && (
          <div
            className="flex items-center justify-center w-full h-64"
            data-oid="bzlt66z"
          >
            <div className="text-white" data-oid="6jr.vwv">
              이미지를 불러올 수 없습니다.
            </div>
          </div>
        )}

        <div className="relative" data-oid="3afxwkr">
          <img
            src={image.imageUrl}
            alt={image.fileName}
            className={`max-w-full max-h-full object-contain rounded-xl ${imageLoading ? "hidden" : ""}`}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
            data-oid="5ift86c"
          />
        </div>

        {/* Image info */}
        {!imageLoading && !imageError && (
          <div className="mt-4 text-white text-center" data-oid="h-p76x8">
            {image.description && (
              <p
                className="text-sm text-black mt-1 bg-white bg-opacity-90 px-3 py-1 rounded"
                data-oid="oxlb0_g"
              >
                {image.description}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1" data-oid="3vx:4d7">
              {(() => {
                const createdDate = parseDate(image.createdTime);
                return createdDate
                  ? createdDate.toLocaleDateString("ko-KR")
                  : "날짜 없음";
              })()}
            </p>
            {image.tags && image.tags.length > 0 && (
              <p className="text-xs text-gray-400 mt-1" data-oid=":8r0l.6">
                태그: {image.tags.join(", ")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Click overlay to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
        aria-label="Close lightbox"
        data-oid="ua5x7n-"
      />
    </div>
  );
}

export default function PhotoAlbumPage() {
  const [images, setImages] = useState<CatImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredImages, setFilteredImages] = useState<CatImage[]>([]);
  // Filter states
  const [cats, setCats] = useState<Cat[]>([]);
  const [showCatSelector, setShowCatSelector] = useState(false);
  const [catSearchQuery, setCatSearchQuery] = useState("");
  const [selectedCatNames, setSelectedCatNames] = useState<Set<string>>(
    new Set(),
  );
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  // Load all images when component mounts
  useEffect(() => {
    loadAllImages();
    loadCats();
  }, []);
  // Filter images based on search query and selected cat names
  useEffect(() => {
    let filtered = images;

    // Apply text search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (image) =>
          image.description
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          image.tags.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      );
    }

    // Apply cat name filter
    if (selectedCatNames.size > 0) {
      filtered = filtered.filter((image) =>
        image.tags.some((tag) => selectedCatNames.has(tag)),
      );
    }

    setFilteredImages(filtered);
  }, [images, searchQuery, selectedCatNames]);
  const loadAllImages = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Loading all images...");

      const imageService = getImageService();
      const allImages = await imageService.getAllImages({ limit: 100 }); // Get first 100 images
      console.log(`Found ${allImages.length} images`);

      setImages(allImages);
    } catch (err) {
      console.error("Error loading images:", err);
      setError("이미지를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const loadCats = async () => {
    try {
      const catService = getCatService();
      const catsData = await catService.getAllCats();
      setCats(catsData);
    } catch (error) {
      console.error("Error loading cats:", error);
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
    if (
      selectedImageIndex !== null &&
      selectedImageIndex < filteredImages.length - 1
    ) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };
  // Cat filter handlers
  const handleCatToggle = (catId: string, catName: string) => {
    const newSelectedCats = new Set(selectedCats);
    if (newSelectedCats.has(catId)) {
      newSelectedCats.delete(catId);
    } else {
      newSelectedCats.add(catId);
    }
    setSelectedCats(newSelectedCats);

    // Update selected cat names for filtering
    const selectedCatNamesSet = new Set(selectedCatNames);
    if (selectedCatNamesSet.has(catName)) {
      selectedCatNamesSet.delete(catName);
    } else {
      selectedCatNamesSet.add(catName);
    }
    setSelectedCatNames(selectedCatNamesSet);
  };

  const handleFilterInputClick = () => {
    setShowCatSelector(true);
    // Pre-select cats that are currently filtered
    const preSelectedCats = new Set<string>();
    cats.forEach((cat) => {
      if (selectedCatNames.has(cat.name)) {
        preSelectedCats.add(cat.id);
      }
    });
    setSelectedCats(preSelectedCats);
  };

  const clearCatFilter = () => {
    setSelectedCatNames(new Set());
    setSelectedCats(new Set());
  };

  const filteredCats = cats.filter(
    (cat) =>
      cat.name.toLowerCase().includes(catSearchQuery.toLowerCase()) ||
      cat.alt_name?.toLowerCase().includes(catSearchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50" data-oid="f:ug0m1">
      {/* Header */}
      <div className="bg-white shadow-sm" data-oid="c-s4cg_">
        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          data-oid="4c72572"
        >
          <h1
            className="text-3xl font-bold text-gray-900 text-center"
            data-oid="2ip13qw"
          >
            사진첩
          </h1>
          <p className="text-gray-600 text-center mt-2" data-oid="rzcnaj3">
            산양이 고양이들의 소중한 순간들
          </p>
        </div>
      </div>{" "}
      {/* Content */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        data-oid="zv_xr.h"
      >
        {/* Search and Filter bar */}
        <div className="mb-8" data-oid="0ixjx:3">
          <div className="max-w-4xl mx-auto" data-oid="nr0l8b.">
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              data-oid="1rq4gxf"
            >
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
              </div>{" "}
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
                          onClick={() => {
                            const cat = cats.find((c) => c.name === catName);
                            if (cat) {
                              handleCatToggle(cat.id, cat.name);
                            }
                          }}
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
                  onClick={handleFilterInputClick}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 cursor-pointer min-h-[40px] flex items-center justify-between bg-gray-50 hover:bg-gray-100"
                  data-oid="xq7gm1z"
                >
                  <span className="text-gray-600 text-sm" data-oid="tvkb9:.">
                    {selectedCatNames.size > 0
                      ? "클릭하여 더 많은 고양이 추가"
                      : "클릭하여 고양이 선택"}
                  </span>
                  <span
                    className="text-blue-500 hover:text-blue-700 text-sm"
                    data-oid="kqbwtb6"
                  >
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
                      {catName}{" "}
                      <button
                        onClick={() => {
                          const cat = cats.find((c) => c.name === catName);
                          if (cat) {
                            handleCatToggle(cat.id, catName);
                          }
                        }}
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
          <div
            className="flex justify-center items-center py-12"
            data-oid="3z7uiss"
          >
            <div className="text-gray-600" data-oid="cq1845w">
              사진을 불러오는 중...
            </div>
          </div>
        )}
        {/* Error state */}
        {error && (
          <div
            className="flex justify-center items-center py-12"
            data-oid="_krhhi9"
          >
            <div className="text-red-600" data-oid="f4g1-lx">
              {error}
            </div>
          </div>
        )}
        {/* Empty state */}
        {!loading &&
          !error &&
          filteredImages.length === 0 &&
          images.length > 0 && (
            <div
              className="flex justify-center items-center py-12"
              data-oid="q9cz44j"
            >
              <div className="text-gray-600" data-oid="w73ek5m">
                검색 결과가 없습니다.
              </div>
            </div>
          )}
        {!loading && !error && images.length === 0 && (
          <div
            className="flex justify-center items-center py-12"
            data-oid="klvl4sb"
          >
            <div className="text-gray-600" data-oid="avk3ark">
              등록된 사진이 없습니다.
            </div>
          </div>
        )}{" "}
        {/* Image grid */}
        {!loading && !error && filteredImages.length > 0 && (
          <>
            <div className="mb-4 text-center text-gray-600" data-oid="eck5kj9">
              {(() => {
                const hasFilters =
                  searchQuery.trim() || selectedCatNames.size > 0;
                if (hasFilters) {
                  const filterDesc = [];
                  if (searchQuery.trim()) filterDesc.push(`"${searchQuery}"`);
                  if (selectedCatNames.size > 0)
                    filterDesc.push(`${selectedCatNames.size}마리 고양이`);
                  return `${filterDesc.join(" + ")} 검색 결과: ${filteredImages.length}장`;
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
                    <p
                      className="text-white text-xs truncate"
                      data-oid="d83rmqg"
                    >
                      {image.description || "설명 없음"}
                    </p>
                    <p
                      className="text-white text-xs opacity-75"
                      data-oid="zom4:lg"
                    >
                      {(() => {
                        const createdDate = parseDate(image.createdTime);
                        return createdDate
                          ? createdDate.toLocaleDateString("ko-KR")
                          : "날짜 없음";
                      })()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>{" "}
      {/* Lightbox */}
      {selectedImageIndex !== null && filteredImages[selectedImageIndex] && (
        <Lightbox
          image={filteredImages[selectedImageIndex]}
          onClose={closeLightbox}
          onPrevious={goToPrevious}
          onNext={goToNext}
          hasPrevious={selectedImageIndex > 0}
          hasNext={selectedImageIndex < filteredImages.length - 1}
          data-oid="zwf8ift"
        />
      )}
      {/* Cat Selector Modal */}
      {showCatSelector && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          data-oid=".q6t9ja"
        >
          <div
            className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 flex flex-col"
            data-oid="i9ktdk."
          >
            <div
              className="flex justify-between items-center mb-4"
              data-oid="077m_9e"
            >
              <h3 className="text-lg font-semibold" data-oid="bsmgajs">
                고양이 선택
              </h3>
              <button
                onClick={() => setShowCatSelector(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
                data-oid="09fzva3"
              >
                ×
              </button>
            </div>

            {/* Search input */}
            <div className="mb-4" data-oid="si-6.dh">
              <input
                type="text"
                placeholder="고양이 이름으로 검색..."
                value={catSearchQuery}
                onChange={(e) => setCatSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                data-oid="qfo_w3z"
              />
            </div>

            {/* Cat list */}
            <div
              className="flex-1 overflow-y-auto border border-gray-200 rounded"
              data-oid="myg6hst"
            >
              {filteredCats.length === 0 ? (
                <div
                  className="p-4 text-center text-gray-500"
                  data-oid="tg2pea3"
                >
                  {cats.length === 0
                    ? "데이터베이스에 고양이가 없습니다"
                    : "검색 결과가 없습니다"}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 p-4" data-oid=":cugd5:">
                  {filteredCats.map((cat) => (
                    <label
                      key={cat.id}
                      className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-50 ${
                        selectedCats.has(cat.id)
                          ? "bg-blue-50 border border-blue-200"
                          : "border border-gray-200"
                      }`}
                      data-oid="c8o7m2."
                    >
                      <input
                        type="checkbox"
                        checked={selectedCats.has(cat.id)}
                        onChange={() => handleCatToggle(cat.id, cat.name)}
                        className="mr-2"
                        data-oid="_l:ssy8"
                      />

                      <div className="flex-1" data-oid="meh_2n1">
                        <div className="font-medium text-sm" data-oid="m79gh38">
                          {cat.name}
                        </div>
                        {cat.alt_name && (
                          <div
                            className="text-xs text-gray-500"
                            data-oid="g:ooag5"
                          >
                            ({cat.alt_name})
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 mt-4" data-oid="8r9k9r-">
              {" "}
              <button
                onClick={() => {
                  setSelectedCats(new Set());
                  setSelectedCatNames(new Set());
                }}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                data-oid="pde7gvi"
              >
                전체 해제
              </button>
              <button
                onClick={() => setShowCatSelector(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                data-oid="5oajfjp"
              >
                완료 ({selectedCats.size}마리 선택됨)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Firebase Debugger - only shows in development */}
      <FirebaseDebugger />
    </div>
  );
}

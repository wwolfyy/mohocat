'use client';

import { useState, useEffect } from 'react';
import { getAllVideos } from '@/services/media-albums';
import { CatVideo } from '@/types/media';
import { Cat } from '@/types';
import { cn } from '@/utils/cn';
import { formatDuration } from '@/utils/duration';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';

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

interface VideoPlayerProps {
  video: CatVideo;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

// Video player component for viewing individual videos
function VideoPlayer({ video, onClose, onPrevious, onNext, hasPrevious, hasNext }: VideoPlayerProps) {
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

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

  // Reset loading state when video changes
  useEffect(() => {
    setVideoLoading(true);
    setVideoError(false);
  }, [video.videoUrl]);

  const renderVideoPlayer = () => {
    if (video.videoType === 'youtube') {
      // Extract YouTube video ID from URL
      const videoId = video.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      if (!videoId) {
        return (
          <div className="flex items-center justify-center w-full h-64">
            <div className="text-white">유효하지 않은 YouTube URL입니다.</div>
          </div>
        );
      }

      return (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full rounded-lg"
          onLoad={() => setVideoLoading(false)}
          onError={() => {
            setVideoLoading(false);
            setVideoError(true);
          }}
        />
      );
    } else {
      // For storage videos, use HTML5 video element
      return (
        <video
          src={video.videoUrl}
          controls
          autoPlay
          className="w-full h-full rounded-lg object-contain"
          onLoadedData={() => setVideoLoading(false)}
          onError={() => {
            setVideoLoading(false);
            setVideoError(true);
          }}
        />
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-90 pt-4 pb-4 overflow-y-auto">
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
          aria-label="Previous video"
        >
          ‹
        </button>
      )}

      {/* Next button */}
      {hasNext && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 text-white hover:text-gray-300 text-3xl font-bold"
          aria-label="Next video"
        >
          ›
        </button>
      )}

      {/* Main video container */}
      <div className="w-full max-w-6xl max-h-[calc(100vh-2rem)] p-4 relative bg-white bg-opacity-5 rounded-2xl backdrop-blur-sm mx-4">
        {videoLoading && !videoError && (
          <div className="flex items-center justify-center w-full h-64">
            <div className="text-white">동영상을 불러오는 중...</div>
          </div>
        )}

        {videoError && (
          <div className="flex items-center justify-center w-full h-64">
            <div className="text-white">동영상을 불러올 수 없습니다.</div>
          </div>
        )}

        <div className="relative aspect-video">
          {renderVideoPlayer()}
        </div>

        {/* Video info */}
        {!videoLoading && !videoError && (
          <div className="mt-4 text-white text-center">
            {video.description && (
              <p className="text-sm text-black mt-1 bg-white bg-opacity-90 px-3 py-1 rounded">{video.description}</p>
            )}
            <div className="flex justify-center items-center gap-4 mt-2 text-sm text-gray-300">
              <span>
                {(() => {
                  const createdDate = parseDate(video.createdTime);
                  return createdDate
                    ? createdDate.toLocaleDateString('ko-KR')
                    : '날짜 없음';
                })()}
              </span>
              {video.duration && (
                <span>{formatDuration(video.duration)}</span>
              )}
              <span className="capitalize">{video.videoType}</span>
            </div>
            {video.tags && video.tags.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                태그: {video.tags.join(', ')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Click overlay to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
        aria-label="Close video player"
      />
    </div>
  );
}

export default function VideoAlbumPage() {
  const [videos, setVideos] = useState<CatVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredVideos, setFilteredVideos] = useState<CatVideo[]>([]);

  // Filter states
  const [cats, setCats] = useState<Cat[]>([]);
  const [showCatSelector, setShowCatSelector] = useState(false);
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [selectedCatNames, setSelectedCatNames] = useState<Set<string>>(new Set());
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());

  // Load all videos when component mounts
  useEffect(() => {
    loadAllVideos();
    loadCats();
  }, []);

  // Filter videos based on search query and selected cat names
  useEffect(() => {
    let filtered = videos;

    // Apply text search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(video =>
        video.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply cat name filter
    if (selectedCatNames.size > 0) {
      filtered = filtered.filter(video =>
        video.tags.some(tag => selectedCatNames.has(tag))
      );
    }

    setFilteredVideos(filtered);
  }, [videos, searchQuery, selectedCatNames]);

  const loadAllVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading all videos...');

      const allVideos = await getAllVideos({ limit: 100 }); // Get first 100 videos
      console.log(`Found ${allVideos.length} videos`);

      setVideos(allVideos);
    } catch (err) {
      console.error('Error loading videos:', err);
      setError('동영상을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadCats = async () => {
    try {
      const catsSnapshot = await getDocs(collection(db, 'cats'));
      const catsData = catsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Cat[];
      setCats(catsData);
    } catch (error) {
      console.error('Error loading cats:', error);
    }
  };

  const openVideoPlayer = (index: number) => {
    setSelectedVideoIndex(index);
  };

  const closeVideoPlayer = () => {
    setSelectedVideoIndex(null);
  };

  const goToPrevious = () => {
    if (selectedVideoIndex !== null && selectedVideoIndex > 0) {
      setSelectedVideoIndex(selectedVideoIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedVideoIndex !== null && selectedVideoIndex < filteredVideos.length - 1) {
      setSelectedVideoIndex(selectedVideoIndex + 1);
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
    cats.forEach(cat => {
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

  const filteredCats = cats.filter(cat =>
    cat.name.toLowerCase().includes(catSearchQuery.toLowerCase()) ||
    cat.alt_name?.toLowerCase().includes(catSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 text-center">동영상첩</h1>
          <p className="text-gray-600 text-center mt-2">산양이 고양이들의 소중한 동영상 순간들</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter bar */}
        <div className="mb-8">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="고양이 이름이나 설명으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Filter input */}
              <div className="relative">
                {/* Selected cat tags display */}
                {selectedCatNames.size > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {Array.from(selectedCatNames).map((catName) => (
                      <span
                        key={catName}
                        className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                      >
                        {catName}
                        <button
                          onClick={() => {
                            const cat = cats.find(c => c.name === catName);
                            if (cat) {
                              handleCatToggle(cat.id, cat.name);
                            }
                          }}
                          className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 text-blue-600 hover:text-blue-800"
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
                >
                  <span className="text-gray-600 text-sm">
                    {selectedCatNames.size > 0 ? '클릭하여 더 많은 고양이 추가' : '클릭하여 고양이 선택'}
                  </span>
                  <span className="text-blue-500 hover:text-blue-700 text-sm">
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
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Active filters display */}
            {selectedCatNames.size > 0 && (
              <div className="mt-3">
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-gray-600">필터된 고양이:</span>
                  {Array.from(selectedCatNames).map((catName) => (
                    <span
                      key={catName}
                      className="inline-flex items-center bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                    >
                      {catName}
                      <button
                        onClick={() => {
                          const cat = cats.find(c => c.name === catName);
                          if (cat) {
                            handleCatToggle(cat.id, catName);
                          }
                        }}
                        className="ml-2 text-blue-600 hover:text-blue-800"
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
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-600">동영상을 불러오는 중...</div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex justify-center items-center py-12">
            <div className="text-red-600">{error}</div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredVideos.length === 0 && videos.length > 0 && (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-600">검색 결과가 없습니다.</div>
          </div>
        )}

        {!loading && !error && videos.length === 0 && (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-600">등록된 동영상이 없습니다.</div>
          </div>
        )}

        {/* Video grid */}
        {!loading && !error && filteredVideos.length > 0 && (
          <>
            <div className="mb-4 text-center text-gray-600">
              {(() => {
                const hasFilters = searchQuery.trim() || selectedCatNames.size > 0;
                if (hasFilters) {
                  const filterDesc = [];
                  if (searchQuery.trim()) filterDesc.push(`"${searchQuery}"`);
                  if (selectedCatNames.size > 0) filterDesc.push(`${selectedCatNames.size}마리 고양이`);
                  return `${filterDesc.join(' + ')} 검색 결과: ${filteredVideos.length}개`;
                } else {
                  return `전체 ${filteredVideos.length}개`;
                }
              })()}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredVideos.map((video, index) => (
                <div
                  key={video.id}
                  className="aspect-video cursor-pointer group relative overflow-hidden rounded-lg bg-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
                  onClick={() => openVideoPlayer(index)}
                >
                  {/* Video thumbnail */}
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.description || 'Video thumbnail'}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      onError={(e) => {
                        // Fallback for missing thumbnails
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>

                  {/* Video info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                    <p className="text-white text-xs truncate">
                      {video.description || '설명 없음'}
                    </p>
                    <div className="flex justify-between items-center text-white text-xs opacity-75 mt-1">
                      <span>
                        {(() => {
                          const createdDate = parseDate(video.createdTime);
                          return createdDate
                            ? createdDate.toLocaleDateString('ko-KR')
                            : '날짜 없음';
                        })()}
                      </span>
                      {video.duration && (
                        <span>{formatDuration(video.duration)}</span>
                      )}
                    </div>

                    {/* Video type indicator */}
                    <div className="absolute top-2 right-2">
                      {video.videoType === 'youtube' ? (
                        <div className="bg-red-600 text-white text-xs px-2 py-1 rounded">
                          YouTube
                        </div>
                      ) : (
                        <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                          Storage
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Video Player */}
      {selectedVideoIndex !== null && filteredVideos[selectedVideoIndex] && (
        <VideoPlayer
          video={filteredVideos[selectedVideoIndex]}
          onClose={closeVideoPlayer}
          onPrevious={goToPrevious}
          onNext={goToNext}
          hasPrevious={selectedVideoIndex > 0}
          hasNext={selectedVideoIndex < filteredVideos.length - 1}
        />
      )}

      {/* Cat Selector Modal */}
      {showCatSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">고양이 선택</h3>
              <button
                onClick={() => setShowCatSelector(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            {/* Search input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="고양이 이름으로 검색..."
                value={catSearchQuery}
                onChange={(e) => setCatSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>

            {/* Cat list */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded">
              {filteredCats.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {cats.length === 0 ? '데이터베이스에 고양이가 없습니다' : '검색 결과가 없습니다'}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 p-4">
                  {filteredCats.map((cat) => (
                    <label
                      key={cat.id}
                      className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-50 ${
                        selectedCats.has(cat.id) ? 'bg-blue-50 border border-blue-200' : 'border border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCats.has(cat.id)}
                        onChange={() => handleCatToggle(cat.id, cat.name)}
                        className="mr-2"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{cat.name}</div>
                        {cat.alt_name && (
                          <div className="text-xs text-gray-500">({cat.alt_name})</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setSelectedCats(new Set());
                  setSelectedCatNames(new Set());
                }}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 text-sm"
              >
                전체 해제
              </button>
              <button
                onClick={() => setShowCatSelector(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                완료 ({selectedCats.size}마리 선택됨)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

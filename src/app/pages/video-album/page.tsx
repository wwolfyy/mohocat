'use client';

import { useState, useEffect } from 'react';
import { getVideoService } from '@/services';
import { CatVideo } from '@/types/media';
import { formatDuration } from '@/utils/duration';
import { parseDate } from '@/utils/parse-date';
import CatSelectorModal from '@/components/CatSelectorModal';
import VideoPlayer from '@/components/ui/VideoPlayer';

export default function VideoAlbumPage() {
  const [videos, setVideos] = useState<CatVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredVideos, setFilteredVideos] = useState<CatVideo[]>([]);

  // Filter states
  const [showCatSelector, setShowCatSelector] = useState(false);
  const [selectedCatNames, setSelectedCatNames] = useState<Set<string>>(new Set());

  // Load all videos when component mounts
  useEffect(() => {
    loadAllVideos();
  }, []);

  // Filter videos based on search query and selected cat names
  useEffect(() => {
    let filtered = videos;

    // Apply text search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (video) =>
          video.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply cat name filter
    if (selectedCatNames.size > 0) {
      filtered = filtered.filter((video) => video.tags.some((tag) => selectedCatNames.has(tag)));
    }

    setFilteredVideos(filtered);
  }, [videos, searchQuery, selectedCatNames]);

  const loadAllVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading all videos...');

      const videoService = getVideoService();
      const allVideos = await videoService.getAllVideos({ limit: 100 }); // Get first 100 videos
      console.log(`Found ${allVideos.length} videos`);

      setVideos(allVideos);
    } catch (err) {
      console.error('Error loading videos:', err);
      setError('동영상을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gray-50" data-oid="gfvx-xq">
      {/* Header */}
      <div className="bg-white shadow-sm" data-oid="yfskekg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-oid="3wi9ab4">
          <h1 className="text-3xl font-bold text-gray-900 text-center" data-oid="u.kev1j">
            동영상
          </h1>
          <p className="text-gray-600 text-center mt-2" data-oid="s-3bu97">
            {/* 산냥이 집냥이의 소중한 순간들 */}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-oid="8qw_o01">
        {/* Search and Filter bar */}
        <div className="mb-8" data-oid="syox3r:">
          <div className="max-w-4xl mx-auto" data-oid="kzau10z">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-oid="eqx8opd">
              {/* Search input */}
              <div className="relative" data-oid="82i9-3:">
                <input
                  type="text"
                  placeholder="고양이 이름이나 설명으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  data-oid="77asoqh"
                />

                <svg
                  className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  data-oid="4cmsjz6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    data-oid="lrtaqtx"
                  />
                </svg>
              </div>

              {/* Filter input */}
              <div className="relative" data-oid="si-59ef">
                {/* Selected cat tags display */}
                {selectedCatNames.size > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1" data-oid="t.lctiw">
                    {Array.from(selectedCatNames).map((catName) => (
                      <span
                        key={catName}
                        className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                        data-oid="53m-6rg"
                      >
                        {catName}
                        <button
                          onClick={() => removeCatFilter(catName)}
                          className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 text-blue-600 hover:text-blue-800"
                          data-oid="20g.jw1"
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
                  data-oid="ypbi-wy"
                >
                  <span className="text-gray-600 text-sm" data-oid="uj_z_pt">
                    {selectedCatNames.size > 0
                      ? '클릭하여 더 많은 고양이 추가'
                      : '클릭하여 고양이 선택'}
                  </span>
                  <span className="text-blue-500 hover:text-blue-700 text-sm" data-oid="s.6rq8p">
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
                    className="absolute -top-2 -right-2 text-gray-500 hover:text-red-600 transition-colors bg-white rounded-full p-1 shadow"
                    title="필터 초기화"
                    data-oid="twp7oev"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      data-oid="7t_i1mi"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                        data-oid="1saqltv"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Active filters display */}
            {selectedCatNames.size > 0 && (
              <div className="mt-3" data-oid="hz2vbwy">
                <div className="flex flex-wrap gap-2" data-oid="4sqvt42">
                  <span className="text-sm text-gray-600" data-oid="kvp.fl_">
                    필터된 고양이:
                  </span>
                  {Array.from(selectedCatNames).map((catName) => (
                    <span
                      key={catName}
                      className="inline-flex items-center bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                      data-oid="7gzy9ah"
                    >
                      {catName}
                      <button
                        onClick={() => removeCatFilter(catName)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                        data-oid="cdd3ku:"
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
          <div className="flex justify-center items-center py-12" data-oid="odq0yjy">
            <div className="text-gray-600" data-oid="4_a7gji">
              동영상을 불러오는 중...
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex justify-center items-center py-12" data-oid="lm1q9ny">
            <div className="text-red-600" data-oid="ua.jg72">
              {error}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredVideos.length === 0 && videos.length > 0 && (
          <div className="flex justify-center items-center py-12" data-oid="ik1h-x2">
            <div className="text-gray-600" data-oid="li2ue1n">
              검색 결과가 없습니다.
            </div>
          </div>
        )}

        {!loading && !error && videos.length === 0 && (
          <div className="flex justify-center items-center py-12" data-oid="t1:ahn-">
            <div className="text-gray-600" data-oid="qnfenfu">
              등록된 동영상이 없습니다.
            </div>
          </div>
        )}

        {/* Video grid */}
        {!loading && !error && filteredVideos.length > 0 && (
          <>
            <div className="mb-4 text-center text-gray-600" data-oid="sa6hyrh">
              {(() => {
                const hasFilters = searchQuery.trim() || selectedCatNames.size > 0;
                if (hasFilters) {
                  const filterDesc = [];
                  if (searchQuery.trim()) filterDesc.push(`"${searchQuery}"`);
                  if (selectedCatNames.size > 0)
                    filterDesc.push(`${selectedCatNames.size}마리 고양이`);
                  return `${filterDesc.join(' + ')} 검색 결과: ${filteredVideos.length}개`;
                } else {
                  return `전체 ${filteredVideos.length}개`;
                }
              })()}
            </div>

            <div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
              data-oid="i0iqyx7"
            >
              {filteredVideos.map((video, index) => (
                <div
                  key={video.id}
                  className="aspect-video cursor-pointer group relative overflow-hidden rounded-lg bg-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
                  onClick={() => openVideoPlayer(index)}
                  data-oid=":9lv5h3"
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
                      data-oid="irslk96"
                    />
                  ) : (
                    <div
                      className="w-full h-full bg-gray-300 flex items-center justify-center"
                      data-oid="kq05jv_"
                    >
                      <svg
                        className="w-8 h-8 text-gray-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        data-oid="23ymum5"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                          clipRule="evenodd"
                          data-oid="-3zqx2t"
                        />
                      </svg>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div
                    className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200 flex items-center justify-center"
                    data-oid=":.ixb86"
                  >
                    <div
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      data-oid="27i2.3q"
                    >
                      <svg
                        className="w-8 h-8 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        data-oid="ft5g3l9"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                          clipRule="evenodd"
                          data-oid=".fq6v1."
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Video info overlay */}
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2"
                    data-oid="ktdhhf."
                  >
                    <p className="text-white text-xs truncate" data-oid="w2qjfiu">
                      {video.description || '설명 없음'}
                    </p>
                    <div
                      className="flex justify-between items-center text-white text-xs opacity-75 mt-1"
                      data-oid="o2807lt"
                    >
                      <span data-oid="ijgsslb">
                        {(() => {
                          const createdDate = parseDate(video.createdTime);
                          return createdDate
                            ? createdDate.toLocaleDateString('ko-KR')
                            : '날짜 없음';
                        })()}
                      </span>
                      {video.duration && (
                        <span data-oid="a.dnzkd">{formatDuration(video.duration)}</span>
                      )}
                    </div>
                  </div>

                  {/* Video type indicator - moved outside bottom overlay to top right */}
                  <div className="absolute top-1 right-1" data-oid="4-p29cf">
                    {video.videoType === 'youtube' ? (
                      <div
                        className="bg-red-600 text-white text-xs px-1 py-0.5 rounded text-center leading-tight"
                        data-oid="ex65x-5"
                      >
                        YouTube
                      </div>
                    ) : (
                      <div
                        className="bg-blue-600 text-white text-xs px-1 py-0.5 rounded text-center leading-tight"
                        data-oid="wqudg8p"
                      >
                        Storage
                      </div>
                    )}
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
      <CatSelectorModal
        isOpen={showCatSelector}
        onClose={() => setShowCatSelector(false)}
        selectedTags={Array.from(selectedCatNames)}
        onTagsChange={(names) => setSelectedCatNames(new Set(names))}
      />
    </div>
  );
}

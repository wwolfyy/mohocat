'use client';

import { useState, useEffect } from 'react';
import { FaVideo, FaSearch, FaPlay } from 'react-icons/fa';
import { getVideoService } from '@/services';
import { useMountain } from '@/components/MountainProvider';
import { CatVideo } from '@/types/media';
import { formatDuration } from '@/utils/duration';
import { parseDate } from '@/utils/parse-date';
import { useMediaFilter } from '@/hooks/useMediaFilter';
import AlbumFilterBar from '@/components/album/AlbumFilterBar';
import MediaTile from '@/components/album/MediaTile';
import { AlbumLoading, AlbumMessage, ResultCount } from '@/components/album/AlbumStates';
import VideoPlayer from '@/components/ui/VideoPlayer';

export default function VideoAlbumPage() {
  const mountainId = useMountain();
  const [videos, setVideos] = useState<CatVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);

  const {
    searchQuery,
    setSearchQuery,
    selectedCatNames,
    setSelectedCatNames,
    filtered: filteredVideos,
  } = useMediaFilter(videos);

  useEffect(() => {
    loadAllVideos();
  }, []);

  const loadAllVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      const videoService = getVideoService(mountainId);
      const allVideos = await videoService.getAllVideos({ limit: 100 }); // Get first 100 videos
      setVideos(allVideos);
    } catch (err) {
      console.error('Error loading videos:', err);
      setError('동영상을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const closeVideoPlayer = () => setSelectedVideoIndex(null);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AlbumFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCatNames={Array.from(selectedCatNames)}
          onCatNamesChange={(names) => setSelectedCatNames(new Set(names))}
        />

        {loading && <AlbumLoading label="동영상을 불러오는 중..." />}

        {error && (
          <AlbumMessage tone="error" icon={<FaVideo className="h-6 w-6" />}>
            {error}
          </AlbumMessage>
        )}

        {!loading && !error && filteredVideos.length === 0 && videos.length > 0 && (
          <AlbumMessage icon={<FaSearch className="h-6 w-6" />}>검색 결과가 없습니다.</AlbumMessage>
        )}

        {!loading && !error && videos.length === 0 && (
          <AlbumMessage icon={<FaVideo className="h-6 w-6" />}>
            아직 등록된 동영상이 없어요.
          </AlbumMessage>
        )}

        {!loading && !error && filteredVideos.length > 0 && (
          <>
            <ResultCount
              count={filteredVideos.length}
              unit="개"
              searchQuery={searchQuery}
              catCount={selectedCatNames.size}
            />

            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredVideos.map((video, index) => {
                const createdDate = parseDate(video.createdTime);
                const dateLabel = createdDate
                  ? createdDate.toLocaleDateString('ko-KR')
                  : '날짜 없음';
                return (
                  <MediaTile
                    key={video.id}
                    aspect="video"
                    layout="below"
                    tags={video.tags}
                    thumbnailUrl={video.thumbnailUrl}
                    // The clip's own name on the footer shelf. Falls back to the
                    // description only when a video has no title (older records
                    // imported before titles were set); '' renders no line at all
                    // rather than a 제목 없음 placeholder cluttering every tile.
                    title={video.title || video.description || ''}
                    alt={video.title || video.description || 'Video thumbnail'}
                    meta={
                      <div className="flex items-center justify-between">
                        <span>{dateLabel}</span>
                        {video.duration && <span>{formatDuration(video.duration)}</span>}
                      </div>
                    }
                    overlayIcon={<FaPlay className="h-6 w-6" />}
                    topRight={
                      video.videoType === 'youtube' ? (
                        <span className="rounded bg-red-600 px-1 py-0.5 text-xs leading-tight text-white">
                          YouTube
                        </span>
                      ) : (
                        <span className="rounded bg-gray-700/90 px-1 py-0.5 text-xs leading-tight text-white">
                          직접 업로드
                        </span>
                      )
                    }
                    placeholder={
                      <div className="flex h-full w-full items-center justify-center bg-gray-300">
                        <FaPlay className="h-7 w-7 text-gray-500" />
                      </div>
                    }
                    onClick={() => setSelectedVideoIndex(index)}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>

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
    </div>
  );
}

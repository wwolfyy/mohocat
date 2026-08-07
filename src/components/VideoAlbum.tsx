'use client';

import { useState, useEffect } from 'react';
import { FaPlay } from 'react-icons/fa';
import { getVideoService } from '@/services';
import { CatVideo } from '@/types/media';
import { formatDuration } from '@/utils/duration';
import { parseDate } from '@/utils/parse-date';
import MediaTile from '@/components/album/MediaTile';
import Modal from './ui/Modal';
import VideoPlayer from './ui/VideoPlayer';
import { useMountain } from '@/components/MountainProvider';

interface VideoAlbumProps {
  isOpen: boolean;
  onClose: () => void;
  catName: string;
}

// Video Player component (similar to Lightbox for images)
export default function VideoAlbum({ isOpen, onClose, catName }: VideoAlbumProps) {
  const mountainId = useMountain();
  const [videos, setVideos] = useState<CatVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);

  // Load videos when the album opens
  useEffect(() => {
    if (isOpen && catName) {
      loadVideos();
    }
  }, [isOpen, catName]);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setSelectedVideoIndex(null);
      setError(null);
    }
  }, [isOpen]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`Loading videos for cat: ${catName}`);

      const videoService = getVideoService(mountainId);
      const catVideos = await videoService.getCatVideos(catName);
      console.log(`Found ${catVideos.length} videos for ${catName}`);

      if (catVideos.length === 0) {
        setError(`${catName}의 동영상을 찾을 수 없습니다.`);
      } else {
        setVideos(catVideos);
      }
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
    if (selectedVideoIndex !== null && selectedVideoIndex < videos.length - 1) {
      setSelectedVideoIndex(selectedVideoIndex + 1);
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`${catName}의 동영상앨범`} size="xl">
        {/* Refresh - top-left mirror of the close button */}
        <button
          onClick={loadVideos}
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
              동영상을 불러오는 중...
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-12 text-red-600">{error}</div>
          )}

          {!loading && !error && videos.length === 0 && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              아직 등록된 동영상이 없어요
            </div>
          )}

          {!loading && !error && videos.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
              {videos.map((video, index) => {
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
                    title={video.title || video.description || ''}
                    alt={video.title || video.description || '동영상 썸네일'}
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
                    onClick={() => openVideoPlayer(index)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* Video Player */}
      {selectedVideoIndex !== null && videos[selectedVideoIndex] && (
        <VideoPlayer
          video={videos[selectedVideoIndex]}
          onClose={closeVideoPlayer}
          onPrevious={goToPrevious}
          onNext={goToNext}
          hasPrevious={selectedVideoIndex > 0}
          hasNext={selectedVideoIndex < videos.length - 1}
        />
      )}
    </>
  );
}

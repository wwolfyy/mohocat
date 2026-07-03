'use client';

import { useState, useEffect } from 'react';
import { getVideoService } from '@/services';
import { CatVideo } from '@/types/media';
import { formatDuration } from '@/utils/duration';
import { parseDate } from '@/utils/parse-date';
import Modal from './ui/Modal';
import VideoPlayer from './ui/VideoPlayer';

interface VideoAlbumProps {
  isOpen: boolean;
  onClose: () => void;
  catName: string;
}

// Video Player component (similar to Lightbox for images)
export default function VideoAlbum({ isOpen, onClose, catName }: VideoAlbumProps) {
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

      const videoService = getVideoService();
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {videos.map((video, index) => (
                <div
                  key={video.id}
                  className="group relative aspect-video cursor-pointer overflow-hidden rounded-xl bg-gray-200"
                  onClick={() => openVideoPlayer(index)}
                >
                  {/* Video thumbnail */}
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.description || '동영상 썸네일'}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                      <svg
                        className="w-12 h-12 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l.414.414a1 1 0 00.707.293H15a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4a2 2 0 012-2z"
                        />
                      </svg>
                    </div>
                  )}

                  {/* Play button overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>

                  {/* Video info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                    <p className="text-white text-xs truncate">
                      {video.description || '제목 없음'}
                    </p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-white text-xs opacity-75">
                        {(() => {
                          const createdDate = parseDate(video.createdTime);
                          return createdDate
                            ? createdDate.toLocaleDateString('ko-KR')
                            : '날짜 없음';
                        })()}
                      </p>
                      {video.duration && (
                        <p className="text-white text-xs opacity-75">
                          {formatDuration(video.duration)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Video type indicator */}
                  <div className="absolute top-2 right-2">
                    {video.videoType === 'youtube' ? (
                      <div className="bg-red-600 text-white text-xs px-2 py-1 rounded">YouTube</div>
                    ) : (
                      <div className="bg-gray-700 text-white text-xs px-2 py-1 rounded">파일</div>
                    )}
                  </div>
                </div>
              ))}
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

'use client';

import { useState, useEffect } from 'react';
import { getVideoService } from '@/services';
import { CatVideo } from '@/types/media';
import { cn } from '@/utils/cn';
import { formatDuration } from '@/utils/duration';

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

interface VideoAlbumProps {
  isOpen: boolean;
  onClose: () => void;
  catName: string;
}

interface VideoPlayerProps {
  video: CatVideo;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

// Video Player component (similar to Lightbox for images)
function VideoPlayer({ video, onClose, onPrevious, onNext, hasPrevious, hasNext }: VideoPlayerProps) {
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

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

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hasPrevious, hasNext]);

  const renderVideoPlayer = () => {
    if (video.videoType === 'youtube') {
      // Extract YouTube video ID from URL
      const getYouTubeVideoId = (url: string) => {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : null;
      };

      const videoId = getYouTubeVideoId(video.videoUrl);
      if (videoId) {
        return (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => setVideoLoading(false)}
            onError={() => {
              setVideoLoading(false);
              setVideoError(true);
            }}
          />
        );
      }
    }

    // For storage videos, use HTML5 video element
    return (
      <video
        src={video.videoUrl}
        controls
        className="w-full h-full object-contain"
        onLoadedData={() => setVideoLoading(false)}
        onError={() => {
          setVideoLoading(false);
          setVideoError(true);
        }}
      >
        동영상을 재생할 수 없습니다.
      </video>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
      onClick={onClose}
    >
      {/* Navigation buttons */}
      {hasPrevious && (
        <button
          onClick={onPrevious}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 p-2 z-10"
          aria-label="Previous video"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {hasNext && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 p-2 z-10"
          aria-label="Next video"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 text-3xl font-bold z-10"
        aria-label="Close video player"
      >
        ×
      </button>

      <div
        className="w-full max-w-4xl max-h-[80vh] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Video player */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          {videoLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white">동영상 로딩 중...</div>
            </div>
          )}

          {videoError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white">동영상을 불러올 수 없습니다.</div>
            </div>
          )}

          {renderVideoPlayer()}
        </div>

        {/* Video info */}
        {!videoLoading && !videoError && (
          <div className="mt-4 text-white text-center">
            <p className="text-lg font-semibold">{video.description || '제목 없음'}</p>
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
    </div>
  );
}

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
              "absolute top-4 right-4 w-8 h-8 bg-red-500 hover:bg-red-600",
              "text-white rounded font-bold hover:shadow-lg transition-all duration-200",
              "flex items-center justify-center z-10"
            )}
            aria-label="Close album"
          >
            ×
          </button>

          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b pr-16">
            <h2 className="text-xl font-bold">{catName}의 동영상첩</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={loadVideos}
                disabled={loading}
                className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 p-1"
                title="새로고침"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-600">동영상을 불러오는 중...</div>
              </div>
            )}

            {error && (
              <div className="flex justify-center items-center py-12">
                <div className="text-red-600">{error}</div>
              </div>
            )}

            {!loading && !error && videos.length === 0 && (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-600">등록된 동영상이 없습니다.</div>
              </div>
            )}

            {!loading && !error && videos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {videos.map((video, index) => (
                  <div
                    key={video.id}
                    className="aspect-video cursor-pointer group relative overflow-hidden rounded-lg bg-gray-200"
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
                        <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l.414.414a1 1 0 00.707.293H15a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4a2 2 0 012-2z" />
                        </svg>
                      </div>
                    )}

                    {/* Play button overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
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
                        <div className="bg-red-600 text-white text-xs px-2 py-1 rounded">
                          YouTube
                        </div>
                      ) : (
                        <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                          파일
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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

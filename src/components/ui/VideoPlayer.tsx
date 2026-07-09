'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { CatVideo } from '@/types/media';
import { parseDate } from '@/utils/parse-date';
import { formatDuration } from '@/utils/duration';
import { useModalLayer } from './useModalLayer';

interface VideoPlayerProps {
  video: CatVideo;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

const getYouTubeVideoId = (url: string): string | null => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7].length === 11 ? match[7] : null;
};

/**
 * Full-bleed video viewer shown over an album grid. Dark immersive surface with
 * the same circular-ghost close/nav language as {@link Lightbox}.
 * Keyboard: Esc closes, ←/→ navigate (topmost layer only).
 */
export default function VideoPlayer({
  video,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: VideoPlayerProps) {
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  // Render through a portal to <body> so the player escapes the album modal's
  // ancestor stacking context; combined with the stack-derived z-index below it
  // then paints above the album it was opened from at any nesting depth.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const zIndex = useModalLayer(true, {
    onEscape: onClose,
    onArrowLeft: hasPrevious ? onPrevious : undefined,
    onArrowRight: hasNext ? onNext : undefined,
  });

  const renderVideoPlayer = () => {
    if (video.videoType === 'youtube') {
      const videoId = getYouTubeVideoId(video.videoUrl);
      if (videoId) {
        return (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="h-full w-full"
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

    return (
      <video
        src={video.videoUrl}
        controls
        className="h-full w-full object-contain"
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

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/90"
      style={{ zIndex }}
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        aria-label="닫기"
        className="absolute right-4 top-4 z-[61] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/20"
      >
        <XMarkIcon className="h-6 w-6" />
      </button>

      {/* Previous */}
      {hasPrevious && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrevious();
          }}
          aria-label="이전 동영상"
          className="absolute left-4 top-1/2 z-[61] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/20"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>
      )}

      {/* Next */}
      {hasNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          aria-label="다음 동영상"
          className="absolute right-4 top-1/2 z-[61] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/20"
        >
          <ChevronRightIcon className="h-6 w-6" />
        </button>
      )}

      {/* Player + info */}
      <div className="mx-4 w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
          {videoLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              동영상 로딩 중...
            </div>
          )}
          {videoError && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              동영상을 불러올 수 없습니다.
            </div>
          )}
          {renderVideoPlayer()}
        </div>

        {!videoLoading && !videoError && (
          <div className="mt-4 text-center text-white">
            <p className="text-lg font-semibold">{video.description || '제목 없음'}</p>
            <div className="mt-2 flex items-center justify-center gap-4 text-sm text-gray-300">
              <span>
                {(() => {
                  const createdDate = parseDate(video.createdTime);
                  return createdDate ? createdDate.toLocaleDateString('ko-KR') : '날짜 없음';
                })()}
              </span>
              {video.duration && <span>{formatDuration(video.duration)}</span>}
              <span className="capitalize">{video.videoType}</span>
            </div>
            {video.tags && video.tags.length > 0 && (
              <p className="mt-1 text-xs text-gray-400">태그: {video.tags.join(', ')}</p>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

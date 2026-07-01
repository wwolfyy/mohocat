'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { CatImage } from '@/types/media';
import { parseDate } from '@/utils/parse-date';
import { useModalLayer } from './useModalLayer';

interface LightboxProps {
  image: CatImage;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

/**
 * Full-bleed image viewer shown over an album grid. Intentionally a dark
 * immersive surface (not the white Modal card) so the photo is the focus;
 * close/nav use the same subtle circular-ghost language on the dark backdrop.
 * Keyboard: Esc closes, ←/→ navigate (topmost layer only).
 */
export default function Lightbox({
  image,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: LightboxProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  // Render through a portal to <body> so the lightbox escapes the album modal's
  // ancestor stacking context; combined with the stack-derived z-index below it
  // then paints above the album it was opened from at any nesting depth.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const zIndex = useModalLayer(true, {
    onEscape: onClose,
    onArrowLeft: hasPrevious ? onPrevious : undefined,
    onArrowRight: hasNext ? onNext : undefined,
  });

  // Reset loading state when the image changes.
  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
  }, [image.imageUrl]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-start justify-center overflow-y-auto bg-black/90 py-4"
      style={{ zIndex }}
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        aria-label="닫기"
        className="fixed right-4 top-4 z-[61] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/20"
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
          aria-label="이전 사진"
          className="fixed left-4 top-1/2 z-[61] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/20"
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
          aria-label="다음 사진"
          className="fixed right-4 top-1/2 z-[61] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/20"
        >
          <ChevronRightIcon className="h-6 w-6" />
        </button>
      )}

      {/* Image + info */}
      <div
        className="relative mx-4 my-auto w-full max-w-4xl rounded-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {imageLoading && !imageError && (
          <div className="flex h-64 w-full items-center justify-center text-white">
            이미지를 불러오는 중...
          </div>
        )}
        {imageError && (
          <div className="flex h-64 w-full items-center justify-center text-white">
            이미지를 불러올 수 없습니다.
          </div>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element -- full-size remote
            images from Firebase Storage; the dev image optimizer stalls on them,
            consistent with the album grid which also uses a native <img>. */}
        <img
          src={image.imageUrl}
          alt={image.fileName}
          className={`mx-auto h-auto max-h-[80vh] w-auto rounded-xl object-contain ${
            imageLoading ? 'hidden' : ''
          }`}
          onLoad={() => setImageLoading(false)}
          onError={() => {
            setImageLoading(false);
            setImageError(true);
          }}
        />

        {!imageLoading && !imageError && (
          <div className="mt-4 text-center text-white">
            {image.description && (
              <p className="mt-1 inline-block rounded bg-white/90 px-3 py-1 text-sm text-black">
                {image.description}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              {(() => {
                const createdDate = parseDate(image.createdTime);
                return createdDate ? createdDate.toLocaleDateString('ko-KR') : '날짜 없음';
              })()}
            </p>
            {image.tags && image.tags.length > 0 && (
              <p className="mt-1 text-xs text-gray-400">태그: {image.tags.join(', ')}</p>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

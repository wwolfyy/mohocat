'use client';

import { ReactNode } from 'react';

interface MediaTileProps {
  aspect: 'square' | 'video';
  thumbnailUrl?: string;
  /** Fallback image swapped in if the thumbnail fails to load. */
  fallbackUrl?: string;
  alt: string;
  /** Optional caption; the empty-state "설명 없음" filler is intentionally dropped. */
  description?: string;
  /** Bottom meta row (e.g. date, or date + duration for video). */
  meta?: ReactNode;
  /** Centered icon revealed on hover (magnifier for photo, play for video). */
  overlayIcon: ReactNode;
  /** Top-right corner badge (e.g. video type). */
  topRight?: ReactNode;
  /** Shown in place of the image when there is no thumbnail. */
  placeholder?: ReactNode;
  onClick: () => void;
}

/**
 * Shared album grid tile shell — rounded-xl card matching the modal language,
 * hover lift + image zoom, a hover overlay, an always-on caption (description
 * shown only when present), and slots for a corner badge / placeholder. Photos
 * use `aspect="square"`, videos `aspect="video"` (16:9).
 */
export default function MediaTile({
  aspect,
  thumbnailUrl,
  fallbackUrl,
  alt,
  description,
  meta,
  overlayIcon,
  topRight,
  placeholder,
  onClick,
}: MediaTileProps) {
  const aspectClass = aspect === 'square' ? 'aspect-square' : 'aspect-video';

  return (
    <div
      className={`${aspectClass} group relative cursor-pointer overflow-hidden rounded-xl bg-gray-200 shadow-sm transition-shadow duration-200 hover:shadow-md`}
      onClick={onClick}
    >
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- full-size Firebase URLs stall next/image (see design notes)
        <img
          src={thumbnailUrl}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          onError={
            fallbackUrl
              ? (e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== fallbackUrl) target.src = fallbackUrl;
                }
              : undefined
          }
        />
      ) : (
        placeholder
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/30">
        <div className="text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {overlayIcon}
        </div>
      </div>

      {topRight && <div className="absolute right-1 top-1">{topRight}</div>}

      {/* Caption */}
      {(description || meta) && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          {description && <p className="truncate text-xs text-white">{description}</p>}
          {meta && <div className="text-xs text-white/75">{meta}</div>}
        </div>
      )}
    </div>
  );
}

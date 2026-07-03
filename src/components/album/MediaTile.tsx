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
  /**
   * Where the caption lives. `'overlay'` (default) draws it over the bottom of
   * the image; `'below'` puts it on a white footer shelf under the image — a
   * cleaner card that also gives the grid natural vertical breathing room.
   */
  layout?: 'overlay' | 'below';
  /** Tag chips (e.g. cat names) shown in the footer — `'below'` layout only. */
  tags?: string[];
  onClick: () => void;
}

/**
 * Shared album grid tile shell — rounded-xl card matching the modal language,
 * hover lift + image zoom, a hover overlay, and slots for a corner badge /
 * placeholder. Photos use `aspect="square"`, videos `aspect="video"` (16:9).
 *
 * Caption placement is switchable: `layout="overlay"` (default) keeps the
 * caption over the image; `layout="below"` moves it to a footer shelf with
 * optional tag chips, keeping the thumbnail clean.
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
  layout = 'overlay',
  tags,
  onClick,
}: MediaTileProps) {
  const aspectClass = aspect === 'square' ? 'aspect-square' : 'aspect-video';

  // Image + hover affordance + corner badge — shared by both layouts.
  const media = (
    <>
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
    </>
  );

  if (layout === 'below') {
    return (
      <div
        className="group cursor-pointer overflow-hidden rounded-xl bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
        onClick={onClick}
      >
        <div className={`${aspectClass} relative overflow-hidden bg-gray-200`}>{media}</div>

        {/* Caption shelf */}
        <div className="space-y-1 p-2">
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800"
                >
                  {tag}
                </span>
              ))}
              {tags.length > 2 && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  +{tags.length - 2}
                </span>
              )}
            </div>
          )}
          {meta && <div className="text-xs text-gray-500">{meta}</div>}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${aspectClass} group relative cursor-pointer overflow-hidden rounded-xl bg-gray-200 shadow-sm transition-shadow duration-200 hover:shadow-md`}
      onClick={onClick}
    >
      {media}

      {/* Top-left cat-name tags — translucent chips over the image (up to 2). */}
      {tags && tags.length > 0 && (
        <div className="absolute left-1 top-1 flex max-w-[calc(100%-0.5rem)] flex-wrap gap-1">
          {tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="truncate rounded-full bg-black/45 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm"
            >
              {tag}
            </span>
          ))}
          {tags.length > 2 && (
            <span className="rounded-full bg-black/45 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
              +{tags.length - 2}
            </span>
          )}
        </div>
      )}

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

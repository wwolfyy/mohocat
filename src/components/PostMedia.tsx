'use client';

import React from 'react';
import { useMediaDetails } from '@/hooks/useMediaDetails';
import type { MediaDetail } from '@/services/media-albums';

/**
 * The full media block of a post: **every** image, then **every** video.
 *
 * Extracted from `AnnouncementModal` (2026-07-31) so the same "showing the whole
 * post" rendering serves the 공지사항 popup, the 입양홍보 popup, and the 입양홍보
 * feed's expanded card. Before this, 입양홍보 had its own miniature version that
 * showed **one** 80×20 thumbnail and chose between video *or* image — so a post
 * with a video never displayed its photos at all, which is the bug this fixes.
 *
 * ⚠️ **Show everything, or the uploader has no way to know.** The composers accept
 * several images and several videos per post; anything that renders only the first
 * silently discards the rest, and nothing in the CMS reveals that. If a compact
 * treatment is ever wanted, it belongs in a separate preview component — not here.
 *
 * Plain `<img>` rather than `next/image`: these URLs are arbitrary Firebase Storage
 * or pasted URLs whose dimensions aren't known ahead of render, and the lightbox
 * elsewhere in the app has the same constraint (see `modal-design-system` notes).
 *
 * **Each item carries its own caption** (2026-07-31, owner-requested): the video
 * 제목, the 설명 typed per file in the composer, and the cat tags. None of that is
 * stored on the post — it lives on the `cat_images` / `cat_videos` record — so it
 * is resolved live; see `useMediaDetails`.
 *
 * The tag line copies the 사진첩 lightbox's `태그: …` wording rather than inventing
 * a second treatment. Captions sit **below** the media, not overlaid, so they never
 * cover the picture.
 *
 * 🐛 **Fixed 2026-08-01 (owner-reported): photos rendered out of proportion with the
 * video beside them.** Two causes, both in the `compact` path: the two-column grid
 * gave a lone photo half the width of the full-width video, and `w-full` +
 * `max-h-64` + `object-contain` pillarboxed it inside a bordered box, so a photo
 * sat small between white bars. `compact` now sizes the `<img>` to the picture
 * itself (`w-auto`, capped by `max-h-64`/`max-w-full`), and the 입양홍보 expanded
 * card — a full-width page surface, not a dialog — moved to `layout="full"`.
 */

interface PostMediaProps {
  imageUrls?: string[];
  videoUrls?: string[];
  /** Used in alt text / iframe titles, e.g. '공지사항' or '입양홍보'. */
  label: string;
  /**
   * How much room the surface has.
   *
   * `compact` (default) is the modal/feed treatment: two columns on desktop, each
   * image capped at 16rem so a multi-photo post still fits in a dialog.
   * `full` is for a dedicated page, where the post is the only thing on screen —
   * one column, full width. The announcement detail page showed full-width photos
   * before it adopted this component, and shrinking them would have been an
   * unrequested downgrade.
   */
  layout?: 'compact' | 'full';
}

/** YouTube id from either a watch URL or a youtu.be short link. */
const youtubeIdFrom = (url: string): string | null => {
  if (!url.includes('youtube.com') && !url.includes('youtu.be')) return null;
  const id = url.includes('youtu.be')
    ? url.split('youtu.be/')[1]?.split('?')[0]
    : url.split('v=')[1]?.split('&')[0];
  return id || null;
};

/**
 * The caption under one medium: 제목 (video), 설명, then 태그.
 *
 * Renders nothing at all when the record has none of them, so an untagged,
 * uncaptioned photo keeps exactly the layout it had before captions existed.
 */
const MediaCaption = ({
  detail,
  showTitle,
  loading,
}: {
  detail?: MediaDetail;
  showTitle?: boolean;
  loading?: boolean;
}) => {
  // A caption is resolved from the media record in a second round trip, so while
  // that is in flight "no caption" is not yet a fact. A placeholder says so
  // rather than showing a bare photo that looks permanently untagged.
  if (loading) {
    return (
      <div className="mt-1" aria-busy="true">
        <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
      </div>
    );
  }

  if (!detail) return null;
  const { title, description, tags } = detail;
  const hasTitle = Boolean(showTitle && title);
  if (!hasTitle && !description && tags.length === 0) return null;

  return (
    <div className="mt-1">
      {hasTitle && <p className="text-sm font-medium text-gray-800">{title}</p>}
      {description && <p className="mt-0.5 text-sm text-gray-700">{description}</p>}
      {tags.length > 0 && <p className="mt-1 text-xs text-gray-500">태그: {tags.join(', ')}</p>}
    </div>
  );
};

const PostMedia = ({ imageUrls, videoUrls, label, layout = 'compact' }: PostMediaProps) => {
  const images = imageUrls?.filter(Boolean) ?? [];
  const videos = videoUrls?.filter(Boolean) ?? [];

  // Hooks must run unconditionally, so this sits above the early return.
  const videoIds = videos.map(youtubeIdFrom).filter((id): id is string => Boolean(id));
  const { byImageUrl, byYoutubeId, loading: detailsLoading } = useMediaDetails(images, videoIds);

  if (images.length === 0 && videos.length === 0) return null;

  return (
    <>
      {images.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-2 font-medium text-gray-700">이미지</h4>
          <div
            className={layout === 'full' ? 'space-y-6' : 'grid grid-cols-1 gap-4 md:grid-cols-2'}
          >
            {images.map((url, index) => (
              <div key={index}>
                <img
                  src={url}
                  alt={`${label} 이미지 ${index + 1}`}
                  className={
                    layout === 'full'
                      ? 'h-auto w-full rounded-lg border object-contain'
                      : 'mx-auto max-h-64 w-auto max-w-full rounded-lg border'
                  }
                />
                {/* Photos have no title by design — a `cat_images` record only
                    carries `fileName`, which is not something to show a reader. */}
                <MediaCaption detail={byImageUrl[url]} loading={detailsLoading} />
              </div>
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div>
          <h4 className="mb-2 font-medium text-gray-700">동영상</h4>
          <div className="space-y-4">
            {videos.map((url, index) => {
              const videoId = youtubeIdFrom(url);

              if (videoId) {
                return (
                  <div key={index}>
                    <div className="aspect-video">
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title={`${label} 동영상 ${index + 1}`}
                        className="h-full w-full rounded-lg"
                        allowFullScreen
                      />
                    </div>
                    <MediaCaption
                      detail={byYoutubeId[videoId]}
                      showTitle
                      loading={detailsLoading}
                    />
                  </div>
                );
              }

              // A non-YouTube URL: the composers only ever produce YouTube links,
              // so this is for pasted/legacy values.
              return (
                <video key={index} src={url} controls className="max-h-64 w-full rounded-lg">
                  Your browser does not support the video tag.
                </video>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default PostMedia;

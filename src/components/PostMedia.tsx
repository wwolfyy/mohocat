'use client';

import React from 'react';

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
 */

interface PostMediaProps {
  imageUrls?: string[];
  videoUrls?: string[];
  /** Used in alt text / iframe titles, e.g. '공지사항' or '입양홍보'. */
  label: string;
}

/** YouTube id from either a watch URL or a youtu.be short link. */
const youtubeIdFrom = (url: string): string | null => {
  if (!url.includes('youtube.com') && !url.includes('youtu.be')) return null;
  const id = url.includes('youtu.be')
    ? url.split('youtu.be/')[1]?.split('?')[0]
    : url.split('v=')[1]?.split('&')[0];
  return id || null;
};

const PostMedia = ({ imageUrls, videoUrls, label }: PostMediaProps) => {
  const images = imageUrls?.filter(Boolean) ?? [];
  const videos = videoUrls?.filter(Boolean) ?? [];

  if (images.length === 0 && videos.length === 0) return null;

  return (
    <>
      {images.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-2 font-medium text-gray-700">이미지</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {images.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`${label} 이미지 ${index + 1}`}
                className="h-auto max-h-64 w-full rounded-lg border object-contain"
              />
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
                  <div key={index} className="aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title={`${label} 동영상 ${index + 1}`}
                      className="h-full w-full rounded-lg"
                      allowFullScreen
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

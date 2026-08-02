'use client';

import type { ExistingMedia } from './MediaItemList';

/**
 * Turning a post's stored media URLs into the `기존` rows an editing composer
 * shows (2026-08-02).
 *
 * Shared by both form hooks — `useSimpleContentForm` (공지사항 / 입양홍보) and
 * `useRichContentForm` (집사톡) — because both now serve create *and* edit, and
 * two copies of "how do we label an already-uploaded file" is how the three post
 * renderers drifted into three different bugs on 2026-07-31.
 */

/** Filename out of a Storage URL, for labelling media already on the post. */
export const labelForImageUrl = (url: string): string => {
  try {
    const path = decodeURIComponent(new URL(url).pathname);
    return path.split('/').pop() || url;
  } catch {
    // Not an absolute URL (a seeded `/images/...` path, say) — the tail still
    // names the file, and a label is cosmetic: never fail an edit over it.
    return url.split('/').pop() || url;
  }
};

/** `https://img.youtube.com/...` preview for a watch URL, when we can parse one. */
export const youtubeThumbnail = (url: string): string | undefined => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/default.jpg` : undefined;
};

/** The post's stored `imageUrls`, as removable rows. */
export const toExistingImages = (urls: unknown): ExistingMedia[] =>
  (Array.isArray(urls) ? urls : []).map((url: string) => ({
    url,
    label: labelForImageUrl(url),
    thumbnailUrl: url,
  }));

/** The post's stored `videoUrls`, as removable rows. */
export const toExistingVideos = (urls: unknown): ExistingMedia[] =>
  (Array.isArray(urls) ? urls : []).map((url: string) => ({
    url,
    label: url,
    thumbnailUrl: youtubeThumbnail(url),
  }));

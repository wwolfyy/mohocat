'use client';

import { useEffect, useState } from 'react';
import { getImageTagsByUrls, getVideoTagsByYoutubeIds } from '@/services/media-albums';
import { useMountain } from '@/components/MountainProvider';

/**
 * Cat tags for a post's media, resolved from the `cat_images` / `cat_videos`
 * records the uploads created (2026-07-31).
 *
 * A post stores only URLs, so the tags an admin picked in the composer are not
 * on the post at all — they live on the media records. This resolves them, so
 * "누가 나오는 사진인지" shows under a post's photo the same way it does on the
 * 사진첩's full picture.
 *
 * 🔑 **A live lookup rather than a copy stamped on the post.** Tags keep being
 * edited in the tagging surfaces afterwards; a copy would disagree with the album
 * from the first retag, and posts made before this shipped would show nothing.
 * See `media-albums.getImageTagsByUrls` for the full reasoning.
 *
 * Failure is non-fatal: on error the maps stay empty and the media simply renders
 * untagged, which is what a post with genuinely untagged media looks like anyway.
 */
export interface MediaTags {
  /** Cat names by image URL. Missing key = no tags (or not yet loaded). */
  byImageUrl: Record<string, string[]>;
  /** Cat names by YouTube video id. */
  byYoutubeId: Record<string, string[]>;
}

const EMPTY: MediaTags = { byImageUrl: {}, byYoutubeId: {} };

export const useMediaTags = (imageUrls: string[], youtubeIds: string[]): MediaTags => {
  const mountainId = useMountain();
  const [tags, setTags] = useState<MediaTags>(EMPTY);

  // Join the identifiers so the effect re-runs when the media actually changes,
  // not on every render (the arrays are rebuilt by the caller each time).
  const imageKey = imageUrls.join('|');
  const videoKey = youtubeIds.join('|');

  useEffect(() => {
    if (!imageKey && !videoKey) {
      setTags(EMPTY);
      return;
    }

    let cancelled = false;

    const load = async () => {
      const [byImageUrl, byYoutubeId] = await Promise.all([
        getImageTagsByUrls(mountainId, imageKey ? imageKey.split('|') : []),
        getVideoTagsByYoutubeIds(mountainId, videoKey ? videoKey.split('|') : []),
      ]);
      // The post can be collapsed (or the modal closed) mid-flight.
      if (!cancelled) setTags({ byImageUrl, byYoutubeId });
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [mountainId, imageKey, videoKey]);

  return tags;
};

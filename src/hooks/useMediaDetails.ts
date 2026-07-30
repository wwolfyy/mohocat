'use client';

import { useEffect, useState } from 'react';
import {
  getImageDetailsByUrls,
  getVideoDetailsByYoutubeIds,
  type MediaDetail,
} from '@/services/media-albums';
import { useMountain } from '@/components/MountainProvider';

/**
 * Everything a post can show *per media item* — cat tags, the video 제목, the 설명
 * — resolved from the `cat_images` / `cat_videos` records the uploads created
 * (2026-07-31).
 *
 * A post stores only URLs, so none of what the composer collects per file is on
 * the post at all; it lives on the media records. This resolves it, so a post's
 * photo carries its caption and its cats the same way the 사진첩's full picture
 * does.
 *
 * 🔑 **A live lookup rather than a copy stamped on the post.** These keep being
 * edited in the tagging surfaces, and for videos YouTube is the source of truth
 * with the sync rebuilding the record from it — a copy on the post would be stale
 * from the first edit, with nothing to reconcile it. See
 * `media-albums.getImageDetailsByUrls` for the full reasoning.
 *
 * Failure is non-fatal: on error the maps stay empty and the media renders bare,
 * which is exactly what a post with genuinely uncaptioned media looks like.
 */
export interface MediaDetails {
  /** By image URL. Missing key = nothing recorded (or not yet loaded). */
  byImageUrl: Record<string, MediaDetail>;
  /** By YouTube video id. */
  byYoutubeId: Record<string, MediaDetail>;
}

const EMPTY: MediaDetails = { byImageUrl: {}, byYoutubeId: {} };

export const useMediaDetails = (imageUrls: string[], youtubeIds: string[]): MediaDetails => {
  const mountainId = useMountain();
  const [details, setDetails] = useState<MediaDetails>(EMPTY);

  // Join the identifiers so the effect re-runs when the media actually changes,
  // not on every render (the arrays are rebuilt by the caller each time).
  const imageKey = imageUrls.join('|');
  const videoKey = youtubeIds.join('|');

  useEffect(() => {
    if (!imageKey && !videoKey) {
      setDetails(EMPTY);
      return;
    }

    let cancelled = false;

    const load = async () => {
      const [byImageUrl, byYoutubeId] = await Promise.all([
        getImageDetailsByUrls(mountainId, imageKey ? imageKey.split('|') : []),
        getVideoDetailsByYoutubeIds(mountainId, videoKey ? videoKey.split('|') : []),
      ]);
      // The post can be collapsed (or the modal closed) mid-flight.
      if (!cancelled) setDetails({ byImageUrl, byYoutubeId });
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [mountainId, imageKey, videoKey]);

  return details;
};

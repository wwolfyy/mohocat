/**
 * Shared shaping of the video metadata a composer submits, used by both halves of
 * the resumable upload: `/api/upload-youtube` (which puts it on the YouTube video
 * resource at session-initiation) and `/api/upload-youtube/complete` (which mirrors
 * it into the `cat_videos` record). The two must agree on how a comma-separated tag
 * string becomes an array, so that parsing lives here rather than in both routes.
 */

/** The metadata fields a composer sends with a video, in their wire form. */
export interface VideoMetadataInput {
  title?: string;
  description?: string;
  /** Comma-separated tag string; empty/absent means no tags. */
  tags?: string;
  /** A YYYY-MM-DD calendar date (the day the media was recorded), not an instant. */
  createdTime?: string;
}

/**
 * Split the wire tag string into YouTube's array form. Empty entries are dropped, so
 * `'a,,b '` → `['a', 'b']` and an absent/blank string → `[]`.
 */
export function parseTagList(tags?: string): string[] {
  if (!tags || !tags.trim()) {
    return [];
  }

  return tags
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

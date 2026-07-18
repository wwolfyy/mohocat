/**
 * Injectable media-upload strategies for the content forms (complexity-retirement
 * P1.2). The four content forms hand-roll near-identical copies of these; the
 * P2/P3 migrations replace those copies with calls into this module. The upload
 * strategy stays a plain injected function — `MediaUploadField` is presentational
 * and never uploads.
 *
 * - `uploadImagesToStorage` — the Family-B "direct storage" image strategy,
 *   lifted verbatim from NewAnnouncementForm (path prefix parameterized:
 *   `announcements/images` vs `adoption/images`).
 * - `uploadVideosToYouTube` — the shared YouTube strategy (all four forms upload
 *   video via POST /api/upload-youtube). Family B always sends title/description/
 *   tags; Family A additionally sends createdTime/playlistId and omits empty tags
 *   — covered via optional fields. Family A's stricter failure handling (its
 *   status-based error message and `!result.videoUrl` guard) is NOT adopted here:
 *   P1/P2 are behavior-preserving for Family B; reconcile at P3 (its point of use).
 *
 * The signed-URL image strategy (Family A) is deliberately not here yet — it is
 * lifted out of NewPostForm at P3.0, its point of use (assessment §7 P1 note).
 */
import { getStorageService } from '@/services';

/**
 * Upload images straight to Firebase Storage via the service layer and return
 * their download URLs. `pathPrefix` example: `announcements/images`.
 */
export const uploadImagesToStorage = async (
  files: File[],
  pathPrefix: string
): Promise<string[]> => {
  const storageService = getStorageService();
  const uploadPromises = files.map(async (file) => {
    const path = `${pathPrefix}/${Date.now()}_${file.name}`;
    return await storageService.uploadFile(file, path);
  });
  return await Promise.all(uploadPromises);
};

export interface YouTubeUploadOptions {
  title: string;
  description: string;
  /** Comma-separated tag string; omitted from the request when empty. */
  tags?: string;
  /** YYYY-MM-DD recording date (Family A sends this when set). */
  createdTime?: string;
  /** Target playlist id (Family A sends this when selected). */
  playlistId?: string;
}

/** Upload one video via POST /api/upload-youtube and return its YouTube URL. */
export const uploadVideoToYouTube = async (
  file: File,
  options: YouTubeUploadOptions
): Promise<string> => {
  const formData = new FormData();
  formData.append('video', file);
  formData.append('title', options.title);
  formData.append('description', options.description);
  if (options.tags) {
    formData.append('tags', options.tags);
  }
  if (options.createdTime) {
    formData.append('createdTime', options.createdTime);
  }
  if (options.playlistId) {
    formData.append('playlistId', options.playlistId);
  }

  const response = await fetch('/api/upload-youtube', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload video: ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  return result.videoUrl;
};

/** Upload several videos in parallel; resolves to their YouTube URLs in order. */
export const uploadVideosToYouTube = async (
  files: File[],
  options: YouTubeUploadOptions
): Promise<string[]> => {
  return await Promise.all(files.map((file) => uploadVideoToYouTube(file, options)));
};

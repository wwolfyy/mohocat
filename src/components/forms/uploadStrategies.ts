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
 *   — covered via optional fields. P3 reconciliation: NewPostForm's
 *   `!result.videoUrl` guard IS adopted (fail-loud on a broken upload response);
 *   its status-based error message is not (this module keeps the statusText form).
 * - `uploadImagesWithSignedUrls` — the Family-A image strategy (lifted from
 *   NewPostForm at P3.0): signed-URL PUT + a `cat_images` Firestore entry so the
 *   photos surface in the album/tagging tools. Canonicalized on the route's real
 *   response contract `{ signedUrl, publicUrl }` — NewButlerTalkForm's copy
 *   destructured `{ uploadUrl, downloadUrl }` and could never have worked (see
 *   log/DEBUG_LOG.md 2026-07-19) — and on NewButlerTalkForm's PUT ok-check,
 *   which NewPostForm's copy lacked.
 */
import { getImageService, getStorageService } from '@/services';

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

  if (!result.videoUrl) {
    throw new Error('No video URL returned from upload');
  }

  return result.videoUrl;
};

/** Upload several videos in parallel; resolves to their YouTube URLs in order. */
export const uploadVideosToYouTube = async (
  files: File[],
  options: YouTubeUploadOptions
): Promise<string[]> => {
  return await Promise.all(files.map((file) => uploadVideoToYouTube(file, options)));
};

export interface SignedUrlImageContext {
  /** Owning mountain — stamped onto the `cat_images` entry via the service. */
  mountainId: string;
  /** Cat tags recorded on the `cat_images` entry. */
  tags: string[];
  /** Recording date (date or datetime-local string); empty → upload time. */
  createdTime: string;
  /** Uploader identity recorded on the entry (user email or 'unknown'). */
  uploadedBy: string;
  /** Post message, reused as the image description. */
  description: string;
}

/**
 * Family-A image strategy: request a signed URL, PUT the file to Storage, then
 * record a `cat_images` Firestore entry so the photo appears in the album and
 * tagging tools. Returns the public URLs in order.
 */
export const uploadImagesWithSignedUrls = async (
  files: File[],
  context: SignedUrlImageContext
): Promise<string[]> => {
  const imageService = getImageService(context.mountainId);

  return await Promise.all(
    files.map(async (file) => {
      const response = await fetch('/api/generate-signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get signed URL: ${response.statusText}`);
      }

      const { signedUrl, publicUrl } = await response.json();

      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
      }

      // Record the upload in cat_images. Deliberately non-fatal (pre-existing
      // behavior in both Family-A forms): the image is already in Storage and
      // the post can still reference it; the entry only feeds the album/tagging
      // tools, so a failure here is logged and the upload proceeds.
      try {
        const imageData = {
          imageUrl: publicUrl,
          fileName: file.name,
          storagePath: publicUrl, // For direct uploads, this is the same as imageUrl
          tags: context.tags,
          uploadDate: new Date(),
          createdTime: context.createdTime ? new Date(context.createdTime) : new Date(),
          uploadedBy: context.uploadedBy,
          description: context.description,
          location: '',
          autoTagged: false,
          fileSize: file.size,
          dimensions: undefined,
        };

        await imageService.createImage(imageData);
      } catch (firestoreError) {
        console.error('Failed to create Firestore entry for image:', firestoreError);
      }

      return publicUrl;
    })
  );
};

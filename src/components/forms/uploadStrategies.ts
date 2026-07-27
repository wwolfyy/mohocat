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
import type { User } from 'firebase/auth';
import { getImageService, getStorageService } from '@/services';
import { authHeader } from '@/lib/auth/authHeader';

/**
 * Upload images straight to Firebase Storage via the service layer and return
 * their download URLs. `pathPrefix` example: `announcements/images`.
 *
 * `storagePrefix` is the owning tenant's Storage namespace (multi-tenant M6,
 * e.g. `mountains/manisan/`); it is prepended so each mountain's uploads land
 * under its own prefix. Geyang's prefix is `''` → the flat path is unchanged,
 * so this defaults to `''` and existing two-arg callers keep their behavior.
 */
export const uploadImagesToStorage = async (
  files: File[],
  pathPrefix: string,
  storagePrefix: string = ''
): Promise<string[]> => {
  const storageService = getStorageService();
  const uploadPromises = files.map(async (file) => {
    const path = `${storagePrefix}${pathPrefix}/${Date.now()}_${file.name}`;
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
  /**
   * Playlists to file the video into, sent as one repeated `playlistId` field
   * each. Normally the owning mountain's playlist; 입양홍보 additionally sends the
   * cross-mountain adoption playlist (plan D8), which is why this is a list.
   * Empty/omitted → the video is uploaded but left unfiled.
   */
  playlistIds?: string[];
  /**
   * Signed-in user, used to attach the `Authorization: Bearer <idToken>` header the
   * gated route requires ('manage-video'). Injected rather than read from the auth
   * SDK here so this module stays a plain strategy with no Firebase coupling.
   */
  user: User | null;
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
  for (const playlistId of options.playlistIds ?? []) {
    if (playlistId) {
      formData.append('playlistId', playlistId);
    }
  }

  const response = await fetch('/api/upload-youtube', {
    method: 'POST',
    headers: await authHeader(options.user),
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
  /**
   * Signed-in user, used to attach the `Authorization: Bearer <idToken>` header the
   * gated signed-URL route requires ('manage-photo'). See YouTubeUploadOptions.user.
   */
  user: User | null;
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
  const authorization = await authHeader(context.user);

  return await Promise.all(
    files.map(async (file) => {
      const response = await fetch('/api/generate-signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authorization,
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

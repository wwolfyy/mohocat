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
 *   video through it). Family B always sends title/description/tags; Family A
 *   additionally sends createdTime/playlistId and omits empty tags — covered via
 *   optional fields. P3 reconciliation: NewPostForm's `!result.videoUrl` guard IS
 *   adopted (fail-loud on a broken upload response); its status-based error message
 *   is not (this module keeps the statusText form). Since 2026-07-29 the upload is
 *   **resumable and direct-to-Google** rather than a single POST through our own
 *   API — see `uploadVideoToYouTube` for why that is not optional.
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
import { calendarDateToInstant } from '@/utils/dateParser';

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
  /**
   * Bytes of **this** file uploaded so far. Low-level: callers uploading more than
   * one video want `onProgress` on the plural form, which aggregates these into one
   * fraction. Omitted → no progress events are requested at all.
   */
  onBytesUploaded?: (loadedBytes: number) => void;
}

/** Fraction (0 → 1) of one submit's video bytes uploaded so far. */
export type UploadProgressCallback = (fraction: number) => void;

export interface YouTubeBatchUploadOptions extends Omit<YouTubeUploadOptions, 'onBytesUploaded'> {
  /** Overall progress across every file in the batch. */
  onProgress?: UploadProgressCallback;
}

/**
 * Aggregates concurrent video uploads into the single 0 → 1 fraction a form shows on
 * one progress bar, and returns a per-file reporter to pass as `onBytesUploaded`.
 *
 * Per-file tracking is the point: the uploads run in **parallel**, so each file's
 * latest byte count has to be stored separately and re-summed. Accumulating into a
 * running total instead would count every progress event on top of the last one and
 * race past 100%. Indexed rather than keyed by `File` so that picking the same file
 * twice still tracks two independent uploads.
 */
export function createUploadProgressTracker(
  files: File[],
  onProgress?: UploadProgressCallback
): (index: number) => ((loadedBytes: number) => void) | undefined {
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const loadedByFile = new Array<number>(files.length).fill(0);

  return (index: number) => {
    // No callback, or nothing to measure against — don't ask for progress events.
    if (!onProgress || totalBytes <= 0) {
      return undefined;
    }

    return (loadedBytes: number) => {
      loadedByFile[index] = loadedBytes;
      const uploaded = loadedByFile.reduce((sum, bytes) => sum + bytes, 0);
      onProgress(Math.min(uploaded / totalBytes, 1));
    };
  };
}

interface RawUploadResult {
  ok: boolean;
  statusText: string;
  body: string;
}

/**
 * PUT the file to Google's resumable session URI, reporting upload progress.
 *
 * ⚠️ Uses `XMLHttpRequest`, not `fetch`, and that is not a style choice: `fetch`
 * cannot report **request** upload progress. Streaming a request body is
 * Chrome-only, needs HTTP/2 and `duplex: 'half'`, and Safari does not support it at
 * all — while `xhr.upload.onprogress` works everywhere. This is the only leg that
 * carries bytes, so it is the only one that needs XHR.
 */
function putFileWithProgress(
  sessionUrl: string,
  file: File,
  mimeType: string,
  onBytesUploaded?: (loadedBytes: number) => void
): Promise<RawUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', sessionUrl, true);
    xhr.setRequestHeader('Content-Type', mimeType);

    if (onBytesUploaded) {
      xhr.upload.onprogress = (event: ProgressEvent) => {
        if (event.lengthComputable) {
          onBytesUploaded(event.loaded);
        }
      };
    }

    xhr.onload = () => {
      // Settle on the full byte count: the last progress event can arrive before the
      // request completes, which would otherwise leave the bar stuck just short.
      onBytesUploaded?.(file.size);
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        statusText: xhr.statusText,
        body: xhr.responseText,
      });
    };

    // Network-level failures have no status to report, so they fail loud with their
    // own message rather than being folded into the status-based error below.
    xhr.onerror = () =>
      reject(new Error('Failed to upload video: the connection to YouTube failed'));
    xhr.onabort = () => reject(new Error('Failed to upload video: the upload was interrupted'));

    xhr.send(file);
  });
}

/**
 * Upload one video and return its YouTube URL, in three steps:
 *
 * 1. `POST /api/upload-youtube` — our server opens a resumable session on YouTube
 *    and returns the session URI (metadata only, a few hundred bytes).
 * 2. `PUT` the file **straight to Google**, bypassing our server entirely.
 * 3. `POST /api/upload-youtube/complete` — our server files the video into its
 *    playlists and writes the `cat_videos` record.
 *
 * ⚠️ Step 2 must not be routed through our own API. Vercel rejects any function
 * request body over **4.5 MB** at the proxy (413 `FUNCTION_PAYLOAD_TOO_LARGE`),
 * which is smaller than essentially any real video — the previous single-POST
 * version of this function could not upload one at all (`log/DEBUG_LOG.md`
 * 2026-07-29). Sending the bytes to Google directly removes the ceiling entirely.
 * The session URI carries its own authorization, so no token is exposed here.
 */
export const uploadVideoToYouTube = async (
  file: File,
  options: YouTubeUploadOptions
): Promise<string> => {
  const headers = await authHeader(options.user);
  // Google matches this against the PUT below, so both must send the same value.
  const mimeType = file.type || 'application/octet-stream';

  const sessionResponse = await fetch('/api/upload-youtube', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      mimeType,
      title: options.title,
      description: options.description,
      tags: options.tags,
      createdTime: options.createdTime,
    }),
  });

  if (!sessionResponse.ok) {
    const errorText = await sessionResponse.text();
    throw new Error(`Failed to upload video: ${sessionResponse.statusText} - ${errorText}`);
  }

  const { sessionUrl } = await sessionResponse.json();
  if (!sessionUrl) {
    throw new Error('No upload session returned from upload');
  }

  // The bytes go to Google, not to us. No Authorization header: the session URI is
  // itself the capability, and we hold no token client-side.
  const uploadResult = await putFileWithProgress(
    sessionUrl,
    file,
    mimeType,
    options.onBytesUploaded
  );

  if (!uploadResult.ok) {
    throw new Error(`Failed to upload video: ${uploadResult.statusText} - ${uploadResult.body}`);
  }

  let uploaded: { id?: string } = {};
  try {
    uploaded = JSON.parse(uploadResult.body);
  } catch {
    // A 2xx whose body isn't the created video resource means the contract moved —
    // fall through to the id guard below rather than guessing.
  }

  if (!uploaded.id) {
    throw new Error('No video ID returned from upload');
  }

  const completeResponse = await fetch('/api/upload-youtube/complete', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: uploaded.id,
      fileName: file.name,
      title: options.title,
      description: options.description,
      tags: options.tags,
      createdTime: options.createdTime,
      playlistIds: (options.playlistIds ?? []).filter((id) => id),
    }),
  });

  if (!completeResponse.ok) {
    const errorText = await completeResponse.text();
    throw new Error(`Failed to upload video: ${completeResponse.statusText} - ${errorText}`);
  }

  const result = await completeResponse.json();

  if (!result.videoUrl) {
    throw new Error('No video URL returned from upload');
  }

  return result.videoUrl;
};

/**
 * Upload several videos in parallel; resolves to their YouTube URLs in order.
 * `onProgress` reports one fraction across the whole batch, not per file.
 */
export const uploadVideosToYouTube = async (
  files: File[],
  options: YouTubeBatchUploadOptions
): Promise<string[]> => {
  const { onProgress, ...perFileOptions } = options;
  const reporterFor = createUploadProgressTracker(files, onProgress);

  return await Promise.all(
    files.map((file, index) =>
      uploadVideoToYouTube(file, { ...perFileOptions, onBytesUploaded: reporterFor(index) })
    )
  );
};

export interface SignedUrlImageContext {
  /** Owning mountain — stamped onto the `cat_images` entry via the service. */
  mountainId: string;
  /** Cat tags recorded on the `cat_images` entry. */
  tags: string[];
  /** Recorded calendar date `YYYY-MM-DD`; empty → the upload moment. */
  createdTime: string;
  /** Uploader identity recorded on the entry (user email or 'unknown'). */
  uploadedBy: string;
  /**
   * Signed-in user, used to attach the `Authorization: Bearer <idToken>` header the
   * gated signed-URL route requires ('manage-photo'). See YouTubeUploadOptions.user.
   */
  user: User | null;
}

/** One photo plus the caption written for it. */
export interface SignedUrlImageUpload {
  file: File;
  /**
   * Saved to `cat_images.description` — the caption the 사진첩 grid and the
   * lightbox show. Empty is saved as empty (the album renders its own '설명 없음'
   * placeholder); it used to inherit the post body, which meant every photo in a
   * post carried the same caption whether it fitted or not.
   */
  description: string;
}

/**
 * Family-A image strategy: request a signed URL, PUT the file to Storage, then
 * record a `cat_images` Firestore entry so the photo appears in the album and
 * tagging tools. Returns the public URLs in order.
 */
export const uploadImagesWithSignedUrls = async (
  uploads: SignedUrlImageUpload[],
  context: SignedUrlImageContext
): Promise<string[]> => {
  const imageService = getImageService(context.mountainId);
  const authorization = await authHeader(context.user);

  return await Promise.all(
    uploads.map(async ({ file, description }) => {
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
          // UTC midnight of the recorded calendar date, matching the video path
          // and the admin editor. Falls back to the upload moment when unset.
          createdTime: context.createdTime
            ? calendarDateToInstant(context.createdTime)
            : new Date(),
          uploadedBy: context.uploadedBy,
          description,
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

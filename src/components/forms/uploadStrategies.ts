/**
 * Injectable media-upload strategies for the content forms (complexity-retirement
 * P1.2). The content forms used to hand-roll near-identical copies of these; the
 * P2/P3 migrations replaced those copies with calls into this module. The upload
 * strategy stays a plain injected function — `MediaItemList` is presentational
 * and never uploads.
 *
 * **Two strategies, one per medium, shared by all three composers** since
 * 2026-07-30:
 *
 * - `uploadVideoItems` / `uploadVideoToYouTube` — the shared YouTube strategy.
 *   P3 reconciliation: NewPostForm's `!result.videoUrl` guard IS adopted
 *   (fail-loud on a broken upload response); its status-based error message is
 *   not (this module keeps the statusText form). Since 2026-07-29 the upload is
 *   **resumable and direct-to-Google** rather than a single POST through our own
 *   API — see `uploadVideoToYouTube` for why that is not optional.
 * - `uploadImagesWithSignedUrls` — the image strategy (lifted from NewPostForm at
 *   P3.0): signed-URL PUT + a `cat_images` Firestore entry so the photos surface
 *   in the album/tagging tools. Canonicalized on the route's real response
 *   contract `{ signedUrl, publicUrl }` — NewButlerTalkForm's copy destructured
 *   `{ uploadUrl, downloadUrl }` and could never have worked (see
 *   log/DEBUG_LOG.md 2026-07-19) — and on NewButlerTalkForm's PUT ok-check,
 *   which NewPostForm's copy lacked.
 *
 * 🗑️ **`uploadImagesToStorage` was deleted 2026-07-30.** It was the "direct
 * storage" image path 공지사항 / 입양홍보 used: it uploaded to
 * `<prefix>/<Date.now()>_<name>` and recorded **nothing** in Firestore, so those
 * photos never reached the album and a per-photo description had nowhere to live.
 * Both forms moved to `uploadImagesWithSignedUrls`, leaving it with no callers.
 */
import type { User } from 'firebase/auth';
import { getImageService } from '@/services';
import { authHeader } from '@/lib/auth/authHeader';
import { calendarDateToInstant } from '@/utils/dateParser';

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
    // A transport-level failure gives us status 0 and nothing else — and it cannot
    // tell "the bytes never arrived" apart from "they arrived but the browser was
    // not allowed to read the response" (a CORS-blocked session, which is what
    // 2026-07-29 hit). So the message must not claim the upload failed outright:
    // the video may well be on YouTube, just unrecorded here.
    xhr.onerror = () =>
      reject(
        new Error(
          'Failed to upload video: YouTube did not return a readable response. ' +
            'The video may still have been uploaded — check the channel before retrying.'
        )
      );
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

/** One video plus the YouTube metadata written for it. */
export interface VideoItemUpload {
  file: File;
  /** Empty falls back to `fallbackTitle`, numbered when several are empty. */
  title: string;
  /** Empty stays empty: the video is uploaded with no YouTube description. */
  description: string;
}

export interface VideoItemsUploadOptions extends Omit<
  YouTubeUploadOptions,
  'onBytesUploaded' | 'title' | 'description'
> {
  /**
   * Title for videos the user left untitled — normally the post title. Only the
   * untitled ones are numbered `(Part n)`, so a title someone typed is uploaded
   * verbatim (butler-media plan §4.3).
   */
  fallbackTitle: string;
  /** Overall progress across every file, not per file. */
  onProgress?: UploadProgressCallback;
}

/**
 * Upload several videos in parallel, **each with its own title and description**;
 * resolves to their YouTube URLs in order. `onProgress` reports one fraction
 * across the whole batch.
 *
 * Shared by every composer since 2026-07-30. It replaced a plural strategy that
 * took `File[]` plus **one** shared title/description — which meant a post with
 * three videos put the same title on all three — and simultaneously replaced the
 * hand-rolled equivalent inside `useRichContentForm`. The `(Part n)` numbering
 * below is the reason those two wanted to be one function: it has to count only
 * the untitled videos, which is fiddly enough to be worth writing once.
 */
export const uploadVideoItems = async (
  items: VideoItemUpload[],
  options: VideoItemsUploadOptions
): Promise<string[]> => {
  const { onProgress, fallbackTitle, ...perFileOptions } = options;
  const reporterFor = createUploadProgressTracker(
    items.map((item) => item.file),
    onProgress
  );

  // Only untitled videos need numbering to stay distinct on YouTube, and a lone
  // untitled one needs no suffix at all.
  const untitledCount = items.filter((item) => !item.title.trim()).length;
  let untitledIndex = 0;

  const titles = items.map((item) => {
    const ownTitle = item.title.trim();
    if (ownTitle) return ownTitle;
    untitledIndex += 1;
    return untitledCount > 1 ? `${fallbackTitle} (Part ${untitledIndex})` : fallbackTitle;
  });

  return await Promise.all(
    items.map((item, index) =>
      uploadVideoToYouTube(item.file, {
        ...perFileOptions,
        title: titles[index],
        description: item.description,
        onBytesUploaded: reporterFor(index),
      })
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

      // A name already taken in the bucket is refused rather than overwritten
      // (2026-07-30). It is a normal thing for a user to do, so it gets the route's
      // Korean message verbatim instead of a statusText the uploader can't act on.
      if (response.status === 409) {
        const { message } = await response.json();
        throw new Error(message ?? `이미 "${file.name}"과 같은 이름의 파일이 있어요.`);
      }

      if (!response.ok) {
        throw new Error(`Failed to get signed URL: ${response.statusText}`);
      }

      const { signedUrl, publicUrl } = await response.json();

      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
          // Must match the `extensionHeaders` the URL was signed with, or the
          // signature itself fails. GCS rejects the write with 412 if the object
          // was created between our exists() check and this PUT.
          'x-goog-if-generation-match': '0',
        },
        body: file,
      });

      // 412 is that race losing, not a broken upload — same user-facing cause as
      // the 409 above.
      if (uploadResponse.status === 412) {
        throw new Error(
          `이미 "${file.name}"과 같은 이름의 파일이 있어요. 파일 이름을 바꿔서 다시 올려주세요.`
        );
      }

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

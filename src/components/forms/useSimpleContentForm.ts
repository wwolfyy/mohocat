'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { uploadVideoItems, uploadImagesWithSignedUrls } from './uploadStrategies';
import { useDialog } from '@/components/ui/useDialog';
import { useMountain } from '@/components/MountainProvider';
import { getYouTubePlaylistId } from '@/utils/config';
import { parseRecordingDateFromTitle, formatDateForInput } from '@/utils/dateParser';
import type { ExistingMedia, MediaItem } from './MediaItemList';
import { toExistingImages, toExistingVideos } from './existingMedia';

/**
 * Shared submit/upload flow for the simple-content family (공지사항 + 입양홍보;
 * complexity-retirement P2.1). Owns the state and submit pipeline the two forms
 * previously duplicated line-for-line: title/message + media state, validation
 * alerts, image and video upload, Korea-time stamping, postData assembly, reset,
 * success dialog (shared ui/Modal via useDialog), and redirect. Per-form differences are injected via config;
 * form-specific extra fields (e.g. the announcement's 팝업 toggle) ride along
 * through `extraPostData`/`onResetExtras`.
 *
 * **Media is per-file since 2026-07-30 (owner).** Both forms used to hold flat
 * `File[]`s behind one `multiple` picker, which meant every video in a post got
 * the *same* YouTube title (the post title) and the same description, and photos
 * carried no description at all. They now use `MediaItem[]` and the same
 * `MediaItemList` as 집사톡, so each file carries its own 제목/설명 — and images
 * moved onto the **signed-URL strategy**, the only image path with somewhere for
 * a per-photo description to live. Two consequences, both intended:
 *
 * 1. 공지사항 / 입양홍보 photos now get a **`cat_images` record**, so they appear
 *    in the public 사진첩 and in the admin tagging queue. The old direct-storage
 *    path recorded nothing at all.
 * 2. Both forms gained a **cat selector** (owner, 2026-07-30) — the same
 *    `CatSelectorModal` 집사톡 uses, one for video and one for images — so those
 *    records can be tagged at upload time instead of only in the tagging queue.
 *    An empty selection still stays empty: `needsTagging` is the signal that the
 *    photo has never been tagged, and a default would erase it.
 *
 * 🗑️ **The pasted-URL lists were removed (owner, 2026-07-30).** Both forms briefly
 * kept an "또는 URL 입력" list beside the file picker; the owner dropped it, so
 * these composers now only attach media they upload.
 *
 * State is hand-rolled useState by decision (§7: react-hook-form dropped — the
 * forms' complexity is upload management, not field state).
 */

export interface SimpleContentFormConfig {
  /**
   * YouTube **title** fallback, used when a video's own 제목 and the post's title
   * are both empty. Title inheritance is kept by decision (owner, 2026-08-05):
   * an untitled video on YouTube is worse than one carrying its post's title.
   *
   * ⚠️ **No `description` here since 2026-08-05** — a video's 설명 is now taken
   * verbatim, empty included, so there is no fallback left to configure. See the
   * upload call below.
   *
   * ⚠️ **No `tags` here, deliberately.** These composers offer the uploader no cat
   * selection, and they used to attach a fixed `공지사항` / `입양홍보` tag regardless —
   * which made `needsTagging` false and kept every one of those videos out of the
   * tagging queue that exists to find untagged ones. Untagged now stays untagged
   * (owner, 2026-07-29); don't reintroduce a default here.
   */
  youtubeDefaults: { title: string };
  /**
   * Playlists to file uploaded videos into, beyond the owning mountain's own
   * (which this hook always adds). 입양홍보 passes the cross-mountain adoption
   * playlist here (plan D7/D8); 공지사항 passes nothing and stays unfiled apart
   * from its mountain playlist.
   */
  extraPlaylistIds?: () => (string | null)[];
  /** Firestore write, injected from the owning form's service. */
  createPost: (postData: Record<string, unknown>) => Promise<unknown>;
  /** Extra fields merged into postData (e.g. the announcement's showInModal). */
  extraPostData?: () => Record<string, unknown>;
  /** Reset for form-specific extra state after a successful submit. */
  onResetExtras?: () => void;
  successMessage: string;
  errorMessagePrefix: string;
  /** Public surface to redirect to after a successful submit. */
  redirectPath: string;
  /**
   * Present ⇒ the form is **editing** an existing post rather than creating one
   * (2026-08-02, owner). Same fields, same pickers, same upload pipeline — the
   * only differences are prefilling, appending to the media already attached,
   * and `updatePost` instead of `createPost`.
   *
   * 🔑 **Why one hook and not a second form:** the separate `EditPostForm` could
   * only take media as **pasted URLs**, because when it was written the three
   * composers uploaded images by three different routes. That stopped being true
   * on 2026-07-30, when 공지사항 / 입양홍보 moved onto the same signed-URL
   * strategy 집사톡 uses — so the obstacle was gone and only the divergence was
   * left. Two implementations of one job is exactly what produced the
   * 2026-07-31 media defects.
   */
  edit?: {
    postId: string;
    /** Loads the post to prefill from; `null` ⇒ render the not-found state. */
    loadPost: () => Promise<Record<string, any> | null>;
    /** Merging write (`updateDoc`), so fields this form never shows survive. */
    updatePost: (postId: string, postData: Record<string, unknown>) => Promise<unknown>;
    /** Prefill form-specific extras from the loaded post (e.g. showInModal). */
    onLoadExtras?: (post: Record<string, any>) => void;
  };
}

export const useSimpleContentForm = (config: SimpleContentFormConfig) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageItems, setImageItems] = useState<MediaItem[]>([]);
  const [videoItems, setVideoItems] = useState<MediaItem[]>([]);
  const [selectedVideoTags, setSelectedVideoTags] = useState<string[]>([]);
  const [selectedImageTags, setSelectedImageTags] = useState<string[]>([]);
  const [showVideoTagSelector, setShowVideoTagSelector] = useState(false);
  const [showImageTagSelector, setShowImageTagSelector] = useState(false);
  const [uploading, setUploading] = useState(false);
  /** 0 → 1 while video bytes are in flight; null when no video upload is running. */
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  /**
   * 촬영일 — a calendar date (YYYY-MM-DD), empty when unknown. Added 2026-08-02:
   * these two composers had no such field, so nothing was ever sent and both the
   * video and image paths silently stamped the **upload moment** as the day the
   * media was recorded (DEBUG_LOG 2026-08-02). Those fallbacks now store null, and
   * this field is how a date gets supplied at all — matching 집사톡, which had it
   * from the start and was the only family unaffected by that bug.
   */
  const [createdTime, setCreatedTime] = useState('');

  /**
   * Media already attached to the post being edited. Kept apart from
   * `imageItems`/`videoItems` because these are stored URLs, not `File`s: they
   * never enter an upload strategy, they are simply carried back into the write
   * unless the operator removes them.
   */
  const [existingImages, setExistingImages] = useState<ExistingMedia[]>([]);
  const [existingVideos, setExistingVideos] = useState<ExistingMedia[]>([]);
  /** Edit mode only: the prefill is a fetch, so it has the usual three states. */
  const [loadingPost, setLoadingPost] = useState(Boolean(config.edit));
  const [postNotFound, setPostNotFound] = useState(false);

  const router = useRouter();
  const { user } = useAuth();
  const dialog = useDialog();
  const mountainId = useMountain();

  // Prefill when editing. `loadPost` is called once per post id — the config
  // object is rebuilt every render, so keying the effect on it would loop.
  const editPostId = config.edit?.postId;
  const loadPost = config.edit?.loadPost;
  const onLoadExtras = config.edit?.onLoadExtras;

  useEffect(() => {
    if (!editPostId || !loadPost) return;
    let active = true;

    const run = async () => {
      setLoadingPost(true);
      try {
        const post = await loadPost();
        if (!active) return;

        if (!post) {
          setPostNotFound(true);
          return;
        }

        setTitle(post.title || '');
        setMessage(post.message || '');
        setExistingImages(toExistingImages(post.imageUrls));
        setExistingVideos(toExistingVideos(post.videoUrls));
        onLoadExtras?.(post);
      } catch (error) {
        console.error('useSimpleContentForm: failed to load the post to edit', error);
        if (active) setPostNotFound(true);
      } finally {
        if (active) setLoadingPost(false);
      }
    };

    run();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editPostId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      if (!title.trim()) {
        await dialog.alert('제목을 입력해주세요.');
        return;
      }

      if (!message.trim()) {
        await dialog.alert('내용을 입력해주세요.');
        return;
      }

      if (!user?.email) {
        await dialog.alert('사용자 정보를 확인할 수 없습니다. 다시 로그인해주세요.');
        return;
      }

      // Editing starts from whatever the operator kept; creating starts empty.
      // Retained media leads, so newly added files append in pick order.
      let allImageUrls: string[] = existingImages.map((medium) => medium.url);
      let allVideoUrls: string[] = existingVideos.map((medium) => medium.url);

      if (imageItems.length > 0) {
        try {
          const uploadedImageUrls = await uploadImagesWithSignedUrls(
            imageItems.map((item) => ({ file: item.file, description: item.description })),
            {
              mountainId,
              // Whatever the uploader picked in the cat selector — empty stays
              // empty, which is what leaves `needsTagging` true and surfaces the
              // photo in the tagging queue.
              tags: selectedImageTags,
              // Empty when the uploader neither typed a date nor picked a file whose
              // name carries one — the strategy then stores null rather than inventing
              // the upload moment (DEBUG_LOG 2026-08-02).
              createdTime,
              uploadedBy: user.email,
              user,
            }
          );
          allImageUrls = [...allImageUrls, ...uploadedImageUrls];
        } catch (error) {
          await dialog.alert(
            '이미지 업로드 실패: ' + (error instanceof Error ? error.message : 'Unknown error')
          );
          return;
        }
      }

      if (videoItems.length > 0) {
        try {
          // The mountain's own playlist always, plus whatever the form adds
          // (입양홍보 → the cross-mountain adoption playlist). Nulls = "not
          // configured yet" and drop out.
          const playlistIds = [
            getYouTubePlaylistId(mountainId),
            ...(config.extraPlaylistIds?.() ?? []),
          ].filter((playlistId): playlistId is string => Boolean(playlistId));

          setUploadProgress(0);
          const uploadedVideoUrls = await uploadVideoItems(
            // ⚠️ **A video's 설명 is taken verbatim — empty stays empty** (owner,
            // 2026-08-05). This REVERSES the earlier behaviour, where a video
            // without its own 설명 inherited the post body (a holdover from when
            // one description covered the whole batch). Do not restore it: the
            // 설명 field is the uploader's statement about the video, and an
            // empty one is an answer, not a gap to fill. 집사톡 has worked this
            // way since the per-file refactor; this is the other two catching up.
            videoItems,
            {
              fallbackTitle: title.trim() || config.youtubeDefaults.title,
              // Untagged stays untagged when nothing is picked — a default would set
              // `needsTagging: false` and hide the video from the queue that exists
              // to find untagged ones (owner, 2026-07-29).
              tags: selectedVideoTags.join(', '),
              // Reaches YouTube as `recordingDetails.recordingDate` and Firestore as
              // `createdTime`; omitted entirely when empty, so YouTube is not given a
              // date we do not have.
              createdTime: createdTime || undefined,
              playlistIds,
              user,
              onProgress: setUploadProgress,
            }
          );
          allVideoUrls = [...allVideoUrls, ...uploadedVideoUrls];
        } catch (error) {
          await dialog.alert(
            '동영상 업로드 실패: ' + (error instanceof Error ? error.message : 'Unknown error')
          );
          return;
        }
      }

      // Get current time in Korea timezone
      const now = new Date();
      const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);

      const postData = {
        title: title.trim(),
        message: message.trim(),
        imageUrls: allImageUrls,
        videoUrls: allVideoUrls,
        thumbnailUrl: allImageUrls.length > 0 ? allImageUrls[0] : null,
        mediaType: allVideoUrls.length > 0 ? 'video' : allImageUrls.length > 0 ? 'image' : null,
        // ⚠️ Authorship and timestamp are set **once, at creation**. Re-stamping
        // them on an edit would relabel someone else's post with the editor's
        // address and jump it to the top of a list ordered by 게시일.
        ...(config.edit
          ? {}
          : {
              username: user.email,
              date: koreaTime.toISOString().split('T')[0], // YYYY-MM-DD
              time: koreaTime.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              }),
            }),
        ...(config.extraPostData ? config.extraPostData() : {}),
      };

      if (config.edit) {
        await config.edit.updatePost(config.edit.postId, postData);
        // No reset: the operator stays on a form that still shows the post they
        // just saved, right up until the redirect below.
        await dialog.alert(config.successMessage);
        router.push('/admin/posts');
        return;
      }

      await config.createPost(postData);

      // Reset form
      setTitle('');
      setMessage('');
      setCreatedTime('');
      setImageItems([]);
      setVideoItems([]);
      setSelectedVideoTags([]);
      setSelectedImageTags([]);
      config.onResetExtras?.();

      await dialog.alert(config.successMessage);

      router.push(config.redirectPath);
    } catch (error) {
      await dialog.alert(
        config.errorMessagePrefix + (error instanceof Error ? error.message : 'Unknown error')
      );
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  /** Both forms cancel back to the admin posts surface. */
  const cancel = () => router.push('/admin/posts');

  /**
   * Fill 촬영일 from a filename the first time one yields a date — same behaviour as
   * 집사톡 (`useRichContentForm.autoParseCreatedTime`), including videos taking
   * precedence over images. Only ever fills an EMPTY field, so a date the uploader
   * typed is never overwritten by a later file pick.
   *
   * ⚠️ Filename-only by design, and its limits are the deferred item in the HANDOFF
   * open threads: iPhone names (`IMG_1234.MOV`) carry no date and will not parse, so
   * the field stays empty and the uploader types it. That is the point of having the
   * field — before it existed, an unparseable name meant a fabricated date.
   */
  const autoParseCreatedTime = (items: MediaItem[]) => {
    if (createdTime) return;
    for (const item of items) {
      const parsedDate = parseRecordingDateFromTitle(item.file.name);
      if (parsedDate) {
        setCreatedTime(formatDateForInput(parsedDate));
        return;
      }
    }
  };

  const handleVideoItemsChange = (items: MediaItem[]) => {
    setVideoItems(items);
    autoParseCreatedTime(items);
  };

  const handleImageItemsChange = (items: MediaItem[]) => {
    setImageItems(items);
    // Videos take precedence for the date, matching 집사톡.
    if (videoItems.length === 0) {
      autoParseCreatedTime(items);
    }
  };

  return {
    title,
    setTitle,
    message,
    setMessage,
    createdTime,
    setCreatedTime,
    imageItems,
    // Prefer the handlers below at call sites — they also drive the 촬영일
    // auto-parse. The raw setters stay exported for resets.
    setImageItems,
    handleImageItemsChange,
    videoItems,
    setVideoItems,
    handleVideoItemsChange,
    selectedVideoTags,
    setSelectedVideoTags,
    selectedImageTags,
    setSelectedImageTags,
    showVideoTagSelector,
    setShowVideoTagSelector,
    showImageTagSelector,
    setShowImageTagSelector,
    uploading,
    uploadProgress,
    handleSubmit,
    cancel,
    /** Media already on the post — edit mode only; empty when creating. */
    existingImages,
    setExistingImages,
    existingVideos,
    setExistingVideos,
    /** `true` while an edit's prefill is in flight; always `false` when creating. */
    loadingPost,
    /** The edited post could not be loaded — render the not-found state. */
    postNotFound,
    /** `true` when this form is editing rather than creating. */
    isEditing: Boolean(config.edit),
    /** Render once inside the owning form (replaces native alert dialogs). */
    dialog: dialog.element,
  };
};

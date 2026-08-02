'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { parseRecordingDateFromTitle, formatDateForInput } from '@/utils/dateParser';
import { uploadVideoItems, uploadImagesWithSignedUrls } from './uploadStrategies';
import { useDialog } from '@/components/ui/useDialog';
import { useMountain } from '@/components/MountainProvider';
import { getMountainName, getYouTubePlaylistId } from '@/utils/config';
import type { ExistingMedia, MediaItem } from './MediaItemList';
import { toExistingImages, toExistingVideos } from './existingMedia';

/**
 * Shared submit/upload flow for the rich-content family (complexity-retirement
 * P3.1). Owns file selection with filename date auto-parse, the per-mountain
 * playlist, cat-tag selector state, video upload via the shared YouTube
 * strategy, image upload via the signed-URL strategy, post assembly, and the
 * create/reset/redirect tail. Form-specific behavior is injected via config.
 *
 * ⚠️ **집사톡(NewButlerTalkForm) is the only consumer** since 2026-07-27:
 * 집사게시판 dropped media upload entirely and now has a plain submit handler of
 * its own (plan D1). Kept as a hook rather than inlined because the per-file
 * media rework (D2) lands here next.
 *
 * Convergence deltas accepted at P3 (documented in the assessment): empty
 * `createdTime`/`playlistIds` are omitted from the YouTube request instead of
 * sent as '' (old ButlerTalk), single-video titles lose a trailing space (old
 * Post), and both forms share the statusText-style upload error message.
 */

export interface RichContentFormConfig {
  /** Fallback title for YouTube uploads when the title input is empty. */
  buildDefaultTitle: () => string;
  /**
   * Fallback title for the stored post when the input is empty. Defaults to
   * `buildDefaultTitle` (ButlerTalk stores the undated '집사톡 글입니다').
   */
  buildPostTitleFallback?: () => string;
  /** Firestore write, injected from the owning form's service. */
  createPost: (post: Record<string, unknown>) => Promise<unknown>;
  /** Post-create side effects (Post: feeding-spots update; non-fatal inside). */
  afterCreate?: () => Promise<void>;
  /** Whether to clear the shared fields after success (Post yes, ButlerTalk no). */
  resetAfterCreate: boolean;
  /** Reset for form-specific extra state after success (Post: visit time). */
  onResetExtras?: () => void;
  successMessage: string;
  errorMessagePrefix: string;
  redirectPath: string;
  /**
   * Present ⇒ the form is **editing** an existing post rather than creating one
   * (2026-08-02, owner). Mirrors `useSimpleContentForm.edit`: same fields, same
   * pickers, same upload pipeline — only prefilling, appending to the media
   * already attached, and `updatePost` instead of `createPost` differ.
   *
   * 🔑 집사톡 was the last post type still edited through the URL-only
   * `EditPostForm`, which meant changing a photo required hunting down its
   * Storage URL. Its create composer already did the job properly.
   */
  edit?: {
    postId: string;
    /** Loads the post to prefill from; `null` ⇒ render the not-found state. */
    loadPost: () => Promise<Record<string, any> | null>;
    /** Merging write (`updateDoc`), so fields this form never shows survive. */
    updatePost: (postId: string, post: Record<string, unknown>) => Promise<unknown>;
  };
}

export const useRichContentForm = (config: RichContentFormConfig) => {
  const mountainId = useMountain();
  const [videoItems, setVideoItems] = useState<MediaItem[]>([]);
  const [imageItems, setImageItems] = useState<MediaItem[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  /** 0 → 1 while video bytes are in flight; null when no video upload is running. */
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [createdTime, setCreatedTime] = useState('');
  const [selectedVideoTags, setSelectedVideoTags] = useState<string[]>([]);
  const [selectedImageTags, setSelectedImageTags] = useState<string[]>([]);
  const [showVideoTagSelector, setShowVideoTagSelector] = useState(false);
  const [showImageTagSelector, setShowImageTagSelector] = useState(false);

  /**
   * Media already attached to the post being edited — stored URLs, not `File`s,
   * so they never enter an upload strategy. They are carried back into the write
   * unless the operator removes them.
   */
  const [existingImages, setExistingImages] = useState<ExistingMedia[]>([]);
  const [existingVideos, setExistingVideos] = useState<ExistingMedia[]>([]);
  /** Edit mode only: the prefill is a fetch, so it has the usual three states. */
  const [loadingPost, setLoadingPost] = useState(Boolean(config.edit));
  const [postNotFound, setPostNotFound] = useState(false);

  const router = useRouter();
  const dialog = useDialog();
  const { user, isAuthenticated, loading } = useAuth();

  // The mountain's own playlist on the shared channel, straight from config —
  // this replaced a `/api/youtube-playlists` fetch that picked the playlist whose
  // title happened to equal '집사게시판' (a rename on YouTube silently stopped
  // filing, and it filed every mountain into the same list). `null` = the mountain
  // deliberately has no playlist yet; the upload proceeds unfiled.
  const playlistId = getYouTubePlaylistId(mountainId);
  const playlistLabel = playlistId ? getMountainName(mountainId) : null;

  // Prefill when editing. Keyed on the post id alone — `config` is rebuilt every
  // render, so depending on it would refetch in a loop.
  const editPostId = config.edit?.postId;
  const loadPost = config.edit?.loadPost;

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
      } catch (error) {
        console.error('useRichContentForm: failed to load the post to edit', error);
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

  /**
   * Fill 촬영일 from a filename the first time one yields a date. Unchanged in
   * spirit from the single-picker version (first video, else first image) — with
   * one file per section, "first" is now the first item that parses.
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
    // Videos take precedence for the date, as before.
    if (videoItems.length === 0) {
      autoParseCreatedTime(items);
    }
  };

  /**
   * Leave without posting, confirming first if anything would be lost. Files
   * count as content: picking three videos and then typing nothing is still work
   * the user would not want silently dropped.
   */
  const handleCancel = async () => {
    // ⚠️ When editing, title/message arrive prefilled — they are not evidence
    // the operator typed anything, so only newly picked files count as work.
    const isDirty = config.edit
      ? videoItems.length > 0 || imageItems.length > 0
      : title.trim().length > 0 ||
        message.trim().length > 0 ||
        videoItems.length > 0 ||
        imageItems.length > 0;

    if (isDirty) {
      const confirmed = await dialog.confirm('작성 중인 내용이 사라져요. 그만 쓸까요?');
      if (!confirmed) return;
    }
    router.push(config.redirectPath);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setUploading(true);

    try {
      let videoUrls: string[] = [];
      let videoThumb = '';
      let imageUrls: string[] = [];
      let mediaType: 'video' | 'image' = 'image';

      // Upload videos first if present (this takes longer)
      if (videoItems.length > 0) {
        try {
          setUploadProgress(0);
          videoUrls = await uploadVideoItems(videoItems, {
            // Untitled videos fall back to the post title; per-item titles are
            // uploaded verbatim (plan §4.3).
            fallbackTitle: title.trim() || config.buildDefaultTitle(),
            // Untagged stays untagged. A '산고양이' fallback used to fill this in,
            // which set `needsTagging: false` on the record and hid the video from
            // the very queue meant to surface it (owner, 2026-07-29).
            tags: selectedVideoTags.join(', '),
            createdTime: createdTime || undefined,
            playlistIds: playlistId ? [playlistId] : undefined,
            user,
            onProgress: setUploadProgress,
          });
          mediaType = 'video';
        } catch (videoError) {
          await dialog.alert(
            'Video upload failed: ' +
              (videoError instanceof Error ? videoError.message : 'Unknown error')
          );
          return;
        }
      }

      if (imageItems.length > 0) {
        try {
          imageUrls = await uploadImagesWithSignedUrls(
            imageItems.map((item) => ({ file: item.file, description: item.description })),
            {
              mountainId,
              tags: selectedImageTags,
              createdTime,
              uploadedBy: user?.email || 'unknown',
              user,
            }
          );
          if (!videoThumb && imageUrls.length > 0) {
            videoThumb = imageUrls[0];
          }
        } catch (imageError) {
          await dialog.alert(
            'Image upload failed: ' +
              (imageError instanceof Error ? imageError.message : 'Unknown error')
          );
          return;
        }
      }

      // Validate that we have the expected content
      if (videoItems.length > 0 && videoUrls.length === 0) {
        throw new Error('Video files were selected but no video URLs were generated');
      }

      // Editing starts from whatever the operator kept; creating starts empty.
      // Retained media leads, so newly picked files append in pick order.
      const allVideoUrls = [...existingVideos.map((m) => m.url), ...videoUrls];
      const allImageUrls = [...existingImages.map((m) => m.url), ...imageUrls];

      const now = new Date();
      const thumbnailUrl = videoThumb || (allImageUrls.length > 0 ? allImageUrls[0] : '');
      const finalTitle =
        title.trim() || (config.buildPostTitleFallback ?? config.buildDefaultTitle)();
      // A post with any video reads as a video post, whether that video was just
      // uploaded or was already attached.
      const finalMediaType: 'video' | 'image' = allVideoUrls.length > 0 ? 'video' : mediaType;

      const post = {
        title: finalTitle,
        thumbnailUrl,
        mediaType: finalMediaType,
        videoUrls: allVideoUrls,
        imageUrls: allImageUrls,
        message,
        // ⚠️ Authorship and timestamp are set **once, at creation**. Re-stamping
        // them on an edit would relabel someone else's post with the editor's
        // address and jump it to the top of a list ordered by 게시일.
        ...(config.edit
          ? {}
          : {
              username: user?.email || 'unknown',
              date: now.toISOString().split('T')[0], // YYYY-MM-DD format in UTC
              time: now.toISOString().split('T')[1].split('.')[0], // HH:MM:SS format in UTC
            }),
        // ⚠️ Post-level `tags` mirror the cat selector, which only ever applies to
        // files being uploaded now. On an edit with no new files it would be
        // empty — and since `updatePost` merges, sending it would ERASE the tags
        // the post already carries. Omitted unless something was actually picked.
        ...(config.edit && videoItems.length === 0 && imageItems.length === 0
          ? {}
          : { tags: finalMediaType === 'video' ? selectedVideoTags : selectedImageTags }),
      };

      if (config.edit) {
        await config.edit.updatePost(config.edit.postId, post);
        await dialog.alert(config.successMessage);
        router.push('/admin/posts');
        return;
      }

      await config.createPost(post);

      await config.afterCreate?.();

      if (config.resetAfterCreate) {
        setVideoItems([]);
        setImageItems([]);
        setTitle('');
        setMessage('');
      }
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

  return {
    user,
    isAuthenticated,
    loading,
    videoItems,
    imageItems,
    handleVideoItemsChange,
    handleImageItemsChange,
    title,
    setTitle,
    message,
    setMessage,
    uploading,
    uploadProgress,
    createdTime,
    setCreatedTime,
    /** The mountain's playlist, or `null` when it has none configured yet. */
    playlistId,
    /** Display name for the locked 재생목록 field; `null` mirrors `playlistId`. */
    playlistLabel,
    selectedVideoTags,
    setSelectedVideoTags,
    selectedImageTags,
    setSelectedImageTags,
    showVideoTagSelector,
    setShowVideoTagSelector,
    showImageTagSelector,
    setShowImageTagSelector,
    handleSubmit,
    handleCancel,
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

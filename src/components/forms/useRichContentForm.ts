'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { parseRecordingDateFromTitle, formatDateForInput } from '@/utils/dateParser';
import { uploadVideoItems, uploadImagesWithSignedUrls } from './uploadStrategies';
import { useDialog } from '@/components/ui/useDialog';
import { useMountain } from '@/components/MountainProvider';
import { getMountainName, getYouTubePlaylistId } from '@/utils/config';
import type { MediaItem } from './MediaItemList';

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
    const isDirty =
      title.trim().length > 0 ||
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

      const now = new Date();
      const thumbnailUrl = videoThumb || (imageUrls.length > 0 ? imageUrls[0] : '');
      const finalTitle =
        title.trim() || (config.buildPostTitleFallback ?? config.buildDefaultTitle)();

      const post = {
        title: finalTitle,
        username: user?.email || 'unknown',
        date: now.toISOString().split('T')[0], // YYYY-MM-DD format in UTC
        time: now.toISOString().split('T')[1].split('.')[0], // HH:MM:SS format in UTC
        thumbnailUrl,
        mediaType,
        videoUrls,
        imageUrls,
        message,
        tags: mediaType === 'video' ? selectedVideoTags : selectedImageTags,
      };

      // Validate that we have the expected content
      if (videoItems.length > 0 && videoUrls.length === 0) {
        throw new Error('Video files were selected but no video URLs were generated');
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
    /** Render once inside the owning form (replaces native alert dialogs). */
    dialog: dialog.element,
  };
};

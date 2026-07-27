'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  parseRecordingDateFromTitle,
  formatDateForInput,
  formatDateTimeForInput,
} from '@/utils/dateParser';
import { uploadVideoToYouTube, uploadImagesWithSignedUrls } from './uploadStrategies';
import { useDialog } from '@/components/ui/useDialog';
import { useMountain } from '@/components/MountainProvider';
import { getMountainName, getYouTubePlaylistId } from '@/utils/config';

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
  /** YouTube description fallback when the message is empty. */
  youtubeDescriptionDefault: string;
  /** Drives the created-time input type AND the filename auto-parse format. */
  createdTimeInputType: 'date' | 'datetime-local';
  /** Multi-video uploads get " (Part n)" title suffixes (Post behavior). */
  multiPartVideoTitles: boolean;
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
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [createdTime, setCreatedTime] = useState('');
  const [selectedVideoTags, setSelectedVideoTags] = useState<string[]>([]);
  const [selectedImageTags, setSelectedImageTags] = useState<string[]>([]);
  const [showVideoTagSelector, setShowVideoTagSelector] = useState(false);
  const [showImageTagSelector, setShowImageTagSelector] = useState(false);

  const router = useRouter();
  const dialog = useDialog();
  const { user, isAuthenticated, loading } = useAuth();

  const formatParsedDate =
    config.createdTimeInputType === 'date' ? formatDateForInput : formatDateTimeForInput;

  // The mountain's own playlist on the shared channel, straight from config —
  // this replaced a `/api/youtube-playlists` fetch that picked the playlist whose
  // title happened to equal '집사게시판' (a rename on YouTube silently stopped
  // filing, and it filed every mountain into the same list). `null` = the mountain
  // deliberately has no playlist yet; the upload proceeds unfiled.
  const playlistId = getYouTubePlaylistId(mountainId);
  const playlistLabel = playlistId ? getMountainName(mountainId) : null;

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const files = Array.from(event.target.files);
      setVideoFiles(files);

      // Auto-parse the recording date from the first video file name.
      if (!createdTime) {
        const parsedDate = parseRecordingDateFromTitle(files[0].name);
        if (parsedDate) {
          setCreatedTime(formatParsedDate(parsedDate));
        }
      }
    } else {
      setVideoFiles([]);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      setImageFiles(files);

      // Fall back to the first image file name when no video set the date.
      if (files.length > 0 && videoFiles.length === 0 && !createdTime) {
        const parsedDate = parseRecordingDateFromTitle(files[0].name);
        if (parsedDate) {
          setCreatedTime(formatParsedDate(parsedDate));
        }
      }
    }
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
      if (videoFiles.length > 0) {
        try {
          const finalTitle = title.trim() || config.buildDefaultTitle();
          videoUrls = await Promise.all(
            videoFiles.map((file, index) =>
              uploadVideoToYouTube(file, {
                title:
                  config.multiPartVideoTitles && videoFiles.length > 1
                    ? `${finalTitle} (Part ${index + 1})`
                    : finalTitle,
                description: message || config.youtubeDescriptionDefault,
                tags: selectedVideoTags.length > 0 ? selectedVideoTags.join(', ') : '산고양이',
                createdTime: createdTime || undefined,
                playlistIds: playlistId ? [playlistId] : undefined,
                user,
              })
            )
          );
          mediaType = 'video';
        } catch (videoError) {
          await dialog.alert(
            'Video upload failed: ' +
              (videoError instanceof Error ? videoError.message : 'Unknown error')
          );
          return;
        }
      }

      if (imageFiles.length > 0) {
        try {
          imageUrls = await uploadImagesWithSignedUrls(imageFiles, {
            mountainId,
            tags: selectedImageTags,
            createdTime,
            uploadedBy: user?.email || 'unknown',
            description: message || '',
            user,
          });
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
      if (videoFiles.length > 0 && videoUrls.length === 0) {
        throw new Error('Video files were selected but no video URLs were generated');
      }

      await config.createPost(post);

      await config.afterCreate?.();

      if (config.resetAfterCreate) {
        setVideoFiles([]);
        setImageFiles([]);
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
    }
  };

  return {
    user,
    isAuthenticated,
    loading,
    videoFiles,
    imageFiles,
    handleVideoChange,
    handleImageChange,
    title,
    setTitle,
    message,
    setMessage,
    uploading,
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
    /** Render once inside the owning form (replaces native alert dialogs). */
    dialog: dialog.element,
  };
};

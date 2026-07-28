'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { uploadImagesToStorage, uploadVideosToYouTube } from './uploadStrategies';
import { useDialog } from '@/components/ui/useDialog';
import { useMountain } from '@/components/MountainProvider';
import { getMountainConfig, getYouTubePlaylistId } from '@/utils/config';

/**
 * Shared submit/upload flow for the simple-content family (공지사항 + 입양홍보;
 * complexity-retirement P2.1). Owns the state and submit pipeline the two forms
 * previously duplicated line-for-line: title/message + media state, validation
 * alerts, image upload via the direct-storage strategy, video upload via the
 * shared YouTube strategy, Korea-time stamping, postData assembly, reset,
 * success dialog (shared ui/Modal via useDialog), and redirect. Per-form differences are injected via config;
 * form-specific extra fields (e.g. the announcement's 팝업 toggle) ride along
 * through `extraPostData`/`onResetExtras`.
 *
 * State is hand-rolled useState by decision (§7: react-hook-form dropped — the
 * forms' complexity is upload management, not field state).
 */

export interface SimpleContentFormConfig {
  /** Storage path prefix for image uploads, e.g. 'announcements/images'. */
  imagePathPrefix: string;
  /** YouTube metadata fallbacks (used when title/message are empty) + fixed tag. */
  youtubeDefaults: { title: string; description: string; tags: string };
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
}

export const useSimpleContentForm = (config: SimpleContentFormConfig) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  /** 0 → 1 while video bytes are in flight; null when no video upload is running. */
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const router = useRouter();
  const { user } = useAuth();
  const dialog = useDialog();
  const mountainId = useMountain();
  const storagePrefix = getMountainConfig(mountainId).storagePrefix;

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

      // Upload files and combine with URLs
      let allImageUrls = [...imageUrls.filter((url) => url.trim())];
      let allVideoUrls = [...videoUrls.filter((url) => url.trim())];

      if (imageFiles.length > 0) {
        try {
          const uploadedImageUrls = await uploadImagesToStorage(
            imageFiles,
            config.imagePathPrefix,
            storagePrefix
          );
          allImageUrls = [...allImageUrls, ...uploadedImageUrls];
        } catch (error) {
          await dialog.alert(
            '이미지 업로드 실패: ' + (error instanceof Error ? error.message : 'Unknown error')
          );
          return;
        }
      }

      if (videoFiles.length > 0) {
        try {
          // The mountain's own playlist always, plus whatever the form adds
          // (입양홍보 → the cross-mountain adoption playlist). Nulls = "not
          // configured yet" and drop out.
          const playlistIds = [
            getYouTubePlaylistId(mountainId),
            ...(config.extraPlaylistIds?.() ?? []),
          ].filter((playlistId): playlistId is string => Boolean(playlistId));

          setUploadProgress(0);
          const uploadedVideoUrls = await uploadVideosToYouTube(videoFiles, {
            title: title || config.youtubeDefaults.title,
            description: message || config.youtubeDefaults.description,
            tags: config.youtubeDefaults.tags,
            playlistIds,
            user,
            onProgress: setUploadProgress,
          });
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
        username: user.email,
        date: koreaTime.toISOString().split('T')[0], // YYYY-MM-DD
        time: koreaTime.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
        imageUrls: allImageUrls,
        videoUrls: allVideoUrls,
        thumbnailUrl: allImageUrls.length > 0 ? allImageUrls[0] : null,
        mediaType: allVideoUrls.length > 0 ? 'video' : allImageUrls.length > 0 ? 'image' : null,
        ...(config.extraPostData ? config.extraPostData() : {}),
      };

      await config.createPost(postData);

      // Reset form
      setTitle('');
      setMessage('');
      setImageFiles([]);
      setVideoFiles([]);
      setImageUrls([]);
      setVideoUrls([]);
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

  return {
    title,
    setTitle,
    message,
    setMessage,
    imageFiles,
    setImageFiles,
    videoFiles,
    setVideoFiles,
    imageUrls,
    setImageUrls,
    videoUrls,
    setVideoUrls,
    uploading,
    uploadProgress,
    handleSubmit,
    cancel,
    /** Render once inside the owning form (replaces native alert dialogs). */
    dialog: dialog.element,
  };
};

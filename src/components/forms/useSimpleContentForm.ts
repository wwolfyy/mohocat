'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { uploadVideoItems, uploadImagesWithSignedUrls } from './uploadStrategies';
import { useDialog } from '@/components/ui/useDialog';
import { useMountain } from '@/components/MountainProvider';
import { getYouTubePlaylistId } from '@/utils/config';
import type { MediaItem } from './MediaItemList';

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
   * YouTube metadata fallbacks, used when a video's own 제목/설명 and the post's
   * title/message are all empty.
   *
   * ⚠️ **No `tags` here, deliberately.** These composers offer the uploader no cat
   * selection, and they used to attach a fixed `공지사항` / `입양홍보` tag regardless —
   * which made `needsTagging` false and kept every one of those videos out of the
   * tagging queue that exists to find untagged ones. Untagged now stays untagged
   * (owner, 2026-07-29); don't reintroduce a default here.
   */
  youtubeDefaults: { title: string; description: string };
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
  const [imageItems, setImageItems] = useState<MediaItem[]>([]);
  const [videoItems, setVideoItems] = useState<MediaItem[]>([]);
  const [selectedVideoTags, setSelectedVideoTags] = useState<string[]>([]);
  const [selectedImageTags, setSelectedImageTags] = useState<string[]>([]);
  const [showVideoTagSelector, setShowVideoTagSelector] = useState(false);
  const [showImageTagSelector, setShowImageTagSelector] = useState(false);
  const [uploading, setUploading] = useState(false);
  /** 0 → 1 while video bytes are in flight; null when no video upload is running. */
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const router = useRouter();
  const { user } = useAuth();
  const dialog = useDialog();
  const mountainId = useMountain();

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

      let allImageUrls: string[] = [];
      let allVideoUrls: string[] = [];

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
              // No 촬영일 field on these composers; the strategy falls back to the
              // upload moment, which is what the direct-storage path recorded too.
              createdTime: '',
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
            // A video left without its own 설명 keeps inheriting the post body, as
            // it did when one description covered the whole batch. Unlike 집사톡
            // (where empty means empty), dropping this would silently blank the
            // description on every announcement video that doesn't type one.
            videoItems.map((item) => ({
              ...item,
              description:
                item.description.trim() || message.trim() || config.youtubeDefaults.description,
            })),
            {
              fallbackTitle: title.trim() || config.youtubeDefaults.title,
              // Untagged stays untagged when nothing is picked — a default would set
              // `needsTagging: false` and hide the video from the queue that exists
              // to find untagged ones (owner, 2026-07-29).
              tags: selectedVideoTags.join(', '),
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

  return {
    title,
    setTitle,
    message,
    setMessage,
    imageItems,
    setImageItems,
    videoItems,
    setVideoItems,
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
    /** Render once inside the owning form (replaces native alert dialogs). */
    dialog: dialog.element,
  };
};

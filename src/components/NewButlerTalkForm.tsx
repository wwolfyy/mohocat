'use client';

import React from 'react';
import { getButlerTalkService } from '@/services';
import Button from '@/components/ui/Button';
import CatSelectorModal from '@/components/CatSelectorModal';
import { useRichContentForm } from '@/components/forms/useRichContentForm';
import { useMountain } from '@/components/MountainProvider';
import MediaItemList from '@/components/forms/MediaItemList';
import CatTagSelectField from '@/components/forms/CatTagSelectField';
import UploadProgressBar from '@/components/forms/UploadProgressBar';
import { getButlerTalkMediaRules } from '@/utils/mediaControl';
import { FormLoadingState, FormNotFoundState } from '@/components/forms/FormStates';

/**
 * 집사톡(butler_talk) post composer. Submit/upload flow comes from the shared
 * rich-content primitives (complexity-retirement P3); no feeding-spots section.
 * Note: the stored-post title fallback is the undated '집사톡 글입니다' while the
 * YouTube title fallback is dated — preserved pre-refactor behavior.
 *
 * ⚠️ This is the **only** composer whose media sections are capped — 공지사항 and
 * 입양홍보 are admin-only and stay unrestricted (PROJECT_PLAN §10d). The caps come
 * from `config/media_control.json`, which is static: changing them is a redeploy,
 * deliberately, so no single mountain's admin can reconfigure the others.
 */
interface NewButlerTalkFormProps {
  /**
   * Present ⇒ **edit** that post instead of creating one (2026-08-02). 집사톡 was
   * the last type still edited through the URL-only `EditPostForm`; editing now
   * offers the same file pickers, per-file 제목/설명, cat selector and 촬영 날짜
   * this form has always had for writing.
   */
  postId?: string;
  /**
   * Where a successful edit lands. Defaults to the admin post list (the CMS edit
   * screen's home); the member-facing editor passes the public board instead, so
   * an author is not dropped into `/admin` after fixing their own post.
   */
  editRedirectTo?: string;
}

const NewButlerTalkForm = ({ postId, editRedirectTo }: NewButlerTalkFormProps = {}) => {
  const DEFAULT_TITLE = '집사톡 글입니다';
  const mediaRules = getButlerTalkMediaRules();

  // Generate dynamic title based on current time
  const generateDynamicTitle = () => {
    const date = new Date();
    const formattedDate = date
      .toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .replace(/\s/g, '')
      .replace(/\.$/, ''); // Remove spaces and trailing period

    return `${DEFAULT_TITLE} (${formattedDate})`;
  };

  const mountainId = useMountain();
  const butlerTalkService = getButlerTalkService(mountainId);

  const form = useRichContentForm({
    buildDefaultTitle: generateDynamicTitle,
    buildPostTitleFallback: () => DEFAULT_TITLE,
    createPost: (post) => butlerTalkService.createPost(post),
    resetAfterCreate: false,
    successMessage: postId ? '글이 수정되었습니다!' : '글이 성공적으로 작성되었습니다!',
    errorMessagePrefix: postId
      ? '글 수정 중 오류가 발생했습니다: '
      : '글 작성 중 오류가 발생했습니다: ',
    redirectPath: '/pages/butler_talk',
    ...(postId
      ? {
          edit: {
            postId,
            loadPost: () => butlerTalkService.getPostById(postId),
            updatePost: (id: string, post: Record<string, unknown>) =>
              butlerTalkService.updatePost(id, post),
            ...(editRedirectTo ? { redirectTo: editRedirectTo } : {}),
          },
        }
      : {}),
  });

  if (form.loading || form.loadingPost) {
    return <FormLoadingState />;
  }

  if (form.postNotFound) {
    return <FormNotFoundState />;
  }

  if (!form.isAuthenticated) {
    return (
      <div className="p-4 bg-brand-50 rounded-lg ring-1 ring-brand-100">
        <h2 className="text-lg font-semibold text-brand-700 mb-2">로그인이 필요해요</h2>
        <p className="text-gray-700">
          새 글을 작성하려면 로그인이 필요해요. 관리자에게 문의해서 계정을 요청해 주세요.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit} className="space-y-4">
      {/* Title Input */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          제목
        </label>
        <input
          type="text"
          id="title"
          value={form.title}
          onChange={(e) => form.setTitle(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300"
        />
      </div>

      {/* Message Input */}
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
          내용
        </label>
        <textarea
          id="message"
          value={form.message}
          onChange={(e) => form.setMessage(e.target.value)}
          rows={4}
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300"
          placeholder="글 내용을 입력하세요"
        />
      </div>

      {/* Video Upload — one file per section, each with its own 제목/설명 */}
      <MediaItemList
        kind="video"
        items={form.videoItems}
        onItemsChange={form.handleVideoItemsChange}
        disabled={form.uploading}
        allowMultiple={mediaRules.allowMultipleVideos}
        existing={form.existingVideos}
        onExistingChange={form.setExistingVideos}
      />

      {/* YouTube Metadata - only show if video files are selected */}
      {form.videoItems.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">YouTube 업로드 설정</h3>

          {/* Cat Tags */}
          <div className="mb-4">
            <CatTagSelectField
              id="videoTags"
              tags={form.selectedVideoTags}
              onOpen={() => form.setShowVideoTagSelector(true)}
              disabled={form.uploading}
            />
          </div>

          {/* Created Time */}
          <div className="mb-4">
            <label htmlFor="createdTime" className="block text-sm font-medium text-gray-700 mb-1">
              촬영 날짜 (선택사항)
            </label>
            {/* A calendar date, not an instant: the filename gives a day, and the
                stored value is that day. Was datetime-local, but the time had
                nowhere to live and was silently discarded. */}
            <input
              type="date"
              id="createdTime"
              value={form.createdTime}
              onChange={(e) => form.setCreatedTime(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300"
            />
            <p className="text-xs text-gray-500 mt-1">
              동영상이나 이미지 파일명에서 자동으로 날짜를 추출합니다. 필요시 수정 가능합니다.
            </p>
          </div>

          {/* Playlist — the mountain's own, from config (no picker: filing is
              per-mountain by design, plan D4). */}
          <div className="mb-4">
            <label htmlFor="playlist" className="block text-sm font-medium text-gray-700 mb-1">
              재생목록
            </label>
            {form.playlistLabel ? (
              <>
                <input
                  type="text"
                  value={form.playlistLabel}
                  readOnly
                  disabled
                  className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  동영상은 &quot;{form.playlistLabel}&quot; 재생목록에 추가돼요
                </p>
              </>
            ) : (
              // Never show a mountain name here when nothing will be filed — that
              // is the shape of the bug this replaced.
              <p className="text-sm text-gray-600">
                재생목록이 아직 없어요. 동영상은 재생목록에 추가되지 않아요.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Image Upload — one file per section, each with its own 설명 */}
      <MediaItemList
        kind="image"
        items={form.imageItems}
        onItemsChange={form.handleImageItemsChange}
        disabled={form.uploading}
        allowMultiple={mediaRules.allowMultipleImages}
        existing={form.existingImages}
        onExistingChange={form.setExistingImages}
      />

      {/* Image Cat Tags - only show if images are selected */}
      {form.imageItems.length > 0 && (
        <CatTagSelectField
          id="imageTags"
          tags={form.selectedImageTags}
          onOpen={() => form.setShowImageTagSelector(true)}
          disabled={form.uploading}
        />
      )}

      {/* Submit / Cancel */}
      <UploadProgressBar progress={form.uploadProgress} />
      <div className="pt-4 flex gap-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="flex-1"
          disabled={form.uploading}
        >
          {form.uploading
            ? form.isEditing
              ? '저장 중...'
              : '업로드 중...'
            : form.isEditing
              ? '글 저장'
              : '글 작성'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={form.handleCancel}
          disabled={form.uploading}
        >
          취소
        </Button>
      </div>

      {/* Cat Selector Modals */}
      <CatSelectorModal
        isOpen={form.showVideoTagSelector}
        onClose={() => form.setShowVideoTagSelector(false)}
        selectedTags={form.selectedVideoTags}
        onTagsChange={form.setSelectedVideoTags}
        title="비디오에 등장하는 고양이 선택"
      />

      <CatSelectorModal
        isOpen={form.showImageTagSelector}
        onClose={() => form.setShowImageTagSelector(false)}
        selectedTags={form.selectedImageTags}
        onTagsChange={form.setSelectedImageTags}
        title="이미지에 등장하는 고양이 선택"
      />
      {form.dialog}
    </form>
  );
};

export default NewButlerTalkForm;

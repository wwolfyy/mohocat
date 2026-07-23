'use client';

import React from 'react';
import { getButlerTalkService } from '@/services';
import Button from '@/components/ui/Button';
import CatSelectorModal from '@/components/CatSelectorModal';
import { useRichContentForm } from '@/components/forms/useRichContentForm';
import { useMountain } from '@/components/MountainProvider';

/**
 * 집사톡(butler_talk) post composer. Submit/upload flow comes from the shared
 * rich-content primitives (complexity-retirement P3); no feeding-spots section.
 * Note: the stored-post title fallback is the undated '집사톡 글입니다' while the
 * YouTube title fallback is dated — preserved pre-refactor behavior.
 */
const NewButlerTalkForm = () => {
  const DEFAULT_TITLE = '집사톡 글입니다';

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
    youtubeDescriptionDefault: '산고양이 영상',
    createdTimeInputType: 'datetime-local',
    multiPartVideoTitles: false,
    createPost: (post) => butlerTalkService.createPost(post),
    resetAfterCreate: false,
    successMessage: '글이 성공적으로 작성되었습니다!',
    errorMessagePrefix: '글 작성 중 오류가 발생했습니다: ',
    redirectPath: '/pages/butler_talk',
  });

  if (form.loading) {
    return <div className="p-4">로딩 중...</div>;
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

      {/* Video Upload */}
      <div>
        <label htmlFor="videos" className="block text-sm font-medium text-gray-700 mb-1">
          동영상 파일 (YouTube 업로드)
        </label>
        <input
          type="file"
          id="videos"
          accept="video/*"
          multiple
          onChange={form.handleVideoChange}
          className="w-full p-2 border border-gray-300 rounded-md"
        />
        {form.videoFiles.length > 0 && (
          <p className="text-sm text-green-600 mt-2">
            {form.videoFiles.length}개의 동영상 파일이 선택되었습니다.
          </p>
        )}
      </div>

      {/* YouTube Metadata - only show if video files are selected */}
      {form.videoFiles.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">YouTube 업로드 설정</h3>

          {/* Cat Tags */}
          <div className="mb-4">
            <label htmlFor="videoTags" className="block text-sm font-medium text-gray-700 mb-1">
              등장하는 고양이
            </label>
            <input
              type="text"
              id="videoTags"
              value={form.selectedVideoTags.join(', ')}
              onClick={() => form.setShowVideoTagSelector(true)}
              readOnly
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300 cursor-pointer bg-gray-50"
              placeholder="고양이를 선택하려면 클릭하세요"
            />
          </div>

          {/* Created Time */}
          <div className="mb-4">
            <label htmlFor="createdTime" className="block text-sm font-medium text-gray-700 mb-1">
              촬영 시간 (선택사항)
            </label>
            <input
              type="datetime-local"
              id="createdTime"
              value={form.createdTime}
              onChange={(e) => form.setCreatedTime(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300"
            />
            <p className="text-xs text-gray-500 mt-1">
              동영상이나 이미지 파일명에서 자동으로 날짜를 추출합니다. 필요시 수정 가능합니다.
            </p>
          </div>

          {/* Playlist Selection */}
          <div className="mb-4">
            <label htmlFor="playlist" className="block text-sm font-medium text-gray-700 mb-1">
              재생목록 선택
            </label>
            {form.loadingPlaylists ? (
              <p className="text-sm text-gray-600">재생목록을 불러오는 중...</p>
            ) : (
              <>
                <input
                  type="text"
                  value="집사게시판"
                  readOnly
                  disabled
                  className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  모든 동영상은 자동으로 &quot;집사게시판&quot; 재생목록에 추가됩니다
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Image Upload */}
      <div>
        <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-1">
          이미지 파일
        </label>
        <input
          type="file"
          id="images"
          accept="image/*"
          multiple
          onChange={form.handleImageChange}
          className="w-full p-2 border border-gray-300 rounded-md"
        />
        {form.imageFiles.length > 0 && (
          <p className="text-sm text-green-600 mt-2">
            {form.imageFiles.length}개의 이미지 파일이 선택되었습니다.
          </p>
        )}
      </div>

      {/* Image Cat Tags - only show if images are selected */}
      {form.imageFiles.length > 0 && (
        <div>
          <label htmlFor="imageTags" className="block text-sm font-medium text-gray-700 mb-1">
            등장하는 고양이
          </label>
          <input
            type="text"
            id="imageTags"
            value={form.selectedImageTags.join(', ')}
            onClick={() => form.setShowImageTagSelector(true)}
            readOnly
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300 cursor-pointer bg-gray-50"
            placeholder="고양이를 선택하려면 클릭하세요"
          />
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-4">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={form.uploading}
        >
          {form.uploading ? '업로드 중...' : '글 작성'}
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

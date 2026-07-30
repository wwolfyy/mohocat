'use client';

import React, { useState } from 'react';
import { getAdoptionService } from '@/services';
import { cn } from '@/utils/cn';
import MediaItemList from '@/components/forms/MediaItemList';
import CatTagSelectField from '@/components/forms/CatTagSelectField';
import CatSelectorModal from '@/components/CatSelectorModal';
import ShowInModalToggle from '@/components/forms/ShowInModalToggle';
import UploadProgressBar from '@/components/forms/UploadProgressBar';
import { useSimpleContentForm } from '@/components/forms/useSimpleContentForm';
import { useMountain } from '@/components/MountainProvider';
import { getAdoptionPlaylistId } from '@/utils/config';

/**
 * 입양홍보 (adoption promotion) post composer — admin-authored, publicly shown on
 * /pages/adoption. Submit/upload flow + media sections come from the shared
 * simple-content primitives (complexity-retirement P2); no 팝업(모달) toggle.
 */
const NewAdoptionForm = () => {
  const mountainId = useMountain();
  const [showInModal, setShowInModal] = useState(false);
  const adoptionService = getAdoptionService(mountainId);

  const form = useSimpleContentForm({
    youtubeDefaults: {
      title: '입양홍보 동영상',
      description: '입양홍보 동영상',
    },
    createPost: (postData) => adoptionService.createPost(postData),
    extraPostData: () => ({ showInModal }),
    onResetExtras: () => setShowInModal(false),
    // 입양홍보 is platform-wide, so its videos also join the one cross-mountain
    // adoption playlist — on top of the mountain playlist the hook always adds,
    // which is what keeps them attributable to a single mountain (plan D7/D8).
    extraPlaylistIds: () => [getAdoptionPlaylistId()],
    successMessage: '입양홍보 글이 성공적으로 작성되었습니다!',
    errorMessagePrefix: '입양홍보 글 작성 중 오류가 발생했습니다: ',
    redirectPath: '/pages/adoption',
  });

  return (
    <form onSubmit={form.handleSubmit} className="space-y-4">
      <div>
        <label className="block font-semibold">제목:</label>
        <input
          value={form.title}
          onChange={(e) => form.setTitle(e.target.value)}
          placeholder="입양홍보 제목을 입력하세요"
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label className="block font-semibold">내용:</label>
        <textarea
          value={form.message}
          onChange={(e) => form.setMessage(e.target.value)}
          placeholder="입양홍보 내용을 입력하세요"
          className="w-full p-2 border rounded"
          rows={6}
          required
        />
      </div>

      <ShowInModalToggle
        checked={showInModal}
        onChange={setShowInModal}
        description="이 입양홍보 글을 사용자가 페이지를 방문할 때 팝업으로 표시합니다"
        disabled={form.uploading}
      />

      {/* Per-file media, each with its own 제목/설명. The cat selector sits under
          the section it tags, and only once there is something to tag. */}
      <div>
        <MediaItemList
          kind="image"
          items={form.imageItems}
          onItemsChange={form.setImageItems}
          disabled={form.uploading}
        />
        {form.imageItems.length > 0 && (
          <CatTagSelectField
            id="imageTags"
            tags={form.selectedImageTags}
            onOpen={() => form.setShowImageTagSelector(true)}
            disabled={form.uploading}
          />
        )}
      </div>

      <div>
        <MediaItemList
          kind="video"
          items={form.videoItems}
          onItemsChange={form.setVideoItems}
          disabled={form.uploading}
          descriptionHelp="비어 있으면 글 내용이 사용돼요."
        />
        {form.videoItems.length > 0 && (
          <CatTagSelectField
            id="videoTags"
            tags={form.selectedVideoTags}
            onOpen={() => form.setShowVideoTagSelector(true)}
            disabled={form.uploading}
          />
        )}
      </div>

      <UploadProgressBar progress={form.uploadProgress} />

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={form.uploading}
          className={cn(
            'w-full py-3 bg-gradient-to-r from-brand to-accent',
            'text-ink rounded-lg font-bold hover:shadow-lg transition-all duration-200',
            form.uploading && 'opacity-50 cursor-not-allowed'
          )}
        >
          {form.uploading ? '작성 중...' : '입양홍보 작성'}
        </button>
        <button
          type="button"
          onClick={form.cancel}
          className="w-full py-3 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600 transition-all duration-200"
        >
          취소
        </button>
      </div>
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

export default NewAdoptionForm;

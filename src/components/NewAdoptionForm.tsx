'use client';

import React from 'react';
import { getAdoptionService } from '@/services';
import { cn } from '@/utils/cn';
import MediaUploadField from '@/components/forms/MediaUploadField';
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
  const adoptionService = getAdoptionService(mountainId);

  const form = useSimpleContentForm({
    imagePathPrefix: 'adoption/images',
    youtubeDefaults: {
      title: '입양홍보 동영상',
      description: '입양홍보 동영상',
    },
    createPost: (postData) => adoptionService.createPost(postData),
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

      <MediaUploadField
        kind="image"
        files={form.imageFiles}
        onFilesChange={form.setImageFiles}
        urls={form.imageUrls}
        onUrlsChange={form.setImageUrls}
      />

      <MediaUploadField
        kind="video"
        files={form.videoFiles}
        onFilesChange={form.setVideoFiles}
        urls={form.videoUrls}
        onUrlsChange={form.setVideoUrls}
      />

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
      {form.dialog}
    </form>
  );
};

export default NewAdoptionForm;

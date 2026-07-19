'use client';

import React, { useState } from 'react';
import { getAnnouncementService } from '@/services';
import { cn } from '@/utils/cn';
import MediaUploadField from '@/components/forms/MediaUploadField';
import { useSimpleContentForm } from '@/components/forms/useSimpleContentForm';

/**
 * 공지사항 composer — admin-authored, publicly listed on /pages/announcements.
 * Submit/upload flow + media sections come from the shared simple-content
 * primitives (complexity-retirement P2); the 팝업(모달) toggle is this form's
 * extra field and rides along via extraPostData.
 */
const NewAnnouncementForm = () => {
  const [showInModal, setShowInModal] = useState(false);
  const announcementService = getAnnouncementService();

  const form = useSimpleContentForm({
    imagePathPrefix: 'announcements/images',
    youtubeDefaults: {
      title: '공지사항 동영상',
      description: '공지사항 동영상',
      tags: '공지사항',
    },
    createPost: (postData) => announcementService.createPost(postData),
    extraPostData: () => ({ showInModal }),
    onResetExtras: () => setShowInModal(false),
    successMessage: '공지사항이 성공적으로 작성되었습니다!',
    errorMessagePrefix: '공지사항 작성 중 오류가 발생했습니다: ',
    redirectPath: '/pages/announcements',
  });

  return (
    <form onSubmit={form.handleSubmit} className="space-y-4">
      <div>
        <label className="block font-semibold">제목:</label>
        <input
          value={form.title}
          onChange={(e) => form.setTitle(e.target.value)}
          placeholder="공지사항 제목을 입력하세요"
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label className="block font-semibold">내용:</label>
        <textarea
          value={form.message}
          onChange={(e) => form.setMessage(e.target.value)}
          placeholder="공지사항 내용을 입력하세요"
          className="w-full p-2 border rounded"
          rows={6}
          required
        />
      </div>

      {/* Modal Toggle */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="block font-semibold text-lg">모달 팝업 설정</label>
            <p className="text-sm text-gray-600 mt-1">
              이 공지사항을 사용자가 페이지를 방문할 때 팝업으로 표시합니다
            </p>
          </div>
          <div className="flex items-center">
            <div
              onClick={() => setShowInModal(!showInModal)}
              className={cn(
                'relative inline-flex items-center h-8 w-14 rounded-full cursor-pointer transition-colors duration-200',
                showInModal ? 'bg-yellow-500' : 'bg-gray-300'
              )}
              role="switch"
              aria-checked={showInModal}
            >
              {/* Toggle circle */}
              <span
                className={cn(
                  'inline-block w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform duration-200',
                  showInModal ? 'translate-x-8' : 'translate-x-1'
                )}
              />
              {/* ON label */}
              <span
                className={cn(
                  'absolute left-1.5 text-xs font-medium transition-opacity duration-200',
                  showInModal ? 'text-white opacity-100' : 'text-gray-500 opacity-0'
                )}
                style={{ fontSize: '10px' }}
              >
                ON
              </span>
              {/* OFF label */}
              <span
                className={cn(
                  'absolute right-1.5 text-xs font-medium transition-opacity duration-200',
                  !showInModal ? 'text-gray-600 opacity-100' : 'text-white opacity-0'
                )}
                style={{ fontSize: '10px' }}
              >
                OFF
              </span>
            </div>
            <label htmlFor="showInModal" className="ml-3 text-sm font-medium text-gray-700">
              팝업으로 표시
            </label>
          </div>
        </div>
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
          {form.uploading ? '작성 중...' : '공지사항 작성'}
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

export default NewAnnouncementForm;

'use client';

import React, { useState, useEffect } from 'react';
import { getPostService, getFeedingSpotsService } from '@/services';
import Button from '@/components/ui/Button';
import CatSelectorModal from '@/components/CatSelectorModal';
import { useRichContentForm } from '@/components/forms/useRichContentForm';
import { useMountain } from '@/components/MountainProvider';

interface BasicFeedingSpot {
  id: number;
  name: string;
}

interface NewPostFormProps {
  feedingSpots: BasicFeedingSpot[];
}

/**
 * 집사게시판(butler_stream) post composer. Submit/upload flow comes from the
 * shared rich-content primitives (complexity-retirement P3); this form owns the
 * feeding-spots section (visit time drives the dynamic default title) and its
 * field markup.
 */
const NewPostForm = ({ feedingSpots }: NewPostFormProps) => {
  const DEFAULT_TITLE = '급식소 챙기고 갑니다';

  // Helper function to format date for datetime-local input in Korea timezone
  const formatKoreaTimeForInput = (date: Date): string => {
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
    const koreaTime = new Date(utcTime + 9 * 3600000);

    const year = koreaTime.getFullYear();
    const month = String(koreaTime.getMonth() + 1).padStart(2, '0');
    const day = String(koreaTime.getDate()).padStart(2, '0');
    const hours = String(koreaTime.getHours()).padStart(2, '0');
    const minutes = String(koreaTime.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Generate dynamic title based on visit time
  const generateDynamicTitle = (visitTime: string) => {
    if (!visitTime) return DEFAULT_TITLE;

    const date = new Date(visitTime);
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
  const postService = getPostService(mountainId);
  const feedingSpotsService = getFeedingSpotsService(mountainId);

  // Feeding spots states (Post-only extras)
  const [checkedSpots, setCheckedSpots] = useState<Set<number>>(new Set());
  const [feedingVisitTime, setFeedingVisitTime] = useState('');

  const form = useRichContentForm({
    buildDefaultTitle: () => generateDynamicTitle(feedingVisitTime),
    youtubeDescriptionDefault: 'Uploaded via Mountain Cats app',
    createdTimeInputType: 'date',
    multiPartVideoTitles: true,
    createPost: (post) => postService.createPost(post),
    afterCreate: async () => {
      // Update feeding spots if any were checked. Deliberately non-fatal
      // (pre-existing behavior): the post is already created.
      if (checkedSpots.size > 0) {
        try {
          const checkedSpotIds = Array.from(checkedSpots);
          const userDisplayName = form.user?.displayName || form.user?.email || 'unknown';
          await feedingSpotsService.updateFeedingSpots(
            checkedSpotIds,
            userDisplayName,
            feedingVisitTime
          );
        } catch (error) {
          console.error('Error updating feeding spots:', error);
        }
      }
    },
    resetAfterCreate: true,
    onResetExtras: () => {
      setCheckedSpots(new Set());
      // Reset the visit time to the current hour; the title-regeneration effect
      // below repopulates the dynamic title from it.
      const resetTime = new Date();
      resetTime.setMinutes(0, 0, 0);
      setFeedingVisitTime(formatKoreaTimeForInput(resetTime));
    },
    successMessage: 'Post created successfully!',
    errorMessagePrefix: 'Error creating post: ',
    redirectPath: '/pages/butler_stream',
  });

  // Prepopulate the visit time with the current hour (Korea time) + initial title.
  useEffect(() => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const timeString = formatKoreaTimeForInput(now);
    setFeedingVisitTime(timeString);
    form.setTitle(generateDynamicTitle(timeString));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update title when visit time changes
  useEffect(() => {
    if (feedingVisitTime) {
      form.setTitle(generateDynamicTitle(feedingVisitTime));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedingVisitTime]);

  const handleFeedingSpotToggle = (spotId: number) => {
    setCheckedSpots((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(spotId)) {
        newSet.delete(spotId);
      } else {
        newSet.add(spotId);
      }
      return newSet;
    });
  };

  const handleSelectAllFeedingSpots = () => {
    setCheckedSpots(new Set(feedingSpots.map((spot) => spot.id)));
  };

  const handleDeselectAllFeedingSpots = () => {
    setCheckedSpots(new Set());
  };

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
      <div>
        <label className="block font-semibold">제목:</label>
        <input
          value={form.title}
          onChange={(e) => form.setTitle(e.target.value)}
          placeholder={generateDynamicTitle(feedingVisitTime)}
          className="border p-2 rounded w-full"
        />
      </div>

      {/* Feeding Spots Section */}
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center gap-4 mb-3">
          <h3 className="text-lg font-semibold text-gray-800">아래 급식소를 챙겼어요!</h3>
          {feedingSpots.length > 0 && (
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleSelectAllFeedingSpots}
                className="px-3 py-1 text-sm bg-brand-100 text-brand-700 rounded hover:bg-brand-200 transition-colors"
              >
                모두 선택
              </button>
              <button
                type="button"
                onClick={handleDeselectAllFeedingSpots}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                선택 해제
              </button>
            </div>
          )}
        </div>
        {feedingSpots.length === 0 ? (
          <p className="text-sm text-gray-600 py-4">급식소 정보가 없습니다.</p>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {feedingSpots.map((spot) => (
                <label
                  key={spot.id}
                  className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 rounded p-2 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checkedSpots.has(spot.id)}
                    onChange={() => handleFeedingSpotToggle(spot.id)}
                    className="w-4 h-4 accent-brand-500 border-gray-300 rounded focus:ring-brand-300"
                  />
                  <span className="text-sm text-gray-900 flex-1">{spot.name}</span>
                </label>
              ))}
            </div>
            {checkedSpots.size > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-green-600 font-medium">
                  선택된 급식소: {checkedSpots.size}개
                </p>
              </div>
            )}
            {checkedSpots.size > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  급식소 방문 시간:
                </label>
                <input
                  type="datetime-local"
                  value={feedingVisitTime}
                  onChange={(e) => setFeedingVisitTime(e.target.value)}
                  className="border p-2 rounded w-full max-w-xs"
                  step="3600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  급식소를 방문한 날짜와 시간을 선택하세요 (시간 단위)
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Visual divider between feeding spots and media upload */}
      <div className="border-t border-gray-200 my-6"></div>

      <div>
        <label className="block font-semibold">동영상 업로드:</label>
        <input type="file" accept="video/*" multiple onChange={form.handleVideoChange} />
      </div>

      {/* YouTube Metadata Section */}
      {form.videoFiles.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">YouTube 동영상 설정</h3>
          {/* Cat Tags */}
          <div className="mb-4">
            <label className="block font-semibold mb-1">등장하는 고양이:</label>
            <input
              type="text"
              value={form.selectedVideoTags.join(', ')}
              onClick={() => form.setShowVideoTagSelector(true)}
              readOnly
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300 cursor-pointer bg-gray-50"
              placeholder="고양이를 선택하려면 클릭하세요"
            />
          </div>
          {/* Created Time */}
          <div className="mb-4">
            <label className="block font-semibold mb-1">촬영 날짜:</label>
            <input
              type="date"
              value={form.createdTime}
              onChange={(e) => form.setCreatedTime(e.target.value)}
              className="border p-2 rounded w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              동영상이나 이미지 파일명에서 자동으로 날짜를 추출합니다. 필요시 수정 가능합니다.
            </p>
          </div>
          {/* Playlist Selection */}
          <div className="mb-4">
            <label className="block font-semibold mb-1">재생목록에 추가:</label>
            {form.loadingPlaylists ? (
              <p className="text-sm text-gray-600">재생목록을 불러오는 중...</p>
            ) : (
              <>
                <input
                  type="text"
                  value="집사게시판"
                  readOnly
                  disabled
                  className="border p-2 rounded w-full bg-gray-100 text-gray-600 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  모든 동영상은 자동으로 &quot;집사게시판&quot; 재생목록에 추가됩니다
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <div>
        <label className="block font-semibold">사진 업로드:</label>
        <input type="file" accept="image/*" multiple onChange={form.handleImageChange} />
      </div>

      {/* Image Cat Tags - only show if images are selected */}
      {form.imageFiles.length > 0 && (
        <div>
          <label className="block font-semibold">등장하는 고양이:</label>
          <input
            type="text"
            value={form.selectedImageTags.join(', ')}
            onClick={() => form.setShowImageTagSelector(true)}
            readOnly
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300 cursor-pointer bg-gray-50"
            placeholder="고양이를 선택하려면 클릭하세요"
          />
        </div>
      )}
      <div>
        <label className="block font-semibold">내용:</label>{' '}
        <textarea
          value={form.message}
          onChange={(e) => form.setMessage(e.target.value)}
          className="w-full border rounded p-2"
          rows={4}
        />
      </div>
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={form.uploading}
      >
        {form.uploading ? '새글 작성 중...' : '작성 완료'}
      </Button>
      {form.uploading && (
        <p className="text-sm text-gray-600 mt-2">
          {form.videoFiles.length > 0
            ? 'Uploading videos to YouTube... This may take a few minutes.'
            : 'Uploading images...'}
        </p>
      )}

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

export default NewPostForm;

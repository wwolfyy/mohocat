'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPostService, getFeedingSpotsService } from '@/services';
import Button from '@/components/ui/Button';
import { useDialog } from '@/components/ui/useDialog';
import { useAuth } from '@/hooks/useAuth';
import { useMountain } from '@/components/MountainProvider';

interface BasicFeedingSpot {
  id: number;
  name: string;
}

interface NewPostFormProps {
  feedingSpots: BasicFeedingSpot[];
  /**
   * Edit an existing post instead of creating one (2026-08-02, member
   * authoring). Only 제목 and 내용 are editable — see the note on the feeding-spot
   * section below for why the check-in is not.
   */
  postId?: string;
}

/**
 * 집사게시판(butler_stream) post composer — a 급식소 check-in log.
 *
 * ⚠️ **This form does not upload media, by design** (2026-07-27 owner decision;
 * docs/planning/butler-media-separation-plan-20260727.md D1). It used to be a
 * second media composer alongside 집사톡(butler_talk), which does that job — so
 * the file pickers, the YouTube metadata block and the cat-tag selectors were
 * removed and this form dropped `useRichContentForm` for a plain submit. Media
 * *display* is untouched: legacy posts still carry `videoUrls`/`imageUrls` and
 * `PostList` renders them, and admins can still attach media by URL in
 * `EditPostForm`. Do not reintroduce uploads here.
 */
const NewPostForm = ({ feedingSpots, postId }: NewPostFormProps) => {
  const isEdit = Boolean(postId);
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

  const router = useRouter();
  const dialog = useDialog();
  const { user, isAuthenticated, loading } = useAuth();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Feeding spots states (this form's own subject matter)
  const [checkedSpots, setCheckedSpots] = useState<Set<number>>(new Set());
  const [feedingVisitTime, setFeedingVisitTime] = useState('');
  const [loadingPost, setLoadingPost] = useState(isEdit);

  // Prepopulate the visit time with the current hour (Korea time) + initial title.
  useEffect(() => {
    // ⚠️ Creation only. On an edit these would overwrite the post's own title
    // with a freshly generated one before the load below could prefill it.
    if (isEdit) return;
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const timeString = formatKoreaTimeForInput(now);
    setFeedingVisitTime(timeString);
    setTitle(generateDynamicTitle(timeString));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  // Edit mode: prefill from the stored post.
  useEffect(() => {
    if (!postId) return;

    const loadPost = async () => {
      try {
        setLoadingPost(true);
        const post = await postService.getPostById(postId);
        if (!post) {
          await dialog.alert('게시물을 찾을 수 없어요.');
          router.push('/pages/butler_stream');
          return;
        }
        setTitle(post.title || '');
        setMessage(post.message || '');
      } catch (error) {
        console.error('Error loading post for edit:', error);
        await dialog.alert('게시물을 불러오지 못했어요.');
        throw error;
      } finally {
        setLoadingPost(false);
      }
    };

    loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // Update title when visit time changes
  useEffect(() => {
    if (isEdit) return; // the stored title is the author's, not a generated one
    if (feedingVisitTime) {
      setTitle(generateDynamicTitle(feedingVisitTime));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedingVisitTime, isEdit]);

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      // ⚠️ An edit changes ONLY 제목/내용. Authorship, 게시일 and the media fields
      // are not resent: `updatePost` merges, so re-sending them would re-stamp
      // provenance (which the Firestore rules now refuse anyway) and an empty
      // media array would erase what a legacy post carries.
      if (postId) {
        await postService.updatePost(postId, {
          title: title.trim() || DEFAULT_TITLE,
          message,
        });
        await dialog.alert('수정했어요.');
        router.push('/pages/butler_stream');
        return;
      }

      const now = new Date();
      const post = {
        title: title.trim() || generateDynamicTitle(feedingVisitTime),
        username: user?.email || 'unknown',
        // Authorization identity (2026-08-02) — the Firestore rules let an author
        // edit their own post by matching this, never `username`. Creation only.
        ...(user?.uid ? { authorUid: user.uid } : {}),
        date: now.toISOString().split('T')[0], // YYYY-MM-DD format in UTC
        time: now.toISOString().split('T')[1].split('.')[0], // HH:MM:SS format in UTC
        // No media is composed here; the fields keep the shape every reader
        // already handles for a media-less post (EditPostForm writes the same).
        thumbnailUrl: '',
        mediaType: null,
        videoUrls: [],
        imageUrls: [],
        message,
        tags: [],
      };

      await postService.createPost(post);

      // Update feeding spots if any were checked. Deliberately non-fatal
      // (pre-existing behavior): the post is already created.
      if (checkedSpots.size > 0) {
        try {
          const checkedSpotIds = Array.from(checkedSpots);
          const userDisplayName = user?.displayName || user?.email || 'unknown';
          await feedingSpotsService.updateFeedingSpots(
            checkedSpotIds,
            userDisplayName,
            feedingVisitTime
          );
        } catch (error) {
          console.error('Error updating feeding spots:', error);
        }
      }

      setMessage('');
      setCheckedSpots(new Set());
      // Reset the visit time to the current hour; the title-regeneration effect
      // above repopulates the dynamic title from it.
      const resetTime = new Date();
      resetTime.setMinutes(0, 0, 0);
      setFeedingVisitTime(formatKoreaTimeForInput(resetTime));

      await dialog.alert('Post created successfully!');

      router.push('/pages/butler_stream');
    } catch (error) {
      await dialog.alert(
        'Error creating post: ' + (error instanceof Error ? error.message : 'Unknown error')
      );
    } finally {
      setSubmitting(false);
    }
  };

  /** Anything the user typed or ticked beyond the generated defaults. */
  const isDirty =
    message.trim().length > 0 ||
    checkedSpots.size > 0 ||
    title.trim() !== generateDynamicTitle(feedingVisitTime);

  const handleCancel = async () => {
    if (isDirty) {
      const confirmed = await dialog.confirm('작성 중인 내용이 사라져요. 그만 쓸까요?');
      if (!confirmed) return;
    }
    router.push('/pages/butler_stream');
  };

  if (loading || loadingPost) {
    return <div className="p-4">로딩 중...</div>;
  }

  if (!isAuthenticated) {
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-semibold">제목:</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={generateDynamicTitle(feedingVisitTime)}
          className="border p-2 rounded w-full"
        />
      </div>

      {/* Feeding Spots Section — creation only.
          ⚠️ Ticking a spot stamps `last_attended`/`last_attended_by` on shared
          state; it is a check-in, not a property of the post. Re-running it on
          an edit would re-log a visit that already happened, and the data model
          keeps only the latest stamp, so it could not be undone either.
          Consequence, accepted: an author who ticked the wrong spot cannot
          correct it here — an admin fixes the spot directly. */}
      <div className={`border-t pt-4 mt-4 ${isEdit ? 'hidden' : ''}`}>
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

      <div>
        <label className="block font-semibold">내용:</label>{' '}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border rounded p-2"
          rows={4}
        />
      </div>

      <p className="text-xs text-gray-500">
        사진과 동영상은 집사톡에 올려 주세요. 이곳은 급식소 기록만 남기는 곳이에요.
      </p>

      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="lg" className="flex-1" disabled={submitting}>
          {submitting
            ? isEdit
              ? '수정 중...'
              : '새글 작성 중...'
            : isEdit
              ? '수정 완료'
              : '작성 완료'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={handleCancel}
          disabled={submitting}
        >
          취소
        </Button>
      </div>
      {dialog.element}
    </form>
  );
};

export default NewPostForm;

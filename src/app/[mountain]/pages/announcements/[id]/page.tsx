'use client';

import { useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAnnouncementService } from '@/services';
import { useMountain } from '@/components/MountainProvider';
import Button from '@/components/ui/Button';
import PostMedia from '@/components/PostMedia';
import { useAsyncData } from '@/hooks/useAsyncData';
import { ErrorNotice } from '@/components/ui/AsyncStates';

const AnnouncementDetailsPage = () => {
  // Service references
  const mountainId = useMountain();
  const announcementService = getAnnouncementService(mountainId);
  const router = useRouter();
  // `useParams`, not `window.location.pathname`: the id is route state, and
  // reading it from the URL string meant the fetch could not react to it.
  const { id } = useParams<{ id: string }>();

  // 🐛 2026-08-01: `post` was a single nullable value, so "공지사항을 찾을 수
  // 없습니다" was the *initial* render of every visit — the reader saw it until
  // the fetch resolved (30s on the affected Safari path), and a thrown fetch
  // landed on the same screen, making a failure indistinguishable from a deleted
  // post. Three states now: loading, error, and a genuine null result.
  const fetchPost = useCallback(async () => {
    if (!id) return null;
    return announcementService.getPostById(id);
  }, [announcementService, id]);

  const { status, data: post, reload } = useAsyncData(fetchPost);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-4xl p-6" aria-busy="true" aria-live="polite">
          <span className="sr-only">불러오는 중이에요.</span>
          <div className="mb-4 h-9 w-32 animate-pulse rounded-lg bg-gray-200" />
          <div className="mb-2 h-9 w-2/3 animate-pulse rounded bg-gray-200" />
          <div className="mb-6 h-4 w-48 animate-pulse rounded bg-gray-100" />
          <div className="h-64 animate-pulse rounded-lg bg-white shadow-md" />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-4xl p-6">
          <ErrorNotice message="공지사항을 불러오지 못했어요." onRetry={reload} />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">공지사항을 찾을 수 없습니다</h1>
          <Button onClick={() => router.push('/pages/announcements')}>
            공지사항 목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={() => router.push('/pages/announcements')}
            className="mb-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200"
          >
            ← 공지사항 목록으로
          </button>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{post.title}</h1>
          <div className="text-sm text-gray-500 mb-4">
            <span className="font-medium">{post.username}</span>
            <span className="mx-2">•</span>
            <span>
              {post.date} {post.time}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Message content */}
          <div className="mb-6">
            <p className="whitespace-pre-wrap leading-relaxed text-gray-700">{post.message}</p>
          </div>

          {/* Media — the shared renderer, so this page shows exactly what the
              공지사항 popup and the 입양홍보 feed show: every image and video, each
              with its own 제목/설명/태그. It previously hand-rolled a third copy
              that displayed none of the per-file detail (owner-reported
              2026-07-31), and `videoUrl` is the legacy single-value field some
              older posts still carry. */}
          <PostMedia
            imageUrls={post.imageUrls}
            videoUrls={post.videoUrls?.length ? post.videoUrls : post.videoUrl && [post.videoUrl]}
            label="공지사항"
            layout="full"
          />
        </div>
      </div>
    </div>
  );
};

export default AnnouncementDetailsPage;

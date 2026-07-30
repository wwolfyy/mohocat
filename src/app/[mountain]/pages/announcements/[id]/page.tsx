'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAnnouncementService } from '@/services';
import { useMountain } from '@/components/MountainProvider';
import Button from '@/components/ui/Button';
import PostMedia from '@/components/PostMedia';

const AnnouncementDetailsPage = () => {
  // Service references
  const mountainId = useMountain();
  const announcementService = getAnnouncementService(mountainId);
  const [post, setPost] = useState<any | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPost = async () => {
      const id = window.location.pathname.split('/').pop();
      if (!id) return;

      try {
        // Use service layer instead of direct Firebase access
        const postData = await announcementService.getPostById(id);
        if (postData) {
          setPost(postData);
        } else {
          setPost(null);
        }
      } catch (error) {
        console.error('Error fetching announcement:', error);
        setPost(null);
      }
    };

    fetchPost();
  }, []);

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

          {/* Important notice banner */}
          <div className="mt-6 p-4 bg-brand-50 ring-1 ring-brand-100 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-brand-600" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-700">
                  이 공지사항은 중요한 안내사항입니다. 내용을 숙지해 주세요.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementDetailsPage;

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAnnouncementService } from '@/services';

const AnnouncementDetailsPage = () => {
  // Service references
  const announcementService = getAnnouncementService();
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
          <button
            onClick={() => router.push('/pages/announcements')}
            className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-300 text-black rounded-lg font-bold hover:shadow-lg transition-all duration-200"
          >
            공지사항 목록으로 돌아가기
          </button>
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
            className="mb-4 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors duration-200"
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
          {/* Video content */}
          {post.videoUrls && post.videoUrls.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">동영상</h3>
              <div className="space-y-4">
                {post.videoUrls.map((url: string, index: number) => {
                  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
                  const videoId = match ? match[1] : null;
                  if (videoId) {
                    return (
                      <div key={index} className="aspect-video">
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}`}
                          title={`Video ${index + 1}`}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full rounded"
                        />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}

          {/* Backward compatibility for single video */}
          {post.videoUrl && !post.videoUrls && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">동영상</h3>
              <div className="aspect-video">
                <iframe
                  src={post.videoUrl}
                  title="Video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full rounded"
                />
              </div>
            </div>
          )}

          {/* Message content */}
          <div className="mb-6">
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{post.message}</p>
          </div>

          {/* Image content */}
          {post.imageUrls && post.imageUrls.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">이미지</h3>
              <div className="space-y-2">
                {post.imageUrls.map((url: string, index: number) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Image ${index + 1}`}
                    className="w-full rounded"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Important notice banner */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
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

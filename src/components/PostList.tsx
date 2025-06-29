import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/utils/cn';
import { Post as PostType } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import ReplyButton from './ReplyButton';
import ReplyForm from './ReplyForm';
import ReplyList from './ReplyList';

interface Post {
  id: string;
  title: string;
  message: string;
  thumbnailUrl?: string;
  mediaType?: 'video' | 'image';
  videoUrls?: string[];
  videoUrl?: string; // Keep for backward compatibility
  imageUrls?: string[];
  username: string;
  date: string;
  time: string;
  replyCount?: number;
}

interface PostListProps {
  posts: Post[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const PostList: React.FC<PostListProps> = ({ posts, currentPage, totalPages, onPageChange }) => {
  const [postReplyCounts, setPostReplyCounts] = useState<Record<string, number>>({});
  const [showReplyForms, setShowReplyForms] = useState<Record<string, boolean>>({});
  const { isAuthenticated } = useAuth();

  const handleReplyCountUpdate = (postId: string, count: number) => {
    setPostReplyCounts(prev => ({ ...prev, [postId]: count }));
  };

  const handleToggleReplyForm = (postId: string) => {
    if (!isAuthenticated) {
      alert('댓글을 작성하려면 로그인이 필요합니다.');
      return;
    }
    setShowReplyForms(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleReplySuccess = (postId: string, reply: PostType) => {
    const currentCount = postReplyCounts[postId] || posts.find(p => p.id === postId)?.replyCount || 0;
    handleReplyCountUpdate(postId, currentCount + 1);
    setShowReplyForms(prev => ({ ...prev, [postId]: false }));
  };

  return (
    <div>
      <div className="space-y-4">
        {posts.length === 0 && <div>No posts yet.</div>}        {posts.map((post) => {
          const currentReplyCount = postReplyCounts[post.id] ?? post.replyCount ?? 0;
          const showingReplyForm = showReplyForms[post.id] || false;

          return (
          <div key={post.id} className="border p-4 rounded flex flex-col space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {/* Show video thumbnail if video exists */}
                {((post.videoUrls && post.videoUrls.length > 0) || post.videoUrl) && (() => {
                  // Support both new videoUrls array and legacy videoUrl
                  const firstVideoUrl = post.videoUrls?.[0] || post.videoUrl;
                  const match = firstVideoUrl?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
                  const videoId = match ? match[1] : null;
                  if (videoId) {
                    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                    const videoCount = post.videoUrls?.length || 1;
                    return (
                      <Link href={`/pages/posts/${post.id}`}>
                        <div className="relative cursor-pointer">
                          <img
                            src={thumbnailUrl}
                            alt="Video thumbnail"
                            className="w-20 h-15 object-cover rounded"
                            onError={(e) => {
                              e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/default.jpg`;
                            }}
                          />
                          {/* Play button overlay */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-red-600 text-white rounded-full p-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          </div>
                          {/* Video count indicator for multiple videos */}
                          {videoCount > 1 && (
                            <div className="absolute top-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                              {videoCount}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  }
                  return null;
                })()}
                {/* Show image thumbnail only if no video exists */}
                {!((post.videoUrls && post.videoUrls.length > 0) || post.videoUrl) && post.thumbnailUrl && (
                  <Link href={`/pages/posts/${post.id}`}>
                    <img
                      src={post.thumbnailUrl}
                      alt="Image thumbnail"
                      className="w-20 h-15 object-cover rounded cursor-pointer"
                    />
                  </Link>
                )}
              </div>
              <div className="flex-grow">
                <Link
                  href={`/pages/posts/${post.id}`}
                  className="text-xl font-bold mb-2 block flex items-center space-x-2"
                >
                  {post.title}
                </Link>
                <p className="text-gray-700 mb-2">{post.message}</p>
              </div>
              <div className="text-right text-sm text-gray-500 flex flex-col items-end">
                <p>{post.username}</p>
                <p>
                  {post.date} {post.time}
                </p>
              </div>
            </div>

            {/* Reply functionality */}
            <div className="border-t pt-3">
              <ReplyButton
                postId={post.id}
                replyCount={currentReplyCount}
                onToggleReply={() => handleToggleReplyForm(post.id)}
                showingReplies={false}
                showingReplyForm={showingReplyForm}
              />

              {showingReplyForm && (
                <ReplyForm
                  parentId={post.id}
                  parentUsername={post.username}
                  onReplySuccess={(reply) => handleReplySuccess(post.id, reply)}
                  onCancel={() => handleToggleReplyForm(post.id)}
                />
              )}

              <ReplyList
                postId={post.id}
                replyCount={currentReplyCount}
                onReplyCountUpdate={(count) => handleReplyCountUpdate(post.id, count)}
              />
            </div>
          </div>
        )})}
      </div>
      <div className="flex justify-center mt-4 space-x-2">
        {Array.from({ length: totalPages }, (_, index) => {
          const page = index + 1;
          const isSelected = page === currentPage;
          return isSelected ? (
            <button
              key={page}
              className={cn(
                'px-4 py-2 rounded bg-gradient-to-r from-yellow-400 to-orange-300 text-black font-bold shadow',
                'border border-yellow-500',
                'transition-all duration-200'
              )}
              disabled
            >
              {page}
            </button>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                'px-4 py-2 rounded text-gray-700 hover:bg-gray-100',
                'transition-all duration-200'
              )}
            >
              {page}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between mt-4">        <div>
          {currentPage > 1 && (
            <button
              onClick={() => onPageChange(currentPage - 1)}
              className={cn(
                "px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-300",
                "text-black rounded-lg font-bold hover:shadow-lg transition-all duration-200"
              )}
            >
              previous
            </button>
          )}
        </div>
        <div>
          {currentPage < totalPages && (
            <button
              onClick={() => onPageChange(currentPage + 1)}
              className={cn(
                "px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-300",
                "text-black rounded-lg font-bold hover:shadow-lg transition-all duration-200"
              )}
            >
              next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostList;

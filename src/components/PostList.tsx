import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/utils/cn';
// Aliased `PostEntity`, not `PostType`: `PostType` is the *kind* of post
// (집사톡 / 급식현황 / …), imported below.
import { Post as PostEntity } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import ReplyButton from './ReplyButton';
import ReplyForm from './ReplyForm';
import ReplyList, { ReplyListRef } from './ReplyList';
import { IPostService } from '@/services';
import { postDetailPath, type PostType } from '@/services/post-types';

// Utility function to convert any timestamp format to Korea timezone display
const formatKoreaDateTime = (date: string, time: string, createdAt?: any) => {
  try {
    let targetDate: Date | null = null;

    // Try multiple parsing strategies to handle different timestamp formats

    // Strategy 1: If we have separate date and time fields (preferred format)
    if (date && time) {
      // Try parsing as UTC first
      const utcDateTime = new Date(`${date}T${time}Z`);
      if (!isNaN(utcDateTime.getTime())) {
        targetDate = utcDateTime;
      } else {
        // Try parsing without Z (local time)
        const localDateTime = new Date(`${date}T${time}`);
        if (!isNaN(localDateTime.getTime())) {
          targetDate = localDateTime;
        }
      }
    }

    // Strategy 2: If we have a createdAt field, use that
    if (!targetDate && createdAt) {
      if (createdAt instanceof Date) {
        targetDate = createdAt;
      } else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
        const parsedDate = new Date(createdAt);
        if (!isNaN(parsedDate.getTime())) {
          targetDate = parsedDate;
        }
      } else if (createdAt.toDate && typeof createdAt.toDate === 'function') {
        // Firestore timestamp
        targetDate = createdAt.toDate();
      }
    }

    // Strategy 3: Try parsing the combined date + time string as-is
    if (!targetDate && date && time) {
      const combinedDateTime = new Date(`${date} ${time}`);
      if (!isNaN(combinedDateTime.getTime())) {
        targetDate = combinedDateTime;
      }
    }

    // If we still don't have a valid date, return original format
    if (!targetDate) {
      return `${date} ${time}`;
    }

    // Convert to Korea timezone if it's in UTC, or assume it's already in Korea time
    let koreaTime: Date;
    if (typeof targetDate.getTimezoneOffset === 'function') {
      // For dates that might be in UTC, convert to Korea time
      koreaTime = new Date(targetDate.getTime() + 9 * 60 * 60 * 1000);
    } else {
      koreaTime = targetDate;
    }

    // Format for display in exact format: "YYYY-MM-DD HH:MM:SS"
    const year = koreaTime.getFullYear();
    const month = String(koreaTime.getMonth() + 1).padStart(2, '0');
    const day = String(koreaTime.getDate()).padStart(2, '0');
    const hours = String(koreaTime.getHours()).padStart(2, '0');
    const minutes = String(koreaTime.getMinutes()).padStart(2, '0');
    const seconds = String(koreaTime.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    // Fallback: ensure consistent format even on error
    return `${date || 'Unknown'} ${time || 'Time'}`;
  }
};

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
  /** Author identity; absent on posts predating it (2026-08-02). */
  authorUid?: string;
  date: string;
  time: string;
  createdAt?: any; // Can be Date, string, number, or Firestore timestamp
  replyCount?: number;
}

interface PostListProps {
  posts: Post[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  postService: IPostService;
  /**
   * Which of the four types these posts are. **Required** — it has to reach the
   * detail link, because a post id only identifies a post within its own
   * collection. Omitting it is what made every 집사톡 post open on
   * "Post not found." (2026-08-02).
   */
  postType: PostType;
}

const PostList: React.FC<PostListProps> = ({
  posts,
  currentPage,
  totalPages,
  onPageChange,
  postService,
  postType,
}) => {
  const [postReplyCounts, setPostReplyCounts] = useState<Record<string, number>>({});
  const [showReplyForms, setShowReplyForms] = useState<Record<string, boolean>>({});
  const [replyListRefs, setReplyListRefs] = useState<Record<string, React.RefObject<ReplyListRef>>>(
    {}
  );
  const { user, isAuthenticated } = useAuth();

  /**
   * Whether the signed-in visitor wrote this post — the condition for offering
   * 수정. Mirrors the Firestore rules' two-era author test: `authorUid` when the
   * post has one, otherwise the email it was authored under.
   *
   * ⚠️ A UX check, not the security boundary. The rules refuse a non-author's
   * update independently; this only decides whether to show the link.
   */
  const isOwnPost = (post: Post) =>
    Boolean(user) &&
    (post.authorUid
      ? post.authorUid === user?.uid
      : Boolean(user?.email) && post.username === user?.email);

  const handleReplyCountUpdate = (postId: string, count: number) => {
    setPostReplyCounts((prev) => ({ ...prev, [postId]: count }));
  };

  const handleToggleReplyForm = (postId: string) => {
    if (!isAuthenticated) {
      alert('댓글을 작성하려면 로그인이 필요합니다.');
      return;
    }
    setShowReplyForms((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleReplySuccess = (postId: string, reply: PostEntity) => {
    const currentCount =
      postReplyCounts[postId] || posts.find((p) => p.id === postId)?.replyCount || 0;
    handleReplyCountUpdate(postId, currentCount + 1);
    setShowReplyForms((prev) => ({ ...prev, [postId]: false }));

    // Notify the ReplyList component about the new reply
    const replyListRef = replyListRefs[postId];
    if (replyListRef?.current) {
      replyListRef.current.addReply(reply);
    }
  };

  return (
    <div>
      <div className="space-y-4">
        {posts.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
            아직 등록된 글이 없어요.
          </div>
        )}{' '}
        {posts.map((post) => {
          const currentReplyCount = postReplyCounts[post.id] ?? post.replyCount ?? 0;
          const showingReplyForm = showReplyForms[post.id] || false;

          // Create a ref for this post's ReplyList if it doesn't exist
          if (!replyListRefs[post.id]) {
            replyListRefs[post.id] = React.createRef<ReplyListRef>();
          }

          return (
            <div key={post.id} className="border p-4 rounded flex flex-col space-y-4">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {/* Show video thumbnail if video exists */}
                  {((post.videoUrls && post.videoUrls.length > 0) || post.videoUrl) &&
                    (() => {
                      // Support both new videoUrls array and legacy videoUrl
                      const firstVideoUrl = post.videoUrls?.[0] || post.videoUrl;
                      const match = firstVideoUrl?.match(
                        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/
                      );
                      const videoId = match ? match[1] : null;
                      if (videoId) {
                        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                        const videoCount = post.videoUrls?.length || 1;
                        return (
                          <Link href={postDetailPath(postType, post.id)}>
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
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <path d="M8 5v14l11-7z" />
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
                  {!((post.videoUrls && post.videoUrls.length > 0) || post.videoUrl) &&
                    post.thumbnailUrl && (
                      <Link href={postDetailPath(postType, post.id)}>
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
                    href={postDetailPath(postType, post.id)}
                    className="text-xl font-bold mb-2 block flex items-center space-x-2"
                  >
                    {post.title}
                  </Link>
                  <p className="text-gray-700 mb-2">{post.message}</p>
                </div>
                <div className="text-right text-sm text-gray-500 flex flex-col items-end">
                  <p>{post.username}</p>
                  <p>{formatKoreaDateTime(post.date, post.time, post.createdAt)}</p>
                  {isOwnPost(post) && (
                    <Link
                      href={`/pages/posts/${postType}/${post.id}/edit`}
                      className="mt-1 font-medium text-brand-600 hover:text-brand-700"
                    >
                      수정
                    </Link>
                  )}
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
                    postService={postService}
                  />
                )}

                <ReplyList
                  ref={replyListRefs[post.id]}
                  postId={post.id}
                  replyCount={currentReplyCount}
                  onReplyCountUpdate={(count) => handleReplyCountUpdate(post.id, count)}
                  postService={postService}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center mt-4 space-x-2">
        {Array.from({ length: totalPages }, (_, index) => {
          const page = index + 1;
          const isSelected = page === currentPage;
          return isSelected ? (
            <button
              key={page}
              className={cn(
                'px-4 py-2 rounded-lg bg-brand text-ink font-bold shadow-sm',
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
                'px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100',
                'transition-all duration-200'
              )}
            >
              {page}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between mt-4">
        {' '}
        <div>
          {currentPage > 1 && (
            <button
              onClick={() => onPageChange(currentPage - 1)}
              className={cn(
                'px-5 py-2.5 rounded-lg bg-gray-100 text-gray-800 font-medium',
                'hover:bg-gray-200 transition-colors duration-200'
              )}
            >
              이전
            </button>
          )}
        </div>
        <div>
          {currentPage < totalPages && (
            <button
              onClick={() => onPageChange(currentPage + 1)}
              className={cn(
                'px-5 py-2.5 rounded-lg bg-gray-100 text-gray-800 font-medium',
                'hover:bg-gray-200 transition-colors duration-200'
              )}
            >
              다음
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostList;

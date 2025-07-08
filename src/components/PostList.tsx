import React, { useState } from "react";
import Link from "next/link";
import { cn } from "@/utils/cn";
import { Post as PostType } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import ReplyButton from "./ReplyButton";
import ReplyForm from "./ReplyForm";
import ReplyList from "./ReplyList";

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
    if (targetDate.getTimezoneOffset) {
      // For dates that might be in UTC, convert to Korea time
      koreaTime = new Date(targetDate.getTime() + (9 * 60 * 60 * 1000));
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
  mediaType?: "video" | "image";
  videoUrls?: string[];
  videoUrl?: string; // Keep for backward compatibility
  imageUrls?: string[];
  username: string;
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
}

const PostList: React.FC<PostListProps> = ({
  posts,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const [postReplyCounts, setPostReplyCounts] = useState<
    Record<string, number>
  >({});
  const [showReplyForms, setShowReplyForms] = useState<Record<string, boolean>>(
    {},
  );
  const { isAuthenticated } = useAuth();

  const handleReplyCountUpdate = (postId: string, count: number) => {
    setPostReplyCounts((prev) => ({ ...prev, [postId]: count }));
  };

  const handleToggleReplyForm = (postId: string) => {
    if (!isAuthenticated) {
      alert("댓글을 작성하려면 로그인이 필요합니다.");
      return;
    }
    setShowReplyForms((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleReplySuccess = (postId: string, reply: PostType) => {
    const currentCount =
      postReplyCounts[postId] ||
      posts.find((p) => p.id === postId)?.replyCount ||
      0;
    handleReplyCountUpdate(postId, currentCount + 1);
    setShowReplyForms((prev) => ({ ...prev, [postId]: false }));
  };

  return (
    <div data-oid="3b9e81w">
      <div className="space-y-4" data-oid="-9-82_z">
        {posts.length === 0 && <div data-oid="-9.mua2">No posts yet.</div>}{" "}
        {posts.map((post) => {
          const currentReplyCount =
            postReplyCounts[post.id] ?? post.replyCount ?? 0;
          const showingReplyForm = showReplyForms[post.id] || false;

          return (
            <div
              key={post.id}
              className="border p-4 rounded flex flex-col space-y-4"
              data-oid="9:9znti"
            >
              <div className="flex items-start space-x-4" data-oid="znsva14">
                <div className="flex-shrink-0" data-oid="uzxozoi">
                  {/* Show video thumbnail if video exists */}
                  {((post.videoUrls && post.videoUrls.length > 0) ||
                    post.videoUrl) &&
                    (() => {
                      // Support both new videoUrls array and legacy videoUrl
                      const firstVideoUrl =
                        post.videoUrls?.[0] || post.videoUrl;
                      const match = firstVideoUrl?.match(
                        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
                      );
                      const videoId = match ? match[1] : null;
                      if (videoId) {
                        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                        const videoCount = post.videoUrls?.length || 1;
                        return (
                          <Link
                            href={`/pages/posts/${post.id}`}
                            data-oid="-luwmz."
                          >
                            <div
                              className="relative cursor-pointer"
                              data-oid="2v1k_yo"
                            >
                              <img
                                src={thumbnailUrl}
                                alt="Video thumbnail"
                                className="w-20 h-15 object-cover rounded"
                                onError={(e) => {
                                  e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/default.jpg`;
                                }}
                                data-oid="l.0mr4a"
                              />

                              {/* Play button overlay */}
                              <div
                                className="absolute inset-0 flex items-center justify-center"
                                data-oid="w62r2df"
                              >
                                <div
                                  className="bg-red-600 text-white rounded-full p-1"
                                  data-oid="v1w.l5h"
                                >
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    data-oid="on.llpv"
                                  >
                                    <path
                                      d="M8 5v14l11-7z"
                                      data-oid="mro1i4z"
                                    />
                                  </svg>
                                </div>
                              </div>
                              {/* Video count indicator for multiple videos */}
                              {videoCount > 1 && (
                                <div
                                  className="absolute top-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded"
                                  data-oid="ecjovul"
                                >
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
                  {!(
                    (post.videoUrls && post.videoUrls.length > 0) ||
                    post.videoUrl
                  ) &&
                    post.thumbnailUrl && (
                      <Link href={`/pages/posts/${post.id}`} data-oid="epramt8">
                        <img
                          src={post.thumbnailUrl}
                          alt="Image thumbnail"
                          className="w-20 h-15 object-cover rounded cursor-pointer"
                          data-oid="4zpq7xr"
                        />
                      </Link>
                    )}
                </div>
                <div className="flex-grow" data-oid="nrsxh9s">
                  <Link
                    href={`/pages/posts/${post.id}`}
                    className="text-xl font-bold mb-2 block flex items-center space-x-2"
                    data-oid="zhxdr_w"
                  >
                    {post.title}
                  </Link>
                  <p className="text-gray-700 mb-2" data-oid="diph-a5">
                    {post.message}
                  </p>
                </div>
                <div
                  className="text-right text-sm text-gray-500 flex flex-col items-end"
                  data-oid="x9ibw25"
                >
                  <p data-oid="vqu:5d-">{post.username}</p>
                  <p data-oid="_t.8j:k">
                    {formatKoreaDateTime(post.date, post.time, post.createdAt)}
                  </p>
                </div>
              </div>

              {/* Reply functionality */}
              <div className="border-t pt-3" data-oid="82-kfph">
                <ReplyButton
                  postId={post.id}
                  replyCount={currentReplyCount}
                  onToggleReply={() => handleToggleReplyForm(post.id)}
                  showingReplies={false}
                  showingReplyForm={showingReplyForm}
                  data-oid="fk96t67"
                />

                {showingReplyForm && (
                  <ReplyForm
                    parentId={post.id}
                    parentUsername={post.username}
                    onReplySuccess={(reply) =>
                      handleReplySuccess(post.id, reply)
                    }
                    onCancel={() => handleToggleReplyForm(post.id)}
                    data-oid="gaff14q"
                  />
                )}

                <ReplyList
                  postId={post.id}
                  replyCount={currentReplyCount}
                  onReplyCountUpdate={(count) =>
                    handleReplyCountUpdate(post.id, count)
                  }
                  data-oid="84ehpq2"
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center mt-4 space-x-2" data-oid="nb7_bdt">
        {Array.from({ length: totalPages }, (_, index) => {
          const page = index + 1;
          const isSelected = page === currentPage;
          return isSelected ? (
            <button
              key={page}
              className={cn(
                "px-4 py-2 rounded bg-gradient-to-r from-yellow-400 to-orange-300 text-black font-bold shadow",
                "border border-yellow-500",
                "transition-all duration-200",
              )}
              disabled
              data-oid="51.e9_i"
            >
              {page}
            </button>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                "px-4 py-2 rounded text-gray-700 hover:bg-gray-100",
                "transition-all duration-200",
              )}
              data-oid="fl5gnwa"
            >
              {page}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between mt-4" data-oid="xj_b5pb">
        {" "}
        <div data-oid="cbu9l42">
          {currentPage > 1 && (
            <button
              onClick={() => onPageChange(currentPage - 1)}
              className={cn(
                "px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-300",
                "text-black rounded-lg font-bold hover:shadow-lg transition-all duration-200",
              )}
              data-oid="qk1:r56"
            >
              previous
            </button>
          )}
        </div>
        <div data-oid="fkdwlbi">
          {currentPage < totalPages && (
            <button
              onClick={() => onPageChange(currentPage + 1)}
              className={cn(
                "px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-300",
                "text-black rounded-lg font-bold hover:shadow-lg transition-all duration-200",
              )}
              data-oid="g9d7zmy"
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

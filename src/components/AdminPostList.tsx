"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthService, getPostService, getButlerTalkService } from "@/services";
import { User } from "firebase/auth";
import { cn } from "@/utils/cn";
import Link from "next/link";
import AdminReplyList from "./AdminReplyList";

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

interface AdminPostListProps {
  postType: "butler_stream" | "butler_talk";
}

const AdminPostList: React.FC<AdminPostListProps> = ({ postType }) => {
  // Service references
  const authService = getAuthService();
  const postService = getPostService();
  const butlerTalkService = getButlerTalkService();

  const [posts, setPosts] = useState<Post[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const postsPerPage = 20;
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user: User | null) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        router.push(`/pages/login?redirect=/admin/posts`);
      }
    });

    return () => unsubscribe();
  }, [router, authService]);

  const fetchPosts = async (page = 1) => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      console.log(`Fetching ${postType} posts...`);

      // Use the appropriate service based on post type
      const service = postType === "butler_stream" ? postService : butlerTalkService;
      const allPosts = await service.getAllPosts();

      console.log(`Raw ${postType} posts from service:`, allPosts);
      console.log(`Number of ${postType} posts fetched:`, allPosts.length);

      // Sort posts by date/time
      const sortedPosts = allPosts.sort((a: any, b: any) => {
        let dateA, dateB;

        if (a.date && a.time) {
          const dateTimeA = `${a.date}T${a.time}Z`;
          dateA = new Date(dateTimeA);
        } else if (a.createdAt) {
          dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        } else {
          dateA = new Date(0);
        }

        if (b.date && b.time) {
          const dateTimeB = `${b.date}T${b.time}Z`;
          dateB = new Date(dateTimeB);
        } else if (b.createdAt) {
          dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        } else {
          dateB = new Date(0);
        }

        return dateB.getTime() - dateA.getTime();
      });

      console.log(`Sorted ${postType} posts:`, sortedPosts);

      const startIndex = (page - 1) * postsPerPage;
      const paginatedPosts = sortedPosts.slice(
        startIndex,
        startIndex + postsPerPage,
      );

      console.log(`Paginated ${postType} posts for display:`, paginatedPosts);
      setPosts(paginatedPosts);
      setTotalPages(Math.ceil(sortedPosts.length / postsPerPage));
    } catch (error) {
      console.error(`Error in fetching ${postType} posts:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Reset to page 1 when switching tabs
    setCurrentPage(1);
  }, [postType]);

  useEffect(() => {
    fetchPosts(currentPage);
  }, [isAuthenticated, currentPage, postType]);

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  const handleEdit = (postId: string) => {
    // TODO: Implement edit functionality
    console.log(`Edit post: ${postId}`);
    alert("Edit functionality coming soon!");
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post? This will also delete all replies.")) {
      return;
    }

    try {
      // Use the appropriate service based on post type
      const service = postType === "butler_stream" ? postService : butlerTalkService;
      await service.deletePost(postId);

      // Remove the post from local state
      setPosts(prev => prev.filter(post => post.id !== postId));

      // Show success message
      alert("Post deleted successfully!");
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post. Please try again.");
    }
  };

  if (!isAuthenticated) {
    return null; // Prevent rendering until authentication is confirmed
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">Loading posts...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        {posts.length === 0 && <div>No posts yet.</div>}
        {posts.map((post) => (
          <div
            key={post.id}
            className="border p-4 rounded flex flex-col space-y-4"
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {/* Show video thumbnail if video exists */}
                {((post.videoUrls && post.videoUrls.length > 0) ||
                  post.videoUrl) &&
                  (() => {
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
                {!(
                  (post.videoUrls && post.videoUrls.length > 0) ||
                  post.videoUrl
                ) &&
                  post.thumbnailUrl && (
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
                  {formatKoreaDateTime(post.date, post.time, post.createdAt)}
                </p>
              </div>
            </div>

            {/* Admin Controls */}
            <div className="border-t pt-3 flex justify-between items-center">
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(post.id)}
                  className={cn(
                    "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600",
                    "transition-colors duration-200"
                  )}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(post.id)}
                  className={cn(
                    "px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600",
                    "transition-colors duration-200"
                  )}
                >
                  Delete
                </button>
              </div>

              {/* Reply count display */}
              {post.replyCount && post.replyCount > 0 && (
                <div className="text-sm text-gray-500">
                  {post.replyCount} replies
                </div>
              )}
            </div>

            {/* Admin Reply Management */}
            <AdminReplyList
              postId={post.id}
              replyCount={post.replyCount || 0}
              onReplyCountUpdate={(count) => {
                setPosts(prev => prev.map(p =>
                  p.id === post.id ? { ...p, replyCount: count } : p
                ));
              }}
              postService={postType === "butler_stream" ? postService : butlerTalkService}
            />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center mt-4 space-x-2">
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
            >
              {page}
            </button>
          ) : (
            <button
              key={page}
              onClick={() => handlePageClick(page)}
              className={cn(
                "px-4 py-2 rounded text-gray-700 hover:bg-gray-100",
                "transition-all duration-200",
              )}
            >
              {page}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between mt-4">
        <div>
          {currentPage > 1 && (
            <button
              onClick={() => handlePageClick(currentPage - 1)}
              className={cn(
                "px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-300",
                "text-black rounded-lg font-bold hover:shadow-lg transition-all duration-200",
              )}
            >
              previous
            </button>
          )}
        </div>
        <div>
          {currentPage < totalPages && (
            <button
              onClick={() => handlePageClick(currentPage + 1)}
              className={cn(
                "px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-300",
                "text-black rounded-lg font-bold hover:shadow-lg transition-all duration-200",
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

export default AdminPostList;

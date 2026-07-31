'use client';

import { useCallback, useState } from 'react';
import { getAnnouncementService } from '@/services';
import { cn } from '@/utils/cn';
import Link from 'next/link';
import { useMountain } from '@/components/MountainProvider';
import { useAsyncData } from '@/hooks/useAsyncData';
import { SkeletonList, ErrorNotice } from '@/components/ui/AsyncStates';

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

const AnnouncementClient = () => {
  // Service references
  const mountainId = useMountain();
  const announcementService = getAnnouncementService(mountainId);

  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 20;

  // 🐛 2026-08-01: this used to keep only `posts`, so the "아직 등록된 공지사항이
  // 없어요" branch below doubled as the loading state *and* the failure state —
  // and since the fetch threw into a `catch` that only logged, a failed load sat
  // on that message until the reader reloaded. `useAsyncData` keeps the three
  // apart; the empty message is now unreachable until a fetch really returns [].
  const fetchPosts = useCallback(async () => {
    const allPosts = await announcementService.getAllPosts();

    // Check if posts have date/time fields or use createdAt
    return allPosts.sort((a: any, b: any) => {
      // Try to use date/time fields first, fallback to createdAt
      let dateA, dateB;

      if (a.date && a.time) {
        // Parse as UTC time for consistent sorting
        const dateTimeA = `${a.date}T${a.time}Z`;
        dateA = new Date(dateTimeA);
      } else if (a.createdAt) {
        dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      } else {
        dateA = new Date(0); // Very old date for fallback
      }

      if (b.date && b.time) {
        // Parse as UTC time for consistent sorting
        const dateTimeB = `${b.date}T${b.time}Z`;
        dateB = new Date(dateTimeB);
      } else if (b.createdAt) {
        dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      } else {
        dateB = new Date(0); // Very old date for fallback
      }

      // Sort newest first (reverse chronological order)
      // Larger timestamp (newer date) should come first
      return dateB.getTime() - dateA.getTime();
    });
  }, [announcementService]);

  const { status, data, reload } = useAsyncData(fetchPosts);

  // Paginate the loaded list in memory — the fetch returns every announcement, so
  // changing page must not refetch (it used to, which is why paging re-ran the
  // whole query).
  const allPosts = data ?? [];
  const totalPages = Math.max(1, Math.ceil(allPosts.length / postsPerPage));
  const startIndex = (currentPage - 1) * postsPerPage;
  const posts = allPosts.slice(startIndex, startIndex + postsPerPage);

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  if (status === 'loading') return <SkeletonList />;

  if (status === 'error') {
    return <ErrorNotice message="공지사항을 불러오지 못했어요." onRetry={reload} />;
  }

  return (
    <div>
      <div className="space-y-4">
        {posts.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-gray-500">
            아직 등록된 공지사항이 없어요.
          </div>
        )}
        {posts.map((post) => (
          <div
            key={post.id}
            className="flex flex-col space-y-4 rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm"
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {/* Show video thumbnail if video exists */}
                {((post.videoUrls && post.videoUrls.length > 0) || post.videoUrl) &&
                  (() => {
                    const firstVideoUrl = post.videoUrls?.[0] || post.videoUrl;
                    const match = firstVideoUrl?.match(
                      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/
                    );
                    const videoId = match ? match[1] : null;
                    if (videoId) {
                      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                      const videoCount = post.videoUrls?.length || 1;
                      return (
                        <Link href={`/pages/announcements/${post.id}`}>
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
                    <Link href={`/pages/announcements/${post.id}`}>
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
                  href={`/pages/announcements/${post.id}`}
                  className="text-xl font-bold mb-2 block flex items-center space-x-2"
                >
                  {post.title}
                </Link>
                <p className="text-gray-700 mb-2">{post.message}</p>
              </div>
              <div className="text-right text-sm text-gray-500 flex flex-col items-end">
                <p>{post.username}</p>
                <p>{formatKoreaDateTime(post.date, post.time, post.createdAt)}</p>
              </div>
            </div>
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
              onClick={() => handlePageClick(page)}
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
        <div>
          {currentPage > 1 && (
            <button
              onClick={() => handlePageClick(currentPage - 1)}
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
              onClick={() => handlePageClick(currentPage + 1)}
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

export default AnnouncementClient;

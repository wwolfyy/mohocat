'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthService, getButlerTalkService } from '@/services';
import PostList from '@/components/PostList';
import Button from '@/components/ui/Button';
import { User } from 'firebase/auth';
import { useMountain } from '@/components/MountainProvider';
import { usePermissions } from '@/hooks/usePermissions';

const ButlerTalkClient = () => {
  // Service references
  const mountainId = useMountain();
  const authService = getAuthService();
  const butlerTalkService = getButlerTalkService(mountainId);
  // Viewing and posting are separate grants: a role may read this board without
  // being able to write to it (plan D1), so the composer link follows the write
  // permission, not mere authentication.
  const { hasAnyPermission } = usePermissions();

  const [posts, setPosts] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const postsPerPage = 20;
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user: User | null) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        router.push(`/pages/login?redirect=/pages/butler_talk`);
      }
    });

    return () => unsubscribe();
  }, [router, authService]);

  const fetchPosts = async (page = 1) => {
    if (isAuthenticated) {
      try {
        console.log('Fetching butler talk posts...');
        // Use service layer for butler talk posts
        const allPosts = await butlerTalkService.getAllPosts();
        console.log('Raw butler talk posts from service:', allPosts);
        console.log('Number of butler talk posts fetched:', allPosts.length);

        // Check if posts have date/time fields or use createdAt
        const sortedPosts = allPosts.sort((a: any, b: any) => {
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

        console.log('Sorted butler talk posts:', sortedPosts);

        const startIndex = (page - 1) * postsPerPage;
        const paginatedPosts = sortedPosts.slice(startIndex, startIndex + postsPerPage);

        console.log('Paginated butler talk posts for display:', paginatedPosts);
        setPosts(paginatedPosts);
        setTotalPages(Math.ceil(sortedPosts.length / postsPerPage));
      } catch (error) {
        console.error('Error in fetchPosts:', error);
      }
    }
  };

  useEffect(() => {
    fetchPosts(currentPage);
  }, [isAuthenticated, currentPage]);

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  if (!isAuthenticated) {
    return null; // Prevent rendering until authentication is confirmed
  }

  return (
    <>
      {hasAnyPermission(['manage-posts', 'write-own-post-butler']) && (
        <div className="flex justify-end mb-4">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => router.push('/pages/butler_talk/new')}
          >
            새글 작성
          </Button>
        </div>
      )}

      <PostList
        posts={posts}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageClick}
        postService={butlerTalkService}
        postType="butler_talk"
      />
    </>
  );
};

export default ButlerTalkClient;

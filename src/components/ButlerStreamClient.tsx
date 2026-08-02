'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthService, getPostService } from '@/services';
import PostList from '@/components/PostList';
import Button from '@/components/ui/Button';
import { User } from 'firebase/auth';
import { useMountain } from '@/components/MountainProvider';

const ButlerStreamClient = () => {
  // Service references
  const mountainId = useMountain();
  const authService = getAuthService();
  const postService = getPostService(mountainId);

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
        router.push(`/pages/login?redirect=/pages/butler_stream`);
      }
    });

    return () => unsubscribe();
  }, [router, authService]);

  const fetchPosts = async (page = 1) => {
    if (isAuthenticated) {
      try {
        console.log('Fetching posts...');
        // Use service layer instead of direct Firebase access
        const allPosts = await postService.getAllPosts();
        console.log('Raw posts from service:', allPosts);
        console.log('Number of posts fetched:', allPosts.length);

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

        console.log('Sorted posts:', sortedPosts);

        const startIndex = (page - 1) * postsPerPage;
        const paginatedPosts = sortedPosts.slice(startIndex, startIndex + postsPerPage);

        console.log('Paginated posts for display:', paginatedPosts);
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
      <div className="flex justify-end mb-4">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => router.push('/pages/butler_stream/new')}
        >
          새글 작성
        </Button>
      </div>

      <PostList
        posts={posts}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageClick}
        postService={postService}
        postType="butler_stream"
      />
    </>
  );
};

export default ButlerStreamClient;

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthService, getPostService } from "@/services";
import PostList from "@/components/PostList";
import { User } from "firebase/auth";
import { cn } from "@/utils/cn";

const ButlerStream = () => {
  // Service references
  const authService = getAuthService();
  const postService = getPostService();

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
        console.log("Fetching posts...");
        // Use service layer instead of direct Firebase access
        const allPosts = await postService.getAllPosts();
        console.log("Raw posts from service:", allPosts);
        console.log("Number of posts fetched:", allPosts.length);

        // Check if posts have date/time fields or use createdAt
        const sortedPosts = allPosts.sort((a: any, b: any) => {
          // Try to use date/time fields first, fallback to createdAt
          let dateA, dateB;

          if (a.date && a.time) {
            dateA = new Date(`${a.date} ${a.time}`);
          } else if (a.createdAt) {
            dateA = new Date(a.createdAt);
          } else {
            dateA = new Date();
          }

          if (b.date && b.time) {
            dateB = new Date(`${b.date} ${b.time}`);
          } else if (b.createdAt) {
            dateB = new Date(b.createdAt);
          } else {
            dateB = new Date();
          }

          return dateB.getTime() - dateA.getTime();
        });

        console.log("Sorted posts:", sortedPosts);

        const startIndex = (page - 1) * postsPerPage;
        const paginatedPosts = sortedPosts.slice(
          startIndex,
          startIndex + postsPerPage,
        );

        console.log("Paginated posts for display:", paginatedPosts);
        setPosts(paginatedPosts);
        setTotalPages(Math.ceil(sortedPosts.length / postsPerPage));
      } catch (error) {
        console.error("Error in fetchPosts:", error);
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
    <div className="p-4" data-oid="z5x374l">
      <h1
        className="text-center text-2xl font-bold mb-4 mx-auto"
        data-oid=".pbn:qr"
      >
        집사게시판
      </h1>
      <div className="flex justify-end mb-4" data-oid="s64j5_s">
        <button
          onClick={() => router.push("/pages/butler_stream/new")}
          className={cn(
            "w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-300",
            "text-black rounded-lg font-bold hover:shadow-lg transition-all duration-200",
          )}
          data-oid="q0:d1d3"
        >
          새글 작성
        </button>
      </div>
      <PostList
        posts={posts}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageClick}
        data-oid="dy3hc7:"
      />
    </div>
  );
};

export default ButlerStream;

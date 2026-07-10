'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAdoptionService } from '@/services';
import { cn } from '@/utils/cn';
import CatLinkedText from '@/components/CatLinkedText';

const youtubeId = (url?: string) =>
  url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1] || null;

/**
 * A single 입양홍보 post as an accordion card. Folded by default: title + a
 * 3-line preview of the content. Expanding reveals the full message and media
 * (video thumbnails open the source on YouTube). Only the header toggles, so the
 * `[catmodal:…]` links inside the body keep opening the cat modal independently.
 */
function AdoptionPostCard({ post }: { post: any }) {
  const [open, setOpen] = useState(false);

  const firstVideoUrl = post.videoUrls?.[0] || post.videoUrl;
  const videoId = youtubeId(firstVideoUrl);

  return (
    <div className="rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-4 p-4 text-left"
      >
        <h3 className="flex-grow text-base font-semibold text-gray-900">{post.title}</h3>
        <div className="flex flex-shrink-0 items-center gap-2 whitespace-nowrap text-sm text-gray-500">
          <span>{formatKoreaDateTime(post.date, post.time, post.createdAt)}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={cn('transition-transform duration-200', open && 'rotate-180')}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      <div className="px-4 pb-4">
        {open ? (
          <div className="flex items-start gap-4">
            {videoId ? (
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block flex-shrink-0"
              >
                <img
                  src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                  alt="동영상 미리보기"
                  className="h-15 w-20 rounded object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/default.jpg`;
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full bg-red-600 p-1 text-white">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </a>
            ) : (
              post.thumbnailUrl && (
                <img
                  src={post.thumbnailUrl}
                  alt="이미지"
                  className="h-15 w-20 flex-shrink-0 rounded object-cover"
                />
              )
            )}
            <CatLinkedText
              text={post.message}
              className="flex-grow whitespace-pre-line text-base text-gray-700"
            />
          </div>
        ) : (
          <CatLinkedText text={post.message} className="line-clamp-3 text-base text-gray-700" />
        )}
      </div>
    </div>
  );
}

// Convert stored date/time (or createdAt) to a Korea-timezone display string.
const formatKoreaDateTime = (date: string, time: string, createdAt?: any) => {
  try {
    let targetDate: Date | null = null;

    if (date && time) {
      const utcDateTime = new Date(`${date}T${time}Z`);
      targetDate = !isNaN(utcDateTime.getTime()) ? utcDateTime : new Date(`${date}T${time}`);
      if (isNaN(targetDate.getTime())) targetDate = null;
    }
    if (!targetDate && createdAt) {
      if (createdAt instanceof Date) targetDate = createdAt;
      else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
        const parsed = new Date(createdAt);
        if (!isNaN(parsed.getTime())) targetDate = parsed;
      } else if (createdAt.toDate && typeof createdAt.toDate === 'function') {
        targetDate = createdAt.toDate();
      }
    }
    if (!targetDate) return `${date} ${time}`;

    const koreaTime = new Date(targetDate.getTime() + 9 * 60 * 60 * 1000);
    const year = koreaTime.getFullYear();
    const month = String(koreaTime.getMonth() + 1).padStart(2, '0');
    const day = String(koreaTime.getDate()).padStart(2, '0');
    const hours = String(koreaTime.getHours()).padStart(2, '0');
    const minutes = String(koreaTime.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (error) {
    return `${date || ''} ${time || ''}`.trim();
  }
};

/**
 * 입양홍보 소식 — public feed of adoption-promotion posts, shown on the adoption
 * page. Reads the `posts_adoption` collection live (client-side); no auth gate.
 * Self-contained cards (title/message/media inline); video thumbnails open the
 * source video on YouTube — the shared PostList detail route only resolves the
 * feeding collection, so it isn't reused here.
 */
const AdoptionPromotionClient = () => {
  const adoptionService = getAdoptionService();

  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 20;

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const posts = await adoptionService.getAllPosts();
        const sorted = posts.sort((a: any, b: any) => {
          const dateA =
            a.date && a.time ? new Date(`${a.date}T${a.time}Z`) : new Date(a.createdAt || 0);
          const dateB =
            b.date && b.time ? new Date(`${b.date}T${b.time}Z`) : new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });
        setAllPosts(sorted);
      } catch (error) {
        console.error('Error fetching adoption posts:', error);
      }
    };
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter by title + content (case-insensitive) before paginating.
  const normalizedQuery = query.trim().toLowerCase();
  const filteredPosts = useMemo(() => {
    if (!normalizedQuery) return allPosts;
    return allPosts.filter((p) =>
      `${p.title || ''} ${p.message || ''}`.toLowerCase().includes(normalizedQuery)
    );
  }, [allPosts, normalizedQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / postsPerPage));
  const startIndex = (currentPage - 1) * postsPerPage;
  const pagePosts = filteredPosts.slice(startIndex, startIndex + postsPerPage);

  // A new search resets to the first page.
  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedQuery]);

  return (
    <div>
      {allPosts.length > 0 && (
        <div className="relative mb-4">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목이나 내용으로 검색"
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm text-gray-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      )}

      <div className="space-y-4">
        {allPosts.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-gray-500">
            아직 등록된 입양홍보 소식이 없어요.
          </div>
        )}
        {allPosts.length > 0 && filteredPosts.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-gray-500">
            검색 결과가 없어요.
          </div>
        )}
        {pagePosts.map((post) => (
          <AdoptionPostCard key={post.id} post={post} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center space-x-2">
          {Array.from({ length: totalPages }, (_, index) => {
            const page = index + 1;
            const isSelected = page === currentPage;
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                disabled={isSelected}
                className={cn(
                  'rounded-lg px-4 py-2 transition-all duration-200',
                  isSelected
                    ? 'bg-brand font-bold text-ink shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                {page}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdoptionPromotionClient;

'use client';

import { useState, useEffect } from 'react';
import {
  getImageService,
  getVideoService,
  getCatService,
  getContactService,
  getPostService,
  getButlerTalkService,
  getAnnouncementService,
  getAdoptionService,
} from '@/services';
import YouTubeAuthPanel from '@/components/admin/YouTubeAuthPanelNew';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import { useMountain } from '@/components/MountainProvider';

interface AdminStats {
  // Images stats
  totalImages: number;
  taggedImages: number;

  // Videos stats
  totalVideos: number;
  taggedVideos: number;

  // Other stats
  totalCats: number;
  totalContacts: number;
  totalPoints: number;

  // Posts stats — one entry per real post collection (see POST_COLLECTIONS)
  postsCollections: { label: string; count: number }[];
  totalPosts: number;
}

/**
 * The post collections, with the Korean name of the surface each one backs.
 *
 * 🗑️ This list used to be operator-configurable — a textarea in 앱 관리 that saved
 * collection names to `localStorage`. It was removed 2026-08-02: which collections
 * exist is a fact about the code (each is a service's `COLLECTION_NAME`), not an
 * operator choice, and the counts beside the names were a hard-coded `0` the whole
 * time. Add a row here when a post service is added.
 */
const POST_COLLECTIONS = [
  { label: '급식현황', getService: getPostService }, // posts_feeding
  { label: '집사톡', getService: getButlerTalkService }, // posts_butler
  { label: '공지사항', getService: getAnnouncementService }, // posts_announcements
  { label: '입양홍보', getService: getAdoptionService }, // posts_adoption
] as const;

export default function AdminDashboard() {
  const mountainId = useMountain();

  // Service references
  const imageService = getImageService(mountainId);
  const videoService = getVideoService(mountainId);
  const catService = getCatService(mountainId);
  const contactService = getContactService(mountainId);

  const [stats, setStats] = useState<AdminStats>({
    totalImages: 0,
    taggedImages: 0,
    totalVideos: 0,
    taggedVideos: 0,
    totalCats: 0,
    totalContacts: 0,
    totalPoints: 0,
    postsCollections: [],
    totalPosts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch data using service layer
        const [
          allImages,
          allVideos,
          allCats,
          // Note: contacts and points don't have getAll methods in current service interfaces
          // We'll handle them separately with try-catch
        ] = await Promise.all([
          imageService.getAllImages(),
          videoService.getAllVideos(),
          catService.getAllCats(),
        ]);

        // Get contacts count
        let totalContacts = 0;
        try {
          const allContacts = await contactService.getAllContacts();
          totalContacts = allContacts.length;
        } catch (error) {
          console.warn('Contacts count not available:', error);
          totalContacts = 0;
        }

        // Get points count from static API
        let totalPoints = 0;
        try {
          const pointsResponse = await fetch('/api/points');
          if (pointsResponse.ok) {
            const { points } = await pointsResponse.json();
            totalPoints = points.length;
          }
        } catch (error) {
          console.warn('Points count not available:', error);
          totalPoints = 0;
        }

        // Count tagged images and videos
        const taggedImagesCount = allImages.filter((image: any) => {
          return image.tags && Array.isArray(image.tags) && image.tags.length > 0;
        }).length;

        const taggedVideosCount = allVideos.filter((video: any) => {
          return video.tags && Array.isArray(video.tags) && video.tags.length > 0;
        }).length;

        // Count each post collection. `getAllPosts()` is mountain-scoped and
        // excludes replies, so this counts posts rather than every document.
        const postsCollections = await Promise.all(
          POST_COLLECTIONS.map(async ({ label, getService }) => ({
            label,
            count: (await getService(mountainId).getAllPosts()).length,
          }))
        );

        setStats({
          totalImages: allImages.length,
          taggedImages: taggedImagesCount,
          totalVideos: allVideos.length,
          taggedVideos: taggedVideosCount,
          totalCats: allCats.length,
          totalContacts: totalContacts,
          totalPoints: totalPoints,
          postsCollections: postsCollections,
          totalPosts: postsCollections.reduce((sum, { count }) => sum + count, 0),
        });
      } catch (err: any) {
        console.error('Error fetching stats:', err);

        // Provide more specific error messages
        let errorMessage = '통계를 불러오지 못했어요';
        if (err.code === 'permission-denied') {
          errorMessage = '권한이 거부됐어요 - Firestore 규칙을 확인해 주세요';
        } else if (err.code === 'unavailable') {
          errorMessage = 'Firestore에 연결할 수 없어요 - 연결을 확인해 주세요';
        } else if (err.message) {
          errorMessage = `오류: ${err.message}`;
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const tileValue = (value: number) => (loading ? '불러오는 중' : value);

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">🐱 산냥이집냥이 관리자 페이지</h1>

        {error && (
          <Alert variant="error" className="mt-4">
            ⚠️ {error}
          </Alert>
        )}

        {!error &&
          !loading &&
          stats.totalImages === 0 &&
          stats.totalVideos === 0 &&
          stats.totalCats === 0 &&
          stats.totalContacts === 0 &&
          stats.totalPoints === 0 && (
            <Alert variant="warning" className="mt-4">
              📊 데이터가 없어요. 데이터베이스 설정을 확인해 주세요.
            </Alert>
          )}
      </div>

      {/* YouTube Auth Panel */}
      <YouTubeAuthPanel />

      {/* Quick Stats - 6 Tiles */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 mb-8">
        {/* 1. 고양이 */}
        <StatTile icon="🐱" label="고양이" value={tileValue(stats.totalCats)} />

        {/* 2. 사진 */}
        <StatTile
          icon="🖼️"
          label="사진"
          value={tileValue(stats.totalImages)}
          subline={!loading && stats.totalImages > 0 ? `${stats.taggedImages}개 태그됨` : undefined}
        />

        {/* 3. 동영상 */}
        <StatTile
          icon="🎥"
          label="동영상"
          value={tileValue(stats.totalVideos)}
          subline={!loading && stats.totalVideos > 0 ? `${stats.taggedVideos}개 태그됨` : undefined}
        />

        {/* 4. 게시물 — total across every post collection, broken down per surface */}
        <Card>
          <div className="text-3xl mb-2">📝</div>
          <h3 className="text-base text-gray-500">게시물</h3>
          <div className="text-2xl font-bold text-gray-900">{tileValue(stats.totalPosts)}</div>
          {!loading && (
            <div className="text-xs text-gray-500 mt-1">
              {stats.postsCollections.map(({ label, count }) => (
                <div key={label} className="my-0.5 flex justify-between">
                  <span>{label}</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 5. 거주지 */}
        <StatTile icon="📍" label="거주지" value={tileValue(stats.totalPoints)} />

        {/* 6. 집사 */}
        <StatTile icon="📧" label="집사" value={tileValue(stats.totalContacts)} />
      </div>
    </div>
  );
}

// Uniform dashboard stat tile (icon + label + value, with an optional subline).
function StatTile({
  icon,
  label,
  value,
  subline,
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
  subline?: string;
}) {
  return (
    <Card>
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="text-base text-gray-500">{label}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subline && <p className="text-xs text-gray-500 mt-1">{subline}</p>}
    </Card>
  );
}

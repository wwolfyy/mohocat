'use client';

import { useState, useEffect } from 'react';
import {
  getImageService,
  getVideoService,
  getCatService,
  getContactService,
  getPostService,
} from '@/services';
import YouTubeAuthPanel from '@/components/admin/YouTubeAuthPanelNew';

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

  // Posts stats (collections starting with "posts_")
  postsCollections: { name: string; count: number }[];
}

export default function AdminDashboard() {
  // Service references
  const imageService = getImageService();
  const videoService = getVideoService();
  const catService = getCatService();
  const contactService = getContactService();
  const postService = getPostService();

  const [stats, setStats] = useState<AdminStats>({
    totalImages: 0,
    taggedImages: 0,
    totalVideos: 0,
    taggedVideos: 0,
    totalCats: 0,
    totalContacts: 0,
    totalPoints: 0,
    postsCollections: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get posts collections from user configuration
  const getConfiguredPostsCollections = async (collectionNames: string[]) => {
    const postsCollections: { name: string; count: number }[] = [];

    for (const collectionName of collectionNames) {
      try {
        // TODO: Replace with post service when collection-specific methods are available
        // For now, return placeholder data since we don't have collection-specific service methods
        postsCollections.push({
          name: collectionName,
          count: 0, // Placeholder until proper post service implementation
        });
      } catch (error) {
        console.warn(`Failed to get count for collection ${collectionName}:`, error);
        postsCollections.push({
          name: collectionName,
          count: 0,
        });
      }
    }

    return postsCollections;
  };
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load posts collection configuration from localStorage
        let configuredCollections = ['posts_main', 'posts_feeding', 'posts_announcements'];
        try {
          const saved = localStorage.getItem('admin-posts-collections');
          if (saved) {
            configuredCollections = saved.split('\n').filter((name) => name.trim().length > 0);
          }
        } catch (error) {
          console.warn('Failed to load posts collection config from localStorage:', error);
        }

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

        // Get contacts count (fallback to 0 if service doesn't support getAll)
        let totalContacts = 0;
        try {
          // TODO: Add getAllContacts method to IContactService interface
          // For now, this is a placeholder
          totalContacts = 0;
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

        // Get posts collections based on user configuration
        const postsCollections = await getConfiguredPostsCollections(configuredCollections);

        setStats({
          totalImages: allImages.length,
          taggedImages: taggedImagesCount,
          totalVideos: allVideos.length,
          taggedVideos: taggedVideosCount,
          totalCats: allCats.length,
          totalContacts: totalContacts,
          totalPoints: totalPoints,
          postsCollections: postsCollections,
        });
      } catch (err: any) {
        console.error('Error fetching stats:', err);

        // Provide more specific error messages
        let errorMessage = 'Failed to load statistics';
        if (err.code === 'permission-denied') {
          errorMessage = 'Permission denied - check Firestore rules';
        } else if (err.code === 'unavailable') {
          errorMessage = 'Firestore unavailable - check connection';
        } else if (err.message) {
          errorMessage = `Error: ${err.message}`;
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }} data-oid="3k7zs5.">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }} data-oid="jbo7lj3">
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '0.5rem',
          }}
          data-oid="7z5gd_x"
        >
          🐱 산냥이집냥이 관리자 페이지
        </h1>

        {/* Service Configuration Status */}
        {/* Removed service layer configuration box */}

        {error && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '1rem',
              marginTop: '1rem',
              color: '#dc2626',
            }}
            data-oid="93q-7rm"
          >
            ⚠️ {error}
          </div>
        )}

        {!error &&
          !loading &&
          stats.totalImages === 0 &&
          stats.totalVideos === 0 &&
          stats.totalCats === 0 &&
          stats.totalContacts === 0 &&
          stats.totalPoints === 0 && (
            <div
              style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                padding: '1rem',
                marginTop: '1rem',
                color: '#92400e',
              }}
              data-oid="b-d56vv"
            >
              📊 No data found. Please ensure your database is properly configured.
            </div>
          )}
      </div>

      {/* YouTube Auth Panel */}
      <YouTubeAuthPanel />

      {/* Quick Stats - 6 Tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
        data-oid="p5es.xv"
      >
        {/* 1. 고양이 관리 - Cats Tile */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
          data-oid="34qlh1x"
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }} data-oid="_952g1o">
            �
          </div>
          <h3 style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }} data-oid="a:g.734">
            고양이
          </h3>
          <p
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#111827',
              margin: 0,
            }}
            data-oid="-zikimc"
          >
            {loading ? 'Loading...' : stats.totalCats}
          </p>
        </div>

        {/* 2. 사진 - Images Tile */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
          data-oid="ky-c8ki"
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }} data-oid="t2fw2li">
            🖼️
          </div>
          <h3 style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }} data-oid="w_aicfh">
            사진
          </h3>
          <p
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#111827',
              margin: 0,
            }}
            data-oid="374zfaz"
          >
            {loading ? 'Loading...' : stats.totalImages}
          </p>
          {!loading && stats.totalImages > 0 && (
            <p
              style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                margin: '0.25rem 0 0 0',
              }}
              data-oid="7nnuis:"
            >
              {stats.taggedImages} tagged
            </p>
          )}
        </div>

        {/* 3. 동영상 - Videos Tile */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
          data-oid="5ago4y3"
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }} data-oid="ce8998b">
            🎥
          </div>
          <h3 style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }} data-oid="k83rzh3">
            동영상
          </h3>
          <p
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#111827',
              margin: 0,
            }}
            data-oid="87ak9e-"
          >
            {loading ? 'Loading...' : stats.totalVideos}
          </p>
          {!loading && stats.totalVideos > 0 && (
            <p
              style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                margin: '0.25rem 0 0 0',
              }}
              data-oid="-b2z-.b"
            >
              {stats.taggedVideos} tagged
            </p>
          )}
        </div>

        {/* 4. 게시물 - Posts Tile */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
          data-oid="f:4x5c1"
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '0.5rem',
            }}
            data-oid="g2cx-mx"
          >
            <div style={{ fontSize: '2rem' }} data-oid=".bq-c12">
              📝
            </div>
            <a
              href="/admin/app-management?tab=posts-config"
              style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                color: '#374151',
                cursor: 'pointer',
                textDecoration: 'none',
              }}
              title="Configure post collections"
              data-oid="mjr.6p6"
            >
              ⚙️ Config
            </a>
          </div>
          <h3 style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }} data-oid="x1.9aam">
            게시물
          </h3>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#111827',
              margin: 0,
            }}
            data-oid="0l.onvm"
          >
            {loading ? 'Loading...' : stats.postsCollections.length}
          </div>
          {!loading && stats.postsCollections.length > 0 && (
            <div
              style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                margin: '0.25rem 0 0 0',
              }}
              data-oid="pt5p2ax"
            >
              {stats.postsCollections.map((collection) => (
                <div
                  key={collection.name}
                  style={{
                    margin: '0.125rem 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                  data-oid="o6qoz3w"
                >
                  <span data-oid="30ngnpc">{collection.name.replace('posts_', '')}</span>
                  <span style={{ fontWeight: 'bold' }} data-oid="b.mqqdx">
                    {collection.count}
                  </span>
                </div>
              ))}
            </div>
          )}
          {!loading && stats.postsCollections.length === 0 && (
            <p
              style={{
                fontSize: '0.75rem',
                color: '#ef4444',
                margin: '0.25rem 0 0 0',
              }}
              data-oid="592_023"
            >
              No collections configured
            </p>
          )}
        </div>

        {/* 5. 거주지 - Points Tile */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
          data-oid="dxjicch"
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }} data-oid="2_y7h0i">
            📍
          </div>
          <h3 style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }} data-oid="7ee3-5p">
            거주지
          </h3>
          <p
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#111827',
              margin: 0,
            }}
            data-oid="116q03m"
          >
            {loading ? 'Loading...' : stats.totalPoints}
          </p>
        </div>

        {/* 6. 회원 - Contacts Tile */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
          data-oid="2zm0gko"
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }} data-oid="q6nqrq2">
            📧
          </div>
          <h3 style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }} data-oid="3ct38kf">
            회원
          </h3>
          <p
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#111827',
              margin: 0,
            }}
            data-oid="1hvy0ga"
          >
            {loading ? 'Loading...' : stats.totalContacts}
          </p>
        </div>
      </div>
    </div>
  );
}

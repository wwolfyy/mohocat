'use client';

import { useState, useEffect } from 'react';
import { getImageService, getVideoService, getCatService, getContactService, getPointService, getPostService } from '@/services';

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
  const pointService = getPointService();
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

  // Posts collections configuration
  const [postsCollectionNames, setPostsCollectionNames] = useState<string>('');
  const [showPostsConfig, setShowPostsConfig] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  // Load posts collection configuration from localStorage
  const loadPostsCollectionConfig = () => {
    try {
      const saved = localStorage.getItem('admin-posts-collections');
      if (saved) {
        setPostsCollectionNames(saved);
        return saved.split('\n').filter(name => name.trim().length > 0);
      }
    } catch (error) {
      console.warn('Failed to load posts collection config from localStorage:', error);
    }

    // Default collections if nothing saved
    const defaultCollections = ['posts_main', 'posts_feeding', 'posts_announcements'];
    setPostsCollectionNames(defaultCollections.join('\n'));
    return defaultCollections;
  };

  // Save posts collection configuration to localStorage
  const savePostsCollectionConfig = (configText: string) => {
    try {
      localStorage.setItem('admin-posts-collections', configText);
      setPostsCollectionNames(configText);
      return true;
    } catch (error) {
      console.error('Failed to save posts collection config to localStorage:', error);
      return false;
    }
  };

  // Get posts collections from user configuration
  const getConfiguredPostsCollections = async (collectionNames: string[]) => {
    const postsCollections: { name: string; count: number }[] = [];

    for (const collectionName of collectionNames) {
      try {
        // TODO: Replace with post service when collection-specific methods are available
        // For now, return placeholder data since we don't have collection-specific service methods
        postsCollections.push({
          name: collectionName,
          count: 0 // Placeholder until proper post service implementation
        });
      } catch (error) {
        console.warn(`Failed to get count for collection ${collectionName}:`, error);
        postsCollections.push({
          name: collectionName,
          count: 0
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

        // Load posts collection configuration
        const configuredCollections = loadPostsCollectionConfig();

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

        // Get points count (fallback to 0 if service doesn't support getAll)
        let totalPoints = 0;
        try {
          const allPoints = await pointService.getAllPoints();
          totalPoints = allPoints.length;
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
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '0.5rem'
        }}>
          🐱 Mountain Cats Admin Dashboard
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
          Manage cat images, videos, and tagging
        </p>

        {/* Service Configuration Status */}
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '1rem',
          marginTop: '1rem'
        }}>
          <h3 style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#166534',
            marginBottom: '0.5rem'
          }}>
            Service Layer Configuration
          </h3>
          <div style={{ fontSize: '0.875rem', color: '#15803d' }}>
            <div style={{ marginBottom: '0.25rem' }}>
              <span style={{ color: '#166534' }}>Data Access:</span>{' '}
              <span style={{ color: '#059669' }}>✅ Using Service Layer Abstraction</span>
            </div>
            <div style={{ marginBottom: '0.25rem' }}>
              <span style={{ color: '#166534' }}>Services:</span>{' '}
              <span style={{ color: '#059669' }}>✅ Images, Videos, Cats, Points via service layer</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.5rem' }}>
              All dashboard statistics are loaded through the service layer for better maintainability and multi-tenant support.
            </div>
          </div>
        </div>        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '1rem',
            marginTop: '1rem',
            color: '#dc2626'
          }}>
            ⚠️ {error}
            {error.includes('Failed to load statistics') && (
              <div style={{ marginTop: '0.5rem' }}>
                <a
                  href="/admin/seed-data"
                  style={{
                    color: '#dc2626',
                    textDecoration: 'underline'
                  }}
                >
                  Try seeding the database with sample data
                </a>
              </div>
            )}
          </div>
        )}

        {!error && !loading && stats.totalImages === 0 && stats.totalVideos === 0 && stats.totalCats === 0 && stats.totalContacts === 0 && stats.totalPoints === 0 && (
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '1rem',
            marginTop: '1rem',
            color: '#92400e'
          }}>
            📊 No data found.
            <a
              href="/admin/seed-data"
              style={{
                color: '#92400e',
                textDecoration: 'underline',
                marginLeft: '0.5rem'
              }}
            >
              Seed database with sample data
            </a>
          </div>
        )}
      </div>

      {/* Quick Stats - 6 Tiles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {/* Images Tile */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🖼️</div>
          <h3 style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }}>Images</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            {loading ? 'Loading...' : stats.totalImages}
          </p>
          {!loading && stats.totalImages > 0 && (
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
              {stats.taggedImages} tagged
            </p>
          )}
        </div>

        {/* Videos Tile */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎥</div>
          <h3 style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }}>Videos</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            {loading ? 'Loading...' : stats.totalVideos}
          </p>
          {!loading && stats.totalVideos > 0 && (
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
              {stats.taggedVideos} tagged
            </p>
          )}
        </div>

        {/* Cats Tile */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🐱</div>
          <h3 style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }}>Cat Profiles</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            {loading ? 'Loading...' : stats.totalCats}
          </p>
        </div>

        {/* Contacts Tile */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📧</div>
          <h3 style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }}>Contacts</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            {loading ? 'Loading...' : stats.totalContacts}
          </p>
        </div>

        {/* Points Tile */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>�</div>
          <h3 style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }}>Points</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            {loading ? 'Loading...' : stats.totalPoints}
          </p>
        </div>

        {/* Posts Tile */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '2rem' }}>📝</div>
            <button
              onClick={() => setShowPostsConfig(!showPostsConfig)}
              style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                color: '#374151',
                cursor: 'pointer'
              }}
              title="Configure post collections"
            >
              ⚙️ Config
            </button>
          </div>
          <h3 style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }}>Posts</h3>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            {loading ? 'Loading...' : stats.postsCollections.length}
          </div>
          {!loading && stats.postsCollections.length > 0 && (
            <div style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
              {stats.postsCollections.map(collection => (
                <div key={collection.name} style={{ margin: '0.125rem 0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{collection.name.replace('posts_', '')}</span>
                  <span style={{ fontWeight: 'bold' }}>{collection.count}</span>
                </div>
              ))}
            </div>
          )}
          {!loading && stats.postsCollections.length === 0 && (
            <p style={{ fontSize: '0.75rem', color: '#ef4444', margin: '0.25rem 0 0 0' }}>
              No collections configured
            </p>
          )}
        </div>
      </div>

      {/* Posts Collections Configuration Panel */}
      {showPostsConfig && (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginBottom: '2rem'
        }}>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            📝 Configure Posts Collections
          </h3>
          <p style={{
            color: '#6b7280',
            fontSize: '0.9rem',
            marginBottom: '1rem',
            lineHeight: '1.4'
          }}>
            Specify which Firestore collections should be considered "posts" collections.
            Enter one collection name per line. The dashboard will show document counts for each collection.
          </p>

          <div style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            padding: '0.75rem',
            marginBottom: '1rem',
            fontSize: '0.8rem',
            color: '#374151'
          }}>
            <strong>Example:</strong><br/>
            <code style={{ fontFamily: 'monospace', backgroundColor: '#f3f4f6', padding: '0.125rem 0.25rem', borderRadius: '3px' }}>
              posts_main<br/>
              posts_feeding<br/>
              posts_announcements<br/>
              posts_events
            </code>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.9rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Collection Names (one per line):
            </label>
            <textarea
              value={postsCollectionNames}
              onChange={(e) => setPostsCollectionNames(e.target.value)}
              placeholder="posts_main&#10;posts_feeding&#10;posts_announcements"
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontFamily: 'monospace',
                resize: 'vertical',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={async () => {
                setConfigLoading(true);
                setConfigSuccess(false);
                try {
                  const saved = savePostsCollectionConfig(postsCollectionNames);
                  if (!saved) {
                    throw new Error('Failed to save configuration');
                  }

                  // Re-fetch stats with new configuration
                  const collectionNames = postsCollectionNames
                    .split('\n')
                    .map(name => name.trim())
                    .filter(name => name.length > 0);

                  if (collectionNames.length === 0) {
                    throw new Error('Please specify at least one collection name');
                  }

                  const newPostsCollections = await getConfiguredPostsCollections(collectionNames);

                  setStats(prev => ({
                    ...prev,
                    postsCollections: newPostsCollections
                  }));

                  setConfigSuccess(true);
                  setTimeout(() => {
                    setShowPostsConfig(false);
                    setConfigSuccess(false);
                  }, 1000);
                } catch (error) {
                  console.error('Failed to update posts collections config:', error);
                  alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                } finally {
                  setConfigLoading(false);
                }
              }}
              disabled={configLoading}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: configLoading ? '#9ca3af' : configSuccess ? '#10b981' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: '500',
                cursor: configLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {configLoading ? 'Saving...' : configSuccess ? '✓ Saved!' : 'Save & Refresh'}
            </button>

            <button
              onClick={() => {
                setShowPostsConfig(false);
                // Reset to saved config
                loadPostsCollectionConfig();
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <div style={{
              fontSize: '0.8rem',
              color: '#6b7280',
              marginLeft: 'auto'
            }}>
              Configuration saved to browser storage
            </div>
          </div>
        </div>
      )}

      {/* Main Actions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <a
          href="/admin/tag-images"
          style={{
            display: 'block',
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            border: '1px solid #e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🖼️</div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            Tag Images
          </h3>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Add tags and metadata to cat images
          </p>
        </a>

        <a
          href="/admin/tag-videos"
          style={{
            display: 'block',
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            border: '1px solid #e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎥</div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            Tag Videos
          </h3>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Add tags and metadata to cat videos
          </p>
        </a>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { ref, listAll } from 'firebase/storage';
import { db, storage } from '@/services/firebase';

interface AdminStats {
  totalImages: number;
  totalVideos: number;
  totalCats: number;
  taggedItems: number;
  storageImages: number;
  untaggedImages: number;
}

export default function AdminDashboard() {  const [stats, setStats] = useState<AdminStats>({
    totalImages: 0,
    totalVideos: 0,
    totalCats: 0,
    taggedItems: 0,
    storageImages: 0,
    untaggedImages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);        console.log('Fetching stats from Firestore and Storage...');

        // Fetch counts from Firestore collections AND Firebase Storage
        const [imagesSnapshot, videosSnapshot, catsSnapshot, storageResult] = await Promise.all([
          getDocs(query(collection(db, 'images'))),
          getDocs(query(collection(db, 'videos'))),
          getDocs(query(collection(db, 'cats'))),
          listAll(ref(storage, 'images/')).catch(() => ({ items: [] })) // Graceful fallback
        ]);

        console.log('Firestore results:', {
          images: imagesSnapshot.size,
          videos: videosSnapshot.size,
          cats: catsSnapshot.size,
          storageFiles: storageResult.items.length
        });

        // Count tagged items (images and videos with tags)
        const taggedImages = imagesSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.tags && data.tags.length > 0;
        }).length;

        const taggedVideos = videosSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.tags && data.tags.length > 0;
        }).length;

        const storageImageCount = storageResult.items.length;
        const firestoreImageCount = imagesSnapshot.size;
        const untaggedCount = Math.max(0, storageImageCount - taggedImages);

        setStats({
          totalImages: Math.max(firestoreImageCount, storageImageCount), // Use the higher count
          totalVideos: videosSnapshot.size,
          totalCats: catsSnapshot.size,
          taggedItems: taggedImages + taggedVideos,
          storageImages: storageImageCount,
          untaggedImages: untaggedCount,
        });

        console.log('Stats updated successfully');
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
        </p>        {error && (
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

        {!error && !loading && stats.totalImages === 0 && stats.totalVideos === 0 && stats.totalCats === 0 && (
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

      {/* Quick Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🖼️</div>
          <h3 style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }}>Images in Storage</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            {loading ? 'Loading...' : stats.storageImages}
          </p>
          {!loading && stats.storageImages > 0 && (
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
              {stats.totalImages} with metadata
            </p>
          )}
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>�️</div>
          <h3 style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }}>Tagged Items</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            {loading ? 'Loading...' : stats.taggedItems}
          </p>
          {!loading && stats.untaggedImages > 0 && (
            <p style={{ fontSize: '0.75rem', color: '#f59e0b', margin: '0.25rem 0 0 0' }}>
              {stats.untaggedImages} untagged images
            </p>
          )}
        </div>

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
      </div>

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

      {/* Navigation Links */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{
          fontSize: '1.1rem',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '1rem'
        }}>
          Quick Links
        </h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <a href="/" style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}>
            🏠 Main Site
          </a>
          <a href="/admin/simple-test" style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}>
            🧪 Simple Test
          </a>
          <a href="/admin/minimal" style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}>
            ⚡ Minimal Test
          </a>
          <a href="/admin/seed-data" style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#fef3c7',
            color: '#92400e',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '0.9rem',
            border: '1px solid #f59e0b'
          }}>
            🌱 Seed Data
          </a>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/services/firebase';
import PostItem from '@/components/PostItem';
import { User } from 'firebase/auth';
import Link from 'next/link';

const ButlerStream = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        router.push(`/pages/login?redirect=/pages/butler_stream`);
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (isAuthenticated) {
      const stored = localStorage.getItem('butler_stream_posts');
      setPosts(stored ? JSON.parse(stored) : []);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null; // Prevent rendering until authentication is confirmed
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Butler Stream</h1>
      <button
        onClick={() => router.push('/pages/butler_stream/new')}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Create New Post
      </button>
      <div className="space-y-4">
        {posts.length === 0 && <div>No posts yet.</div>}
        {posts.map((post) => (
          <div key={post.id} className="border p-4 rounded flex items-start space-x-4">
            <div className="flex-shrink-0">
              {post.thumbnailUrl && (
                <img
                  src={post.thumbnailUrl}
                  alt="Thumbnail"
                  className="w-32 h-32 rounded"
                />
              )}
            </div>
            <div className="flex-grow">
              <Link
                href={`/pages/posts/${post.id}`}
                className="text-xl font-bold mb-2 block"
              >
                {post.title}
              </Link>
              <p className="text-gray-700 mb-2">{post.message}</p>
              <div className="flex space-x-2">
                {post.mediaType === 'video' && <span>🎥</span>}
                {post.mediaType === 'image' && <span>📷</span>}
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>{post.username}</p>
              <p>
                {post.date} {post.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ButlerStream;
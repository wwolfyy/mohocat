'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PostItem from '@/components/PostItem';

const ButlerStream = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Simulate fetching posts from localStorage or API
    const stored = localStorage.getItem('butler_stream_posts');
    setPosts(stored ? JSON.parse(stored) : []);
  }, []);

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
          <PostItem key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
};

export default ButlerStream;
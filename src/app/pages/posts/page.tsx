import { useEffect, useState } from 'react';
import Link from 'next/link';

const PostsPage = () => {
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('butler_stream_posts');
    setPosts(stored ? JSON.parse(stored) : []);
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Posts</h1>
      <div className="space-y-4">
        {posts.length === 0 && <div>No posts available.</div>}
        {posts.map((post) => (
          <div key={post.id} className="border p-4 rounded">
            <h2 className="text-xl font-semibold">{post.title}</h2>
            <p>{post.message}</p>
            <Link href={`/pages/posts/${post.id}`}>
              <a className="text-blue-500 underline">View Details</a>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PostsPage;

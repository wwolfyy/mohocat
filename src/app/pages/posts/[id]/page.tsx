'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';

const PostDetailsPage = () => {
  const [post, setPost] = useState<any | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPost = async () => {
      const id = window.location.pathname.split('/').pop();
      if (!id) return;

      try {
        const postDoc = await getDoc(doc(db, 'posts_feeding', id));
        if (postDoc.exists()) {
          setPost(postDoc.data());
        } else {
          setPost(null);
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        setPost(null);
      }
    };

    fetchPost();
  }, []);

  if (!post) {
    return <div className="p-4">Post not found.</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{post.title}</h1>
      <p>{post.message}</p>
      {post.mediaType === 'video' && (
        <div>
          <h2 className="text-xl font-semibold">Video:</h2>
          <a href={post.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
            Watch Video
          </a>
        </div>
      )}
      {post.mediaType === 'image' && (
        <div>
          <h2 className="text-xl font-semibold">Images:</h2>
          <div className="space-y-2">
            {post.imageUrls.map((url: string, index: number) => (
              <img key={index} src={url} alt={`Image ${index + 1}`} className="w-full rounded" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PostDetailsPage;

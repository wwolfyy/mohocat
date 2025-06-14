import React from 'react';
import Link from 'next/link';

interface Post {
  id: string;
  title: string;
  message: string;
  thumbnailUrl?: string;
  mediaType?: 'video' | 'image';
  videoUrl?: string;
  imageUrls?: string[];
  username: string;
  date: string;
  time: string;
}

interface PostListProps {
  posts: Post[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const PostList: React.FC<PostListProps> = ({ posts, currentPage, totalPages, onPageChange }) => {
  return (
    <div>
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
                {post.mediaType === 'video' && post.videoUrl && <span>🎥</span>}
                {post.mediaType === 'image' && post.imageUrls?.length > 0 && <span>📷</span>}
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
      <div className="flex justify-center mt-4">
        {Array.from({ length: totalPages }, (_, index) => (
          <button
            key={index + 1}
            onClick={() => onPageChange(index + 1)}
            className={`px-4 py-2 mx-1 rounded ${currentPage === index + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            {index + 1}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-4">
        {currentPage > 1 && (
          <button
            onClick={() => onPageChange(currentPage - 1)}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Previous
          </button>
        )}
        {currentPage < totalPages && (
          <button
            onClick={() => onPageChange(currentPage + 1)}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default PostList;

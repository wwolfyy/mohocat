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
        {posts.length === 0 && <div>No posts yet.</div>}        {posts.map((post) => (
          <div key={post.id} className="border p-4 rounded flex items-start space-x-4">            <div className="flex-shrink-0">              {/* Show video thumbnail if video exists */}
              {post.videoUrl && (() => {
                const match = post.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
                const videoId = match ? match[1] : null;
                if (videoId) {
                  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;                  return (
                    <Link href={`/pages/posts/${post.id}`}>
                      <div className="relative cursor-pointer">
                        <img
                          src={thumbnailUrl}
                          alt="Video thumbnail"
                          className="w-20 h-15 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/default.jpg`;
                          }}
                        />
                        {/* Play button overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-red-600 text-white rounded-full p-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                }
                return null;
              })()}              {/* Show image thumbnail only if no video exists */}
              {!post.videoUrl && post.thumbnailUrl && (
                <Link href={`/pages/posts/${post.id}`}>
                  <img
                    src={post.thumbnailUrl}
                    alt="Image thumbnail"
                    className="w-20 h-15 object-cover rounded cursor-pointer"
                  />
                </Link>
              )}
            </div>
            <div className="flex-grow">
              <Link
                href={`/pages/posts/${post.id}`}
                className="text-xl font-bold mb-2 block flex items-center space-x-2"
              >
                {post.title}
              </Link>
              <p className="text-gray-700 mb-2">{post.message}</p>
            </div>
            <div className="text-right text-sm text-gray-500 flex flex-col items-end">
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
      </div>      <div className="flex justify-between mt-4">
        <div>
          {currentPage > 1 && (
            <button
              onClick={() => onPageChange(currentPage - 1)}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              Previous
            </button>
          )}
        </div>
        <div>
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
    </div>
  );
};

export default PostList;

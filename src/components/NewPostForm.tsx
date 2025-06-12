import React, { useState } from 'react';
import { uploadVideoToYoutubeClient } from '@/utils/uploadToYoutubeClient';
import { uploadImageToFirebase } from '@/services/firebase';
import { v4 as uuidv4 } from 'uuid';

const NewPostForm = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setVideoFile(event.target.files[0]);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setImageFiles(Array.from(event.target.files));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setUploading(true);
    let videoUrl = '';
    let videoThumb = '';
    let imageUrls: string[] = [];
    let mediaType: 'video' | 'image' = 'image';
    try {
      if (videoFile) {
        // Upload video to YouTube via server-side API
        const { videoId } = await uploadVideoToYoutubeClient(videoFile, title, message);
        videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        videoThumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        mediaType = 'video';
      }
      if (imageFiles.length > 0) {
        // Upload all images, get URLs
        imageUrls = await Promise.all(imageFiles.map(uploadImageToFirebase));
        if (!videoThumb && imageUrls.length > 0) {
          videoThumb = imageUrls[0];
        }
      }
      // Save post to localStorage (simulate backend)
      const now = new Date();
      const post = {
        id: uuidv4(),
        title,
        username: 'anonymous',
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        thumbnailUrl: videoThumb,
        mediaType,
        videoUrl,
        imageUrls,
        message,
      };
      const stored = localStorage.getItem('butler_stream_posts');
      const posts = stored ? JSON.parse(stored) : [];
      posts.unshift(post);
      localStorage.setItem('butler_stream_posts', JSON.stringify(posts));
      // Reset form
      setVideoFile(null);
      setImageFiles([]);
      setTitle('');
      setMessage('');
      alert('Post created!');
    } catch (error) {
      console.error('Error uploading post:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-semibold">Title:</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className="border p-2 rounded w-full"
        />
      </div>
      <div>
        <label className="block font-semibold">Upload Video:</label>
        <input type="file" accept="video/*" onChange={handleVideoChange} />
      </div>
      <div>
        <label className="block font-semibold">Upload Images:</label>
        <input type="file" accept="image/*" multiple onChange={handleImageChange} />
      </div>
      <div>
        <label className="block font-semibold">Message:</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="w-full border rounded p-2"
          rows={4}
        />
      </div>
      <button type="submit" disabled={uploading} className="bg-blue-500 text-white p-2 rounded">
        {uploading ? 'Uploading...' : 'Create Post'}
      </button>
    </form>
  );
};

export default NewPostForm;
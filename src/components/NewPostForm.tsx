import React, { useState } from 'react';
import { db } from '@/services/firebase';
import { useRouter } from 'next/navigation';
import { collection, addDoc } from 'firebase/firestore';

const NewPostForm = () => {
  const router = useRouter();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setVideoFile(file);
    } else {
      setVideoFile(null);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setImageFiles(Array.from(event.target.files));
    }
  };

  const uploadImagesWithSignedUrls = async (files: File[]): Promise<string[]> => {
    const urls = await Promise.all(
      files.map(async file => {
        const response = await fetch('/api/generate-signed-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileName: file.name, fileType: file.type }),
        });

        if (!response.ok) {
          throw new Error('Failed to get signed URL');
        }

        const { signedUrl, publicUrl } = await response.json();

        await fetch(signedUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          body: file,
        });        return publicUrl;
      })
    );
    return urls;
  };

  const uploadVideoToYouTube = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title);
    formData.append('description', 'Uploaded via Mountain Cats app');

    try {
      const response = await fetch('/api/upload-youtube', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (!result.videoUrl) {
        throw new Error('No video URL returned from upload');
      }

      return result.videoUrl;
    } catch (error) {
      throw error;
    }
  };  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setUploading(true);

    try {
      let videoUrl = '';
      let videoThumb = '';
      let imageUrls: string[] = [];
      let mediaType: 'video' | 'image' = 'image';

      // Upload video first if present (this takes longer)
      if (videoFile) {
        try {
          videoUrl = await uploadVideoToYouTube(videoFile);
          mediaType = 'video';
        } catch (videoError) {
          alert('Video upload failed: ' + (videoError instanceof Error ? videoError.message : 'Unknown error'));
          return;
        }
      }

      // Upload images
      if (imageFiles.length > 0) {
        try {
          imageUrls = await uploadImagesWithSignedUrls(imageFiles);
          if (!videoThumb && imageUrls.length > 0) {
            videoThumb = imageUrls[0];
          }
        } catch (imageError) {
          alert('Image upload failed: ' + (imageError instanceof Error ? imageError.message : 'Unknown error'));
          return;
        }
      }      // Only proceed with post creation if uploads succeeded
      const now = new Date();
      const thumbnailUrl = videoThumb || (imageUrls.length > 0 ? imageUrls[0] : '');

      const post = {
        title,
        username: 'anonymous',
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        thumbnailUrl,
        mediaType,
        videoUrl,
        imageUrls,
        message,
      };

      // Validate that we have the expected content
      if (videoFile && !videoUrl) {
        throw new Error('Video file was selected but no video URL was generated');
      }

      await addDoc(collection(db, 'posts_feeding'), post);

      setVideoFile(null);
      setImageFiles([]);
      setTitle('');
      setMessage('');
      alert('Post created successfully!');

      // Redirect to the butler_stream page
      router.push('/pages/butler_stream');
    } catch (error) {
      alert('Error creating post: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setUploading(false);
    }  };

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
      </div>      <button
        type="submit"
        disabled={uploading}
        className="bg-blue-500 text-white p-2 rounded disabled:opacity-50"
      >
        {uploading ? 'Uploading... Please wait' : 'Create Post'}
      </button>
      {uploading && (
        <p className="text-sm text-gray-600 mt-2">
          {videoFile ? 'Uploading video to YouTube... This may take a few minutes.' : 'Uploading images...'}
        </p>
      )}
    </form>
  );
};

export default NewPostForm;
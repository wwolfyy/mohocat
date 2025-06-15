import React, { useState } from 'react';
import { db } from '@/services/firebase';
import { useRouter } from 'next/navigation';
import { collection, addDoc } from 'firebase/firestore';
import { cn } from '@/utils/cn';

const NewPostForm = () => {
  const router = useRouter();
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setVideoFiles(Array.from(event.target.files));
    } else {
      setVideoFiles([]);
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
  };

  const uploadVideosToYouTube = async (files: File[]): Promise<string[]> => {
    const urls = await Promise.all(
      files.map(async (file, index) => {
        const formData = new FormData();
        formData.append('video', file);
        formData.append('title', `${title} ${files.length > 1 ? `(Part ${index + 1})` : ''}`);
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
      })
    );
    return urls;
  };  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setUploading(true);

    try {
      let videoUrls: string[] = [];
      let videoThumb = '';
      let imageUrls: string[] = [];
      let mediaType: 'video' | 'image' = 'image';

      // Upload videos first if present (this takes longer)
      if (videoFiles.length > 0) {
        try {
          videoUrls = await uploadVideosToYouTube(videoFiles);
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
      }

      // Only proceed with post creation if uploads succeeded
      const now = new Date();
      const thumbnailUrl = videoThumb || (imageUrls.length > 0 ? imageUrls[0] : '');

      const post = {
        title,
        username: 'anonymous',
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        thumbnailUrl,
        mediaType,
        videoUrls,
        imageUrls,
        message,
      };

      // Validate that we have the expected content
      if (videoFiles.length > 0 && videoUrls.length === 0) {
        throw new Error('Video files were selected but no video URLs were generated');
      }

      await addDoc(collection(db, 'posts_feeding'), post);

      setVideoFiles([]);
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
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-semibold">제목:</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className="border p-2 rounded w-full"
        />
      </div>      <div>
        <label className="block font-semibold">동영상 업로드:</label>
        <input type="file" accept="video/*" multiple onChange={handleVideoChange} />
      </div>
      <div>
        <label className="block font-semibold">사진 업로드:</label>
        <input type="file" accept="image/*" multiple onChange={handleImageChange} />
      </div>
      <div>
        <label className="block font-semibold">내용:</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="w-full border rounded p-2"
          rows={4}
        />
      </div>      <button
        type="submit"
        disabled={uploading}
        className={cn(
          "w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-300",
          "text-black rounded-lg font-bold hover:shadow-lg transition-all duration-200",
          uploading && "opacity-50 cursor-not-allowed"
        )}
      >
        {uploading ? '새글 작성 중...' : '작성 완료'}
      </button>
      {uploading && (        <p className="text-sm text-gray-600 mt-2">
          {videoFiles.length > 0 ? 'Uploading videos to YouTube... This may take a few minutes.' : 'Uploading images...'}
        </p>
      )}
    </form>
  );
};

export default NewPostForm;
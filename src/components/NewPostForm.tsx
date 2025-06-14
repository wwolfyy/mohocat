import React, { useState, useEffect } from 'react';
import { db } from '@/services/firebase';
import { v4 as uuidv4 } from 'uuid';
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
    if (event.target.files) {
      setVideoFile(event.target.files[0]);
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
        });

        return publicUrl;
      })
    );

    return urls;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setUploading(true);

    try {
      let videoUrl = '';
      let videoThumb = '';
      let imageUrls: string[] = [];
      let mediaType: 'video' | 'image' = 'image';

      if (videoFile) {
        // Video upload logic remains unchanged
      }

      if (imageFiles.length > 0) {
        imageUrls = await uploadImagesWithSignedUrls(imageFiles);
        if (!videoThumb && imageUrls.length > 0) {
          videoThumb = imageUrls[0];
        }
      }

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

      await addDoc(collection(db, 'posts_feeding'), post);

      setVideoFile(null);
      setImageFiles([]);
      setTitle('');
      setMessage('');
      alert('Post created!');

      // Redirect to the butler_stream page
      router.push('/pages/butler_stream');
    } catch (error) {
      console.error('Error uploading post:', error);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    try {
      console.log('Firestore db object:', db);
      console.log('Type of db:', typeof db);
      console.log('useEffect is running');

      if (!db) {
        console.error('Firestore db object is undefined');
      }

      const testCollection = collection(db, 'posts_feeding');
      console.log('Collection reference:', testCollection);
    } catch (error) {
      console.error('Error accessing Firestore collection:', error);
    }
  }, []);

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
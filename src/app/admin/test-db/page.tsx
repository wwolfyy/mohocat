'use client';

import { useState } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';

export default function TestDbPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testCollections = async () => {
    setLoading(true);
    try {
      // Test cat_videos collection
      const videosSnapshot = await getDocs(collection(db, 'cat_videos'));
      const videos = videosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Test cat_images collection
      const imagesSnapshot = await getDocs(collection(db, 'cat_images'));
      const images = imagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Test old collections for comparison
      const oldVideosSnapshot = await getDocs(collection(db, 'videos'));
      const oldVideos = oldVideosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const oldImagesSnapshot = await getDocs(collection(db, 'images'));
      const oldImages = oldImagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setResults([
        { collection: 'cat_videos', count: videos.length, data: videos },
        { collection: 'cat_images', count: images.length, data: images },
        { collection: 'videos (old)', count: oldVideos.length, data: oldVideos },
        { collection: 'images (old)', count: oldImages.length, data: oldImages },
      ]);    } catch (error: any) {
      console.error('Error testing collections:', error);
      setResults([{ error: error.message }]);
    } finally {
      setLoading(false);
    }
  };

  const addTestVideo = async () => {
    try {
      const testVideo = {
        videoUrl: 'https://youtube.com/test',
        fileName: 'test-video',
        storagePath: 'https://youtube.com/test',
        tags: ['test', 'admin'],
        uploadDate: new Date(),
        uploadedBy: 'admin-test',
        description: 'Test video from admin interface',
        needsTagging: false,
        videoType: 'youtube',
        youtubeId: 'test-123',
        title: 'Test Video',
      };      await addDoc(collection(db, 'cat_videos'), testVideo);
      alert('Test video added successfully!');
      testCollections(); // Refresh data
    } catch (error: any) {
      console.error('Error adding test video:', error);
      alert('Error adding test video: ' + error.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Database Collections Test</h1>

      <div className="flex gap-4 mb-6">
        <button
          onClick={testCollections}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
        >
          {loading ? 'Testing...' : 'Test Collections'}
        </button>

        <button
          onClick={addTestVideo}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Add Test Video
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-6">
          {results.map((result, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">
                {result.collection || 'Error'} ({result.count || 0} documents)
              </h3>
              {result.error ? (
                <p className="text-red-600">{result.error}</p>
              ) : (
                <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto max-h-60">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

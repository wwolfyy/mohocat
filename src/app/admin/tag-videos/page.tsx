'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { fetchChannelVideos, YouTubeVideo, batchDeleteYouTubeVideos } from '@/services/youtube';
import { Cat } from '@/types';

interface TaggedVideo extends Omit<YouTubeVideo, 'description'> {
  hasMetadata: boolean;
  firestoreId?: string;
  tags?: string[];
  description?: string;
  catName?: string;
  needsTagging?: boolean;
}

export default function TagVideosPage() {
  const [videos, setVideos] = useState<TaggedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<TaggedVideo | null>(null);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [tags, setTags] = useState<string>('');
  const [description, setDescription] = useState('');
  const [catName, setCatName] = useState('');
  const [saving, setSaving] = useState(false);
  const [batchTags, setBatchTags] = useState<string>('');
  const [batchDescription, setBatchDescription] = useState('');  const [showBatchActions, setShowBatchActions] = useState(false);  const [batchSaving, setBatchSaving] = useState(false);

  // Cat selector states
  const [cats, setCats] = useState<Cat[]>([]);
  const [showCatSelector, setShowCatSelector] = useState(false);
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [catSelectorContext, setCatSelectorContext] = useState<'individual' | 'batch'>('individual');

  useEffect(() => {
    loadVideos();
  }, []);
  const loadVideos = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading videos from channel...');

      // Get videos from YouTube channel
      console.log('Fetching channel videos...');
      const youtubeVideos = await fetchChannelVideos();

      console.log(`Fetched ${youtubeVideos.length} videos from YouTube`);

      if (youtubeVideos.length === 0) {
        setVideos([]);
        setError('No videos found in your YouTube channel. Please check your channel ID and make sure your channel has public videos.');
        return;
      }// Get existing metadata from Firestore
      const firestoreVideos = await getDocs(collection(db, 'cat_videos'));
      const metadataMap = new Map();
      firestoreVideos.docs.forEach(doc => {
        const data = doc.data();
        if (data.videoId || data.youtubeId) {
          metadataMap.set(data.videoId || data.youtubeId, { id: doc.id, ...data });
        }
      });

      // Combine YouTube videos with Firestore metadata
      const combinedVideos: TaggedVideo[] = youtubeVideos.map(video => {
        const metadata = metadataMap.get(video.id);
        return {
          ...video,
          hasMetadata: !!metadata,
          firestoreId: metadata?.id,
          tags: metadata?.tags || [],
          catName: metadata?.catName || '',
          needsTagging: !metadata || metadata.needsTagging !== false,
          description: metadata?.description || video.description,
        };
      });

      setVideos(combinedVideos);
    } catch (err) {
      console.error('Error loading videos:', err);
      let errorMessage = 'Failed to load videos';

      if (err instanceof Error) {
        if (err.message.includes('API key')) {
          errorMessage = 'YouTube API key not configured or invalid. Please check your environment variables.';
        } else if (err.message.includes('channel')) {
          errorMessage = 'YouTube channel not found or not accessible. Please check your channel ID.';
        } else if (err.message.includes('quota')) {
          errorMessage = 'YouTube API quota exceeded. Please try again later.';
        } else {
          errorMessage = `YouTube API error: ${err.message}`;
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoSelect = (video: TaggedVideo) => {
    setSelectedVideo(video);
    setTags(video.tags?.join(', ') || '');
    setDescription(video.description || '');
    setCatName(video.catName || '');
  };

  const handleCheckboxChange = (videoId: string, checked: boolean) => {
    const newSelected = new Set(selectedVideos);
    if (checked) {
      newSelected.add(videoId);
    } else {
      newSelected.delete(videoId);
    }
    setSelectedVideos(newSelected);
    setShowBatchActions(newSelected.size > 0);
  };

  const handleSave = async () => {
    if (!selectedVideo) return;

    try {
      setSaving(true);
      const tagsArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);      const videoData = {
        videoUrl: selectedVideo.videoUrl,
        fileName: selectedVideo.title, // Using title as filename for YouTube videos
        storagePath: selectedVideo.videoUrl,
        tags: tagsArray,
        uploadDate: new Date(),
        uploadedBy: 'admin',
        description: description,
        thumbnailUrl: selectedVideo.thumbnailUrl,
        duration: selectedVideo.duration,
        needsTagging: false,
        videoType: 'youtube' as const,
        // Additional YouTube-specific fields
        youtubeId: selectedVideo.id,
        title: selectedVideo.title,
        publishedAt: selectedVideo.publishedAt,
        channelTitle: selectedVideo.channelTitle,
        // Custom field for primary cat name
        catName: catName,
      };if (selectedVideo.hasMetadata && selectedVideo.firestoreId) {
        // Update existing document
        await updateDoc(doc(db, 'cat_videos', selectedVideo.firestoreId), videoData);
      } else {
        // Create new document
        await addDoc(collection(db, 'cat_videos'), videoData);
      }

      // Update local state
      setVideos(prev => prev.map(v =>
        v.id === selectedVideo.id
          ? { ...v, hasMetadata: true, tags: tagsArray, catName, description, needsTagging: false }
          : v
      ));

      setSelectedVideo(null);
      setTags('');
      setDescription('');
      setCatName('');
    } catch (err) {
      console.error('Error saving video metadata:', err);
      setError('Failed to save video metadata');
    } finally {
      setSaving(false);
    }
  };

  const handleBatchSave = async () => {
    if (selectedVideos.size === 0) return;

    try {
      setBatchSaving(true);
      const tagsArray = batchTags.split(',').map(tag => tag.trim()).filter(Boolean);

      const promises = Array.from(selectedVideos).map(async (videoId) => {
        const video = videos.find(v => v.id === videoId);
        if (!video) return;        const videoData = {
          videoUrl: video.videoUrl,
          fileName: video.title, // Using title as filename for YouTube videos
          storagePath: video.videoUrl,
          tags: tagsArray,
          uploadDate: new Date(),
          uploadedBy: 'admin',
          description: batchDescription || video.description,
          thumbnailUrl: video.thumbnailUrl,
          duration: video.duration,
          needsTagging: false,
          videoType: 'youtube' as const,
          // Additional YouTube-specific fields
          youtubeId: video.id,
          title: video.title,
          publishedAt: video.publishedAt,
          channelTitle: video.channelTitle,
          // Custom field for primary cat name
          catName: batchDescription ? '' : video.catName,
        };if (video.hasMetadata && video.firestoreId) {
          return updateDoc(doc(db, 'cat_videos', video.firestoreId), videoData);
        } else {
          return addDoc(collection(db, 'cat_videos'), videoData);
        }
      });

      await Promise.all(promises);

      // Update local state
      setVideos(prev => prev.map(v =>
        selectedVideos.has(v.id)
          ? { ...v, hasMetadata: true, tags: tagsArray, description: batchDescription || v.description, needsTagging: false }
          : v
      ));

      setSelectedVideos(new Set());
      setShowBatchActions(false);
      setBatchTags('');
      setBatchDescription('');
    } catch (err) {
      console.error('Error batch saving videos:', err);
      setError('Failed to save batch video metadata');
    } finally {
      setBatchSaving(false);
    }
  };
  const handleBatchDeleteVideos = async () => {
    if (selectedVideos.size === 0) return;    const selectedVideoList = Array.from(selectedVideos).map(id => videos.find(v => v.id === id)).filter(Boolean) as TaggedVideo[];
    const videoLinks = selectedVideoList.map(v => `• ${v.title} (youtu.be/${v.id})`).join('\n');

    if (!confirm(`Are you sure you want to PERMANENTLY DELETE ${selectedVideos.size} video(s) from YouTube AND remove their metadata from Firestore? This action cannot be undone!\n\nVideos to be deleted:\n${videoLinks}`)) {
      return;
    }

    try {
      setBatchSaving(true);
      setError(null);

      // Step 1: Attempt to delete from YouTube
      const videoIds = Array.from(selectedVideos);
      const deleteResults = await batchDeleteYouTubeVideos(videoIds);

      // Step 2: Delete Firestore metadata for all videos (regardless of YouTube deletion success)
      const firestorePromises = selectedVideoList.map(async (video) => {
        if (video?.hasMetadata && video.firestoreId) {
          return deleteDoc(doc(db, 'cat_videos', video.firestoreId));
        }
      });

      await Promise.all(firestorePromises.filter(Boolean));

      // Step 3: Update local state - remove videos that were successfully deleted from YouTube
      const successfullyDeleted = new Set(deleteResults.success);
      setVideos(prev => prev.filter(v => !successfullyDeleted.has(v.id)));

      // Step 4: Update metadata-only for videos that failed YouTube deletion
      if (deleteResults.failed.length > 0) {
        setVideos(prev => prev.map(v =>
          deleteResults.failed.includes(v.id)
            ? { ...v, hasMetadata: false, firestoreId: undefined, tags: [], catName: '', needsTagging: true }
            : v
        ));

        setError(`Note: ${deleteResults.failed.length} video(s) could not be deleted from YouTube (requires OAuth authentication), but their metadata was removed from Firestore. You may need to delete these videos manually from YouTube Studio.`);
      }

      setSelectedVideos(new Set());
      setShowBatchActions(false);

      // Show success message
      if (deleteResults.success.length > 0) {
        alert(`Successfully deleted ${deleteResults.success.length} video(s) from YouTube and removed their metadata.`);
      }
    } catch (err) {
      console.error('Error batch deleting videos:', err);
      setError('Failed to delete videos. Some videos may have been partially deleted.');
    } finally {
      setBatchSaving(false);
    }  };

  const cleanupOrphanedMetadata = async () => {
    const confirmed = confirm('This will remove any database entries for videos that no longer exist on YouTube (either because they were deleted or made private). Continue?');
    if (!confirmed) return;

    try {
      setBatchSaving(true);
      setError(null);

      // Get all metadata from Firestore
      const firestoreVideos = await getDocs(collection(db, 'cat_videos'));
      const currentVideoIds = new Set(videos.map(video => video.id));

      let cleanedCount = 0;
      for (const docSnapshot of firestoreVideos.docs) {
        const data = docSnapshot.data();
        if (data.youtubeId && !currentVideoIds.has(data.youtubeId)) {
          // This metadata has no corresponding YouTube video in current fetch
          await deleteDoc(doc(db, 'cat_videos', docSnapshot.id));
          cleanedCount++;
        }
      }

      // Reload videos to refresh the display
      await loadVideos();
      alert(`Cleanup complete! Removed ${cleanedCount} orphaned metadata entries.`);
    } catch (err: any) {
      console.error('Error cleaning up orphaned metadata:', err);
      setError('Failed to cleanup metadata: ' + err.message);
    } finally {
      setBatchSaving(false);
    }
  };

  // Load cats from Firestore
  useEffect(() => {
    loadCats();
  }, []);

  const loadCats = async () => {
    try {
      const catsSnapshot = await getDocs(collection(db, 'cats'));
      const catsData = catsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Cat[];
      setCats(catsData);
    } catch (error) {
      console.error('Error loading cats:', error);
    }
  };

  const untaggedVideos = videos.filter(v => v.needsTagging);
  const taggedVideos = videos.filter(v => !v.needsTagging);

  // Cat selector functions
  const handleCatToggle = (catId: string, catName: string) => {
    const newSelectedCats = new Set(selectedCats);
    if (newSelectedCats.has(catId)) {
      newSelectedCats.delete(catId);
    } else {
      newSelectedCats.add(catId);
    }
    setSelectedCats(newSelectedCats);

    // Update tags input with selected cat names
    const selectedCatNames = cats
      .filter(cat => newSelectedCats.has(cat.id))
      .map(cat => cat.name);
    setTags(selectedCatNames.join(', '));
  };
  const handleTagsInputClick = () => {
    setCatSelectorContext('individual');
    setShowCatSelector(true);
    // Parse existing tags to pre-select cats
    const existingTags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    const preSelectedCats = new Set<string>();
    cats.forEach(cat => {
      if (existingTags.includes(cat.name)) {
        preSelectedCats.add(cat.id);
      }
    });
    setSelectedCats(preSelectedCats);
  };

  const handleBatchTagsInputClick = () => {
    setCatSelectorContext('batch');
    setShowCatSelector(true);
    // Parse existing batch tags to pre-select cats
    const existingTags = batchTags.split(',').map(tag => tag.trim()).filter(Boolean);
    const preSelectedCats = new Set<string>();
    cats.forEach(cat => {
      if (existingTags.includes(cat.name)) {
        preSelectedCats.add(cat.id);
      }
    });
    setSelectedCats(preSelectedCats);
  };

  const handleCatToggleBatch = (catId: string, catName: string) => {
    const newSelectedCats = new Set(selectedCats);
    if (newSelectedCats.has(catId)) {
      newSelectedCats.delete(catId);
    } else {
      newSelectedCats.add(catId);
    }
    setSelectedCats(newSelectedCats);

    // Update batch tags input with selected cat names
    const selectedCatNames = cats
      .filter(cat => newSelectedCats.has(cat.id))
      .map(cat => cat.name);
    setBatchTags(selectedCatNames.join(', '));
  };

  const filteredCats = cats.filter(cat =>
    cat.name.toLowerCase().includes(catSearchQuery.toLowerCase()) ||
    cat.alt_name?.toLowerCase().includes(catSearchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Tag YouTube Videos</h1>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-lg text-gray-600">Loading videos from YouTube...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Tag YouTube Videos</h1>      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* API Configuration Status */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">YouTube API Configuration</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700">API Key:</span>{' '}
            <span className={process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ? 'text-green-600' : 'text-red-600'}>
              {process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ? '✅ Configured' : '❌ Missing'}
            </span>
          </div>
          <div>
            <span className="text-blue-700">Channel ID:</span>{' '}
            <span className={process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID ? 'text-green-600' : 'text-red-600'}>
              {process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID ? `✅ ${process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID}` : '❌ Missing'}
            </span>
          </div>
        </div>
        {(!process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || !process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID) && (
          <div className="mt-2 text-sm text-blue-700">
            <strong>Setup Required:</strong> Please configure your YouTube API credentials in the .env.local file.
          </div>        )}
      </div>      {/* Video Statistics and Cleanup */}
      <div className="mb-6">
        {/* Cleanup option */}
        <div className="mb-4 flex gap-3">
          <button
            onClick={cleanupOrphanedMetadata}
            disabled={batchSaving}
            className={`px-3 py-2 text-white text-sm rounded ${
              batchSaving
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-600 cursor-pointer'
            }`}
          >
            🧹 {batchSaving ? 'Cleaning...' : 'Cleanup Orphaned Metadata'}
          </button>

          <button
            onClick={loadVideos}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 text-sm"
          >
            {loading ? 'Loading...' : '🔄 Refresh Videos'}
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Videos</h3>
          <p className="text-3xl font-bold text-blue-600">{videos.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Untagged Videos</h3>
          <p className="text-3xl font-bold text-orange-600">{untaggedVideos.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Tagged Videos</h3>
          <p className="text-3xl font-bold text-green-600">{taggedVideos.length}</p>
        </div>
      </div>

      {/* Batch Actions */}
      {showBatchActions && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-3">
            Batch Actions ({selectedVideos.size} videos selected)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Tags (comma-separated)
              </label>
              <input
                type="text"
                value={batchTags}
                onChange={(e) => setBatchTags(e.target.value)}
                onClick={handleBatchTagsInputClick}
                placeholder="Click to select cats or type manually"
                className="border border-gray-300 rounded px-3 py-2 w-full cursor-pointer"
              />
              <button
                type="button"
                onClick={handleBatchTagsInputClick}
                className="absolute right-2 top-8 text-blue-500 hover:text-blue-700 text-sm"
              >
                🐱 Select Cats
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Description (optional)
              </label>
              <input
                type="text"
                value={batchDescription}
                onChange={(e) => setBatchDescription(e.target.value)}
                placeholder="Common description..."
                className="border border-gray-300 rounded px-3 py-2 w-full"
              />
            </div>
          </div>          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleBatchSave}
              disabled={batchSaving || !batchTags.trim()}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
            >
              {batchSaving ? 'Saving...' : 'Save Batch Tags'}
            </button>
            <button
              onClick={handleBatchDeleteVideos}
              disabled={batchSaving}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 font-semibold"
            >
              {batchSaving ? 'Deleting...' : 'Delete Videos from YouTube'}
            </button>
            <button
              onClick={() => {
                setSelectedVideos(new Set());
                setShowBatchActions(false);
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}      {videos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">
            No videos found. Check your YouTube API configuration.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video List */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">
              YouTube Videos ({videos.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className={`relative bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border-2 ${
                    selectedVideo?.id === video.id
                      ? 'border-blue-500'
                      : video.hasMetadata && !video.needsTagging
                      ? 'border-green-200'
                      : 'border-gray-200'
                  }`}
                >
                  {/* Checkbox for batch selection */}
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={selectedVideos.has(video.id)}
                      onChange={(e) => handleCheckboxChange(video.id, e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Status indicator */}
                  <div className="absolute top-2 right-2 z-10">
                    {video.hasMetadata && !video.needsTagging ? (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                        Tagged
                      </span>
                    ) : (
                      <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded">
                        Untagged
                      </span>
                    )}
                  </div>

                  <div onClick={() => handleVideoSelect(video)}>
                    {/* Video Thumbnail */}
                    <div className="relative">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-36 object-cover rounded-t-lg"                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/images/arrow_north.svg';
                        }}
                      />                      {/* Play button overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-t-lg">
                        <div className="w-8 h-6 bg-red-600 rounded flex items-center justify-center">
                          <div className="w-0 h-0 border-l-[6px] border-l-white border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent ml-0.5"></div>
                        </div>
                      </div>
                    </div>                    {/* Video Info */}
                    <div className="p-3">
                      <h3 className="font-medium text-sm line-clamp-2 mb-1">
                        {video.title}
                      </h3>
                      <p className="text-xs text-gray-500 mb-1">
                        {new Date(video.publishedAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-blue-600 mb-2 font-mono break-all">
                        youtu.be/{video.id}
                      </p>
                      {video.tags && video.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {video.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {video.tags.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{video.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tagging Panel */}
          <div className="lg:col-span-1">
            {selectedVideo ? (
              <div className="bg-white p-6 rounded-lg shadow sticky top-6">
                <h3 className="text-lg font-semibold mb-4">Tag Video</h3>

                <div className="mb-4">
                  <img
                    src={selectedVideo.thumbnailUrl}
                    alt={selectedVideo.title}
                    className="w-full h-32 object-cover rounded mb-2"
                  />                  <h4 className="font-medium text-sm line-clamp-2">
                    {selectedVideo.title}
                  </h4>
                  <p className="text-xs text-gray-500 mb-1">
                    {new Date(selectedVideo.publishedAt).toLocaleDateString()}
                  </p>
                  <div className="text-xs mb-2">
                    <span className="text-gray-500">YouTube: </span>
                    <a
                      href={`https://youtu.be/${selectedVideo.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-mono break-all"
                    >
                      youtu.be/{selectedVideo.id}
                    </a>
                  </div>
                  <a
                    href={selectedVideo.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700 text-xs"
                  >
                    View on YouTube →
                  </a>
                </div>                <div className="space-y-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      onClick={handleTagsInputClick}
                      placeholder="Click to select cats or type manually"
                      className="border border-gray-300 rounded px-3 py-2 w-full text-sm cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={handleTagsInputClick}
                      className="absolute right-2 top-8 text-blue-500 hover:text-blue-700 text-sm"
                    >
                      🐱 Select Cats
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Primary Cat Name
                    </label>
                    <input
                      type="text"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="Main cat featured"
                      className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Video description..."
                      rows={3}
                      className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 text-sm"
                    >
                      {saving ? 'Saving...' : 'Save Tags'}
                    </button>
                    <button
                      onClick={() => setSelectedVideo(null)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-6 rounded-lg text-center">
                <p className="text-gray-600">
                  Select a video to start tagging
                </p>
              </div>
            )}
          </div>        </div>
      )}

      {/* Cat Selector Modal */}
      {showCatSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 flex flex-col">            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Select Cats {catSelectorContext === 'batch' ? '(Batch Tagging)' : '(Individual Video)'}
              </h3>
              <button
                onClick={() => setShowCatSelector(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            {/* Search input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search cats..."
                value={catSearchQuery}
                onChange={(e) => setCatSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>

            {/* Cat list */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded">
              {filteredCats.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {cats.length === 0 ? 'No cats found in database' : 'No cats match your search'}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 p-4">
                  {filteredCats.map((cat) => (
                    <label
                      key={cat.id}
                      className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-50 ${
                        selectedCats.has(cat.id) ? 'bg-blue-50 border border-blue-200' : 'border border-gray-200'
                      }`}
                    >                      <input
                        type="checkbox"
                        checked={selectedCats.has(cat.id)}
                        onChange={() => catSelectorContext === 'batch'
                          ? handleCatToggleBatch(cat.id, cat.name)
                          : handleCatToggle(cat.id, cat.name)
                        }
                        className="mr-2"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{cat.name}</div>
                        {cat.alt_name && (
                          <div className="text-xs text-gray-500">({cat.alt_name})</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 mt-4">              <button
                onClick={() => {
                  setSelectedCats(new Set());
                  if (catSelectorContext === 'batch') {
                    setBatchTags('');
                  } else {
                    setTags('');
                  }
                }}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 text-sm"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowCatSelector(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                Done ({selectedCats.size} selected)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

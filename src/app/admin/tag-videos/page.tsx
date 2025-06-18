'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { fetchChannelVideos, YouTubeVideo } from '@/services/youtube';
import { Cat } from '@/types';

interface TaggedVideo extends Omit<YouTubeVideo, 'description'> {
  hasMetadata: true; // Always true now - all videos have metadata entries
  firestoreId: string; // Always present now
  tags: string[]; // Always present, can be empty array
  description: string; // Always present, can be empty string
  catName: string; // Always present, can be empty string
  needsTagging: boolean; // Always present
  createdTime?: Date | { seconds: number } | any; // Firebase Timestamp or Date
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
  const [catSelectorContext, setCatSelectorContext] = useState<'individual' | 'batch'>('individual');  // Filter states
  const [showTaggedVideos, setShowTaggedVideos] = useState(true);
  const [showUntaggedVideos, setShowUntaggedVideos] = useState(true);
  const [showVideosWithoutTimestamp, setShowVideosWithoutTimestamp] = useState(true);
  const [enableDateFilter, setEnableDateFilter] = useState(false);
  const [dateFilterFrom, setDateFilterFrom] = useState('');
  const [dateFilterTo, setDateFilterTo] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [videosPerPage, setVideosPerPage] = useState(25);

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
      }      // Get existing metadata from Firestore
      const firestoreVideos = await getDocs(collection(db, 'cat_videos'));
      const metadataMap = new Map();
      firestoreVideos.docs.forEach(doc => {
        const data = doc.data();
        if (data.videoId || data.youtubeId) {
          metadataMap.set(data.videoId || data.youtubeId, { id: doc.id, ...data });
        }
      });

      // Create Firestore entries for any YouTube videos that don't have them yet
      const videosToCreate = [];
      for (const video of youtubeVideos) {
        if (!metadataMap.has(video.id)) {          const videoData = {
            videoUrl: video.videoUrl,
            fileName: video.title,
            storagePath: video.videoUrl,
            tags: [],
            uploadDate: new Date(),
            uploadedBy: 'admin',
            description: video.description || '',
            thumbnailUrl: video.thumbnailUrl,
            duration: video.duration,
            needsTagging: true,
            videoType: 'youtube' as const,
            youtubeId: video.id,            title: video.title,
            publishedAt: video.publishedAt,
            recordingDate: video.recordingDate || null,
            channelTitle: video.channelTitle,
            catName: '',
            createdTime: null, // Leave empty for manual entry
          };
          videosToCreate.push({ videoId: video.id, data: videoData });
        }
      }

      // Batch create missing entries
      const createPromises = videosToCreate.map(async ({ videoId, data }) => {
        const docRef = await addDoc(collection(db, 'cat_videos'), data);
        return { videoId, id: docRef.id, ...data };
      });

      const createdEntries = await Promise.all(createPromises);

      // Add newly created entries to metadata map
      createdEntries.forEach(entry => {
        metadataMap.set(entry.videoId, entry);
      });

      console.log(`Created ${createdEntries.length} new cat_videos entries`);
      console.log(`All ${youtubeVideos.length} YouTube videos now have metadata entries in Firestore (consistent with cat_images collection)`);      // Combine YouTube videos with Firestore metadata (now all videos have metadata)
      const combinedVideos: TaggedVideo[] = youtubeVideos.map(video => {
        const metadata = metadataMap.get(video.id);
        return {
          ...video,
          hasMetadata: true, // Now all videos have metadata
          firestoreId: metadata!.id, // Safe to use ! since we created all missing entries
          tags: metadata?.tags || [],
          catName: metadata?.catName || '',
          needsTagging: metadata?.needsTagging !== false,
          description: metadata?.description || video.description || '',
          createdTime: metadata?.createdTime || null,
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
    setTags(video.tags.join(', '));
    setDescription(video.description);
    setCatName(video.catName);
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

  const selectAllVideos = () => {
    const currentlyVisibleVideos = new Set(filteredVideos.map(video => video.id));
    const selectedFromVisible = new Set(Array.from(selectedVideos).filter(id => currentlyVisibleVideos.has(id)));

    if (selectedFromVisible.size === filteredVideos.length) {
      // Deselect all visible videos
      const newSelection = new Set(Array.from(selectedVideos).filter(id => !currentlyVisibleVideos.has(id)));
      setSelectedVideos(newSelection);
      setShowBatchActions(newSelection.size > 0);
    } else {
      // Select all visible videos
      const newSelection = new Set([...Array.from(selectedVideos), ...filteredVideos.map(video => video.id)]);
      setSelectedVideos(newSelection);
      setShowBatchActions(true);
    }
  };

  const clearSelection = () => {
    setSelectedVideos(new Set());
    setShowBatchActions(false);
    setBatchTags('');
    setBatchDescription('');
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
        createdTime: selectedVideo.createdTime || null, // Preserve existing or leave null
        uploadedBy: 'admin',
        description: description,
        thumbnailUrl: selectedVideo.thumbnailUrl,
        duration: selectedVideo.duration,
        needsTagging: false, // Mark as tagged
        videoType: 'youtube' as const,
        // Additional YouTube-specific fields
        youtubeId: selectedVideo.id,        title: selectedVideo.title,
        publishedAt: selectedVideo.publishedAt,
        recordingDate: selectedVideo.recordingDate || null,
        channelTitle: selectedVideo.channelTitle,
        // Custom field for primary cat name
        catName: catName,
      };

      // All videos now have metadata entries, so we always update existing documents
      if (selectedVideo.firestoreId) {
        await updateDoc(doc(db, 'cat_videos', selectedVideo.firestoreId), videoData);
      } else {
        throw new Error('Video metadata entry not found - this should not happen');
      }      // Update local state
      setVideos(prev => prev.map(v =>
        v.id === selectedVideo.id
          ? { ...v, tags: tagsArray, catName, description, needsTagging: false }
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
          createdTime: video.createdTime || null, // Preserve existing or leave null
          uploadedBy: 'admin',
          description: batchDescription || video.description,
          thumbnailUrl: video.thumbnailUrl,
          duration: video.duration,
          needsTagging: false,
          videoType: 'youtube' as const,
          // Additional YouTube-specific fields
          youtubeId: video.id,          title: video.title,
          publishedAt: video.publishedAt,
          recordingDate: video.recordingDate || null,
          channelTitle: video.channelTitle,
          // Custom field for primary cat name
          catName: batchDescription ? '' : video.catName,
        };

        // All videos now have metadata entries, so we always update existing documents
        if (video.firestoreId) {
          return updateDoc(doc(db, 'cat_videos', video.firestoreId), videoData);
        } else {
          throw new Error(`Video metadata entry not found for ${video.id} - this should not happen`);
        }
      });

      await Promise.all(promises);      // Update local state
      setVideos(prev => prev.map(v =>
        selectedVideos.has(v.id)
          ? { ...v, tags: tagsArray, description: batchDescription || v.description, needsTagging: false }
          : v
      ));

      setSelectedVideos(new Set());
      setShowBatchActions(false);
      setBatchTags('');
      setBatchDescription('');
    } catch (err) {
      console.error('Error batch saving videos:', err);
      setError('Failed to save batch video metadata');    } finally {
      setBatchSaving(false);
    }
  };

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
  const taggedVideos = videos.filter(v => !v.needsTagging);  // Apply filters to get displayed videos
  const filteredVideos = videos.filter(video => {
    // Tag filtering
    if (video.needsTagging && !showUntaggedVideos) return false;
    if (!video.needsTagging && !showTaggedVideos) return false;

    // Date filtering (only if enabled)
    if (enableDateFilter) {
      const recordingDate = video.recordingDate;

      // Handle videos without recording date
      if (!recordingDate) {
        if (!showVideosWithoutTimestamp) return false;
      } else {
        // Apply date range filters if they are set
        if (dateFilterFrom && recordingDate < dateFilterFrom) return false;
        if (dateFilterTo && recordingDate > dateFilterTo) return false;
      }
    }    return true;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredVideos.length / videosPerPage);
  const startIndex = (currentPage - 1) * videosPerPage;
  const endIndex = startIndex + videosPerPage;
  const paginatedVideos = filteredVideos.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [showTaggedVideos, showUntaggedVideos, showVideosWithoutTimestamp, enableDateFilter, dateFilterFrom, dateFilterTo]);

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
  const removeTag = async (tagToRemove: string) => {
    const currentTags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    const updatedTags = currentTags.filter(tag => tag !== tagToRemove);
    const newTagsString = updatedTags.join(', ');
    setTags(newTagsString);

    // Auto-save the changes if we have a selected video
    if (selectedVideo) {
      try {
        const videoData = {
          videoUrl: selectedVideo.videoUrl,
          fileName: selectedVideo.title,
          storagePath: selectedVideo.videoUrl,
          tags: updatedTags,
          uploadDate: new Date(),
          createdTime: selectedVideo.createdTime || null,
          uploadedBy: 'admin',
          description: description,
          thumbnailUrl: selectedVideo.thumbnailUrl,
          duration: selectedVideo.duration,
          needsTagging: updatedTags.length === 0, // Mark as needs tagging if no tags
          videoType: 'youtube' as const,
          youtubeId: selectedVideo.id,
          title: selectedVideo.title,
          publishedAt: selectedVideo.publishedAt,
          recordingDate: selectedVideo.recordingDate || null,
          channelTitle: selectedVideo.channelTitle,
          catName: catName,
        };

        await updateDoc(doc(db, 'cat_videos', selectedVideo.firestoreId), videoData);

        // Update the local state to reflect the change immediately
        const updatedVideo = { ...selectedVideo, tags: updatedTags, needsTagging: updatedTags.length === 0 };
        setVideos(videos.map(v => v.id === selectedVideo.id ? updatedVideo : v));
        setSelectedVideo(updatedVideo);

      } catch (err: any) {
        console.error('Error saving after tag removal:', err);
        // Revert the local state if save failed
        setTags(tags);
      }
    }
  };

  const addTag = (newTag: string) => {
    if (!newTag.trim()) return;
    const currentTags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    if (!currentTags.includes(newTag.trim())) {
      currentTags.push(newTag.trim());
      setTags(currentTags.join(', '));
    }
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

      {/* Filter Controls */}
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter Videos</h3>

        {/* Tag Filters */}
        <div className="flex gap-6 mb-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showTaggedVideos}
              onChange={(e) => setShowTaggedVideos(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500 mr-2"
            />
            <span className="text-sm text-gray-700">
              Show Tagged Videos ({taggedVideos.length})
            </span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showUntaggedVideos}
              onChange={(e) => setShowUntaggedVideos(e.target.checked)}
              className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 mr-2"
            />
            <span className="text-sm text-gray-700">
              Show Untagged Videos ({untaggedVideos.length})
            </span>
          </label>
        </div>        {/* Date Filters */}
        <div className="border-t border-gray-300 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Filter by Recording Date</h4>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showVideosWithoutTimestamp}
                onChange={(e) => setShowVideosWithoutTimestamp(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mr-2"
              />
              <span className="text-sm text-gray-700">
                Show videos without timestamp ({videos.filter(v => !v.recordingDate).length})
              </span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableDateFilter}
                onChange={(e) => {
                  setEnableDateFilter(e.target.checked);
                  if (!e.target.checked) {
                    setDateFilterFrom('');
                    setDateFilterTo('');
                  }
                }}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 mr-2"
              />
              <span className="text-sm text-gray-700">Apply date range filter</span>
            </label>
            <div className="flex items-center gap-2">
              <label className={`text-sm ${enableDateFilter ? 'text-gray-700' : 'text-gray-400'}`}>From:</label>
              <input
                type="date"
                value={dateFilterFrom}
                onChange={(e) => setDateFilterFrom(e.target.value)}
                disabled={!enableDateFilter}
                className={`border border-gray-300 rounded px-2 py-1 text-sm ${
                  enableDateFilter ? 'bg-white' : 'bg-gray-100 text-gray-400'
                }`}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className={`text-sm ${enableDateFilter ? 'text-gray-700' : 'text-gray-400'}`}>To:</label>
              <input
                type="date"
                value={dateFilterTo}
                onChange={(e) => setDateFilterTo(e.target.value)}
                disabled={!enableDateFilter}
                className={`border border-gray-300 rounded px-2 py-1 text-sm ${
                  enableDateFilter ? 'bg-white' : 'bg-gray-100 text-gray-400'
                }`}
              />
            </div>            {enableDateFilter && (dateFilterFrom || dateFilterTo) && (
              <button
                onClick={() => {
                  setDateFilterFrom('');
                  setDateFilterTo('');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear dates
              </button>
            )}
          </div>
        </div>

        {/* Selection and Display Controls */}
        <div className="border-t border-gray-300 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Selection & Display</h4>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={selectAllVideos}
              className={`px-4 py-2 text-white rounded text-sm ${
                new Set(Array.from(selectedVideos).filter(id => filteredVideos.some(v => v.id === id))).size === filteredVideos.length
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {new Set(Array.from(selectedVideos).filter(id => filteredVideos.some(v => v.id === id))).size === filteredVideos.length ? 'Deselect All' : 'Select All'}
            </button>
            {selectedVideos.size > 0 && (
              <button
                onClick={clearSelection}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
              >
                Clear Selection ({selectedVideos.size})
              </button>
            )}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Videos per page:</label>
              <select
                value={videosPerPage}
                onChange={(e) => {
                  setVideosPerPage(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page when changing page size
                }}
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredVideos.length)} of {filteredVideos.length} videos
            </div>
          </div>
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
            </div>          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={handleBatchSave}
              disabled={batchSaving || !batchTags.trim()}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
            >
              {batchSaving ? 'Saving...' : 'Save Batch Tags'}
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
            <div className="text-sm text-gray-600 ml-4">
              💡 To delete videos, use YouTube Studio - requires OAuth authentication
            </div>
          </div>
        </div>
      )}      {videos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">
            No videos found. Check your YouTube API configuration.
          </p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">
            No videos match the current filter settings.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Try checking different filter options above.
          </p>
        </div>
      ) : (        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video List */}
          <div className="lg:col-span-2">            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {paginatedVideos.map((video) => (
                <div
                  key={video.id}                  className={`relative bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border-2 ${
                    selectedVideo?.id === video.id
                      ? 'border-blue-500'
                      : !video.needsTagging
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
                  </div>                  {/* Status indicator */}
                  <div className="absolute top-2 right-2 z-10">
                    {!video.needsTagging ? (
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
                        Published: {new Date(video.publishedAt).toLocaleDateString()}
                      </p>                      {video.recordingDate && (
                        <p className="text-xs text-gray-500 mb-1">
                          Recorded: {new Date(video.recordingDate).toLocaleDateString()}
                        </p>
                      )}                      <p className="text-xs text-gray-500 mb-1">
                        Created: {video.createdTime ?
                          new Date(video.createdTime.seconds ? video.createdTime.seconds * 1000 : video.createdTime).toLocaleDateString() :
                          'null'
                        }
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
                    </div>                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-6 gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 text-sm border rounded ${
                        currentPage === pageNum
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
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
                  </h4>                  <p className="text-xs text-gray-500 mb-1">
                    Published: {new Date(selectedVideo.publishedAt).toLocaleDateString()}
                  </p>
                  {selectedVideo.recordingDate && (
                    <p className="text-xs text-gray-500 mb-1">
                      Recorded: {new Date(selectedVideo.recordingDate).toLocaleDateString()}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mb-1">
                    Created: {selectedVideo.createdTime ?
                      new Date(selectedVideo.createdTime.seconds ? selectedVideo.createdTime.seconds * 1000 : selectedVideo.createdTime).toLocaleDateString() :
                      'null'
                    }
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
                </div>                <div className="space-y-4">                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags
                    </label>

                    {/* Display existing tags as removable buttons */}
                    {tags && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {tags.split(',').map(tag => tag.trim()).filter(Boolean).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Hidden input for maintaining the comma-separated value */}
                    <input
                      type="hidden"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />

                    {/* Click area to open cat selector */}
                    <div
                      onClick={handleTagsInputClick}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 cursor-pointer min-h-[40px] flex items-center justify-between bg-gray-50 hover:bg-gray-100"
                    >
                      <span className="text-gray-600 text-sm">
                        {tags ? 'Click to add more cats' : 'Click to select cats'}
                      </span>
                      <span className="text-blue-500 hover:text-blue-700 text-sm">
                        🐱 Select Cats
                      </span>
                    </div>
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

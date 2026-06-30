'use client';

import { useState, useEffect } from 'react';
import { getVideoService, getCatService } from '@/services';
import { Cat } from '@/types';
import { CatVideo } from '@/types/media';
import { parseRecordingDateFromTitle } from '@/utils/dateParser';
import { adminStrings } from '@/constants/adminStrings';
import Button from '@/components/ui/Button';

const { tagVideos: t } = adminStrings;

// Utility function to format duration from ISO 8601 or seconds to human-friendly format
function formatDuration(duration: number | string | undefined): string {
  if (!duration) return 'Unknown';

  let totalSeconds: number;

  if (typeof duration === 'number') {
    totalSeconds = duration;
  } else if (typeof duration === 'string') {
    // Parse ISO 8601 duration format (e.g., "PT1M30S" = 1 minute 30 seconds)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) {
      return duration; // Return original if we can't parse
    }

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    totalSeconds = hours * 3600 + minutes * 60 + seconds;
  } else {
    return 'Unknown';
  }

  // Format as HH:MM:SS, MM:SS, or SS depending on length
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${seconds}s`;
  }
}

interface AdminVideo extends CatVideo {
  // Additional admin-specific properties can be added here
  processingStatus?: 'updating' | 'deleting' | null;
}

export default function TagVideosPage() {
  // Service references
  const videoService = getVideoService();

  // State management
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<AdminVideo | null>(null);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());

  // Form states
  const [saving, setSaving] = useState(false);

  // YouTube-specific form states
  const [youtubeTitle, setYoutubeTitle] = useState<string>('');
  const [youtubeTags, setYoutubeTags] = useState<string>('');
  const [youtubeDescription, setYoutubeDescription] = useState<string>('');
  const [youtubeCreatedTime, setYoutubeCreatedTime] = useState<string>('');
  const [updatingYoutube, setUpdatingYoutube] = useState(false);

  // Batch operation states
  const [batchTags, setBatchTags] = useState<string>('');
  const [batchYoutubeCreatedTime, setBatchYoutubeCreatedTime] = useState<string>('');
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const [savingDate, setSavingDate] = useState(false);

  // Cat selector states
  const [cats, setCats] = useState<Cat[]>([]);
  const [showCatSelector, setShowCatSelector] = useState(false);
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [catSelectorContext, setCatSelectorContext] = useState<
    'batch' | 'youtube-individual' | 'youtube-batch'
  >('batch');

  // Playlist selector states
  const [allPlaylists, setAllPlaylists] = useState<
    Array<{ id: string; title: string; description: string; itemCount: number }>
  >([]);
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(new Set());
  const [playlistSelectorContext, setPlaylistSelectorContext] = useState<'individual' | 'batch'>(
    'individual'
  );
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [savingPlaylists, setSavingPlaylists] = useState(false);

  // Filter states
  const [showTaggedVideos, setShowTaggedVideos] = useState(true);
  const [showUntaggedVideos, setShowUntaggedVideos] = useState(true);
  const [showVideosWithoutTimestamp, setShowVideosWithoutTimestamp] = useState(true);
  const [enableDateFilter, setEnableDateFilter] = useState(false);
  const [dateFilterFrom, setDateFilterFrom] = useState('');
  const [dateFilterTo, setDateFilterTo] = useState('');

  // Date parsing states
  const [parsingDates, setParsingDates] = useState(false);
  const [processingVideos, setProcessingVideos] = useState<Set<string>>(new Set());

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [videosPerPage, setVideosPerPage] = useState(25);

  // Sorting states
  const [sortBy, setSortBy] = useState<'created' | 'uploaded' | 'updated'>('uploaded');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load data
  useEffect(() => {
    loadVideos();
    loadCats();
    loadPlaylists();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use service layer to get all videos
      const allVideos = await videoService.getAllVideos();

      // Convert to admin format
      const adminVideos: AdminVideo[] = allVideos.map((video) => ({
        ...video,
        processingStatus: null,
      }));

      setVideos(adminVideos);
    } catch (err: any) {
      console.error('Error loading videos:', err);
      setError(t.alerts.loadFailed(err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadCats = async () => {
    try {
      const catService = getCatService();
      const catsData = await catService.getAllCats();
      setCats(catsData);
    } catch (error) {
      console.error('Error loading cats:', error);
    }
  };

  const loadPlaylists = async () => {
    try {
      setLoadingPlaylists(true);
      console.log('Loading playlists...');

      const response = await fetch('/api/manage-playlists');
      if (!response.ok) {
        throw new Error('Failed to fetch playlists');
      }

      const data = await response.json();
      if (data.success) {
        setAllPlaylists(data.playlists);
        console.log(`Loaded ${data.playlists.length} playlists`);
      } else {
        throw new Error(data.error || 'Failed to load playlists');
      }
    } catch (error) {
      console.error('Error loading playlists:', error);
      // Don't set the main error since playlists are optional
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const selectVideo = (video: AdminVideo) => {
    setSelectedVideo(video);

    // Populate YouTube-specific fields
    setYoutubeTitle(video.title || '');
    setYoutubeTags(video.tags?.join(', ') || '');
    setYoutubeDescription(video.description || '');

    // Format recording date for YouTube field from Firestore createdTime
    let createdTimeStr = '';
    if (video.createdTime) {
      try {
        let date: Date;

        // Handle different date formats from Firestore
        if (video.createdTime instanceof Date) {
          date = video.createdTime;
        } else if (
          typeof video.createdTime === 'object' &&
          video.createdTime !== null &&
          'seconds' in video.createdTime
        ) {
          // Firebase Timestamp object
          date = new Date((video.createdTime as any).seconds * 1000);
        } else {
          // String or other format
          date = new Date(video.createdTime as any);
        }

        if (!isNaN(date.getTime())) {
          // Convert to local date string for the date input (YYYY-MM-DD format)
          createdTimeStr = date.toISOString().split('T')[0];
          console.log('Pre-populating recording date from Firestore createdTime:', createdTimeStr);
        }
      } catch (e) {
        console.warn('Error parsing createdTime from Firestore:', video.createdTime, e);
      }
    }
    setYoutubeCreatedTime(createdTimeStr);
  };

  const saveVideoMetadata = async () => {
    if (!selectedVideo) return;

    // Only handle YouTube videos for now
    if (selectedVideo.videoType !== 'youtube') {
      alert(t.alerts.onlyYoutube);
      return;
    }

    try {
      setSaving(true);
      setUpdatingYoutube(true);

      const videoId = selectedVideo.youtubeId || selectedVideo.id;

      // Prepare the updates object
      const updates: any = {};

      // Check if title has changed
      if (youtubeTitle !== selectedVideo.title) {
        updates.title = youtubeTitle;
      }

      // Check if description has changed
      if (youtubeDescription !== (selectedVideo.description || '')) {
        updates.description = youtubeDescription;
      }

      // Check if tags have changed
      const currentTags = (selectedVideo.tags || []).join(',');
      if (youtubeTags !== currentTags) {
        updates.tags = youtubeTags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean);
      }

      // Check if recording date has changed
      let currentRecordingDate = '';
      if (selectedVideo.createdTime) {
        try {
          let date: Date;
          if (selectedVideo.createdTime instanceof Date) {
            date = selectedVideo.createdTime;
          } else if (
            typeof selectedVideo.createdTime === 'object' &&
            selectedVideo.createdTime !== null &&
            'seconds' in selectedVideo.createdTime
          ) {
            // Firebase Timestamp object
            date = new Date((selectedVideo.createdTime as any).seconds * 1000);
          } else {
            // String or other format
            date = new Date(selectedVideo.createdTime as any);
          }

          if (!isNaN(date.getTime())) {
            currentRecordingDate = date.toISOString().split('T')[0];
          }
        } catch (e) {
          console.warn('Error parsing createdTime for comparison:', selectedVideo.createdTime, e);
        }
      }

      if (youtubeCreatedTime && youtubeCreatedTime !== currentRecordingDate) {
        // Convert to ISO string for YouTube API
        const createdTime = new Date(youtubeCreatedTime + 'T00:00:00.000Z');
        updates.createdTime = createdTime.toISOString();
      }

      // If no changes were made, skip the update
      if (Object.keys(updates).length === 0) {
        alert(t.alerts.noChanges);
        return;
      }

      console.log('Updating YouTube video with:', updates);

      // Step 1: Update YouTube video metadata
      const updateResponse = await fetch('/api/update-youtube-video', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: videoId,
          updates: updates,
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Failed to update YouTube video');
      }

      const updateResult = await updateResponse.json();
      console.log('YouTube update result:', updateResult);

      setUpdatingYoutube(false);

      // Step 2: Wait for YouTube API to propagate changes
      // Recording date changes can take longer to propagate than other metadata
      const waitTime = updates.createdTime ? 3000 : 3000; // 3 seconds for all metadata updates
      console.log(`Waiting ${waitTime}ms for YouTube API to propagate changes...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      // Step 3: Refresh metadata from YouTube to Firestore
      console.log('Syncing changes to Firestore...');
      const refreshPayload: any = {
        videoIds: [videoId],
      };

      // If we updated the recording date, pass the expected value for retry logic
      if (updates.createdTime) {
        refreshPayload.expectedRecordingDate = updates.createdTime;
        console.log('Expecting recording date to be:', updates.createdTime);
      }

      const refreshResponse = await fetch('/api/refresh-video-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(refreshPayload),
      });

      if (!refreshResponse.ok) {
        const errorData = await refreshResponse.json();
        throw new Error(errorData.error || 'Failed to sync changes to Firestore');
      }

      const refreshResult = await refreshResponse.json();
      console.log('Firestore sync result:', refreshResult);

      // Step 4: Update local state with the refreshed data
      await loadVideos();

      // Wait a moment for state to update, then get the fresh video data
      setTimeout(() => {
        setVideos((currentVideos) => {
          const updatedVideo = currentVideos.find((v) => v.id === selectedVideo.id);
          if (updatedVideo) {
            console.log('Updating selected video with fresh data:', updatedVideo);
            setSelectedVideo(updatedVideo);
            // Update form fields with the new data
            setYoutubeTitle(updatedVideo.title || '');
            setYoutubeDescription(updatedVideo.description || '');
            setYoutubeTags((updatedVideo.tags || []).join(','));

            // Update recording date from createdTime
            let updatedRecordingDate = '';
            if (updatedVideo.createdTime) {
              try {
                let date: Date;
                if (updatedVideo.createdTime instanceof Date) {
                  date = updatedVideo.createdTime;
                } else if (
                  typeof updatedVideo.createdTime === 'object' &&
                  updatedVideo.createdTime !== null &&
                  'seconds' in updatedVideo.createdTime
                ) {
                  // Firebase Timestamp object
                  date = new Date((updatedVideo.createdTime as any).seconds * 1000);
                } else {
                  // String or other format
                  date = new Date(updatedVideo.createdTime as any);
                }

                if (!isNaN(date.getTime())) {
                  updatedRecordingDate = date.toISOString().split('T')[0];
                }
              } catch (e) {
                console.warn('Error parsing updated createdTime:', updatedVideo.createdTime, e);
              }
            }
            setYoutubeCreatedTime(updatedRecordingDate);
          }
          return currentVideos; // Don't modify the videos array
        });
      }, 500); // Small delay to ensure state has updated

      alert(t.alerts.updated);
    } catch (err: any) {
      console.error('Error updating video metadata:', err);
      alert(t.alerts.updateFailed(err.message));
    } finally {
      setSaving(false);
      setUpdatingYoutube(false);
    }
  };

  // Removed deleteVideoAndMetadata functionality

  // Individual save functions for each field
  const batchUpdateTags = async () => {
    if (selectedVideos.size === 0 || !batchTags.trim()) return;

    try {
      setSavingTags(true);
      setError(null);

      const videoIds = Array.from(selectedVideos);
      let youtubeUpdateResults = [];

      console.log('Performing batch tags update...');
      console.log(`Processing ${videoIds.length} selected videos for tags:`, batchTags);

      for (const videoId of videoIds) {
        const video = videos.find((v) => v.id === videoId);
        if (!video) continue;

        const newTags = batchTags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean);
        const currentTags = video.tags || [];

        const tagsChanged =
          newTags.length !== currentTags.length ||
          !newTags.every((tag, index) => tag === currentTags[index]);

        if (tagsChanged) {
          try {
            const youtubeResponse = await fetch('/api/update-youtube-video', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                videoId: video.youtubeId || video.id,
                updates: { tags: newTags },
              }),
            });

            if (youtubeResponse.ok) {
              youtubeUpdateResults.push({ videoId, success: true });
              console.log(`✅ Successfully updated tags for ${video.title}`);
            } else {
              const errorData = await youtubeResponse.json();
              youtubeUpdateResults.push({
                videoId,
                success: false,
                error: errorData.error,
              });
              console.error(`❌ Failed to update tags for ${video.title}:`, errorData.error);
            }
          } catch (err) {
            youtubeUpdateResults.push({
              videoId,
              success: false,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
            console.error(`❌ Exception updating tags for ${video.title}:`, err);
          }
        }
      }

      // Sync Firestore if there were successful updates
      const successfulVideoIds = youtubeUpdateResults
        .filter((r) => r.success)
        .map((r) => r.videoId);
      if (successfulVideoIds.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for YouTube propagation

        const refreshResponse = await fetch('/api/refresh-video-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoIds: successfulVideoIds }),
        });

        if (refreshResponse.ok) {
          console.log('✅ Firestore synced with fresh YouTube metadata');
        }
      }

      // Reload videos and show results
      await loadVideos();
      const successful = youtubeUpdateResults.filter((r) => r.success).length;
      const failed = youtubeUpdateResults.filter((r) => !r.success).length;

      alert(t.alerts.batchTagsDone(successful, failed));
      setBatchTags(''); // Clear tags after successful update
    } catch (err: any) {
      console.error('Error updating tags:', err);
      setError(t.alerts.batchTagsError);
    } finally {
      setSavingTags(false);
    }
  };

  const batchUpdateDate = async () => {
    if (selectedVideos.size === 0 || !batchYoutubeCreatedTime.trim()) return;

    try {
      setSavingDate(true);
      setError(null);

      const videoIds = Array.from(selectedVideos);
      let youtubeUpdateResults = [];

      console.log('Performing batch date update...');
      console.log(
        `Processing ${videoIds.length} selected videos for date:`,
        batchYoutubeCreatedTime
      );

      for (const videoId of videoIds) {
        const video = videos.find((v) => v.id === videoId);
        if (!video) continue;

        const newCreatedTime = new Date(batchYoutubeCreatedTime).toISOString();
        const currentCreatedTime = video.createdTime || '';

        const newTimestamp = new Date(newCreatedTime).getTime();
        const currentTimestamp = currentCreatedTime ? new Date(currentCreatedTime).getTime() : 0;

        if (newTimestamp !== currentTimestamp) {
          try {
            const youtubeResponse = await fetch('/api/update-youtube-video', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                videoId: video.youtubeId || video.id,
                updates: { createdTime: newCreatedTime },
              }),
            });

            if (youtubeResponse.ok) {
              youtubeUpdateResults.push({ videoId, success: true });
              console.log(`✅ Successfully updated date for ${video.title}`);
            } else {
              const errorData = await youtubeResponse.json();
              youtubeUpdateResults.push({
                videoId,
                success: false,
                error: errorData.error,
              });
              console.error(`❌ Failed to update date for ${video.title}:`, errorData.error);
            }
          } catch (err) {
            youtubeUpdateResults.push({
              videoId,
              success: false,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
            console.error(`❌ Exception updating date for ${video.title}:`, err);
          }
        }
      }

      // Sync Firestore if there were successful updates
      const successfulVideoIds = youtubeUpdateResults
        .filter((r) => r.success)
        .map((r) => r.videoId);
      if (successfulVideoIds.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for YouTube propagation

        const refreshResponse = await fetch('/api/refresh-video-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoIds: successfulVideoIds,
            expectedRecordingDate: new Date(batchYoutubeCreatedTime).toISOString(),
          }),
        });

        if (refreshResponse.ok) {
          console.log('✅ Firestore synced with fresh YouTube metadata');
        }
      }

      // Reload videos and show results
      await loadVideos();
      const successful = youtubeUpdateResults.filter((r) => r.success).length;
      const failed = youtubeUpdateResults.filter((r) => !r.success).length;

      alert(t.alerts.batchDateDone(successful, failed));
      setBatchYoutubeCreatedTime(''); // Clear date after successful update
    } catch (err: any) {
      console.error('Error updating date:', err);
      setError(t.alerts.batchDateError);
    } finally {
      setSavingDate(false);
    }
  };

  // Removed batchDeleteVideos functionality

  const syncWithYouTube = async () => {
    if (!confirm(t.alerts.syncConfirm)) return;

    try {
      setBatchSaving(true);

      // Step 1: Discover and import new videos from YouTube
      console.log('Step 1: Discovering new videos from YouTube...');
      if (videoService && videoService.syncWithYouTube) {
        const syncResult = await videoService.syncWithYouTube();
        console.log('New video discovery complete');
      } else {
        console.log('Video service not available, skipping new video discovery');
      }

      // Step 2: Get all videos (including newly discovered ones) to collect YouTube video IDs
      const allVideos = await videoService.getAllVideos();
      const youtubeVideos = allVideos.filter((video) => video.videoType === 'youtube');
      const youtubeVideoIds = youtubeVideos
        .map((video) => video.youtubeId || video.id)
        .filter(Boolean);

      if (youtubeVideoIds.length === 0) {
        alert(t.alerts.noYoutubeToSync);
        return;
      }

      console.log(`Syncing ${youtubeVideoIds.length} YouTube videos...`);

      // Call the refresh metadata API to update all YouTube videos
      const response = await fetch('/api/refresh-video-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoIds: youtubeVideoIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refresh video metadata');
      }

      const result = await response.json();
      console.log('Metadata refresh result:', result);

      // Reload videos to get the updated data
      await loadVideos();

      alert(t.alerts.syncDone(result.updated || youtubeVideoIds.length));
    } catch (err: any) {
      console.error('Error syncing:', err);
      alert(t.alerts.syncFailed(err.message));
    } finally {
      setBatchSaving(false);
    }
  };

  // Helper functions
  const toggleVideoSelection = (videoId: string) => {
    const newSelection = new Set(selectedVideos);
    if (newSelection.has(videoId)) {
      newSelection.delete(videoId);
    } else {
      newSelection.add(videoId);
    }
    setSelectedVideos(newSelection);
    setShowBatchActions(newSelection.size > 0);
  };

  const selectAllVideos = () => {
    // Only select all visible videos (no deselect functionality)
    const newSelection = new Set([
      ...Array.from(selectedVideos),
      ...filteredVideos.map((video) => video.id),
    ]);
    setSelectedVideos(newSelection);
    setShowBatchActions(true);
  };

  const clearSelection = () => {
    setSelectedVideos(new Set());
    setShowBatchActions(false);
    setBatchTags('');
    setBatchYoutubeCreatedTime('');
    setSelectedPlaylists(new Set());
  };

  // Automatic date parsing function
  const handleAutomaticDateParsing = async () => {
    // Count videos that could benefit from date parsing
    const videosNeedingDates = videos.filter((video) => {
      const hasNoCreatedTime = !video.createdTime;
      // Try multiple sources for date parsing
      const titleSource = video.description || video.id || '';
      const couldParseDate = parseRecordingDateFromTitle(titleSource) !== null;
      return hasNoCreatedTime && couldParseDate;
    });

    if (videosNeedingDates.length === 0) {
      alert(t.alerts.noVideosNeedParsing);
      return;
    }

    const confirmed = confirm(t.alerts.autoParseConfirm(videosNeedingDates.length));

    if (!confirmed) return;

    try {
      setParsingDates(true);
      setError(null);
      setProcessingVideos(new Set()); // Clear any previous processing state

      let successCount = 0;
      let failCount = 0;
      const results = [];
      const updatedVideos = [...videos]; // Create a copy to batch updates

      console.log(`Starting automatic date parsing for ${videosNeedingDates.length} videos...`);

      for (const video of videosNeedingDates) {
        try {
          // Add video to processing set to show visual feedback
          setProcessingVideos((prev) => {
            const newSet = new Set(prev);
            newSet.add(video.id);
            return newSet;
          });

          const titleSource = video.description || video.id;
          const parsedDate = parseRecordingDateFromTitle(titleSource);
          if (parsedDate) {
            console.log(`📅 Parsing date for "${titleSource}": ${parsedDate.toISOString()}`);

            // Use service layer to update the video
            await videoService.updateVideo(video.id, {
              createdTime: parsedDate,
            });

            console.log(`✅ Database updated for ${titleSource}`);

            // Update the local copy
            const videoIndex = updatedVideos.findIndex((vid) => vid.id === video.id);
            if (videoIndex !== -1) {
              updatedVideos[videoIndex] = {
                ...updatedVideos[videoIndex],
                createdTime: parsedDate,
              };
            }

            successCount++;
            results.push({
              video: titleSource,
              date: parsedDate.toISOString().split('T')[0],
              success: true,
            });
          }

          // Remove video from processing set after completion
          setProcessingVideos((prev) => {
            const newSet = new Set(prev);
            newSet.delete(video.id);
            return newSet;
          });
        } catch (error) {
          const titleSource = video.description || video.id;
          console.error(`❌ Error processing ${titleSource}:`, error);
          failCount++;
          results.push({
            video: titleSource,
            success: false,
            error: error instanceof Error ? error.message : 'Date parsing failed',
          });

          // Remove video from processing set even on error
          setProcessingVideos((prev) => {
            const newSet = new Set(prev);
            newSet.delete(video.id);
            return newSet;
          });
        }
      }

      // Batch update the entire videos state once at the end
      setVideos(updatedVideos);

      // Show results
      let resultMessage = `${t.alerts.doneHeader}\n\n`;
      resultMessage += `${t.alerts.successLine(successCount)}\n`;
      if (failCount > 0) {
        resultMessage += `${t.alerts.failLine(failCount)}\n`;
      }
      resultMessage += t.alerts.detailsHeader;

      results.forEach((result) => {
        if (result.success) {
          resultMessage += `✅ ${result.video} → ${result.date}\n`;
        } else {
          resultMessage += `❌ ${result.video} → ${result.error}\n`;
        }
      });

      alert(resultMessage);
      console.log('📊 Date parsing completed:', {
        successCount,
        failCount,
        results,
      });
    } catch (error) {
      console.error('❌ Error during automatic date parsing:', error);
      setError(t.alerts.parseFailed(error instanceof Error ? error.message : '알 수 없는 오류'));
    } finally {
      setParsingDates(false);
      setProcessingVideos(new Set()); // Clear processing state
    }
  };

  // Cat selector functions
  const handleCatToggleBatch = (catId: string, catName: string) => {
    const newSelectedCats = new Set(selectedCats);
    if (newSelectedCats.has(catId)) {
      newSelectedCats.delete(catId);
    } else {
      newSelectedCats.add(catId);
    }
    setSelectedCats(newSelectedCats);

    // Update batch tags input with selected cat names
    const selectedCatNames = Array.from(newSelectedCats)
      .map((id) => cats.find((cat) => cat.id === id))
      .filter((cat) => cat)
      .map((cat) => cat!.name);
    setBatchTags(selectedCatNames.join(', '));
  };

  const handleBatchTagsInputClick = () => {
    setCatSelectorContext('batch');
    setShowCatSelector(true);
    // Parse existing batch tags to pre-select cats
    const existingTags = batchTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const preSelectedCats = new Set<string>();
    cats.forEach((cat) => {
      if (existingTags.includes(cat.name)) {
        preSelectedCats.add(cat.id);
      }
    });
    setSelectedCats(preSelectedCats);
  };

  // YouTube tag management functions
  const removeYoutubeTag = (tagToRemove: string) => {
    const currentTags = youtubeTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const updatedTags = currentTags.filter((tag) => tag !== tagToRemove);
    const newTagsString = updatedTags.join(', ');
    setYoutubeTags(newTagsString);
  };

  const handleYoutubeTagsInputClick = () => {
    setCatSelectorContext('youtube-individual');
    setShowCatSelector(true);
    // Parse existing YouTube tags to pre-select cats
    const existingTags = youtubeTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const preSelectedCats = new Set<string>();
    cats.forEach((cat) => {
      if (existingTags.includes(cat.name)) {
        preSelectedCats.add(cat.id);
      }
    });
    setSelectedCats(preSelectedCats);
  };

  const handleCatToggleYoutubeIndividual = (catId: string, catName: string) => {
    const newSelectedCats = new Set(selectedCats);
    if (newSelectedCats.has(catId)) {
      newSelectedCats.delete(catId);
    } else {
      newSelectedCats.add(catId);
    }
    setSelectedCats(newSelectedCats);

    // Update YouTube tags input with selected cat names
    const selectedCatNames = Array.from(newSelectedCats)
      .map((id) => cats.find((cat) => cat.id === id))
      .filter((cat) => cat)
      .map((cat) => cat!.name);
    setYoutubeTags(selectedCatNames.join(', '));
  };

  // Playlist selector handler
  const handlePlaylistSelectorClick = () => {
    setPlaylistSelectorContext('individual');
    setShowPlaylistSelector(true);
    // Pre-select playlists that the video is already in
    const videoPlaylists = selectedVideo?.allPlaylists || [];
    const preSelectedPlaylists = new Set(videoPlaylists.map((p) => p.id));
    setSelectedPlaylists(preSelectedPlaylists);
  };

  // Handle playlist toggle for individual video
  const handlePlaylistToggle = (playlistId: string) => {
    const newSelectedPlaylists = new Set(selectedPlaylists);
    if (newSelectedPlaylists.has(playlistId)) {
      newSelectedPlaylists.delete(playlistId);
    } else {
      newSelectedPlaylists.add(playlistId);
    }
    setSelectedPlaylists(newSelectedPlaylists);
  };

  // Save playlist changes for the selected video
  const savePlaylistChanges = async () => {
    if (!selectedVideo || selectedVideo.videoType !== 'youtube') {
      return;
    }

    try {
      setSavingPlaylists(true);

      const videoId = selectedVideo.youtubeId || selectedVideo.id;
      const currentPlaylistIds = new Set(selectedVideo.allPlaylists?.map((p) => p.id) || []);
      const newPlaylistIds = selectedPlaylists;

      console.log('Saving playlist changes for video:', videoId);
      console.log('Current playlists:', Array.from(currentPlaylistIds));
      console.log('New playlists:', Array.from(newPlaylistIds));

      // Use the manage-playlists API to update playlist membership
      const response = await fetch('/api/manage-playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'batch_update_playlists',
          videoId: videoId,
          playlistIds: Array.from(newPlaylistIds),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Playlist update failed:', errorData);
        throw new Error(errorData.error || 'Failed to update playlists');
      }

      const result = await response.json();
      console.log('Playlist update result:', result);

      // Check if there were any failures in the batch operation
      if (result.summary && result.summary.failed > 0) {
        console.warn('Some playlist operations failed:', result.results);
        const failedOperations = result.results.filter((r: any) => !r.success);
        const errorMessages = failedOperations.map(
          (r: any) => `${r.action} ${r.playlistId}: ${r.error}`
        );
        console.warn('Failed operations:', errorMessages);

        // Still continue with the sync if some operations succeeded
        if (result.summary.added > 0 || result.summary.removed > 0) {
          console.log(
            `Partial success: ${result.summary.added} added, ${result.summary.removed} removed, ${result.summary.failed} failed`
          );
        }
      }

      // After updating YouTube, refresh the video's metadata from YouTube to sync to Firestore
      console.log('Refreshing video metadata to sync playlist changes to Firestore...');
      const refreshResponse = await fetch('/api/refresh-video-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoIds: [videoId],
        }),
      });

      if (!refreshResponse.ok) {
        const refreshErrorData = await refreshResponse.json();
        console.warn('Failed to refresh metadata after playlist update:', refreshErrorData.error);
        // Don't throw here, the playlist update was successful
      }

      // Reload videos to get the updated data
      await loadVideos();

      // Update the selected video with new playlist information
      const updatedVideos = await videoService.getAllVideos();
      const updatedVideo = updatedVideos.find((v) => v.id === selectedVideo.id);
      if (updatedVideo) {
        setSelectedVideo(updatedVideo);
      }

      // Close the modal
      setShowPlaylistSelector(false);

      // Create success message
      let message = t.alerts.playlistSaved(
        result.summary?.added || 0,
        result.summary?.removed || 0
      );
      if (result.summary?.failed > 0) {
        message += t.alerts.playlistSavedFailures(result.summary.failed);
      }

      alert(message);
    } catch (error) {
      console.error('Error saving playlist changes:', error);
      alert(
        t.alerts.playlistSaveFailed(error instanceof Error ? error.message : '알 수 없는 오류')
      );
    } finally {
      setSavingPlaylists(false);
    }
  };

  // Filter and sort videos
  const filteredVideos = videos
    .filter((video: AdminVideo) => {
      // Tag filtering
      const hasActualTags = video.tags && video.tags.length > 0;
      if (!hasActualTags && !showUntaggedVideos) return false;
      if (hasActualTags && !showTaggedVideos) return false;

      // Date filtering
      if (!video.createdTime && !showVideosWithoutTimestamp) return false;

      // Date range filtering
      if (enableDateFilter) {
        let recordingDateStr = '';
        if (video.createdTime) {
          try {
            let date: Date;
            if (video.createdTime instanceof Date) {
              date = video.createdTime;
            } else if (
              typeof video.createdTime === 'object' &&
              video.createdTime !== null &&
              'seconds' in video.createdTime
            ) {
              // Firebase Timestamp
              date = new Date((video.createdTime as any).seconds * 1000);
            } else {
              // String or other format
              date = new Date(video.createdTime as any);
            }

            if (!isNaN(date.getTime())) {
              recordingDateStr = date.toISOString().split('T')[0];
            }
          } catch (e) {
            // Skip if date parsing fails
          }
        }

        if (recordingDateStr) {
          if (dateFilterFrom && recordingDateStr < dateFilterFrom) return false;
          if (dateFilterTo && recordingDateStr > dateFilterTo) return false;
        } else {
          // If date filter is enabled but video has no date, exclude it
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      let aValue: Date | null = null;
      let bValue: Date | null = null;

      if (sortBy === 'created') {
        // Handle createdTime which could be Date, Firebase Timestamp, or string
        aValue = a.createdTime
          ? (() => {
              if (a.createdTime instanceof Date) {
                return a.createdTime;
              } else if (
                typeof a.createdTime === 'object' &&
                a.createdTime !== null &&
                'seconds' in a.createdTime
              ) {
                return new Date((a.createdTime as any).seconds * 1000);
              } else {
                return new Date(a.createdTime as any);
              }
            })()
          : null;
        bValue = b.createdTime
          ? (() => {
              if (b.createdTime instanceof Date) {
                return b.createdTime;
              } else if (
                typeof b.createdTime === 'object' &&
                b.createdTime !== null &&
                'seconds' in b.createdTime
              ) {
                return new Date((b.createdTime as any).seconds * 1000);
              } else {
                return new Date(b.createdTime as any);
              }
            })()
          : null;
      } else if (sortBy === 'uploaded') {
        aValue = a.uploadDate ? new Date(a.uploadDate) : null;
        bValue = b.uploadDate ? new Date(b.uploadDate) : null;
      } else if (sortBy === 'updated') {
        aValue = a.updated ? new Date(a.updated) : null;
        bValue = b.updated ? new Date(b.updated) : null;
      }

      // Handle null values
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return sortOrder === 'asc' ? 1 : -1;
      if (bValue === null) return sortOrder === 'asc' ? -1 : 1;

      // Check for invalid dates
      if (isNaN(aValue.getTime()) && isNaN(bValue.getTime())) return 0;
      if (isNaN(aValue.getTime())) return sortOrder === 'asc' ? 1 : -1;
      if (isNaN(bValue.getTime())) return sortOrder === 'asc' ? -1 : 1;

      const comparison = aValue.getTime() - bValue.getTime();
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Filtered cats for search
  const filteredCats = cats.filter(
    (cat) =>
      cat.name.toLowerCase().includes(catSearchQuery.toLowerCase()) ||
      (cat.alt_name && cat.alt_name.toLowerCase().includes(catSearchQuery.toLowerCase()))
  );

  // Pagination
  const totalPages = Math.ceil(filteredVideos.length / videosPerPage);
  const startIndex = (currentPage - 1) * videosPerPage;
  const endIndex = startIndex + videosPerPage;
  const paginatedVideos = filteredVideos.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    showTaggedVideos,
    showUntaggedVideos,
    showVideosWithoutTimestamp,
    enableDateFilter,
    dateFilterFrom,
    dateFilterTo,
    sortBy,
    sortOrder,
  ]);

  // Statistics
  const untaggedVideos = videos.filter((video) => !video.tags || video.tags.length === 0);
  const taggedVideos = videos.filter((video) => video.tags && video.tags.length > 0);

  if (loading) {
    return (
      <div className="p-6" data-oid="-qs:p70">
        <h1 className="text-2xl font-bold" data-oid="fk5vyhz">
          {t.title}
        </h1>
        <div className="mt-2 mb-4 h-1 w-12 rounded-full bg-brand" />
        <div className="flex items-center justify-center min-h-64" data-oid="w:zv44s">
          <div className="text-lg text-gray-600" data-oid="qjf16xw">
            {t.loading}
          </div>
        </div>
      </div>
    );
  }

  const getVideoThumbnail = (video: AdminVideo) => {
    // Return thumbnail URL if available, otherwise a default placeholder
    return video.thumbnailUrl || '/images/video-placeholder.png';
  };

  return (
    <div className="p-6" data-oid="6j4_s9_">
      <h1 className="text-2xl font-bold" data-oid="qeg4aph">
        {t.title}
      </h1>
      <div className="mt-2 mb-4 h-1 w-12 rounded-full bg-brand" />

      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
          data-oid="mzf-t:7"
        >
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
            data-oid="dpdexee"
          >
            ×
          </button>
        </div>
      )}

      {/* Service Configuration Status */}
      <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6" data-oid="q1x:ea2">
        <h3 className="text-sm font-semibold text-green-800 mb-2" data-oid="wnkkuf6">
          {t.serviceBox.title}
        </h3>
        <div className="text-sm space-y-1" data-oid="5i23q-:">
          <div data-oid="u-higbo">
            <span className="text-green-700" data-oid="l7m339c">
              {t.serviceBox.videosLabel}
            </span>{' '}
            <span className="text-green-600" data-oid="skcd8m4">
              {t.serviceBox.videosValue}
            </span>
          </div>
          <div data-oid="dnyhdpa">
            <span className="text-green-700" data-oid="6vzk:a9">
              {t.serviceBox.operationsLabel}
            </span>{' '}
            <span className="text-green-600" data-oid="4r9tigy">
              {t.serviceBox.operationsValue}
            </span>
          </div>
          <div className="text-xs text-green-600 mt-2" data-oid="8okujy5">
            {t.serviceBox.note}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6" data-oid="rkq6i3h">
        <div className="mb-4 flex gap-3" data-oid="369jt61">
          <button
            onClick={syncWithYouTube}
            disabled={batchSaving}
            className={`inline-flex items-center justify-center rounded-lg font-medium transition-all px-3 py-1.5 text-sm text-white ${
              batchSaving
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 cursor-pointer'
            }`}
            data-oid="n8wr8ia"
          >
            📺 {batchSaving ? t.actions.syncing : t.actions.sync}
          </button>

          <Button size="sm" onClick={() => loadVideos()} disabled={loading} data-oid="70m9l58">
            🔄 {loading ? t.actions.refreshing : t.actions.refresh}
          </Button>

          <Button
            size="sm"
            onClick={handleAutomaticDateParsing}
            disabled={parsingDates || loading}
            data-oid="-f8pk-p"
          >
            📅 {parsingDates ? t.actions.parsing : t.actions.autoDateParse}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" data-oid="8thbbky">
        <div className="bg-white p-4 rounded-lg shadow" data-oid="-7toujv">
          <h3 className="text-lg font-semibold text-gray-700" data-oid="bqmug9g">
            {t.stats.total}
          </h3>
          <p className="text-3xl font-bold text-ink" data-oid="04c5o-_">
            {videos.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow" data-oid="fo9t3.q">
          <h3 className="text-lg font-semibold text-gray-700" data-oid="kn33wve">
            {t.stats.untagged}
          </h3>
          <p className="text-3xl font-bold text-orange-600" data-oid="ru1yz:f">
            {untaggedVideos.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow" data-oid="h7:c8xz">
          <h3 className="text-lg font-semibold text-gray-700" data-oid="kmxb2my">
            {t.stats.tagged}
          </h3>
          <p className="text-3xl font-bold text-green-600" data-oid="-ryhu8r">
            {taggedVideos.length}
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-6" data-oid=":bk8dx-">
        {/* Tag Filters */}
        <div className="flex gap-6 mb-4" data-oid="9iem8ps">
          <label className="flex items-center cursor-pointer" data-oid=":976vpi">
            <input
              type="checkbox"
              checked={showTaggedVideos}
              onChange={(e) => setShowTaggedVideos(e.target.checked)}
              className="w-4 h-4 accent-brand-500 rounded mr-2"
              data-oid="atil9s6"
            />

            <span className="text-sm text-gray-700" data-oid="b-8it84">
              {t.filters.showTagged(taggedVideos.length)}
            </span>
          </label>
          <label className="flex items-center cursor-pointer" data-oid="3pm2fe7">
            <input
              type="checkbox"
              checked={showUntaggedVideos}
              onChange={(e) => setShowUntaggedVideos(e.target.checked)}
              className="w-4 h-4 accent-brand-500 rounded mr-2"
              data-oid="lriy.qy"
            />

            <span className="text-sm text-gray-700" data-oid="stvuhib">
              {t.filters.showUntagged(untaggedVideos.length)}
            </span>
          </label>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-wrap items-center gap-4 mb-4" data-oid="f23gk3v">
          <label className="flex items-center cursor-pointer" data-oid="3yvdua_">
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
              className="w-4 h-4 accent-brand-500 rounded mr-2"
              data-oid="di1dw85"
            />

            <span className="text-sm text-gray-700" data-oid="s4e.t_c">
              {t.filters.applyDateRange}
            </span>
          </label>
          <div className="flex items-center gap-2" data-oid="_qqkosm">
            <label
              className={`text-sm ${enableDateFilter ? 'text-gray-700' : 'text-gray-400'}`}
              data-oid="n:m.hpq"
            >
              {t.filters.from}
            </label>
            <input
              type="date"
              value={dateFilterFrom}
              onChange={(e) => setDateFilterFrom(e.target.value)}
              disabled={!enableDateFilter}
              className={`border border-gray-300 rounded px-2 py-1 text-sm ${
                enableDateFilter ? 'bg-white' : 'bg-gray-100 text-gray-400'
              }`}
              data-oid="es5wt_6"
            />
          </div>
          <div className="flex items-center gap-2" data-oid="ty:4fxg">
            <label
              className={`text-sm ${enableDateFilter ? 'text-gray-700' : 'text-gray-400'}`}
              data-oid="8n4doyk"
            >
              {t.filters.to}
            </label>
            <input
              type="date"
              value={dateFilterTo}
              onChange={(e) => setDateFilterTo(e.target.value)}
              disabled={!enableDateFilter}
              className={`border border-gray-300 rounded px-2 py-1 text-sm ${
                enableDateFilter ? 'bg-white' : 'bg-gray-100 text-gray-400'
              }`}
              data-oid=".v3dcyo"
            />
          </div>
          {enableDateFilter && (dateFilterFrom || dateFilterTo) && (
            <button
              onClick={() => {
                setDateFilterFrom('');
                setDateFilterTo('');
              }}
              className="text-sm text-brand-700 hover:text-brand-800 underline"
              data-oid="37f:p6y"
            >
              {t.filters.clearDates}
            </button>
          )}
          <label className="flex items-center cursor-pointer" data-oid="gcq49-.">
            <input
              type="checkbox"
              checked={showVideosWithoutTimestamp}
              onChange={(e) => setShowVideosWithoutTimestamp(e.target.checked)}
              className="w-4 h-4 accent-brand-500 rounded mr-2"
              data-oid=":2ywq6t"
            />

            <span className="text-sm text-gray-700" data-oid="2akisn5">
              {t.filters.showWithoutTimestamp(videos.filter((v) => !v.createdTime).length)}
            </span>
          </label>
        </div>

        {/* Selection and Display Controls */}
        <div className="border-t border-gray-300 pt-4" data-oid=".69c.qo">
          <div className="flex flex-wrap items-center gap-4" data-oid="y_:c3tc">
            <Button size="sm" onClick={selectAllVideos} data-oid="5aptvqp">
              {t.filters.selectAll}
            </Button>
            {selectedVideos.size > 0 && (
              <Button variant="secondary" size="sm" onClick={clearSelection} data-oid="lhfif.5">
                {t.filters.clearSelection(selectedVideos.size)}
              </Button>
            )}
            <div className="flex items-center gap-2" data-oid="n9rchho">
              <label className="text-sm text-gray-700" data-oid=".qlo:04">
                {t.filters.sortBy}
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'created' | 'uploaded' | 'updated')}
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                data-oid="gkx4b4_"
              >
                <option value="created" data-oid=":t0t2ln">
                  {t.filters.sortCreated}
                </option>
                <option value="uploaded" data-oid="m2bstub">
                  {t.filters.sortPublished}
                </option>
                <option value="updated" data-oid="kp262uc">
                  {t.filters.sortUpdated}
                </option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                data-oid="i7d04:u"
              >
                <option value="desc" data-oid="p05a:hc">
                  {t.filters.newestFirst}
                </option>
                <option value="asc" data-oid="tpeov9u">
                  {t.filters.oldestFirst}
                </option>
              </select>
            </div>
            <div className="flex items-center gap-2" data-oid="gxi-b_r">
              <label className="text-sm text-gray-700" data-oid="g:dce.a">
                {t.filters.perPage}
              </label>
              <select
                value={videosPerPage}
                onChange={(e) => {
                  setVideosPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                data-oid="dfs:4er"
              >
                <option value={10} data-oid="0.qi5i:">
                  10
                </option>
                <option value={25} data-oid="v4xq-fa">
                  25
                </option>
                <option value={50} data-oid="g8m-1a7">
                  50
                </option>
              </select>
            </div>
            <div className="text-sm text-gray-600" data-oid="86o:q1b">
              {t.filters.showingRange(
                startIndex + 1,
                Math.min(endIndex, filteredVideos.length),
                filteredVideos.length
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Batch Actions */}
      {showBatchActions && (
        <div className="bg-brand-50 border border-brand-200 p-3 rounded-lg mb-4" data-oid="z.5rz9d">
          <h3 className="text-lg font-semibold mb-2" data-oid="0bcedeh">
            {t.batch.title(selectedVideos.size)}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3" data-oid="mpmneae">
            {/* Tags Section */}
            <div
              className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg"
              data-oid="v-lb5nu"
            >
              <h4
                className="text-sm font-semibold text-yellow-800 mb-2 flex items-center"
                data-oid="d_cwk0b"
              >
                {t.batch.tags}
              </h4>
              <div className="relative mb-2" data-oid="kv-qrab">
                <input
                  type="text"
                  value={batchTags}
                  onChange={(e) => setBatchTags(e.target.value)}
                  onClick={handleBatchTagsInputClick}
                  placeholder={t.batch.clickToSelect}
                  className="border border-gray-300 rounded px-2 py-1 w-full cursor-pointer pr-12 text-sm"
                  data-oid="kh3gio3"
                />

                <button
                  type="button"
                  onClick={handleBatchTagsInputClick}
                  className="absolute right-1 top-1 text-brand-600 hover:text-brand-700 text-xs"
                  data-oid="5:j-6dt"
                >
                  🐱
                </button>
              </div>

              {/* Tag chips */}
              {batchTags && (
                <div className="flex flex-wrap gap-1 mb-2" data-oid="1_y_83j">
                  {batchTags.split(',').map((tag, index) => {
                    const trimmedTag = tag.trim();
                    if (!trimmedTag) return null;
                    return (
                      <span
                        key={index}
                        className="inline-flex items-center bg-brand-100 text-ink text-xs px-1 py-0.5 rounded"
                        data-oid="8-wpc.m"
                      >
                        {trimmedTag}
                        <button
                          type="button"
                          onClick={() => {
                            const newTags = batchTags
                              .split(',')
                              .map((t) => t.trim())
                              .filter((t) => t !== trimmedTag)
                              .join(', ');
                            setBatchTags(newTags);
                          }}
                          className="ml-1 text-ink/70 hover:text-ink"
                          data-oid="owpc.-o"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <Button
                size="sm"
                onClick={batchUpdateTags}
                disabled={savingTags || !batchTags.trim()}
                className="w-full"
                data-oid="4ec.mh-"
              >
                {savingTags ? t.batch.saving : t.batch.saveTags}
              </Button>
              <p className="text-xs text-yellow-700 mt-1" data-oid=":qum3s7">
                {t.batch.updatesYoutube}
              </p>
            </div>

            {/* Recording Date Section */}
            <div
              className="bg-purple-50 border border-purple-200 p-3 rounded-lg"
              data-oid="sqi563."
            >
              <h4
                className="text-sm font-semibold text-purple-800 mb-2 flex items-center"
                data-oid="f9peut6"
              >
                {t.batch.recordingDate}
              </h4>
              <input
                type="datetime-local"
                value={batchYoutubeCreatedTime}
                onChange={(e) => setBatchYoutubeCreatedTime(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 w-full text-sm mb-2"
                data-oid="5ru_tpc"
              />

              <Button
                size="sm"
                onClick={batchUpdateDate}
                disabled={savingDate || !batchYoutubeCreatedTime.trim()}
                className="w-full"
                data-oid=":yn-305"
              >
                {savingDate ? t.batch.saving : t.batch.saveDate}
              </Button>
              <p className="text-xs text-purple-700 mt-1" data-oid="p_hhrgh">
                {t.batch.updatesYoutube}
              </p>
            </div>

            {/* Playlists Section */}
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg" data-oid="_:mh5v7">
              <h4
                className="text-sm font-semibold text-green-800 mb-2 flex items-center"
                data-oid="rngas84"
              >
                {t.batch.playlists}
              </h4>
              <div
                className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border mb-2 min-h-[1.5rem]"
                data-oid="1awdih_"
              >
                {selectedPlaylists.size > 0 ? (
                  <div data-oid="ixqb6al">
                    {Array.from(selectedPlaylists)
                      .slice(0, 2)
                      .map((playlistId) => {
                        const playlist = allPlaylists.find((p) => p.id === playlistId);
                        return playlist ? (
                          <div key={playlistId} className="truncate" data-oid="cizxunf">
                            {playlist.title}
                          </div>
                        ) : null;
                      })}
                    {selectedPlaylists.size > 2 && (
                      <div className="text-gray-500" data-oid="jlz-g6:">
                        {t.batch.moreCount(selectedPlaylists.size - 2)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 italic" data-oid="t68vltp">
                    {t.batch.noneSelected}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setPlaylistSelectorContext('batch');
                  setShowPlaylistSelector(true);
                }}
                disabled={loadingPlaylists}
                className="w-full px-2 py-1 text-brand-700 bg-brand-50 border border-brand-200 rounded hover:bg-brand-100 disabled:opacity-50 text-sm"
                data-oid="t00lsus"
              >
                {loadingPlaylists ? t.batch.loading : t.batch.selectPlaylists}
              </button>
              <p className="text-xs text-green-700 mt-1" data-oid="jbp:qlp">
                {t.batch.saveInModal}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-3" data-oid="ksnj-b-">
            {/* Delete Metadata button removed */}
            <Button variant="secondary" size="sm" onClick={clearSelection} data-oid="vyk7oc5">
              {t.batch.cancel}
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-oid="_-:v39r">
        {/* Video List */}
        <div className="lg:col-span-2" data-oid="mtdvsqy">
          {filteredVideos.length === 0 ? (
            <div className="text-center py-12" data-oid="tt1buvm">
              <p className="text-gray-600 text-lg" data-oid="9_yl05i">
                {t.grid.noMatch}
              </p>
            </div>
          ) : (
            <>
              {/* Video Grid */}
              <div
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
                data-oid="_u0faq_"
              >
                {paginatedVideos.map((video) => (
                  <div
                    key={video.id}
                    className={`relative bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border-2 ${
                      selectedVideo?.id === video.id
                        ? 'border-brand-500'
                        : processingVideos.has(video.id)
                          ? 'border-purple-500 shadow-md'
                          : video.tags && video.tags.length > 0
                            ? 'border-green-200'
                            : 'border-gray-200'
                    }`}
                    data-oid="j_2y5ex"
                  >
                    {/* Processing indicator */}
                    {processingVideos.has(video.id) && (
                      <div
                        className="absolute inset-0 bg-purple-500 bg-opacity-20 z-30 flex items-center justify-center rounded-lg"
                        data-oid="_:xvla4"
                      >
                        <div
                          className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium"
                          data-oid="qu.jc8x"
                        >
                          {t.grid.parsingDate}
                        </div>
                      </div>
                    )}

                    {/* Checkbox */}
                    <div className="absolute top-2 left-2 z-10" data-oid="2s-r.8t">
                      <input
                        type="checkbox"
                        checked={selectedVideos.has(video.id)}
                        onChange={() => toggleVideoSelection(video.id)}
                        className="w-4 h-4 accent-brand-500 rounded"
                        onClick={(e) => e.stopPropagation()}
                        data-oid="u1ekmue"
                      />
                    </div>

                    {/* Status indicator */}
                    <div className="absolute top-2 right-2 z-10 flex gap-1" data-oid="ohqq7_h">
                      {video.tags && video.tags.length > 0 ? (
                        <span
                          className="bg-green-500 text-white text-xs px-2 py-1 rounded"
                          data-oid="v4vanei"
                        >
                          {t.grid.tagged}
                        </span>
                      ) : (
                        <span
                          className="bg-orange-500 text-white text-xs px-2 py-1 rounded"
                          data-oid="yepj4_k"
                        >
                          {t.grid.untagged}
                        </span>
                      )}
                    </div>

                    {/* Video type indicator */}
                    <div className="absolute bottom-2 right-2 z-10" data-oid=":csqj2o">
                      <span
                        className={`text-white text-xs px-2 py-1 rounded ${
                          video.videoType === 'youtube' ? 'bg-red-600' : 'bg-gray-600'
                        }`}
                        data-oid="vazpqwp"
                      >
                        {video.videoType === 'youtube' ? t.grid.youtube : t.grid.storage}
                      </span>
                    </div>

                    <div onClick={() => selectVideo(video)} data-oid="2kfg.ws">
                      {/* Video Thumbnail */}
                      <div className="relative" data-oid="kmb.gso">
                        <img
                          src={getVideoThumbnail(video)}
                          alt={video.title || video.id || 'Video'}
                          className="w-full h-36 object-cover rounded-t-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/arrow_north.svg';
                          }}
                          data-oid="tkas6_p"
                        />
                      </div>

                      {/* Video Info */}
                      <div className="p-3" data-oid=":pma7lf">
                        <h3 className="font-medium text-sm line-clamp-2 mb-1" data-oid="ius0m:m">
                          {video.title || video.description || video.id}
                        </h3>
                        {video.uploadDate && (
                          <p className="text-xs text-gray-500 mb-1" data-oid="kduux3.">
                            {t.grid.published(
                              (() => {
                                try {
                                  const date = new Date(video.uploadDate);
                                  if (!isNaN(date.getTime())) {
                                    return date.toLocaleDateString();
                                  }
                                  return t.grid.invalidDate;
                                } catch (e) {
                                  return t.grid.invalidDate;
                                }
                              })()
                            )}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mb-1" data-oid="v:hhmr1">
                          {t.grid.created(
                            video.createdTime
                              ? (() => {
                                  try {
                                    let date: Date;
                                    if (video.createdTime instanceof Date) {
                                      date = video.createdTime;
                                    } else if (
                                      typeof video.createdTime === 'object' &&
                                      video.createdTime !== null &&
                                      'seconds' in video.createdTime
                                    ) {
                                      // Firebase Timestamp
                                      date = new Date((video.createdTime as any).seconds * 1000);
                                    } else {
                                      // String or other format
                                      date = new Date(video.createdTime as any);
                                    }
                                    return !isNaN(date.getTime())
                                      ? date.toLocaleDateString()
                                      : t.grid.invalidDate;
                                  } catch (e) {
                                    return t.grid.invalidDate;
                                  }
                                })()
                              : t.grid.nullDate
                          )}
                        </p>
                        {video.videoType === 'youtube' && (
                          <p
                            className="text-xs text-gray-500 mb-2 font-mono break-all"
                            data-oid="r2tifa0"
                          >
                            youtu.be/{video.youtubeId || video.id}
                          </p>
                        )}
                        {video.duration && (
                          <p className="text-xs text-gray-500 mb-2" data-oid="p37u_uu">
                            {t.grid.duration(formatDuration(video.duration))}
                          </p>
                        )}
                        {video.tags && video.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1" data-oid="nyzmx7c">
                            {video.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="bg-brand-100 text-ink text-xs px-2 py-1 rounded"
                                data-oid="27qt5ds"
                              >
                                {tag}
                              </span>
                            ))}
                            {video.tags.length > 3 && (
                              <span className="text-xs text-gray-500" data-oid="xle0dlc">
                                {t.grid.moreCount(video.tags.length - 3)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center mt-6 gap-2" data-oid="xd2qj5x">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-oid="kuzf9d8"
                  >
                    {t.grid.previous}
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 text-sm border rounded ${
                          currentPage === pageNum
                            ? 'bg-brand text-ink border-brand font-bold'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                        data-oid="gnluo38"
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-oid="r4gz9bj"
                  >
                    {t.grid.next}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Tagging Form */}
        <div className="lg:col-span-1" data-oid="7p1tusp">
          <div
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm sticky top-6"
            data-oid=".bbu:8y"
          >
            {selectedVideo ? (
              <>
                <div className="mb-4" data-oid="2xg8j8v">
                  <img
                    src={getVideoThumbnail(selectedVideo)}
                    alt={selectedVideo.title || selectedVideo.id || 'Video'}
                    className="w-full h-32 object-cover rounded mb-2"
                    data-oid="togz2fs"
                  />

                  {/* Video Information Block */}
                  <h4 className="font-medium text-sm line-clamp-2" data-oid=":tramz3">
                    {selectedVideo.title || selectedVideo.id}
                  </h4>
                  <p className="text-xs text-gray-500 mb-1" data-oid="sdf.:f9">
                    {t.form.published}{' '}
                    {(() => {
                      try {
                        const date = selectedVideo.uploadDate
                          ? new Date(selectedVideo.uploadDate)
                          : null;
                        return date && !isNaN(date.getTime())
                          ? date.toLocaleDateString()
                          : t.form.unknown;
                      } catch (e) {
                        return t.form.unknown;
                      }
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 mb-1" data-oid="dqshn.-">
                    {t.form.created}{' '}
                    {selectedVideo.createdTime
                      ? (() => {
                          try {
                            let date: Date;
                            if (selectedVideo.createdTime instanceof Date) {
                              date = selectedVideo.createdTime;
                            } else if (
                              typeof selectedVideo.createdTime === 'object' &&
                              selectedVideo.createdTime !== null &&
                              'seconds' in selectedVideo.createdTime
                            ) {
                              // Firebase Timestamp
                              date = new Date((selectedVideo.createdTime as any).seconds * 1000);
                            } else {
                              // String or other format
                              date = new Date(selectedVideo.createdTime as any);
                            }
                            return !isNaN(date.getTime())
                              ? date.toLocaleDateString()
                              : t.form.invalidDate;
                          } catch (e) {
                            return t.form.invalidDate;
                          }
                        })()
                      : t.form.nullDate}
                  </p>
                  <p className="text-xs text-gray-500 mb-1" data-oid="zhjmyo6">
                    {t.form.metadataUpdated}{' '}
                    {selectedVideo.updated
                      ? (() => {
                          try {
                            const date = new Date(selectedVideo.updated);
                            return !isNaN(date.getTime())
                              ? date.toLocaleDateString()
                              : t.form.unknown;
                          } catch (e) {
                            return t.form.unknown;
                          }
                        })()
                      : t.form.never}
                  </p>
                  {selectedVideo.videoType === 'youtube' && (
                    <>
                      <div className="text-xs mb-2" data-oid="p5vkh0c">
                        <span className="text-gray-500" data-oid="4g:ea8i">
                          {t.form.youtubeLabel}{' '}
                        </span>
                        <a
                          href={`https://youtu.be/${selectedVideo.youtubeId || selectedVideo.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-700 hover:text-brand-800 font-mono break-all"
                          data-oid="tshsqaa"
                        >
                          youtu.be/{selectedVideo.youtubeId || selectedVideo.id}
                        </a>
                      </div>
                      <a
                        href={selectedVideo.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:text-brand-700 text-xs"
                        data-oid="0:pl-wb"
                      >
                        {t.form.viewOnYoutube}
                      </a>
                    </>
                  )}
                </div>

                <div className="space-y-4" data-oid="mdmb933">
                  {/* YouTube Title */}
                  {selectedVideo.videoType === 'youtube' && (
                    <div data-oid="3bqboba">
                      <label
                        className="block text-sm font-medium text-gray-700 mb-1"
                        data-oid="tmzbzvl"
                      >
                        {t.form.titleYoutube}
                      </label>
                      <input
                        type="text"
                        value={youtubeTitle}
                        onChange={(e) => setYoutubeTitle(e.target.value)}
                        placeholder={t.form.titlePlaceholder}
                        className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                        data-oid="rcgyly8"
                      />

                      <div className="text-xs text-gray-500 mt-1" data-oid="4ygdjy4">
                        {t.form.syncNote}
                      </div>
                    </div>
                  )}

                  {/* YouTube Tags */}
                  {selectedVideo.videoType === 'youtube' && (
                    <div data-oid="2aj8-:4">
                      <label
                        className="block text-sm font-medium text-gray-700 mb-1"
                        data-oid="4ocq5ws"
                      >
                        {t.form.tagsYoutube}
                      </label>
                      <div className="relative" data-oid="u:9m1_6">
                        <input
                          type="text"
                          value={youtubeTags}
                          onChange={(e) => setYoutubeTags(e.target.value)}
                          onClick={handleYoutubeTagsInputClick}
                          placeholder={t.form.tagsPlaceholder}
                          className="border border-gray-300 rounded px-3 py-2 w-full text-sm cursor-pointer pr-16"
                          data-oid="fjebfr9"
                        />

                        <button
                          type="button"
                          onClick={handleYoutubeTagsInputClick}
                          className="absolute right-2 top-2 text-brand-600 hover:text-brand-700 text-sm"
                          data-oid="c82ku26"
                        >
                          {t.form.selectBtn}
                        </button>
                      </div>

                      {/* Tag chips */}
                      {youtubeTags && (
                        <div className="flex flex-wrap gap-1 mt-2" data-oid="uz:y.ys">
                          {youtubeTags.split(',').map((tag, index) => {
                            const trimmedTag = tag.trim();
                            if (!trimmedTag) return null;
                            return (
                              <span
                                key={index}
                                className="inline-flex items-center bg-brand-100 text-ink text-xs px-2 py-1 rounded"
                                data-oid="km25_kc"
                              >
                                {trimmedTag}
                                <button
                                  type="button"
                                  onClick={() => removeYoutubeTag(trimmedTag)}
                                  className="ml-1 text-ink/70 hover:text-ink"
                                  data-oid="14vrejc"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <div className="text-xs text-gray-500 mt-1" data-oid="mwzpbja">
                        {t.form.syncNote}
                      </div>
                    </div>
                  )}

                  {/* YouTube Description */}
                  {selectedVideo.videoType === 'youtube' && (
                    <div data-oid="c9.ac:y">
                      <label
                        className="block text-sm font-medium text-gray-700 mb-1"
                        data-oid="fi0hhhq"
                      >
                        {t.form.descriptionYoutube}
                      </label>
                      <textarea
                        value={youtubeDescription}
                        onChange={(e) => setYoutubeDescription(e.target.value)}
                        placeholder={t.form.descriptionPlaceholder}
                        rows={3}
                        className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                        data-oid="6sb0avc"
                      />

                      <div className="text-xs text-gray-500 mt-1" data-oid="a07bs4o">
                        {t.form.syncNote}
                      </div>
                    </div>
                  )}

                  {/* Recording Date */}
                  {selectedVideo.videoType === 'youtube' && (
                    <div data-oid="olzhg8s">
                      <label
                        className="block text-sm font-medium text-gray-700 mb-1"
                        data-oid="4iy1ucf"
                      >
                        {t.form.createdTimeYoutube}
                      </label>
                      <div className="space-y-2" data-oid="hjwy8u-">
                        <input
                          type="date"
                          value={youtubeCreatedTime}
                          onChange={(e) => setYoutubeCreatedTime(e.target.value)}
                          className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                          data-oid="57iry89"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            if (selectedVideo && selectedVideo.title) {
                              const parsedDate = parseRecordingDateFromTitle(selectedVideo.title);
                              if (parsedDate) {
                                // Convert to UTC+9 timezone (Korea Standard Time)
                                const utcTime = parsedDate.getTime();
                                const utcPlus9Time = new Date(utcTime + 9 * 60 * 60 * 1000);
                                const dateStr = utcPlus9Time.toISOString().split('T')[0];
                                setYoutubeCreatedTime(dateStr);
                                alert(t.alerts.parsedFromTitle(dateStr));
                              } else {
                                alert(t.alerts.parseFromTitleFailed);
                              }
                            }
                          }}
                          className="w-full px-3 py-2 text-brand-700 bg-brand-50 border border-brand-200 rounded hover:bg-brand-100 text-sm"
                          data-oid="zu13mws"
                        >
                          {t.form.parseFromTitle}
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 mt-1" data-oid="r:w.0-c">
                        {t.form.syncNote}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2" data-oid="6nq12hf">
                    <Button
                      onClick={saveVideoMetadata}
                      disabled={saving || updatingYoutube}
                      className="flex-1"
                      data-oid="kbe7otr"
                    >
                      {updatingYoutube
                        ? t.form.savingYoutube
                        : saving
                          ? t.form.saving
                          : t.form.saveChanges}
                    </Button>
                    {/* Delete button removed */}
                  </div>

                  {(saving || updatingYoutube) && (
                    <div
                      className="text-xs text-gray-500 bg-brand-50 p-3 rounded border-l-4 border-brand-400"
                      data-oid="v37lci7"
                    >
                      <div className="font-medium text-ink mb-1" data-oid="e8-_qs6">
                        {t.form.saveProcess}
                      </div>
                      <div className="space-y-1" data-oid="3ka4wja">
                        <div
                          className={updatingYoutube ? 'text-brand-700' : 'text-gray-500'}
                          data-oid="r318a_e"
                        >
                          1. {updatingYoutube ? t.form.step1Updating : t.form.step1Done}
                        </div>
                        <div
                          className={
                            saving && !updatingYoutube ? 'text-brand-700' : 'text-gray-500'
                          }
                          data-oid="bah-bca"
                        >
                          2.{' '}
                          {saving && !updatingYoutube
                            ? t.form.step2Waiting
                            : updatingYoutube
                              ? t.form.step2Pending
                              : t.form.step2Done}
                        </div>
                        <div
                          className={
                            saving && !updatingYoutube ? 'text-brand-700' : 'text-gray-500'
                          }
                          data-oid="4c-8nwo"
                        >
                          3.{' '}
                          {saving && !updatingYoutube
                            ? t.form.step3Syncing
                            : updatingYoutube
                              ? t.form.step3Pending
                              : t.form.step3Done}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* YouTube Playlists - Separate Management Section */}
                  {selectedVideo.videoType === 'youtube' && (
                    <div className="border-t border-gray-200 pt-4 mt-4" data-oid="6192ft7">
                      <h4 className="text-sm font-medium text-gray-700 mb-3" data-oid="3li:a-m">
                        {t.form.playlistManagement}
                      </h4>

                      {/* Display current playlists */}
                      <div className="mb-3" data-oid="37b6qtd">
                        <label
                          className="block text-xs font-medium text-gray-600 mb-1"
                          data-oid="0:fvvt2"
                        >
                          {t.form.currentPlaylists}
                        </label>
                        {selectedVideo.allPlaylists && selectedVideo.allPlaylists.length > 0 ? (
                          <div className="flex flex-wrap gap-1" data-oid=":c-1qg4">
                            {selectedVideo.allPlaylists.map((playlist) => (
                              <span
                                key={playlist.id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                                data-oid="jursp7q"
                              >
                                {playlist.title}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 italic" data-oid="ad8prf:">
                            {t.form.notInPlaylists}
                          </span>
                        )}
                      </div>

                      {/* Playlist management button */}
                      <button
                        type="button"
                        onClick={handlePlaylistSelectorClick}
                        disabled={loadingPlaylists || savingPlaylists}
                        className="w-full px-3 py-2 text-brand-700 bg-brand-50 border border-brand-200 rounded hover:bg-brand-100 disabled:opacity-50 text-sm"
                        data-oid="wul1h1p"
                      >
                        {loadingPlaylists
                          ? t.form.loadingPlaylists
                          : savingPlaylists
                            ? t.form.savingChanges
                            : t.form.managePlaylists}
                      </button>

                      <div className="text-xs text-gray-500 mt-2" data-oid="br5ao2s">
                        {t.form.playlistNote}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12" data-oid="-nx:1_t">
                <p className="text-gray-500" data-oid="vz8wyvh">
                  {t.form.emptyPrompt}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cat Selector Modal */}
      {showCatSelector && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          data-oid=".aegs.1"
        >
          <div
            className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 flex flex-col"
            data-oid="tys76iv"
          >
            <div className="flex justify-between items-center mb-4" data-oid="34qb22l">
              <h3 className="text-lg font-semibold" data-oid="e-c73t9">
                {t.catSelector.title(catSelectorContext)}
              </h3>
              <button
                onClick={() => setShowCatSelector(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
                data-oid="-4eahex"
              >
                ×
              </button>
            </div>

            {/* Search input */}
            <div className="mb-4" data-oid="c7.jys6">
              <input
                type="text"
                placeholder={t.catSelector.search}
                value={catSearchQuery}
                onChange={(e) => setCatSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                data-oid="2yx6cip"
              />
            </div>

            {/* Cat list */}
            <div
              className="flex-1 overflow-y-auto border border-gray-200 rounded"
              data-oid="_gr-lpj"
            >
              {filteredCats.length === 0 ? (
                <div className="p-4 text-center text-gray-500" data-oid="kdkatss">
                  {cats.length === 0 ? t.catSelector.noneInDb : t.catSelector.noMatch}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 p-4" data-oid="7gaiylw">
                  {filteredCats.map((cat) => (
                    <label
                      key={cat.id}
                      className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-50 ${
                        selectedCats.has(cat.id)
                          ? 'bg-brand-50 border border-brand-200'
                          : 'border border-gray-200'
                      }`}
                      data-oid="j5u3cxf"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCats.has(cat.id)}
                        onChange={() => {
                          if (catSelectorContext === 'batch') {
                            handleCatToggleBatch(cat.id, cat.name);
                          } else if (catSelectorContext === 'youtube-individual') {
                            handleCatToggleYoutubeIndividual(cat.id, cat.name);
                          }
                          // Note: individual local tags context has been removed
                        }}
                        className="mr-2"
                        data-oid="riqdvnm"
                      />

                      <div className="flex-1" data-oid="_ymx58t">
                        <div className="font-medium text-sm" data-oid="pzu-ur0">
                          {cat.name}
                        </div>
                        {cat.alt_name && (
                          <div className="text-xs text-gray-500" data-oid="0uv9mk7">
                            ({cat.alt_name})
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 mt-4" data-oid="_khk6bc">
              <button
                onClick={() => {
                  setSelectedCats(new Set());
                  if (catSelectorContext === 'batch') {
                    setBatchTags('');
                  } else if (catSelectorContext === 'youtube-individual') {
                    setYoutubeTags('');
                  } else if (catSelectorContext === 'youtube-batch') {
                    // Clear YouTube batch tags if implemented
                  }
                }}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                data-oid="4u1.4tf"
              >
                {t.catSelector.clearAll}
              </button>
              <Button size="sm" onClick={() => setShowCatSelector(false)} data-oid="o110wyj">
                {t.catSelector.done(selectedCats.size)}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Playlist Selector Modal */}
      {showPlaylistSelector && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          data-oid="52wf5pg"
        >
          <div
            className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 flex flex-col"
            data-oid="iavnu52"
          >
            <div className="flex justify-between items-center mb-4" data-oid="o8v5u1v">
              <h3 className="text-lg font-semibold" data-oid="ij82ao6">
                {t.playlistSelector.title(playlistSelectorContext === 'batch')}
              </h3>
              <button
                onClick={() => setShowPlaylistSelector(false)}
                disabled={savingPlaylists}
                className="text-gray-500 hover:text-gray-700 text-xl disabled:opacity-50"
                data-oid="aj6u4um"
              >
                ×
              </button>
            </div>

            {/* Saving indicator */}
            {savingPlaylists && (
              <div
                className="mb-4 bg-brand-50 border border-brand-200 p-3 rounded"
                data-oid="sgm1ztr"
              >
                <div className="flex items-center" data-oid="jv9i0zk">
                  <div
                    className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-500 mr-2"
                    data-oid="f:a_83z"
                  ></div>
                  <span className="text-ink text-sm" data-oid="ksnf.5q">
                    {t.playlistSelector.savingNote}
                  </span>
                </div>
              </div>
            )}

            {/* Playlist list */}
            <div
              className="flex-1 overflow-y-auto border border-gray-200 rounded"
              data-oid="bnb3:pc"
            >
              {allPlaylists.length === 0 ? (
                <div className="p-4 text-center text-gray-500" data-oid="prcyn.2">
                  {t.playlistSelector.noPlaylists}
                </div>
              ) : (
                <div className="space-y-2" data-oid="xychz.v">
                  {allPlaylists.map((playlist) => (
                    <label
                      key={playlist.id}
                      className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-50 ${
                        selectedPlaylists.has(playlist.id)
                          ? 'bg-brand-50 border border-brand-200'
                          : 'border border-gray-200'
                      } ${savingPlaylists ? 'opacity-50 cursor-not-allowed' : ''}`}
                      data-oid="28aygn7"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlaylists.has(playlist.id)}
                        onChange={() => handlePlaylistToggle(playlist.id)}
                        disabled={savingPlaylists}
                        className="mr-2"
                        data-oid="cp:y0_f"
                      />

                      <div className="flex-1" data-oid="hrxjbpx">
                        <div className="font-medium text-sm" data-oid="egn8jag">
                          {playlist.title}
                        </div>
                        <div className="text-xs text-gray-500" data-oid="8g33we8">
                          {playlist.description}
                        </div>
                        <div className="text-xs text-gray-400" data-oid="ba-amzt">
                          {t.playlistSelector.videoCount(playlist.itemCount)}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 mt-4" data-oid="1.l::4e">
              <button
                onClick={() => {
                  setShowPlaylistSelector(false);
                  // Reset selected playlists to original state
                  const videoPlaylists = selectedVideo?.allPlaylists || [];
                  const preSelectedPlaylists = new Set(videoPlaylists.map((p) => p.id));
                  setSelectedPlaylists(preSelectedPlaylists);
                }}
                disabled={savingPlaylists}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 text-sm disabled:opacity-50"
                data-oid="x.q12vs"
              >
                {t.playlistSelector.cancel}
              </button>
              <Button
                size="sm"
                onClick={savePlaylistChanges}
                disabled={savingPlaylists}
                data-oid="6beezti"
              >
                {savingPlaylists
                  ? t.playlistSelector.saving
                  : t.playlistSelector.saveChanges(selectedPlaylists.size)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

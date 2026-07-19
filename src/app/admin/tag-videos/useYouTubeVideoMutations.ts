'use client';

import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { CatVideo } from '@/types/media';
import { adminStrings } from '@/constants/adminStrings';

const { tagVideos: t } = adminStrings;

export interface AdminVideo extends CatVideo {
  // Additional admin-specific properties can be added here
  processingStatus?: 'updating' | 'deleting' | null;
}

interface VideoServiceLike {
  getAllVideos: () => Promise<CatVideo[]>;
  syncWithYouTube?: () => Promise<unknown>;
}

interface UseYouTubeVideoMutationsOptions {
  videos: AdminVideo[];
  setVideos: Dispatch<SetStateAction<AdminVideo[]>>;
  reloadVideos: () => Promise<void>;
  setError: (message: string | null) => void;
  videoService: VideoServiceLike;
}

/**
 * Page-owned YouTube write orchestration for /admin/tag-videos (deliberately
 * NOT genericized — assessment §1.3a): the multi-step
 * update → propagation-wait → refresh-metadata → reload flows, plus the
 * individual edit-form state and the batch inputs they operate on. Extracted
 * from the page component for readability only; behavior is verbatim.
 */
export function useYouTubeVideoMutations({
  videos,
  setVideos,
  reloadVideos,
  setError,
  videoService,
}: UseYouTubeVideoMutationsOptions) {
  // Selected video + YouTube-specific form states
  const [selectedVideo, setSelectedVideo] = useState<AdminVideo | null>(null);
  const [youtubeTitle, setYoutubeTitle] = useState<string>('');
  const [youtubeTags, setYoutubeTags] = useState<string>('');
  const [youtubeDescription, setYoutubeDescription] = useState<string>('');
  const [youtubeCreatedTime, setYoutubeCreatedTime] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [updatingYoutube, setUpdatingYoutube] = useState(false);

  // Batch operation inputs + states
  const [batchTags, setBatchTags] = useState<string>('');
  const [batchYoutubeCreatedTime, setBatchYoutubeCreatedTime] = useState<string>('');
  const [batchSaving, setBatchSaving] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const [savingDate, setSavingDate] = useState(false);

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
      await reloadVideos();

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

  const batchUpdateTags = async (selectedIds: Set<string>) => {
    if (selectedIds.size === 0 || !batchTags.trim()) return;

    try {
      setSavingTags(true);
      setError(null);

      const videoIds = Array.from(selectedIds);
      const youtubeUpdateResults = [];

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
      await reloadVideos();
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

  const batchUpdateDate = async (selectedIds: Set<string>) => {
    if (selectedIds.size === 0 || !batchYoutubeCreatedTime.trim()) return;

    try {
      setSavingDate(true);
      setError(null);

      const videoIds = Array.from(selectedIds);
      const youtubeUpdateResults = [];

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
        const currentTimestamp = currentCreatedTime
          ? new Date(currentCreatedTime as any).getTime()
          : 0;

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
      await reloadVideos();
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

  const syncWithYouTube = async () => {
    if (!confirm(t.alerts.syncConfirm)) return;

    try {
      setBatchSaving(true);

      // Step 1: Discover and import new videos from YouTube
      console.log('Step 1: Discovering new videos from YouTube...');
      if (videoService && videoService.syncWithYouTube) {
        await videoService.syncWithYouTube();
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
      await reloadVideos();

      alert(t.alerts.syncDone(result.updated || youtubeVideoIds.length));
    } catch (err: any) {
      console.error('Error syncing:', err);
      alert(t.alerts.syncFailed(err.message));
    } finally {
      setBatchSaving(false);
    }
  };

  return {
    // selected video + edit form
    selectedVideo,
    setSelectedVideo,
    selectVideo,
    youtubeTitle,
    setYoutubeTitle,
    youtubeTags,
    setYoutubeTags,
    youtubeDescription,
    setYoutubeDescription,
    youtubeCreatedTime,
    setYoutubeCreatedTime,
    saving,
    updatingYoutube,
    saveVideoMetadata,
    // batch inputs + mutations
    batchTags,
    setBatchTags,
    batchYoutubeCreatedTime,
    setBatchYoutubeCreatedTime,
    savingTags,
    savingDate,
    batchSaving,
    batchUpdateTags,
    batchUpdateDate,
    syncWithYouTube,
  };
}

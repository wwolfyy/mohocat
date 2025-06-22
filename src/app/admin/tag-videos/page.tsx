'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { fetchChannelVideos, YouTubeVideo } from '@/services/youtube';
import { Cat } from '@/types';

// Helper function to parse recording date from video title
const parseRecordingDateFromTitle = (title: string): Date | null => {
  try {
    // Pattern 1: yyyy-mm-dd hh.MM.ss (with spaces or special chars around)
    const pattern1 = /(\d{4}-\d{2}-\d{2}\s+\d{2}\.\d{2}\.\d{2})/;
    const match1 = title.match(pattern1);

    if (match1) {
      const dateTimeStr = match1[1];
      // Convert format: "2024-03-15 14.30.45" -> "2024-03-15T14:30:45"
      const isoFormat = dateTimeStr.replace(/\s+/, 'T').replace(/\./g, ':');
      const date = new Date(isoFormat);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Pattern 2: yyyymmdd_hhMMss (with spaces or special chars around)
    const pattern2 = /(\d{8}_\d{6})/;
    const match2 = title.match(pattern2);

    if (match2) {
      const dateTimeStr = match2[1];
      // Convert format: "20240315_143045" -> "2024-03-15T14:30:45"
      const year = dateTimeStr.substring(0, 4);
      const month = dateTimeStr.substring(4, 6);
      const day = dateTimeStr.substring(6, 8);
      const hour = dateTimeStr.substring(9, 11);
      const minute = dateTimeStr.substring(11, 13);
      const second = dateTimeStr.substring(13, 15);

      const isoFormat = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
      const date = new Date(isoFormat);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Additional pattern: yyyy-mm-dd (date only, no time)
    const pattern3 = /(\d{4}-\d{2}-\d{2})/;
    const match3 = title.match(pattern3);

    if (match3) {
      const dateStr = match3[1];
      const date = new Date(dateStr + 'T00:00:00');
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Additional pattern: yyyymmdd (date only, no time)
    const pattern4 = /(\d{8})/;
    const match4 = title.match(pattern4);

    if (match4) {
      const dateStr = match4[1];
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);

      const isoFormat = `${year}-${month}-${day}T00:00:00`;
      const date = new Date(isoFormat);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  } catch (error) {
    console.warn(`Error parsing date from video title "${title}":`, error);
    return null;
  }
}

interface TaggedVideo extends Omit<YouTubeVideo, 'description'> {
  hasMetadata: true; // Always true now - all videos have metadata entries
  firestoreId: string; // Always present now
  tags: string[]; // Always present, can be empty array (YouTube-sourced, editable via YouTube)
  description: string; // YouTube description (YouTube-sourced, editable via YouTube)
  createdTime?: Date | { seconds: number } | any; // Firebase Timestamp or Date (YouTube-sourced, editable via YouTube)
  location?: { latitude: number; longitude: number; altitude?: number } | null; // YouTube location data (YouTube-sourced)
  allPlaylists?: Array<{id: string, title: string}>; // All playlists the video belongs to (YouTube-sourced)
  lastMetadataRefresh?: Date | { seconds: number } | any; // When metadata was last refreshed
  youtubeId?: string; // YouTube video ID
}

export default function TagVideosPage() {
  const [videos, setVideos] = useState<TaggedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);  const [selectedVideo, setSelectedVideo] = useState<TaggedVideo | null>(null);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [catName, setCatName] = useState('');

  // YouTube-editable fields (these will be updated on YouTube first, then synced to Firebase)
  const [youtubeTitle, setYoutubeTitle] = useState<string>('');
  const [youtubeTags, setYoutubeTags] = useState<string>('');
  const [youtubeDescription, setYoutubeDescription] = useState<string>('');
  const [youtubeRecordingDate, setYoutubeRecordingDate] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [updatingYoutube, setUpdatingYoutube] = useState(false);
  // Batch YouTube-editable fields
  const [batchYoutubeTitle, setBatchYoutubeTitle] = useState<string>('');
  const [batchYoutubeTags, setBatchYoutubeTags] = useState<string>('');
  const [batchYoutubeDescription, setBatchYoutubeDescription] = useState<string>('');  const [batchYoutubeRecordingDate, setBatchYoutubeRecordingDate] = useState<string>('');const [showBatchActions, setShowBatchActions] = useState(false);  const [batchSaving, setBatchSaving] = useState(false);
  const [refreshingMetadata, setRefreshingMetadata] = useState(false);
  const [parsingDates, setParsingDates] = useState(false);
  const [processingVideos, setProcessingVideos] = useState<Set<string>>(new Set());

  // Cat selector states
  const [cats, setCats] = useState<Cat[]>([]);
  const [showCatSelector, setShowCatSelector] = useState(false);
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [catSelectorContext, setCatSelectorContext] = useState<'youtube-individual' | 'youtube-batch'>('youtube-individual');// Playlist selector states
  const [allPlaylists, setAllPlaylists] = useState<Array<{id: string, title: string, description: string, itemCount: number}>>([]);
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(new Set());
  const [playlistSelectorContext, setPlaylistSelectorContext] = useState<'individual' | 'batch'>('individual');
  const [loadingPlaylists, setLoadingPlaylists] = useState(false); // Filter states
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
    loadPlaylists();
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
      for (const video of youtubeVideos) {        if (!metadataMap.has(video.id)) {          const videoData = {
            videoUrl: video.videoUrl,
            storagePath: video.videoUrl,
            tags: [],
            uploadDate: new Date(),
            uploadedBy: 'admin',
            description: video.description || '',
            thumbnailUrl: video.thumbnailUrl,
            duration: video.duration,
            videoType: 'youtube' as const,
            youtubeId: video.id,            title: video.title,
            publishedAt: video.publishedAt,
            recordingDate: video.recordingDate || null,
            channelTitle: video.channelTitle,            createdTime: null, // Leave empty for manual entry
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
        const metadata = metadataMap.get(video.id);        return {
          ...video,
          hasMetadata: true, // Now all videos have metadata
          firestoreId: metadata!.id, // Safe to use ! since we created all missing entries
          tags: metadata?.tags || [],
          description: metadata?.description || video.description || '',
          createdTime: metadata?.createdTime || null,
          allPlaylists: metadata?.allPlaylists || [],
          lastMetadataRefresh: metadata?.lastMetadataRefresh || null,
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
  };  const handleVideoSelect = (video: TaggedVideo) => {
    setSelectedVideo(video);

    // Populate YouTube-editable fields
    setYoutubeTitle(video.title || '');
    setYoutubeTags(video.tags.join(', '));
    setYoutubeDescription(video.description || ''); // Note: This starts as the current YouTube description

    // Format recording date for input (YYYY-MM-DD)
    let recordingDateStr = '';
    if (video.recordingDate) {
      try {
        const date = new Date(video.recordingDate);
        if (!isNaN(date.getTime())) {
          recordingDateStr = date.toISOString().split('T')[0];
        }
      } catch (e) {
        console.warn('Error parsing recording date:', video.recordingDate);
      }
    }
    setYoutubeRecordingDate(recordingDateStr);
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
  const handleSave = async () => {
    if (!selectedVideo) return;

    try {
      setSaving(true);
      setUpdatingYoutube(true);

      console.log('Starting YouTube-first save process...');

      // Step 1: Check if we need to update YouTube fields
      const youtubeUpdates: any = {};
      let hasYoutubeChanges = false;

      // Check for title changes
      if (youtubeTitle !== selectedVideo.title) {
        youtubeUpdates.title = youtubeTitle;
        hasYoutubeChanges = true;
      }

      // Check for tag changes
      const currentTags = selectedVideo.tags.join(', ');
      if (youtubeTags !== currentTags) {
        youtubeUpdates.tags = youtubeTags.split(',').map(tag => tag.trim()).filter(Boolean);
        hasYoutubeChanges = true;
      }

      // Check for YouTube description changes (different from Firebase description)
      if (youtubeDescription !== selectedVideo.description) {
        youtubeUpdates.description = youtubeDescription;
        hasYoutubeChanges = true;
      }

      // Check for recording date changes
      const currentRecordingDate = selectedVideo.recordingDate
        ? new Date(selectedVideo.recordingDate).toISOString().split('T')[0]
        : '';
      if (youtubeRecordingDate !== currentRecordingDate) {
        youtubeUpdates.recordingDate = youtubeRecordingDate ? new Date(youtubeRecordingDate).toISOString() : undefined;
        hasYoutubeChanges = true;
      }

      // Step 2: Update YouTube if there are changes
      if (hasYoutubeChanges) {
        console.log('Updating YouTube with changes:', youtubeUpdates);

        const youtubeResponse = await fetch('/api/update-youtube-video', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: selectedVideo.youtubeId || selectedVideo.id,
            updates: youtubeUpdates
          })
        });

        if (!youtubeResponse.ok) {
          const errorData = await youtubeResponse.json();
          throw new Error(`YouTube update failed: ${errorData.error || 'Unknown error'}`);
        }

        const youtubeResult = await youtubeResponse.json();
        console.log('✅ YouTube update successful:', youtubeResult);

        // Step 3: Refresh metadata from YouTube to sync changes to Firebase
        console.log('Refreshing metadata from YouTube...');
        const refreshResponse = await fetch('/api/refresh-video-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoIds: [selectedVideo.youtubeId || selectedVideo.id]
          })
        });

        if (!refreshResponse.ok) {
          console.warn('Failed to refresh metadata, but YouTube update was successful');
        } else {
          console.log('✅ Metadata refresh successful');
        }
      }      // Step 4: Update Firestore-only fields (cat name, etc.)
      const videoData = {
        uploadDate: new Date(),
        uploadedBy: 'admin',
        videoType: 'youtube' as const,
        youtubeId: selectedVideo.youtubeId || selectedVideo.id,
      };

      if (selectedVideo.firestoreId) {
        await updateDoc(doc(db, 'cat_videos', selectedVideo.firestoreId), videoData);
        console.log('✅ Updated Firestore-only fields');
      }      // Step 5: Reload videos to reflect all changes
      await loadVideos();

      setSelectedVideo(null);
      setYoutubeTitle('');
      setYoutubeTags('');
      setYoutubeDescription('');
      setYoutubeRecordingDate('');

      console.log('✅ Save process completed successfully');

    } catch (err) {
      console.error('Error in save process:', err);
      setError(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
      setUpdatingYoutube(false);
    }  };
  const handleBatchSave = async () => {
    if (selectedVideos.size === 0) return;

    try {
      setBatchSaving(true);
      setError(null);      const videoIds = Array.from(selectedVideos);
      let youtubeUpdateResults = [];

      // Step 1: Update YouTube fields
      console.log('Performing batch YouTube updates...');

        for (const videoId of videoIds) {
          const video = videos.find(v => v.id === videoId);
          if (!video) continue;

          const youtubeUpdates: any = {};
          let hasYoutubeChanges = false;

          // Check for title changes
          if (batchYoutubeTitle.trim() && batchYoutubeTitle !== video.title) {
            youtubeUpdates.title = batchYoutubeTitle;
            hasYoutubeChanges = true;
          }

          // Check for tag changes
          if (batchYoutubeTags.trim()) {
            const newTags = batchYoutubeTags.split(',').map(tag => tag.trim()).filter(Boolean);
            const currentTags = video.tags.join(', ');
            if (batchYoutubeTags !== currentTags) {
              youtubeUpdates.tags = newTags;
              hasYoutubeChanges = true;
            }
          }

          // Check for YouTube description changes
          if (batchYoutubeDescription.trim() && batchYoutubeDescription !== video.description) {
            youtubeUpdates.description = batchYoutubeDescription;
            hasYoutubeChanges = true;
          }

          // Check for recording date changes
          if (batchYoutubeRecordingDate.trim()) {
            const currentRecordingDate = video.recordingDate
              ? new Date(video.recordingDate).toISOString().split('T')[0]
              : '';
            if (batchYoutubeRecordingDate !== currentRecordingDate) {
              youtubeUpdates.recordingDate = new Date(batchYoutubeRecordingDate).toISOString();
              hasYoutubeChanges = true;
            }
          }

          // Update YouTube if there are changes
          if (hasYoutubeChanges) {
            try {
              const youtubeResponse = await fetch('/api/update-youtube-video', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  videoId: video.youtubeId || video.id,
                  updates: youtubeUpdates
                })
              });

              if (youtubeResponse.ok) {
                youtubeUpdateResults.push({ videoId, success: true });
              } else {
                const errorData = await youtubeResponse.json();
                youtubeUpdateResults.push({
                  videoId,
                  success: false,
                  error: errorData.error || 'Unknown error'
                });
              }
            } catch (err) {
              youtubeUpdateResults.push({
                videoId,
                success: false,
                error: err instanceof Error ? err.message : 'Unknown error'
              });
            }
          }
        }        // Refresh metadata for successfully updated videos
        const successfulUpdates = youtubeUpdateResults.filter(r => r.success);
        if (successfulUpdates.length > 0) {
          console.log('Refreshing metadata for updated videos...');
          try {
            await fetch('/api/refresh-video-metadata', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                videoIds: successfulUpdates.map(r => r.videoId)
              })
            });
          } catch (err) {
            console.warn('Failed to refresh metadata after YouTube updates:', err);
          }
        }

      // Step 2: Update Firestore-only fields (cat names, etc.) - simplified since no more Firebase-only description
      // Currently, we don't have any Firestore-only fields to update in batch mode
      // This section is reserved for future Firebase-only field updates

      // Step 3: Reload videos to reflect all changes
      await loadVideos();      // Clear selection and reset form
      setSelectedVideos(new Set());
      setShowBatchActions(false);
      setBatchYoutubeTitle('');
      setBatchYoutubeTags('');      setBatchYoutubeDescription('');
      setBatchYoutubeRecordingDate('');

      // Show results if YouTube updates were attempted
      if (youtubeUpdateResults.length > 0) {
        const successful = youtubeUpdateResults.filter(r => r.success).length;
        const failed = youtubeUpdateResults.filter(r => !r.success).length;

        let message = `Batch save completed!\n\nFirestore updates: ${videoIds.length} videos`;
        if (successful > 0) message += `\nYouTube updates: ${successful} successful`;
        if (failed > 0) message += `, ${failed} failed`;

        alert(message);
      }

    } catch (err) {
      console.error('Error batch saving videos:', err);
      setError('Failed to save batch video metadata');
    } finally {
      setBatchSaving(false);
    }
  };

  const handleRefreshMetadata = async () => {
    if (selectedVideos.size === 0) {
      alert('Please select at least one video to refresh metadata.');
      return;
    }    const confirmed = confirm(
      `⚠️ COMPLETE REFRESH for ${selectedVideos.size} selected video(s)\n\n` +
      'This will RESET ALL data with fresh YouTube metadata:\n' +
      '• Titles, descriptions, thumbnails, tags, dates\n' +
      '• Cat names → cleared\n' +
      '• Playlist assignments → cleared\n' +
      '• Tagging status → based on YouTube tags\n\n' +
      'This is a FULL refresh. Continue?'
    );

    if (!confirmed) return;

    try {
      setRefreshingMetadata(true);
      setError(null);

      const videoIds = Array.from(selectedVideos);

      const response = await fetch('/api/refresh-video-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoIds }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to refresh metadata');
      }

      // Reload videos to show updated metadata
      await loadVideos();

      // Clear selection
      setSelectedVideos(new Set());
      setShowBatchActions(false);

      alert(
        `Metadata refresh completed!\n\n` +
        `Updated: ${result.summary.updated} videos\n` +
        `Not found: ${result.summary.notFound} videos`
      );

    } catch (err) {
      console.error('Error refreshing metadata:', err);
      setError(`Failed to refresh metadata: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRefreshingMetadata(false);
    }
  };  const handleRefreshSingleMetadata = async (video: TaggedVideo) => {
    const confirmed = confirm(
      `⚠️ COMPLETE REFRESH for "${video.title}"\n\n` +
      'This will RESET ALL data with fresh YouTube metadata:\n' +
      '• Title, description, thumbnail, tags, dates\n' +
      '• Cat names → cleared\n' +
      '• Playlist assignments → cleared\n' +
      '• Tagging status → based on YouTube tags\n\n' +
      'This is a FULL refresh. Continue?'
    );

    if (!confirmed) return;

    try {
      setRefreshingMetadata(true);
      setError(null);

      const response = await fetch('/api/refresh-video-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoIds: [video.id] }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to refresh metadata');
      }

      // Reload videos to show updated metadata
      await loadVideos();

      alert('Metadata refreshed successfully!');

    } catch (err) {
      console.error('Error refreshing metadata:', err);
      setError(`Failed to refresh metadata: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRefreshingMetadata(false);
    }  };
  const handleAutomaticDateParsing = async () => {
    // Count videos that could benefit from date parsing
    const videosNeedingDates = videos.filter(video => {
      const hasNoCreatedTime = !video.createdTime;
      const couldParseDate = parseRecordingDateFromTitle(video.title) !== null;
      return hasNoCreatedTime && couldParseDate;
    });

    if (videosNeedingDates.length === 0) {
      alert('❌ No videos found that need date parsing.\\n\\nEither all videos already have creation dates, or no video titles contain parseable date patterns.');
      return;
    }    const confirmed = confirm(
      `🤖 Automatic Date Parsing\\n\\n` +
      `This will parse creation dates from video titles and update:\\n` +
      `• YouTube recording date field\\n` +
      `• Firestore createdTime field\\n\\n` +
      `Found ${videosNeedingDates.length} video(s) that could benefit from date parsing.\\n\\n` +
      `⚠️ This will make changes to YouTube and may take time to process.\\n\\n` +
      `Continue?`
    );

    if (!confirmed) return;    try {
      setParsingDates(true);
      setError(null);
      setProcessingVideos(new Set()); // Clear any previous processing state

      let successCount = 0;
      let failCount = 0;
      const results = [];

      console.log(`Starting automatic date parsing for ${videosNeedingDates.length} videos...`);      for (const video of videosNeedingDates) {
        try {
          // Add video to processing set to show visual feedback
          setProcessingVideos(prev => {
            const newSet = new Set(prev);
            newSet.add(video.id);
            return newSet;
          });

          const parsedDate = parseRecordingDateFromTitle(video.title);
          if (parsedDate) {
            console.log(`📅 Parsing date for "${video.title}": ${parsedDate.toISOString()}`);            // Update YouTube first
            try {
              const response = await fetch('/api/update-youtube-video', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  videoId: video.id,
                  updates: {
                    recordingDate: parsedDate.toISOString(),
                  },
                }),
              });

              if (response.ok) {
                console.log(`✅ YouTube updated for ${video.id}`);

                // Update Firestore createdTime
                if (video.firestoreId) {
                  await updateDoc(doc(db, 'cat_videos', video.firestoreId), {
                    createdTime: parsedDate,
                    recordingDate: parsedDate.toISOString().split('T')[0],
                    lastMetadataRefresh: new Date()
                  });
                  console.log(`✅ Firestore updated for ${video.id}`);
                }

                successCount++;
                results.push({
                  video: video.title,
                  date: parsedDate.toISOString().split('T')[0],
                  success: true                });
              } else {
                throw new Error(`YouTube API error: ${response.status}`);
              }
            } catch (youtubeError) {
              console.error(`❌ Failed to update YouTube for ${video.id}:`, youtubeError);
              failCount++;
              results.push({
                video: video.title,
                date: parsedDate.toISOString().split('T')[0],
                success: false,
                error: youtubeError instanceof Error ? youtubeError.message : 'Unknown error'
              });
            }
          }

          // Remove video from processing set after completion
          setProcessingVideos(prev => {
            const newSet = new Set(prev);
            newSet.delete(video.id);
            return newSet;
          });

        } catch (error) {
          console.error(`❌ Error processing ${video.title}:`, error);
          failCount++;
          results.push({
            video: video.title,
            success: false,
            error: error instanceof Error ? error.message : 'Date parsing failed'
          });

          // Remove video from processing set even on error
          setProcessingVideos(prev => {
            const newSet = new Set(prev);
            newSet.delete(video.id);
            return newSet;
          });
        }
      }

      // Reload videos to reflect changes
      await loadVideos();

      // Show results
      let message = `📅 Automatic Date Parsing Complete!\\n\\n`;
      message += `✅ Successfully processed: ${successCount} videos\\n`;
      if (failCount > 0) {
        message += `❌ Failed: ${failCount} videos\\n`;
      }

      if (results.length > 0) {
        message += `\\nDetails:\\n`;
        results.slice(0, 10).forEach(result => {
          const status = result.success ? '✅' : '❌';
          const dateInfo = result.date ? ` (${result.date})` : '';
          message += `${status} ${result.video}${dateInfo}\\n`;
        });
        if (results.length > 10) {
          message += `... and ${results.length - 10} more\\n`;
        }
      }

      alert(message);

    } catch (error) {
      console.error('Error during automatic date parsing:', error);
      setError(`Failed to parse dates: ${error instanceof Error ? error.message : 'Unknown error'}`);    } finally {
      setParsingDates(false);
      setProcessingVideos(new Set()); // Clear processing state
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
  };  // Load playlists from server
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
  };  // Determine tagged/untagged based on whether video has tags
  const untaggedVideos = videos.filter(v => v.tags.length === 0);
  const taggedVideos = videos.filter(v => v.tags.length > 0);  // Apply filters to get displayed videos
  const filteredVideos = videos.filter(video => {
    // Tag filtering - check if video has tags instead of needsTagging field
    const hasNoTags = video.tags.length === 0;
    if (hasNoTags && !showUntaggedVideos) return false;
    if (!hasNoTags && !showTaggedVideos) return false;    // Date filtering (only if enabled)
    if (enableDateFilter) {
      const recordingDate = video.recordingDate;

      // Handle videos without recording date
      if (!recordingDate) {
        if (!showVideosWithoutTimestamp) return false;
      } else {
        // Convert recordingDate to date string for comparison
        const recordingDateStr = new Date(recordingDate).toISOString().split('T')[0];
        // Apply date range filters if they are set
        if (dateFilterFrom && recordingDateStr < dateFilterFrom) return false;
        if (dateFilterTo && recordingDateStr > dateFilterTo) return false;
      }
    } else {
      // When date filter is disabled, check if we should show videos without timestamp
      const recordingDate = video.recordingDate;
      if (!recordingDate && !showVideosWithoutTimestamp) return false;
    }return true;
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
  // YouTube tags handlers for individual editing
  const handleYoutubeTagsInputClick = () => {
    setCatSelectorContext('youtube-individual');
    setShowCatSelector(true);
    // Parse existing YouTube tags to pre-select cats
    const existingTags = youtubeTags.split(',').map(tag => tag.trim()).filter(Boolean);
    const preSelectedCats = new Set<string>();
    cats.forEach(cat => {
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
    const selectedCatNames = cats
      .filter(cat => newSelectedCats.has(cat.id))
      .map(cat => cat.name);
    setYoutubeTags(selectedCatNames.join(', '));
  };

  // YouTube tags handlers for batch editing
  const handleBatchYoutubeTagsInputClick = () => {
    setCatSelectorContext('youtube-batch');
    setShowCatSelector(true);
    // Parse existing batch YouTube tags to pre-select cats
    const existingTags = batchYoutubeTags.split(',').map(tag => tag.trim()).filter(Boolean);
    const preSelectedCats = new Set<string>();
    cats.forEach(cat => {
      if (existingTags.includes(cat.name)) {
        preSelectedCats.add(cat.id);
      }
    });
    setSelectedCats(preSelectedCats);
  };

  const handleCatToggleYoutubeBatch = (catId: string, catName: string) => {
    const newSelectedCats = new Set(selectedCats);
    if (newSelectedCats.has(catId)) {
      newSelectedCats.delete(catId);
    } else {
      newSelectedCats.add(catId);
    }
    setSelectedCats(newSelectedCats);

    // Update batch YouTube tags input with selected cat names
    const selectedCatNames = cats
      .filter(cat => newSelectedCats.has(cat.id))
      .map(cat => cat.name);
    setBatchYoutubeTags(selectedCatNames.join(', '));
  };  // YouTube tag removal handler
  const removeYoutubeTag = (tagToRemove: string) => {
    const currentTags = youtubeTags.split(',').map(tag => tag.trim()).filter(Boolean);
    const updatedTags = currentTags.filter(tag => tag !== tagToRemove);
    const newTagsString = updatedTags.join(', ');
    setYoutubeTags(newTagsString);
  };

  // YouTube tag addition handler
  const addYoutubeTag = (newTag: string) => {
    if (!newTag.trim()) return;
    const currentTags = youtubeTags.split(',').map(tag => tag.trim()).filter(Boolean);
    if (!currentTags.includes(newTag.trim())) {
      currentTags.push(newTag.trim());
      setYoutubeTags(currentTags.join(', '));
    }
  };
  // YouTube tag removal functions
  const removeBatchYoutubeTag = (tagToRemove: string) => {
    const currentTags = batchYoutubeTags.split(',').map(tag => tag.trim()).filter(Boolean);
    const updatedTags = currentTags.filter(tag => tag !== tagToRemove);
    setBatchYoutubeTags(updatedTags.join(', '));
  };

  const addBatchYoutubeTag = (newTag: string) => {
    if (!newTag.trim()) return;
    const currentTags = batchYoutubeTags.split(',').map(tag => tag.trim()).filter(Boolean);    if (!currentTags.includes(newTag.trim())) {
      currentTags.push(newTag.trim());
      setBatchYoutubeTags(currentTags.join(', '));
    }
  };

  // Playlist management functions
  const handlePlaylistSelectorOpen = (context: 'individual' | 'batch') => {
    setPlaylistSelectorContext(context);
    setShowPlaylistSelector(true);

    // Pre-select current playlists for the selected video(s)
    if (context === 'individual' && selectedVideo) {
      const currentPlaylistIds = new Set(selectedVideo.allPlaylists?.map(p => p.id) || []);
      setSelectedPlaylists(currentPlaylistIds);
    } else if (context === 'batch') {
      // For batch, start with empty selection
      setSelectedPlaylists(new Set());
    }
  };

  const handlePlaylistToggle = (playlistId: string) => {
    const newSelected = new Set(selectedPlaylists);
    if (newSelected.has(playlistId)) {
      newSelected.delete(playlistId);
    } else {
      newSelected.add(playlistId);
    }
    setSelectedPlaylists(newSelected);
  };

  const handleSavePlaylistChanges = async () => {
    try {
      if (playlistSelectorContext === 'individual' && selectedVideo) {
        // Update playlists for individual video
        const response = await fetch('/api/manage-playlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'batch_update_playlists',
            videoId: selectedVideo.youtubeId || selectedVideo.id,
            playlistIds: Array.from(selectedPlaylists)
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update playlists');
        }

        const result = await response.json();
        console.log('Playlist update result:', result);

        // Refresh metadata to get updated playlist information
        await fetch('/api/refresh-video-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoIds: [selectedVideo.youtubeId || selectedVideo.id]
          })
        });

        // Reload videos to reflect changes
        await loadVideos();

        alert(`Playlist update completed!\nAdded: ${result.summary?.added || 0}\nRemoved: ${result.summary?.removed || 0}`);

      } else if (playlistSelectorContext === 'batch' && selectedVideos.size > 0) {
        // Update playlists for batch videos
        const videoIds = Array.from(selectedVideos);
        const results = [];

        for (const videoId of videoIds) {
          try {
            const response = await fetch('/api/manage-playlists', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'batch_update_playlists',
                videoId: videoId,
                playlistIds: Array.from(selectedPlaylists)
              })
            });

            if (response.ok) {
              const result = await response.json();
              results.push({ videoId, success: true, result });
            } else {
              const errorData = await response.json();
              results.push({ videoId, success: false, error: errorData.error });
            }
          } catch (error) {
            results.push({
              videoId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // Refresh metadata for all updated videos
        await fetch('/api/refresh-video-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoIds })
        });

        // Reload videos to reflect changes
        await loadVideos();

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        alert(`Batch playlist update completed!\nSuccessful: ${successful}\nFailed: ${failed}`);
      }

      setShowPlaylistSelector(false);
      setSelectedPlaylists(new Set());

    } catch (error) {
      console.error('Error updating playlists:', error);
      alert(`Failed to update playlists: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

      {/* YouTube API Configuration Status */}
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
      </div>      {/* Date Parsing Configuration Status */}
      <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
        <h3 className="text-sm font-semibold text-green-800 mb-2">Video Date Parsing</h3>
        <div className="text-sm space-y-1">
          <div>
            <span className="text-green-700">Date Parsing:</span>{' '}
            <span className="text-green-600">✅ Auto-extracts recording dates from video titles</span>
          </div>
          <div>
            <span className="text-green-700">Individual Videos:</span>{' '}
            <span className="text-green-600">✅ Parse button available in edit pane</span>
          </div>
          <div>
            <span className="text-green-700">Automatic Processing:</span>{' '}
            <span className="text-green-600">✅ Bulk automatic date parsing available</span>
          </div>
          <div className="text-xs text-green-600 mt-2">
            Supported date formats: yyyy-mm-dd hh.MM.ss, yyyymmdd_hhMMss, yyyy-mm-dd, yyyymmdd
          </div>
          <div className="text-xs text-green-600 mt-1">
            📅 Use "Automatic Date Parsing" to process all videos with parseable dates
          </div>
        </div>
      </div>{/* Video Statistics and Cleanup */}
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
          </button>          <button
            onClick={loadVideos}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 text-sm"
          >
            {loading ? 'Loading...' : '🔄 Refresh Videos'}
          </button>

          <button
            onClick={handleAutomaticDateParsing}
            disabled={parsingDates || loading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300 text-sm"
          >
            {parsingDates ? 'Parsing Dates...' : '📅 Automatic Date Parsing'}
          </button>
        </div>
      </div>      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Need Date Parsing</h3>          <p className="text-3xl font-bold text-purple-600">
            {videos.filter(video => {
              const hasNoCreatedTime = !video.createdTime;
              const couldParseDate = parseRecordingDateFromTitle(video.title) !== null;
              return hasNoCreatedTime && couldParseDate;
            }).length}
          </p>
          {processingVideos.size > 0 && (
            <p className="text-sm text-purple-500 mt-1">
              📅 Processing: {processingVideos.size}
            </p>
          )}
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
            </button>            {selectedVideos.size > 0 && (
              <button
                onClick={() => {
                  setSelectedVideos(new Set());
                  setShowBatchActions(false);
                }}
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
      </div>      {/* Batch Actions */}
      {showBatchActions && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-3">
            Batch Actions ({selectedVideos.size} videos selected)          </h3>

          {/* YouTube Fields */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
              <h4 className="text-md font-semibold text-yellow-800 mb-3">
                YouTube Fields (will be updated on YouTube first)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    YouTube Title (leave empty to keep existing)
                  </label>
                  <input
                    type="text"
                    value={batchYoutubeTitle}
                    onChange={(e) => setBatchYoutubeTitle(e.target.value)}
                    placeholder="New title for all selected videos..."
                    className="border border-gray-300 rounded px-3 py-2 w-full"
                  />
                </div>                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    YouTube Tags (comma-separated, leave empty to keep existing)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={batchYoutubeTags}
                      onChange={(e) => setBatchYoutubeTags(e.target.value)}
                      onClick={handleBatchYoutubeTagsInputClick}
                      placeholder="Click to select cats or type manually..."
                      className="border border-gray-300 rounded px-3 py-2 w-full cursor-pointer pr-16"
                    />
                    <button
                      type="button"
                      onClick={handleBatchYoutubeTagsInputClick}
                      className="absolute right-2 top-2 text-blue-500 hover:text-blue-700 text-sm"
                    >
                      🐱 Select
                    </button>
                  </div>

                  {/* Tag chips */}
                  {batchYoutubeTags && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {batchYoutubeTags.split(',').map((tag, index) => {
                        const trimmedTag = tag.trim();
                        if (!trimmedTag) return null;
                        return (
                          <span
                            key={index}
                            className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                          >
                            {trimmedTag}
                            <button
                              type="button"
                              onClick={() => removeBatchYoutubeTag(trimmedTag)}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    YouTube Description (leave empty to keep existing)
                  </label>
                  <textarea
                    value={batchYoutubeDescription}
                    onChange={(e) => setBatchYoutubeDescription(e.target.value)}
                    placeholder="New YouTube description for all selected videos..."
                    className="border border-gray-300 rounded px-3 py-2 w-full h-20 resize-none"
                  />
                </div>                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    YouTube Recording Date (leave empty to keep existing)
                  </label>
                  <input
                    type="date"
                    value={batchYoutubeRecordingDate}
                    onChange={(e) => setBatchYoutubeRecordingDate(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 w-full"
                  />
                </div>
              </div>              <p className="text-xs text-yellow-700 mt-2">
                ⚠️ These changes will be made directly to YouTube and may take time to process.
              </p>
            </div>

          {/* Playlists selection for batch update */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Playlists (YouTube) - Set for all selected videos
            </label>
            <div className="space-y-2">
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded border min-h-[2.5rem]">
                {selectedPlaylists.size > 0 ? (
                  <div className="space-y-1">
                    {Array.from(selectedPlaylists).map(playlistId => {
                      const playlist = allPlaylists.find(p => p.id === playlistId);
                      return playlist ? (
                        <div key={playlistId} className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <div className="font-medium text-sm">{playlist.title}</div>
                            <div className="text-xs text-gray-500">{playlist.itemCount} videos</div>
                          </div>
                        </div>
                      ) : null;
                    })}
                    <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
                      Selected: {selectedPlaylists.size} playlists
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 italic">No playlists selected (will remove from all playlists)</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => handlePlaylistSelectorOpen('batch')}
                disabled={loadingPlaylists}
                className="w-full px-3 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50 text-sm"
              >
                {loadingPlaylists ? 'Loading...' : '✏️ Select Playlists'}
              </button>
            </div>
            <div className="text-xs text-yellow-600 mt-1">
              ⚠️ All selected videos will be set to ONLY these playlists (removes from others)
            </div>
          </div>

          <div className="flex gap-2 flex-wrap items-center">            <button
              onClick={handleBatchSave}
              disabled={batchSaving}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
            >
              {batchSaving ? 'Saving...' : 'Save Batch Changes'}
            </button>
            <button
              onClick={handleRefreshMetadata}
              disabled={refreshingMetadata || selectedVideos.size === 0}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
              {refreshingMetadata ? 'Refreshing...' : 'Refresh Metadata'}
            </button>            <button              onClick={() => {
                setSelectedVideos(new Set());
                setShowBatchActions(false);
                setBatchYoutubeTitle('');
                setBatchYoutubeTags('');
                setBatchYoutubeDescription('');
                setBatchYoutubeRecordingDate('');
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
            <div className="text-sm text-gray-600 ml-4">
              💡 "Refresh Metadata" does a COMPLETE refresh from YouTube, clearing custom cat names and playlist assignments. To delete videos, use YouTube Studio.
            </div>
          </div>
        </div>
      )}{videos.length === 0 ? (
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
              {paginatedVideos.map((video) => (                <div
                  key={video.id}
                  className={`relative bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border-2 ${
                    selectedVideo?.id === video.id
                      ? 'border-blue-500'
                      : processingVideos.has(video.id)
                      ? 'border-purple-500 shadow-md'
                      : video.tags.length > 0
                      ? 'border-green-200'
                      : 'border-gray-200'
                  }`}
                >
                  {/* Processing overlay */}
                  {processingVideos.has(video.id) && (
                    <div className="absolute inset-0 bg-purple-500 bg-opacity-20 z-30 flex items-center justify-center rounded-lg">
                      <div className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        📅 Parsing Date...
                      </div>
                    </div>
                  )}
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
                  <div className="absolute top-2 right-2 z-10 flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRefreshSingleMetadata(video);
                      }}
                      disabled={refreshingMetadata}
                      className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded disabled:bg-gray-300"
                      title="Refresh metadata from YouTube"
                    >
                      🔄
                    </button>                    {video.tags.length > 0 ? (
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
                      </h3>                      <p className="text-xs text-gray-500 mb-1">
                        Published: {new Date(video.publishedAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500 mb-1">
                        Created: {video.createdTime ? (
                          <span className={`${
                            video.lastMetadataRefresh &&
                            new Date(video.lastMetadataRefresh.seconds ? video.lastMetadataRefresh.seconds * 1000 : video.lastMetadataRefresh).getTime() > Date.now() - 10000
                              ? 'text-green-600 font-medium'
                              : ''
                          }`}>
                            {new Date(video.createdTime.seconds ? video.createdTime.seconds * 1000 : video.createdTime).toLocaleDateString()}
                            {video.lastMetadataRefresh &&
                             new Date(video.lastMetadataRefresh.seconds ? video.lastMetadataRefresh.seconds * 1000 : video.lastMetadataRefresh).getTime() > Date.now() - 10000 && (
                              <span className="text-green-600"> ✨</span>
                            )}
                          </span>
                        ) : (
                          'null'
                        )}
                      </p><p className="text-xs text-blue-600 mb-2 font-mono break-all">
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
                  </p>                  <p className="text-xs text-gray-500 mb-1">
                    Created: {selectedVideo.createdTime ?
                      new Date(selectedVideo.createdTime.seconds ? selectedVideo.createdTime.seconds * 1000 : selectedVideo.createdTime).toLocaleDateString() :
                      'null'
                    }
                  </p>
                  <p className="text-xs text-gray-500 mb-1">
                    Metadata Refreshed: {selectedVideo.lastMetadataRefresh ?
                      new Date(selectedVideo.lastMetadataRefresh.seconds ? selectedVideo.lastMetadataRefresh.seconds * 1000 : selectedVideo.lastMetadataRefresh).toLocaleDateString() :
                      'Never'
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
                </div>                <div className="space-y-4">
                  {/* YouTube Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title (YouTube)
                    </label>
                    <input
                      type="text"
                      value={youtubeTitle}
                      onChange={(e) => setYoutubeTitle(e.target.value)}
                      placeholder="Video title..."
                      className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      ✏️ Changes will be saved to YouTube and synced to Firebase
                    </div>
                  </div>                  {/* YouTube Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags (YouTube)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={youtubeTags}
                        onChange={(e) => setYoutubeTags(e.target.value)}
                        onClick={handleYoutubeTagsInputClick}
                        placeholder="Click to select cats or type manually..."
                        className="border border-gray-300 rounded px-3 py-2 w-full text-sm cursor-pointer pr-16"
                      />
                      <button
                        type="button"
                        onClick={handleYoutubeTagsInputClick}
                        className="absolute right-2 top-2 text-blue-500 hover:text-blue-700 text-sm"
                      >
                        🐱 Select
                      </button>
                    </div>

                    {/* Tag chips */}
                    {youtubeTags && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {youtubeTags.split(',').map((tag, index) => {
                          const trimmedTag = tag.trim();
                          if (!trimmedTag) return null;
                          return (
                            <span
                              key={index}
                              className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                            >
                              {trimmedTag}
                              <button
                                type="button"
                                onClick={() => removeYoutubeTag(trimmedTag)}
                                className="ml-1 text-blue-600 hover:text-blue-800"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mt-1">
                      ✏️ Changes will be saved to YouTube and synced to Firebase
                    </div>
                  </div>

                  {/* YouTube Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      YouTube Description
                    </label>
                    <textarea
                      value={youtubeDescription}
                      onChange={(e) => setYoutubeDescription(e.target.value)}
                      placeholder="YouTube video description..."
                      rows={3}
                      className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      ✏️ Changes will be saved to YouTube and synced to Firebase
                    </div>
                  </div>                  {/* Recording Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recording Date (YouTube)
                    </label>
                    <div className="space-y-2">
                      <input
                        type="date"
                        value={youtubeRecordingDate}
                        onChange={(e) => setYoutubeRecordingDate(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedVideo) {
                            const parsedDate = parseRecordingDateFromTitle(selectedVideo.title);
                            if (parsedDate) {
                              // Convert to UTC+9 timezone (Korea Standard Time)
                              const utcTime = parsedDate.getTime();
                              const utcPlus9Time = new Date(utcTime + (9 * 60 * 60 * 1000));
                              const dateStr = utcPlus9Time.toISOString().split('T')[0];
                              setYoutubeRecordingDate(dateStr);
                              alert(`✅ Parsed date from title: ${dateStr}`);
                            } else {
                              alert('❌ Could not parse date from video title');
                            }
                          }
                        }}
                        className="w-full px-3 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 text-sm"
                      >
                        📅 Parse Date from Title
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      ✏️ Changes will be saved to YouTube and synced to Firebase
                    </div>
                  </div>{/* Playlists (YouTube) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Playlists (YouTube)
                    </label>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded border min-h-[2.5rem]">
                        {selectedVideo.allPlaylists && selectedVideo.allPlaylists.length > 0 ? (
                          <div className="space-y-1">
                            {selectedVideo.allPlaylists.map((playlist, index) => (
                              <div key={playlist.id || index} className="flex items-center justify-between">
                                <div className="flex flex-col">
                                  <div className="font-medium text-sm">{playlist.title}</div>
                                  <div className="text-xs text-gray-500">ID: {playlist.id}</div>
                                </div>
                              </div>
                            ))}
                            {selectedVideo.allPlaylists.length > 1 && (
                              <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
                                Total: {selectedVideo.allPlaylists.length} playlists
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-gray-500 italic">No playlists</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePlaylistSelectorOpen('individual')}
                        disabled={loadingPlaylists}
                        className="w-full px-3 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50 text-sm"
                      >
                        {loadingPlaylists ? 'Loading...' : '✏️ Edit Playlists'}
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      ✏️ Changes will be saved to YouTube and synced to Firebase
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving || updatingYoutube}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 text-sm"
                    >
                      {updatingYoutube ? 'Updating YouTube...' : saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => setSelectedVideo(null)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                    >
                      Cancel
                    </button>
                  </div>

                  {(saving || updatingYoutube) && (
                    <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                      <div className="font-medium text-blue-700 mb-1">Save Process:</div>
                      <div className="space-y-1">
                        <div className={updatingYoutube ? 'text-blue-600' : 'text-gray-500'}>
                          1. {updatingYoutube ? '🔄 Updating YouTube...' : '✅ YouTube updated'}
                        </div>
                        <div className={saving && !updatingYoutube ? 'text-blue-600' : 'text-gray-500'}>
                          2. {saving && !updatingYoutube ? '🔄 Syncing to Firebase...' : updatingYoutube ? '⏳ Pending' : '✅ Firebase synced'}
                        </div>
                      </div>
                    </div>
                  )}
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
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 flex flex-col">            <div className="flex justify-between items-center mb-4">              <h3 className="text-lg font-semibold">
                Select Cats {
                  catSelectorContext === 'youtube-batch' ? '(YouTube Tags - Batch)' :
                  catSelectorContext === 'youtube-individual' ? '(YouTube Tags - Individual)' :
                  '(YouTube Tags)'
                }
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
                        onChange={() => {
                          if (catSelectorContext === 'youtube-batch') {
                            handleCatToggleYoutubeBatch(cat.id, cat.name);
                          } else if (catSelectorContext === 'youtube-individual') {
                            handleCatToggleYoutubeIndividual(cat.id, cat.name);
                          }
                        }}
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
                  if (catSelectorContext === 'youtube-batch') {
                    setBatchYoutubeTags('');
                  } else if (catSelectorContext === 'youtube-individual') {
                    setYoutubeTags('');
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

      {/* Playlist Selector Modal */}
      {showPlaylistSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 flex flex-col">            <div className="flex justify-between items-center mb-4">              <h3 className="text-lg font-semibold">
                Manage Playlists {
                  playlistSelectorContext === 'batch' ? '(Batch Edit)' : '(Individual Edit)'
                }
              </h3>
              <button
                onClick={() => setShowPlaylistSelector(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            {/* Playlist list */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded">
              {allPlaylists.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No playlists found. Create a playlist in YouTube Studio.
                </div>
              ) : (
                <div className="space-y-2">
                  {allPlaylists.map((playlist) => (
                    <label
                      key={playlist.id}
                      className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-50 ${
                        selectedPlaylists.has(playlist.id) ? 'bg-blue-50 border border-blue-200' : 'border border-gray-200'
                      }`}
                    >                      <input
                        type="checkbox"
                        checked={selectedPlaylists.has(playlist.id)}
                        onChange={() => handlePlaylistToggle(playlist.id)}
                        className="mr-2"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{playlist.title}</div>
                        <div className="text-xs text-gray-500">ID: {playlist.id}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>            {/* Action buttons */}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowPlaylistSelector(false)}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlaylistChanges}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                Save Changes ({selectedPlaylists.size} selected)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getVideoService } from '@/services';
import { parseRecordingDateFromTitle } from '@/utils/dateParser';
import { parseDate } from '@/utils/parse-date';
import { adminStrings } from '@/constants/adminStrings';
import Button from '@/components/ui/Button';
import CatSelectorModal from '@/components/CatSelectorModal';
import { useDialog } from '@/components/ui/useDialog';
import { useMountain } from '@/components/MountainProvider';
import { useAuth } from '@/hooks/useAuth';
import { authHeader } from '@/lib/auth/authHeader';
import {
  useMediaListController,
  useDateAutoParse,
  MediaStatsCards,
  BatchActionsPanel,
  CatTagField,
  MediaGrid,
  PaginationBar,
} from '@/components/admin/media';
import { useYouTubeVideoMutations, type AdminVideo } from './useYouTubeVideoMutations';

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

type VideoSortKey = 'created' | 'uploaded' | 'updated';

const sortDate = (video: AdminVideo, sortBy: VideoSortKey): Date | null => {
  if (sortBy === 'created') {
    return video.createdTime ? parseDate(video.createdTime) : null;
  }
  if (sortBy === 'uploaded') {
    return video.uploadDate ? new Date(video.uploadDate) : null;
  }
  return video.updated ? new Date(video.updated) : null;
};

export default function TagVideosPage() {
  const mountainId = useMountain();

  // Signed-in user — the YouTube API routes are gated on 'manage-video', so every
  // call below carries this user's ID token.
  const { user } = useAuth();

  // Service references
  const videoService = getVideoService(mountainId);

  // Shared Modal-based alert/confirm (replaces the native dialogs — P6.1)
  const dialog = useDialog();

  // Read side: shared media-list controller (load/selection/filter/sort/pagination)
  const load = useCallback(async () => {
    const allVideos = await videoService.getAllVideos();
    return allVideos.map((video) => ({ ...video, processingStatus: null }) as AdminVideo);
  }, [videoService]);

  const c = useMediaListController<AdminVideo, VideoSortKey>({
    load,
    loadErrorMessage: t.alerts.loadFailed,
    sortDate,
    defaultSortBy: 'uploaded',
    dateFilterExcludesUndated: true,
  });

  // Write side: page-owned YouTube orchestration (edit form + batch mutations)
  const ytm = useYouTubeVideoMutations({
    videos: c.items,
    setVideos: c.setItems,
    reloadVideos: c.reload,
    setError: c.setError,
    videoService,
    dialog,
  });

  // Cat selector states (selection itself lives inside the shared CatSelectorModal;
  // the dead 'youtube-batch' context — never set by any trigger — was dropped)
  const [showCatSelector, setShowCatSelector] = useState(false);
  const [catSelectorContext, setCatSelectorContext] = useState<'batch' | 'youtube-individual'>(
    'batch'
  );

  // Playlist selector states (page-owned; YouTube-only surface)
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

  // 자동 날짜 인식: shared loop machinery (title/description date-source)
  /**
   * YouTube IDs whose parsed date landed on YouTube, collected during a run so the
   * Firestore sync afterwards knows which videos to re-read.
   */
  const autoParsedYoutubeIds = useRef<string[]>([]);

  const autoParse = useDateAutoParse<AdminVideo>({
    items: c.items,
    setItems: c.setItems,
    needsDate: (video) => !video.createdTime,
    parse: (video) => parseRecordingDateFromTitle(video.description || video.id || ''),
    label: (video) => video.description || video.id,
    // ⚠️ Writes to YouTube, NOT straight to Firestore. Video data is YouTube-owned: a
    // Firestore-only write does not survive, because refresh-video-metadata re-reads
    // YouTube's recordingDetails and nulls createdTime when YouTube has none — so the
    // next sync (or any other save on that video) erased every date parsed here.
    // Same shape as batchUpdateDate: PUT per video, then one Firestore sync at the end.
    applyUpdate: async (video, date) => {
      const youtubeVideoId = video.youtubeId || video.id;

      // parseRecordingDateFromTitle builds its Date from an ISO string with no `Z`, so it
      // is LOCAL time: calling .toISOString() on it moves the calendar day backwards in
      // any timezone ahead of UTC (2024-03-15 00:00 KST → 2024-03-14T15:00Z). Send the
      // calendar date the operator sees, at UTC midnight — the convention
      // saveVideoMetadata already uses for the per-video 촬영일 field.
      const calendarDate = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-');

      const response = await fetch('/api/update-youtube-video', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(await authHeader(user)),
        },
        body: JSON.stringify({
          videoId: youtubeVideoId,
          updates: { createdTime: `${calendarDate}T00:00:00.000Z` },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update YouTube video');
      }

      autoParsedYoutubeIds.current.push(youtubeVideoId);
    },
    mergeParsedDate: (video, date) => ({ ...video, createdTime: date }),
  });

  useEffect(() => {
    loadPlaylists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPlaylists = async () => {
    try {
      setLoadingPlaylists(true);
      console.log('Loading playlists...');

      const response = await fetch('/api/manage-playlists?action=list_playlists', {
        headers: await authHeader(user),
      });
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

  // Automatic date parsing: page-owned confirm/report copy around the shared loop
  const handleAutomaticDateParsing = async () => {
    if (autoParse.candidates.length === 0) {
      await dialog.alert(t.alerts.noVideosNeedParsing);
      return;
    }

    if (!(await dialog.confirm(t.alerts.autoParseConfirm(autoParse.candidates.length)))) return;

    try {
      c.setError(null);
      autoParsedYoutubeIds.current = [];
      const report = await autoParse.run();

      // Pull the dates YouTube just accepted back into Firestore. Without this the
      // parsed dates live only on YouTube until the next sync — the mirror image of the
      // bug this replaced (Firestore-only writes that YouTube later erased).
      if (autoParsedYoutubeIds.current.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 3000)); // YouTube propagation
        const refreshResponse = await fetch('/api/refresh-video-metadata', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await authHeader(user)),
          },
          body: JSON.stringify({ videoIds: autoParsedYoutubeIds.current }),
        });

        if (!refreshResponse.ok) {
          console.warn('Failed to sync auto-parsed dates to Firestore');
        }

        await c.reload();
      }

      let resultMessage = `${t.alerts.doneHeader}\n\n`;
      resultMessage += `${t.alerts.successLine(report.successCount)}\n`;
      if (report.failCount > 0) {
        resultMessage += `${t.alerts.failLine(report.failCount)}\n`;
      }
      resultMessage += t.alerts.detailsHeader;
      report.results.forEach((result) => {
        resultMessage += result.success
          ? `✅ ${result.label} → ${result.date}\n`
          : `❌ ${result.label} → ${result.error}\n`;
      });
      await dialog.alert(resultMessage);
    } catch (error) {
      console.error('❌ Error during automatic date parsing:', error);
      c.setError(t.alerts.parseFailed(error instanceof Error ? error.message : '알 수 없는 오류'));
    }
  };

  // Clearing the selection also resets the batch inputs
  const clearSelection = () => {
    c.clearSelection();
    ytm.setBatchTags('');
    ytm.setBatchYoutubeCreatedTime('');
    setSelectedPlaylists(new Set());
  };

  // Cat selector functions — CatSelectorModal pre-selects from the current tags
  // string and commits the new selection on 완료 (commit-on-done)
  const handleBatchTagsInputClick = () => {
    setCatSelectorContext('batch');
    setShowCatSelector(true);
  };

  const removeYoutubeTag = (tagToRemove: string) => {
    const currentTags = ytm.youtubeTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const updatedTags = currentTags.filter((tag) => tag !== tagToRemove);
    ytm.setYoutubeTags(updatedTags.join(', '));
  };

  const handleYoutubeTagsInputClick = () => {
    setCatSelectorContext('youtube-individual');
    setShowCatSelector(true);
  };

  const catSelectorTags = (catSelectorContext === 'batch' ? ytm.batchTags : ytm.youtubeTags)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  const handleCatSelectorTagsChange = (selectedCatNames: string[]) => {
    if (catSelectorContext === 'batch') {
      ytm.setBatchTags(selectedCatNames.join(', '));
    } else {
      ytm.setYoutubeTags(selectedCatNames.join(', '));
    }
  };

  // Playlist selector handler
  const handlePlaylistSelectorClick = () => {
    setPlaylistSelectorContext('individual');
    setShowPlaylistSelector(true);
    // Pre-select playlists that the video is already in
    const videoPlaylists = ytm.selectedVideo?.allPlaylists || [];
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
    if (!ytm.selectedVideo || ytm.selectedVideo.videoType !== 'youtube') {
      return;
    }

    try {
      setSavingPlaylists(true);

      const videoId = ytm.selectedVideo.youtubeId || ytm.selectedVideo.id;
      const currentPlaylistIds = new Set(ytm.selectedVideo.allPlaylists?.map((p) => p.id) || []);
      const newPlaylistIds = selectedPlaylists;

      console.log('Saving playlist changes for video:', videoId);
      console.log('Current playlists:', Array.from(currentPlaylistIds));
      console.log('New playlists:', Array.from(newPlaylistIds));

      // Use the manage-playlists API to update playlist membership
      const response = await fetch('/api/manage-playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await authHeader(user)),
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
          ...(await authHeader(user)),
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
      await c.reload();

      // Update the selected video with new playlist information
      const updatedVideos = await videoService.getAllVideos();
      const updatedVideo = updatedVideos.find((v) => v.id === ytm.selectedVideo!.id);
      if (updatedVideo) {
        ytm.setSelectedVideo(updatedVideo as AdminVideo);
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

      await dialog.alert(message);
    } catch (error) {
      console.error('Error saving playlist changes:', error);
      await dialog.alert(
        t.alerts.playlistSaveFailed(error instanceof Error ? error.message : '알 수 없는 오류')
      );
    } finally {
      setSavingPlaylists(false);
    }
  };

  if (c.loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <div className="mt-2 mb-4 h-1 w-12 rounded-full bg-brand" />
        <div className="flex items-center justify-center min-h-64">
          <div className="text-lg text-gray-600">{t.loading}</div>
        </div>
      </div>
    );
  }

  const getVideoThumbnail = (video: AdminVideo) => {
    // Return thumbnail URL if available, otherwise a default placeholder
    return video.thumbnailUrl || '/images/video-placeholder.png';
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <div className="mt-2 mb-4 h-1 w-12 rounded-full bg-brand" />

      {c.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {c.error}
          <button onClick={() => c.setError(null)} className="ml-2 text-red-500 hover:text-red-700">
            ×
          </button>
        </div>
      )}

      {/* Service Configuration Status */}
      <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
        <h3 className="text-sm font-semibold text-green-800 mb-2">{t.serviceBox.title}</h3>
        <div className="text-sm space-y-1">
          <div>
            <span className="text-green-700">{t.serviceBox.videosLabel}</span>{' '}
            <span className="text-green-600">{t.serviceBox.videosValue}</span>
          </div>
          <div>
            <span className="text-green-700">{t.serviceBox.operationsLabel}</span>{' '}
            <span className="text-green-600">{t.serviceBox.operationsValue}</span>
          </div>
          <div className="text-xs text-green-600 mt-2">{t.serviceBox.note}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6">
        <div className="mb-4 flex gap-3">
          <button
            onClick={ytm.syncWithYouTube}
            disabled={ytm.batchSaving}
            className={`inline-flex items-center justify-center rounded-lg font-medium transition-all px-3 py-1.5 text-sm text-white ${
              ytm.batchSaving
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 cursor-pointer'
            }`}
          >
            📺 {ytm.batchSaving ? t.actions.syncing : t.actions.sync}
          </button>

          <Button size="sm" onClick={() => c.reload()} disabled={c.loading}>
            🔄 {c.loading ? t.actions.refreshing : t.actions.refresh}
          </Button>

          <Button
            size="sm"
            onClick={handleAutomaticDateParsing}
            disabled={autoParse.parsing || c.loading}
          >
            📅 {autoParse.parsing ? t.actions.parsing : t.actions.autoDateParse}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <MediaStatsCards
        cards={[
          { label: t.stats.total, value: c.items.length },
          {
            label: t.stats.untagged,
            value: c.untaggedItems.length,
            valueClassName: 'text-orange-600',
          },
          { label: t.stats.tagged, value: c.taggedItems.length, valueClassName: 'text-green-600' },
        ]}
      />

      {/* Filter Controls (page-owned markup — layout drifted from tag-images'
          MediaFilterBar: no section headers, clear-dates shortcut, 3-way sort) */}
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-6">
        {/* Tag Filters */}
        <div className="flex gap-6 mb-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={c.showTagged}
              onChange={(e) => c.setShowTagged(e.target.checked)}
              className="w-4 h-4 accent-brand-500 rounded mr-2"
            />
            <span className="text-sm text-gray-700">
              {t.filters.showTagged(c.taggedItems.length)}
            </span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={c.showUntagged}
              onChange={(e) => c.setShowUntagged(e.target.checked)}
              className="w-4 h-4 accent-brand-500 rounded mr-2"
            />
            <span className="text-sm text-gray-700">
              {t.filters.showUntagged(c.untaggedItems.length)}
            </span>
          </label>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={c.enableDateFilter}
              onChange={(e) => c.setEnableDateFilter(e.target.checked)}
              className="w-4 h-4 accent-brand-500 rounded mr-2"
            />
            <span className="text-sm text-gray-700">{t.filters.applyDateRange}</span>
          </label>
          <div className="flex items-center gap-2">
            <label className={`text-sm ${c.enableDateFilter ? 'text-gray-700' : 'text-gray-400'}`}>
              {t.filters.from}
            </label>
            <input
              type="date"
              value={c.dateFilterFrom}
              onChange={(e) => c.setDateFilterFrom(e.target.value)}
              disabled={!c.enableDateFilter}
              className={`border border-gray-300 rounded px-2 py-1 text-sm ${
                c.enableDateFilter ? 'bg-white' : 'bg-gray-100 text-gray-400'
              }`}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className={`text-sm ${c.enableDateFilter ? 'text-gray-700' : 'text-gray-400'}`}>
              {t.filters.to}
            </label>
            <input
              type="date"
              value={c.dateFilterTo}
              onChange={(e) => c.setDateFilterTo(e.target.value)}
              disabled={!c.enableDateFilter}
              className={`border border-gray-300 rounded px-2 py-1 text-sm ${
                c.enableDateFilter ? 'bg-white' : 'bg-gray-100 text-gray-400'
              }`}
            />
          </div>
          {c.enableDateFilter && (c.dateFilterFrom || c.dateFilterTo) && (
            <button
              onClick={() => {
                c.setDateFilterFrom('');
                c.setDateFilterTo('');
              }}
              className="text-sm text-brand-700 hover:text-brand-800 underline"
            >
              {t.filters.clearDates}
            </button>
          )}
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={c.showWithoutTimestamp}
              onChange={(e) => c.setShowWithoutTimestamp(e.target.checked)}
              className="w-4 h-4 accent-brand-500 rounded mr-2"
            />
            <span className="text-sm text-gray-700">
              {t.filters.showWithoutTimestamp(c.withoutTimestampCount)}
            </span>
          </label>
        </div>

        {/* Selection and Display Controls */}
        <div className="border-t border-gray-300 pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <Button size="sm" onClick={c.selectAllFiltered}>
              {t.filters.selectAll}
            </Button>
            {c.selectedIds.size > 0 && (
              <Button variant="secondary" size="sm" onClick={clearSelection}>
                {t.filters.clearSelection(c.selectedIds.size)}
              </Button>
            )}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">{t.filters.sortBy}</label>
              <select
                value={c.sortBy}
                onChange={(e) => c.setSortBy(e.target.value as VideoSortKey)}
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
              >
                <option value="created">{t.filters.sortCreated}</option>
                <option value="uploaded">{t.filters.sortPublished}</option>
                <option value="updated">{t.filters.sortUpdated}</option>
              </select>
              <select
                value={c.sortOrder}
                onChange={(e) => c.setSortOrder(e.target.value as 'asc' | 'desc')}
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
              >
                <option value="desc">{t.filters.newestFirst}</option>
                <option value="asc">{t.filters.oldestFirst}</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">{t.filters.perPage}</label>
              <select
                value={c.perPage}
                onChange={(e) => c.setPerPage(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="text-sm text-gray-600">
              {t.filters.showingRange(
                c.startIndex + 1,
                Math.min(c.endIndex, c.filteredItems.length),
                c.filteredItems.length
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Batch Actions */}
      {c.showBatchActions && (
        <BatchActionsPanel
          title={t.batch.title(c.selectedIds.size)}
          cancelLabel={t.batch.cancel}
          onCancel={clearSelection}
          columns={3}
        >
          {/* Tags Section */}
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <h4 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center">
              {t.batch.tags}
            </h4>
            <CatTagField
              value={ytm.batchTags}
              onChange={ytm.setBatchTags}
              onOpenSelector={handleBatchTagsInputClick}
              placeholder={t.batch.clickToSelect}
            />
            <Button
              size="sm"
              onClick={() => ytm.batchUpdateTags(c.selectedIds)}
              disabled={ytm.savingTags || !ytm.batchTags.trim()}
              className="w-full"
            >
              {ytm.savingTags ? t.batch.saving : t.batch.saveTags}
            </Button>
            <p className="text-xs text-yellow-700 mt-1">{t.batch.updatesYoutube}</p>
          </div>

          {/* Recording Date Section */}
          <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
            <h4 className="text-sm font-semibold text-purple-800 mb-2 flex items-center">
              {t.batch.recordingDate}
            </h4>
            <input
              type="datetime-local"
              value={ytm.batchYoutubeCreatedTime}
              onChange={(e) => ytm.setBatchYoutubeCreatedTime(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 w-full text-sm mb-2"
            />
            <Button
              size="sm"
              onClick={() => ytm.batchUpdateDate(c.selectedIds)}
              disabled={ytm.savingDate || !ytm.batchYoutubeCreatedTime.trim()}
              className="w-full"
            >
              {ytm.savingDate ? t.batch.saving : t.batch.saveDate}
            </Button>
            <p className="text-xs text-purple-700 mt-1">{t.batch.updatesYoutube}</p>
          </div>

          {/* Playlists Section */}
          <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
            <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center">
              {t.batch.playlists}
            </h4>
            <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border mb-2 min-h-[1.5rem]">
              {selectedPlaylists.size > 0 ? (
                <div>
                  {Array.from(selectedPlaylists)
                    .slice(0, 2)
                    .map((playlistId) => {
                      const playlist = allPlaylists.find((p) => p.id === playlistId);
                      return playlist ? (
                        <div key={playlistId} className="truncate">
                          {playlist.title}
                        </div>
                      ) : null;
                    })}
                  {selectedPlaylists.size > 2 && (
                    <div className="text-gray-500">
                      {t.batch.moreCount(selectedPlaylists.size - 2)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500 italic">{t.batch.noneSelected}</div>
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
            >
              {loadingPlaylists ? t.batch.loading : t.batch.selectPlaylists}
            </button>
            <p className="text-xs text-green-700 mt-1">{t.batch.saveInModal}</p>
          </div>
        </BatchActionsPanel>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video List */}
        <div className="lg:col-span-2">
          <MediaGrid
            items={c.paginatedItems}
            emptyMessage={t.grid.noMatch}
            renderCard={(video) => (
              <div
                className={`relative bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border-2 ${
                  ytm.selectedVideo?.id === video.id
                    ? 'border-brand-500'
                    : autoParse.processingIds.has(video.id)
                      ? 'border-purple-500 shadow-md'
                      : video.tags && video.tags.length > 0
                        ? 'border-green-200'
                        : 'border-gray-200'
                }`}
              >
                {/* Processing indicator */}
                {autoParse.processingIds.has(video.id) && (
                  <div className="absolute inset-0 bg-purple-500 bg-opacity-20 z-30 flex items-center justify-center rounded-lg">
                    <div className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {t.grid.parsingDate}
                    </div>
                  </div>
                )}

                {/* Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={c.selectedIds.has(video.id)}
                    onChange={() => c.toggleSelection(video.id)}
                    className="w-4 h-4 accent-brand-500 rounded"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Status indicator */}
                <div className="absolute top-2 right-2 z-10 flex gap-1">
                  {video.tags && video.tags.length > 0 ? (
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                      {t.grid.tagged}
                    </span>
                  ) : (
                    <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded">
                      {t.grid.untagged}
                    </span>
                  )}
                </div>

                {/* Video type indicator */}
                <div className="absolute bottom-2 right-2 z-10">
                  <span
                    className={`text-white text-xs px-2 py-1 rounded ${
                      video.videoType === 'youtube' ? 'bg-red-600' : 'bg-gray-600'
                    }`}
                  >
                    {video.videoType === 'youtube' ? t.grid.youtube : t.grid.storage}
                  </span>
                </div>

                <div onClick={() => ytm.selectVideo(video)}>
                  {/* Video Thumbnail */}
                  <div className="relative">
                    <img
                      src={getVideoThumbnail(video)}
                      alt={video.title || video.id || 'Video'}
                      className="w-full h-36 object-cover rounded-t-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/arrow_north.svg';
                      }}
                    />
                  </div>

                  {/* Video Info */}
                  <div className="p-3">
                    <h3 className="font-medium text-sm line-clamp-2 mb-1">
                      {video.title || video.description || video.id}
                    </h3>
                    {video.uploadDate && (
                      <p className="text-xs text-gray-500 mb-1">
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
                    <p className="text-xs text-gray-500 mb-1">
                      {t.grid.created(
                        video.createdTime
                          ? (() => {
                              const date = parseDate(video.createdTime);
                              return date ? date.toLocaleDateString() : t.grid.invalidDate;
                            })()
                          : t.grid.nullDate
                      )}
                    </p>
                    {video.videoType === 'youtube' && (
                      <p className="text-xs text-gray-500 mb-2 font-mono break-all">
                        youtu.be/{video.youtubeId || video.id}
                      </p>
                    )}
                    {video.duration && (
                      <p className="text-xs text-gray-500 mb-2">
                        {t.grid.duration(formatDuration(video.duration))}
                      </p>
                    )}
                    {video.tags && video.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {video.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="bg-brand-100 text-ink text-xs px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {video.tags.length > 3 && (
                          <span className="text-xs text-gray-500">
                            {t.grid.moreCount(video.tags.length - 3)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          />

          {/* Pagination */}
          <PaginationBar
            currentPage={c.currentPage}
            totalPages={c.totalPages}
            onPageChange={c.setCurrentPage}
            previousLabel={t.grid.previous}
            nextLabel={t.grid.next}
            windowSize={5}
          />
        </div>

        {/* Tagging Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm sticky top-6">
            {ytm.selectedVideo ? (
              <>
                <div className="mb-4">
                  <img
                    src={getVideoThumbnail(ytm.selectedVideo)}
                    alt={ytm.selectedVideo.title || ytm.selectedVideo.id || 'Video'}
                    className="w-full h-32 object-cover rounded mb-2"
                  />

                  {/* Video Information Block */}
                  <h4 className="font-medium text-sm line-clamp-2">
                    {ytm.selectedVideo.title || ytm.selectedVideo.id}
                  </h4>
                  <p className="text-xs text-gray-500 mb-1">
                    {t.form.published}{' '}
                    {(() => {
                      try {
                        const date = ytm.selectedVideo.uploadDate
                          ? new Date(ytm.selectedVideo.uploadDate)
                          : null;
                        return date && !isNaN(date.getTime())
                          ? date.toLocaleDateString()
                          : t.form.unknown;
                      } catch (e) {
                        return t.form.unknown;
                      }
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 mb-1">
                    {t.form.created}{' '}
                    {ytm.selectedVideo.createdTime
                      ? (() => {
                          const date = parseDate(ytm.selectedVideo.createdTime);
                          return date ? date.toLocaleDateString() : t.form.invalidDate;
                        })()
                      : t.form.nullDate}
                  </p>
                  <p className="text-xs text-gray-500 mb-1">
                    {t.form.metadataUpdated}{' '}
                    {ytm.selectedVideo.updated
                      ? (() => {
                          try {
                            const date = new Date(ytm.selectedVideo.updated);
                            return !isNaN(date.getTime())
                              ? date.toLocaleDateString()
                              : t.form.unknown;
                          } catch (e) {
                            return t.form.unknown;
                          }
                        })()
                      : t.form.never}
                  </p>
                  {ytm.selectedVideo.videoType === 'youtube' && (
                    <>
                      <div className="text-xs mb-2">
                        <span className="text-gray-500">{t.form.youtubeLabel} </span>
                        <a
                          href={`https://youtu.be/${ytm.selectedVideo.youtubeId || ytm.selectedVideo.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-700 hover:text-brand-800 font-mono break-all"
                        >
                          youtu.be/{ytm.selectedVideo.youtubeId || ytm.selectedVideo.id}
                        </a>
                      </div>
                      <a
                        href={ytm.selectedVideo.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:text-brand-700 text-xs"
                      >
                        {t.form.viewOnYoutube}
                      </a>
                    </>
                  )}
                </div>

                <div className="space-y-4">
                  {/* YouTube Title */}
                  {ytm.selectedVideo.videoType === 'youtube' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.form.titleYoutube}
                      </label>
                      <input
                        type="text"
                        value={ytm.youtubeTitle}
                        onChange={(e) => ytm.setYoutubeTitle(e.target.value)}
                        placeholder={t.form.titlePlaceholder}
                        className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                      />
                      <div className="text-xs text-gray-500 mt-1">{t.form.syncNote}</div>
                    </div>
                  )}

                  {/* YouTube Tags */}
                  {ytm.selectedVideo.videoType === 'youtube' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.form.tagsYoutube}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={ytm.youtubeTags}
                          onChange={(e) => ytm.setYoutubeTags(e.target.value)}
                          onClick={handleYoutubeTagsInputClick}
                          placeholder={t.form.tagsPlaceholder}
                          className="border border-gray-300 rounded px-3 py-2 w-full text-sm cursor-pointer pr-16"
                        />
                        <button
                          type="button"
                          onClick={handleYoutubeTagsInputClick}
                          className="absolute right-2 top-2 text-brand-600 hover:text-brand-700 text-sm"
                        >
                          {t.form.selectBtn}
                        </button>
                      </div>

                      {/* Tag chips */}
                      {ytm.youtubeTags && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {ytm.youtubeTags.split(',').map((tag, index) => {
                            const trimmedTag = tag.trim();
                            if (!trimmedTag) return null;
                            return (
                              <span
                                key={index}
                                className="inline-flex items-center bg-brand-100 text-ink text-xs px-2 py-1 rounded"
                              >
                                {trimmedTag}
                                <button
                                  type="button"
                                  onClick={() => removeYoutubeTag(trimmedTag)}
                                  className="ml-1 text-ink/70 hover:text-ink"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <div className="text-xs text-gray-500 mt-1">{t.form.syncNote}</div>
                    </div>
                  )}

                  {/* YouTube Description */}
                  {ytm.selectedVideo.videoType === 'youtube' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.form.descriptionYoutube}
                      </label>
                      <textarea
                        value={ytm.youtubeDescription}
                        onChange={(e) => ytm.setYoutubeDescription(e.target.value)}
                        placeholder={t.form.descriptionPlaceholder}
                        rows={3}
                        className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                      />
                      <div className="text-xs text-gray-500 mt-1">{t.form.syncNote}</div>
                    </div>
                  )}

                  {/* Recording Date */}
                  {ytm.selectedVideo.videoType === 'youtube' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.form.createdTimeYoutube}
                      </label>
                      <div className="space-y-2">
                        <input
                          type="date"
                          value={ytm.youtubeCreatedTime}
                          onChange={(e) => ytm.setYoutubeCreatedTime(e.target.value)}
                          className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            if (ytm.selectedVideo && ytm.selectedVideo.title) {
                              const parsedDate = parseRecordingDateFromTitle(
                                ytm.selectedVideo.title
                              );
                              if (parsedDate) {
                                // Convert to UTC+9 timezone (Korea Standard Time)
                                const utcTime = parsedDate.getTime();
                                const utcPlus9Time = new Date(utcTime + 9 * 60 * 60 * 1000);
                                const dateStr = utcPlus9Time.toISOString().split('T')[0];
                                ytm.setYoutubeCreatedTime(dateStr);
                                void dialog.alert(t.alerts.parsedFromTitle(dateStr));
                              } else {
                                void dialog.alert(t.alerts.parseFromTitleFailed);
                              }
                            }
                          }}
                          className="w-full px-3 py-2 text-brand-700 bg-brand-50 border border-brand-200 rounded hover:bg-brand-100 text-sm"
                        >
                          {t.form.parseFromTitle}
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{t.form.syncNote}</div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={ytm.saveVideoMetadata}
                      disabled={ytm.saving || ytm.updatingYoutube}
                      className="flex-1"
                    >
                      {ytm.updatingYoutube
                        ? t.form.savingYoutube
                        : ytm.saving
                          ? t.form.saving
                          : t.form.saveChanges}
                    </Button>
                  </div>

                  {(ytm.saving || ytm.updatingYoutube) && (
                    <div className="text-xs text-gray-500 bg-brand-50 p-3 rounded border-l-4 border-brand-400">
                      <div className="font-medium text-ink mb-1">{t.form.saveProcess}</div>
                      <div className="space-y-1">
                        <div className={ytm.updatingYoutube ? 'text-brand-700' : 'text-gray-500'}>
                          1. {ytm.updatingYoutube ? t.form.step1Updating : t.form.step1Done}
                        </div>
                        <div
                          className={
                            ytm.saving && !ytm.updatingYoutube ? 'text-brand-700' : 'text-gray-500'
                          }
                        >
                          2.{' '}
                          {ytm.saving && !ytm.updatingYoutube
                            ? t.form.step2Waiting
                            : ytm.updatingYoutube
                              ? t.form.step2Pending
                              : t.form.step2Done}
                        </div>
                        <div
                          className={
                            ytm.saving && !ytm.updatingYoutube ? 'text-brand-700' : 'text-gray-500'
                          }
                        >
                          3.{' '}
                          {ytm.saving && !ytm.updatingYoutube
                            ? t.form.step3Syncing
                            : ytm.updatingYoutube
                              ? t.form.step3Pending
                              : t.form.step3Done}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* YouTube Playlists - Separate Management Section */}
                  {ytm.selectedVideo.videoType === 'youtube' && (
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        {t.form.playlistManagement}
                      </h4>

                      {/* Display current playlists */}
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {t.form.currentPlaylists}
                        </label>
                        {ytm.selectedVideo.allPlaylists &&
                        ytm.selectedVideo.allPlaylists.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {ytm.selectedVideo.allPlaylists.map((playlist) => (
                              <span
                                key={playlist.id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                              >
                                {playlist.title}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 italic">
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
                      >
                        {loadingPlaylists
                          ? t.form.loadingPlaylists
                          : savingPlaylists
                            ? t.form.savingChanges
                            : t.form.managePlaylists}
                      </button>

                      <div className="text-xs text-gray-500 mt-2">{t.form.playlistNote}</div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">{t.form.emptyPrompt}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {dialog.element}

      {/* Cat Selector Modal (shared; commits the selection on 완료) */}
      <CatSelectorModal
        isOpen={showCatSelector}
        onClose={() => setShowCatSelector(false)}
        selectedTags={catSelectorTags}
        onTagsChange={handleCatSelectorTagsChange}
        title={t.catSelector.title(catSelectorContext)}
      />

      {/* Playlist Selector Modal */}
      {showPlaylistSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {t.playlistSelector.title(playlistSelectorContext === 'batch')}
              </h3>
              <button
                onClick={() => setShowPlaylistSelector(false)}
                disabled={savingPlaylists}
                className="text-gray-500 hover:text-gray-700 text-xl disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* Saving indicator */}
            {savingPlaylists && (
              <div className="mb-4 bg-brand-50 border border-brand-200 p-3 rounded">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-500 mr-2"></div>
                  <span className="text-ink text-sm">{t.playlistSelector.savingNote}</span>
                </div>
              </div>
            )}

            {/* Playlist list */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded">
              {allPlaylists.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {t.playlistSelector.noPlaylists}
                </div>
              ) : (
                <div className="space-y-2">
                  {allPlaylists.map((playlist) => (
                    <label
                      key={playlist.id}
                      className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-50 ${
                        selectedPlaylists.has(playlist.id)
                          ? 'bg-brand-50 border border-brand-200'
                          : 'border border-gray-200'
                      } ${savingPlaylists ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlaylists.has(playlist.id)}
                        onChange={() => handlePlaylistToggle(playlist.id)}
                        disabled={savingPlaylists}
                        className="mr-2"
                      />

                      <div className="flex-1">
                        <div className="font-medium text-sm">{playlist.title}</div>
                        <div className="text-xs text-gray-500">{playlist.description}</div>
                        <div className="text-xs text-gray-400">
                          {t.playlistSelector.videoCount(playlist.itemCount)}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowPlaylistSelector(false);
                  // Reset selected playlists to original state
                  const videoPlaylists = ytm.selectedVideo?.allPlaylists || [];
                  const preSelectedPlaylists = new Set(videoPlaylists.map((p) => p.id));
                  setSelectedPlaylists(preSelectedPlaylists);
                }}
                disabled={savingPlaylists}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 text-sm disabled:opacity-50"
              >
                {t.playlistSelector.cancel}
              </button>
              <Button size="sm" onClick={savePlaylistChanges} disabled={savingPlaylists}>
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

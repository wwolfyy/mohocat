"use client";

import { useState, useEffect } from "react";
import { getVideoService, getCatService } from "@/services";
import { Cat } from "@/types";
import { CatVideo } from "@/types/media";

// Utility function to format duration from ISO 8601 or seconds to human-friendly format
function formatDuration(duration: number | string | undefined): string {
  if (!duration) return "Unknown";

  let totalSeconds: number;

  if (typeof duration === "number") {
    totalSeconds = duration;
  } else if (typeof duration === "string") {
    // Parse ISO 8601 duration format (e.g., "PT1M30S" = 1 minute 30 seconds)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) {
      return duration; // Return original if we can't parse
    }

    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    const seconds = parseInt(match[3] || "0", 10);

    totalSeconds = hours * 3600 + minutes * 60 + seconds;
  } else {
    return "Unknown";
  }

  // Format as HH:MM:SS, MM:SS, or SS depending on length
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  } else if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  } else {
    return `${seconds}s`;
  }
}

interface AdminVideo extends CatVideo {
  // Additional admin-specific properties can be added here
  processingStatus?: "updating" | "deleting" | null;
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
  const [youtubeTitle, setYoutubeTitle] = useState<string>("");
  const [youtubeTags, setYoutubeTags] = useState<string>("");
  const [youtubeDescription, setYoutubeDescription] = useState<string>("");
  const [youtubeCreatedTime, setYoutubeCreatedTime] = useState<string>("");
  const [updatingYoutube, setUpdatingYoutube] = useState(false);

  // Batch operation states
  const [batchTags, setBatchTags] = useState<string>("");
  const [batchYoutubeCreatedTime, setBatchYoutubeCreatedTime] =
    useState<string>("");
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const [savingDate, setSavingDate] = useState(false);

  // Cat selector states
  const [cats, setCats] = useState<Cat[]>([]);
  const [showCatSelector, setShowCatSelector] = useState(false);
  const [catSearchQuery, setCatSearchQuery] = useState("");
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [catSelectorContext, setCatSelectorContext] = useState<
    "batch" | "youtube-individual" | "youtube-batch"
  >("batch");

  // Playlist selector states
  const [allPlaylists, setAllPlaylists] = useState<
    Array<{ id: string; title: string; description: string; itemCount: number }>
  >([]);
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(
    new Set(),
  );
  const [playlistSelectorContext, setPlaylistSelectorContext] = useState<
    "individual" | "batch"
  >("individual");
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [savingPlaylists, setSavingPlaylists] = useState(false);

  // Filter states
  const [showTaggedVideos, setShowTaggedVideos] = useState(true);
  const [showUntaggedVideos, setShowUntaggedVideos] = useState(true);
  const [showVideosWithoutTimestamp, setShowVideosWithoutTimestamp] =
    useState(true);
  const [enableDateFilter, setEnableDateFilter] = useState(false);
  const [dateFilterFrom, setDateFilterFrom] = useState("");
  const [dateFilterTo, setDateFilterTo] = useState("");

  // Date parsing states
  const [parsingDates, setParsingDates] = useState(false);
  const [processingVideos, setProcessingVideos] = useState<Set<string>>(
    new Set(),
  );

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [videosPerPage, setVideosPerPage] = useState(25);

  // Sorting states
  const [sortBy, setSortBy] = useState<"created" | "uploaded" | "updated">(
    "uploaded",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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
      console.error("Error loading videos:", err);
      setError("Failed to load videos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCats = async () => {
    try {
      // Use service layer to get all cats
      const catService = getCatService();
      const catsData = await catService.getAllCats();
      setCats(catsData);
    } catch (error) {
      console.error("Error loading cats:", error);
    }
  };

  const loadPlaylists = async () => {
    try {
      setLoadingPlaylists(true);
      console.log("Loading playlists...");

      const response = await fetch("/api/manage-playlists");
      if (!response.ok) {
        throw new Error("Failed to fetch playlists");
      }

      const data = await response.json();
      if (data.success) {
        setAllPlaylists(data.playlists);
        console.log(`Loaded ${data.playlists.length} playlists`);
      } else {
        throw new Error(data.error || "Failed to load playlists");
      }
    } catch (error) {
      console.error("Error loading playlists:", error);
      // Don't set the main error since playlists are optional
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const selectVideo = (video: AdminVideo) => {
    setSelectedVideo(video);

    // Populate YouTube-specific fields
    setYoutubeTitle(video.title || "");
    setYoutubeTags(video.tags?.join(", ") || "");
    setYoutubeDescription(video.description || "");

    // Format recording date for YouTube field from Firestore createdTime
    let createdTimeStr = "";
    if (video.createdTime) {
      try {
        let date: Date;

        // Handle different date formats from Firestore
        if (video.createdTime instanceof Date) {
          date = video.createdTime;
        } else if (
          typeof video.createdTime === "object" &&
          video.createdTime !== null &&
          "seconds" in video.createdTime
        ) {
          // Firebase Timestamp object
          date = new Date((video.createdTime as any).seconds * 1000);
        } else {
          // String or other format
          date = new Date(video.createdTime as any);
        }

        if (!isNaN(date.getTime())) {
          // Convert to local date string for the date input (YYYY-MM-DD format)
          createdTimeStr = date.toISOString().split("T")[0];
          console.log(
            "Pre-populating recording date from Firestore createdTime:",
            createdTimeStr,
          );
        }
      } catch (e) {
        console.warn(
          "Error parsing createdTime from Firestore:",
          video.createdTime,
          e,
        );
      }
    }
    setYoutubeCreatedTime(createdTimeStr);
  };

  const saveVideoMetadata = async () => {
    if (!selectedVideo) return;

    // Only handle YouTube videos for now
    if (selectedVideo.videoType !== "youtube") {
      alert("Only YouTube videos can be edited from this interface.");
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
      if (youtubeDescription !== (selectedVideo.description || "")) {
        updates.description = youtubeDescription;
      }

      // Check if tags have changed
      const currentTags = (selectedVideo.tags || []).join(",");
      if (youtubeTags !== currentTags) {
        updates.tags = youtubeTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
      }

      // Check if recording date has changed
      let currentRecordingDate = "";
      if (selectedVideo.createdTime) {
        try {
          let date: Date;
          if (selectedVideo.createdTime instanceof Date) {
            date = selectedVideo.createdTime;
          } else if (
            typeof selectedVideo.createdTime === "object" &&
            selectedVideo.createdTime !== null &&
            "seconds" in selectedVideo.createdTime
          ) {
            // Firebase Timestamp object
            date = new Date((selectedVideo.createdTime as any).seconds * 1000);
          } else {
            // String or other format
            date = new Date(selectedVideo.createdTime as any);
          }

          if (!isNaN(date.getTime())) {
            currentRecordingDate = date.toISOString().split("T")[0];
          }
        } catch (e) {
          console.warn(
            "Error parsing createdTime for comparison:",
            selectedVideo.createdTime,
            e,
          );
        }
      }

      if (youtubeCreatedTime && youtubeCreatedTime !== currentRecordingDate) {
        // Convert to ISO string for YouTube API
        const createdTime = new Date(youtubeCreatedTime + "T00:00:00.000Z");
        updates.createdTime = createdTime.toISOString();
      }

      // If no changes were made, skip the update
      if (Object.keys(updates).length === 0) {
        alert("No changes detected to save.");
        return;
      }

      console.log("Updating YouTube video with:", updates);

      // Step 1: Update YouTube video metadata
      const updateResponse = await fetch("/api/update-youtube-video", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoId: videoId,
          updates: updates,
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || "Failed to update YouTube video");
      }

      const updateResult = await updateResponse.json();
      console.log("YouTube update result:", updateResult);

      setUpdatingYoutube(false);

      // Step 2: Wait for YouTube API to propagate changes
      // Recording date changes can take longer to propagate than other metadata
      const waitTime = updates.createdTime ? 3000 : 3000; // 3 seconds for all metadata updates
      console.log(
        `Waiting ${waitTime}ms for YouTube API to propagate changes...`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      // Step 3: Refresh metadata from YouTube to Firestore
      console.log("Syncing changes to Firestore...");
      const refreshPayload: any = {
        videoIds: [videoId],
      };

      // If we updated the recording date, pass the expected value for retry logic
      if (updates.createdTime) {
        refreshPayload.expectedRecordingDate = updates.createdTime;
        console.log("Expecting recording date to be:", updates.createdTime);
      }

      const refreshResponse = await fetch("/api/refresh-video-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(refreshPayload),
      });

      if (!refreshResponse.ok) {
        const errorData = await refreshResponse.json();
        throw new Error(
          errorData.error || "Failed to sync changes to Firestore",
        );
      }

      const refreshResult = await refreshResponse.json();
      console.log("Firestore sync result:", refreshResult);

      // Step 4: Update local state with the refreshed data
      await loadVideos();

      // Wait a moment for state to update, then get the fresh video data
      setTimeout(() => {
        setVideos((currentVideos) => {
          const updatedVideo = currentVideos.find(
            (v) => v.id === selectedVideo.id,
          );
          if (updatedVideo) {
            console.log(
              "Updating selected video with fresh data:",
              updatedVideo,
            );
            setSelectedVideo(updatedVideo);
            // Update form fields with the new data
            setYoutubeTitle(updatedVideo.title || "");
            setYoutubeDescription(updatedVideo.description || "");
            setYoutubeTags((updatedVideo.tags || []).join(","));

            // Update recording date from createdTime
            let updatedRecordingDate = "";
            if (updatedVideo.createdTime) {
              try {
                let date: Date;
                if (updatedVideo.createdTime instanceof Date) {
                  date = updatedVideo.createdTime;
                } else if (
                  typeof updatedVideo.createdTime === "object" &&
                  updatedVideo.createdTime !== null &&
                  "seconds" in updatedVideo.createdTime
                ) {
                  // Firebase Timestamp object
                  date = new Date(
                    (updatedVideo.createdTime as any).seconds * 1000,
                  );
                } else {
                  // String or other format
                  date = new Date(updatedVideo.createdTime as any);
                }

                if (!isNaN(date.getTime())) {
                  updatedRecordingDate = date.toISOString().split("T")[0];
                }
              } catch (e) {
                console.warn(
                  "Error parsing updated createdTime:",
                  updatedVideo.createdTime,
                  e,
                );
              }
            }
            setYoutubeCreatedTime(updatedRecordingDate);
          }
          return currentVideos; // Don't modify the videos array
        });
      }, 500); // Small delay to ensure state has updated

      alert("✅ Video metadata updated successfully!");
    } catch (err: any) {
      console.error("Error updating video metadata:", err);
      alert("❌ Failed to update video metadata: " + err.message);
    } finally {
      setSaving(false);
      setUpdatingYoutube(false);
    }
  };

  // Removed deleteVideoAndMetadata functionality

  const batchUpdateVideos = async () => {
    if (selectedVideos.size === 0) return;

    try {
      setBatchSaving(true);
      setError(null);

      const videoIds = Array.from(selectedVideos);
      let youtubeUpdateResults = [];

      // Step 1: Update YouTube fields
      console.log("Performing batch YouTube updates...");
      console.log(`Processing ${videoIds.length} selected videos:`, videoIds);

      for (const videoId of videoIds) {
        const video = videos.find((v) => v.id === videoId);
        if (!video) {
          console.warn(`Video not found for ID: ${videoId}`);
          continue;
        }

        console.log(`Processing video: ${video.title} (${videoId})`);

        const youtubeUpdates: any = {};
        let hasYoutubeChanges = false;

        // Check for tag changes
        if (batchTags.trim()) {
          const newTags = batchTags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean);
          const currentTags = video.tags || [];

          console.log(`Tag comparison for ${video.title}:`);
          console.log("  New tags:", newTags);
          console.log("  Current tags:", currentTags);

          // Compare arrays properly instead of comparing strings
          const tagsChanged =
            newTags.length !== currentTags.length ||
            !newTags.every((tag, index) => tag === currentTags[index]);

          console.log("  Tags changed:", tagsChanged);

          if (tagsChanged) {
            youtubeUpdates.tags = newTags;
            hasYoutubeChanges = true;
          }
        }

        // Check for created time changes
        if (batchYoutubeCreatedTime.trim()) {
          // Handle datetime-local format (YYYY-MM-DDTHH:mm)
          const newCreatedTime = new Date(
            batchYoutubeCreatedTime,
          ).toISOString();
          const currentCreatedTime = video.createdTime || "";

          // Compare timestamps properly (handle different ISO string formats)
          const newTimestamp = new Date(newCreatedTime).getTime();
          const currentTimestamp = currentCreatedTime
            ? new Date(currentCreatedTime).getTime()
            : 0;

          if (newTimestamp !== currentTimestamp) {
            youtubeUpdates.createdTime = newCreatedTime;
            hasYoutubeChanges = true;
            console.log(
              `Recording date change detected for ${video.title}: ${currentCreatedTime} → ${newCreatedTime}`,
            );
          }
        }

        // Update YouTube if there are changes
        if (hasYoutubeChanges) {
          console.log(
            `Updating YouTube for ${video.title} with:`,
            youtubeUpdates,
          );
          try {
            const youtubeResponse = await fetch("/api/update-youtube-video", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                videoId: video.youtubeId || video.id,
                updates: youtubeUpdates,
              }),
            });

            if (youtubeResponse.ok) {
              youtubeUpdateResults.push({ videoId, success: true });
              console.log(`✅ Successfully updated ${video.title}`);
            } else {
              const errorData = await youtubeResponse.json();
              youtubeUpdateResults.push({
                videoId,
                success: false,
                error: errorData.error || "Unknown error",
              });
              console.error(
                `❌ Failed to update ${video.title}:`,
                errorData.error,
              );
            }
          } catch (err) {
            youtubeUpdateResults.push({
              videoId,
              success: false,
              error: err instanceof Error ? err.message : "Unknown error",
            });
            console.error(`❌ Exception updating ${video.title}:`, err);
          }
        } else {
          console.log(`No changes needed for ${video.title}`);
        }
      }

      // Step 2: Sync Firestore with fresh YouTube metadata for successfully updated videos
      const successfulVideoIds = youtubeUpdateResults
        .filter((r) => r.success)
        .map((r) => r.videoId);

      if (successfulVideoIds.length > 0) {
        console.log(
          `Syncing Firestore for ${successfulVideoIds.length} successfully updated videos...`,
        );

        // Wait for YouTube API to propagate changes
        const waitTime = 3000; // 3 seconds for all metadata updates
        console.log(
          `Waiting ${waitTime}ms for YouTube API to propagate changes...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));

        const refreshResponse = await fetch("/api/refresh-video-metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoIds: successfulVideoIds,
          }),
        });

        if (refreshResponse.ok) {
          console.log("✅ Firestore synced with fresh YouTube metadata");
        } else {
          console.warn(
            "⚠️ Failed to sync Firestore, but YouTube updates were successful",
          );
        }
      }

      // Step 3: Update playlists for all selected videos (if playlist selections were made)
      let playlistUpdateResults = [];
      if (selectedPlaylists.size > 0 || videoIds.length > 0) {
        console.log("Updating playlists for selected videos...");
        for (const videoId of videoIds) {
          const video = videos.find((v) => v.id === videoId);
          if (!video) continue;

          try {
            const playlistResponse = await fetch("/api/manage-playlists", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "batch_update_playlists",
                videoId: video.youtubeId || video.id,
                playlistIds: Array.from(selectedPlaylists),
              }),
            });

            if (playlistResponse.ok) {
              playlistUpdateResults.push({ videoId, success: true });
              console.log(
                `✅ Successfully updated playlists for ${video.title}`,
              );
            } else {
              const errorData = await playlistResponse.json();
              playlistUpdateResults.push({
                videoId,
                success: false,
                error: errorData.error || "Unknown error",
              });
              console.error(
                `❌ Failed to update playlists for ${video.title}:`,
                errorData.error,
              );
            }
          } catch (err) {
            playlistUpdateResults.push({
              videoId,
              success: false,
              error: err instanceof Error ? err.message : "Unknown error",
            });
            console.error(
              `❌ Exception updating playlists for ${video.title}:`,
              err,
            );
          }
        }
      }

      // Step 4: Update local state by reloading from Firestore (single source of truth)
      console.log("Reloading videos from Firestore to update local state...");
      await loadVideos();
      console.log("✅ Local state updated from Firestore data");

      // Clear selection and reset form
      clearSelection();

      // Show results
      const youtubeSuccessful = youtubeUpdateResults.filter(
        (r) => r.success,
      ).length;
      const youtubeFailed = youtubeUpdateResults.filter(
        (r) => !r.success,
      ).length;
      const playlistSuccessful = playlistUpdateResults.filter(
        (r) => r.success,
      ).length;
      const playlistFailed = playlistUpdateResults.filter(
        (r) => !r.success,
      ).length;

      let message = `Batch save completed!\n\n✅ Data flow: UI → YouTube → Firestore → Local State`;
      if (youtubeSuccessful > 0)
        message += `\n\nYouTube updates (tags/dates): ${youtubeSuccessful} successful`;
      if (youtubeFailed > 0) message += `\nYouTube failures: ${youtubeFailed}`;
      if (playlistSuccessful > 0)
        message += `\nPlaylist updates: ${playlistSuccessful} successful`;
      if (playlistFailed > 0)
        message += `\nPlaylist failures: ${playlistFailed}`;
      message += `\nFirestore sync: ${youtubeSuccessful > 0 ? "Completed" : "Skipped (no successful updates)"}`;
      message += `\nLocal state: Updated from Firestore`;

      alert(message);
    } catch (err: any) {
      console.error("Error batch updating videos:", err);
      setError("Failed to save batch video metadata");
    } finally {
      setBatchSaving(false);
    }
  };

  // Individual save functions for each field
  const batchUpdateTags = async () => {
    if (selectedVideos.size === 0 || !batchTags.trim()) return;

    try {
      setSavingTags(true);
      setError(null);

      const videoIds = Array.from(selectedVideos);
      let youtubeUpdateResults = [];

      console.log("Performing batch tags update...");
      console.log(
        `Processing ${videoIds.length} selected videos for tags:`,
        batchTags,
      );

      for (const videoId of videoIds) {
        const video = videos.find((v) => v.id === videoId);
        if (!video) continue;

        const newTags = batchTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
        const currentTags = video.tags || [];

        const tagsChanged =
          newTags.length !== currentTags.length ||
          !newTags.every((tag, index) => tag === currentTags[index]);

        if (tagsChanged) {
          try {
            const youtubeResponse = await fetch("/api/update-youtube-video", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
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
              console.error(
                `❌ Failed to update tags for ${video.title}:`,
                errorData.error,
              );
            }
          } catch (err) {
            youtubeUpdateResults.push({
              videoId,
              success: false,
              error: err instanceof Error ? err.message : "Unknown error",
            });
            console.error(
              `❌ Exception updating tags for ${video.title}:`,
              err,
            );
          }
        }
      }

      // Sync Firestore if there were successful updates
      const successfulVideoIds = youtubeUpdateResults
        .filter((r) => r.success)
        .map((r) => r.videoId);
      if (successfulVideoIds.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for YouTube propagation

        const refreshResponse = await fetch("/api/refresh-video-metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoIds: successfulVideoIds }),
        });

        if (refreshResponse.ok) {
          console.log("✅ Firestore synced with fresh YouTube metadata");
        }
      }

      // Reload videos and show results
      await loadVideos();
      const successful = youtubeUpdateResults.filter((r) => r.success).length;
      const failed = youtubeUpdateResults.filter((r) => !r.success).length;

      let message = `Tags update completed!`;
      if (successful > 0)
        message += `\n✅ Successfully updated: ${successful} videos`;
      if (failed > 0) message += `\n❌ Failed: ${failed} videos`;

      alert(message);
      setBatchTags(""); // Clear tags after successful update
    } catch (err: any) {
      console.error("Error updating tags:", err);
      setError("Failed to update tags");
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

      console.log("Performing batch date update...");
      console.log(
        `Processing ${videoIds.length} selected videos for date:`,
        batchYoutubeCreatedTime,
      );

      for (const videoId of videoIds) {
        const video = videos.find((v) => v.id === videoId);
        if (!video) continue;

        const newCreatedTime = new Date(batchYoutubeCreatedTime).toISOString();
        const currentCreatedTime = video.createdTime || "";

        const newTimestamp = new Date(newCreatedTime).getTime();
        const currentTimestamp = currentCreatedTime
          ? new Date(currentCreatedTime).getTime()
          : 0;

        if (newTimestamp !== currentTimestamp) {
          try {
            const youtubeResponse = await fetch("/api/update-youtube-video", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
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
              console.error(
                `❌ Failed to update date for ${video.title}:`,
                errorData.error,
              );
            }
          } catch (err) {
            youtubeUpdateResults.push({
              videoId,
              success: false,
              error: err instanceof Error ? err.message : "Unknown error",
            });
            console.error(
              `❌ Exception updating date for ${video.title}:`,
              err,
            );
          }
        }
      }

      // Sync Firestore if there were successful updates
      const successfulVideoIds = youtubeUpdateResults
        .filter((r) => r.success)
        .map((r) => r.videoId);
      if (successfulVideoIds.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for YouTube propagation

        const refreshResponse = await fetch("/api/refresh-video-metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoIds: successfulVideoIds,
            expectedRecordingDate: new Date(
              batchYoutubeCreatedTime,
            ).toISOString(),
          }),
        });

        if (refreshResponse.ok) {
          console.log("✅ Firestore synced with fresh YouTube metadata");
        }
      }

      // Reload videos and show results
      await loadVideos();
      const successful = youtubeUpdateResults.filter((r) => r.success).length;
      const failed = youtubeUpdateResults.filter((r) => !r.success).length;

      let message = `Recording date update completed!`;
      if (successful > 0)
        message += `\n✅ Successfully updated: ${successful} videos`;
      if (failed > 0) message += `\n❌ Failed: ${failed} videos`;

      alert(message);
      setBatchYoutubeCreatedTime(""); // Clear date after successful update
    } catch (err: any) {
      console.error("Error updating date:", err);
      setError("Failed to update recording date");
    } finally {
      setSavingDate(false);
    }
  };

  const batchUpdatePlaylists = async () => {
    if (selectedVideos.size === 0) return;

    try {
      setSavingPlaylists(true);
      setError(null);

      const videoIds = Array.from(selectedVideos);
      let playlistUpdateResults = [];

      console.log("Performing batch playlist update...");
      console.log(
        `Processing ${videoIds.length} selected videos for playlists:`,
        Array.from(selectedPlaylists),
      );

      for (const videoId of videoIds) {
        const video = videos.find((v) => v.id === videoId);
        if (!video) continue;

        try {
          const playlistResponse = await fetch("/api/manage-playlists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "batch_update_playlists",
              videoId: video.youtubeId || video.id,
              playlistIds: Array.from(selectedPlaylists),
            }),
          });

          if (playlistResponse.ok) {
            playlistUpdateResults.push({ videoId, success: true });
            console.log(`✅ Successfully updated playlists for ${video.title}`);
          } else {
            const errorData = await playlistResponse.json();
            playlistUpdateResults.push({
              videoId,
              success: false,
              error: errorData.error,
            });
            console.error(
              `❌ Failed to update playlists for ${video.title}:`,
              errorData.error,
            );
          }
        } catch (err) {
          playlistUpdateResults.push({
            videoId,
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
          });
          console.error(
            `❌ Exception updating playlists for ${video.title}:`,
            err,
          );
        }
      }

      // Reload videos and show results
      await loadVideos();
      const successful = playlistUpdateResults.filter((r) => r.success).length;
      const failed = playlistUpdateResults.filter((r) => !r.success).length;

      let message = `Playlist update completed!`;
      if (successful > 0)
        message += `\n✅ Successfully updated: ${successful} videos`;
      if (failed > 0) message += `\n❌ Failed: ${failed} videos`;

      alert(message);
      setSelectedPlaylists(new Set()); // Clear playlist selection after successful update
    } catch (err: any) {
      console.error("Error updating playlists:", err);
      setError("Failed to update playlists");
    } finally {
      setSavingPlaylists(false);
    }
  };

  // Removed batchDeleteVideos functionality

  const syncWithYouTube = async () => {
    if (
      !confirm(
        "This will sync video metadata with YouTube, including playlist information.\n\nNote: This fetches the current data from YouTube and may overwrite any recent changes that haven't propagated yet.\n\nContinue?",
      )
    )
      return;

    try {
      setBatchSaving(true);

      // First, get all videos to collect YouTube video IDs
      const allVideos = await videoService.getAllVideos();
      const youtubeVideos = allVideos.filter(
        (video) => video.videoType === "youtube",
      );
      const youtubeVideoIds = youtubeVideos
        .map((video) => video.youtubeId || video.id)
        .filter(Boolean);

      if (youtubeVideoIds.length === 0) {
        alert("No YouTube videos found to sync.");
        return;
      }

      console.log(`Syncing ${youtubeVideoIds.length} YouTube videos...`);

      // Call the refresh metadata API to update all YouTube videos
      const response = await fetch("/api/refresh-video-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoIds: youtubeVideoIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to refresh video metadata");
      }

      const result = await response.json();
      console.log("Metadata refresh result:", result);

      // Reload videos to get the updated data
      await loadVideos();

      alert(
        `YouTube sync completed successfully! Updated ${result.updated || youtubeVideoIds.length} videos with latest metadata and playlist information.`,
      );
    } catch (err: any) {
      console.error("Error syncing:", err);
      alert("Failed to sync: " + err.message);
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
    setBatchTags("");
    setBatchYoutubeCreatedTime("");
    setSelectedPlaylists(new Set());
  };

  // Automatic date parsing function
  const handleAutomaticDateParsing = async () => {
    // Count videos that could benefit from date parsing
    const videosNeedingDates = videos.filter((video) => {
      const hasNoCreatedTime = !video.createdTime;
      // Try multiple sources for date parsing
      const titleSource = video.description || video.id || "";
      const couldParseDate = parseRecordingDateFromTitle(titleSource) !== null;
      return hasNoCreatedTime && couldParseDate;
    });

    if (videosNeedingDates.length === 0) {
      alert(
        "❌ No videos found that need date parsing.\n\nEither all videos already have creation dates, or no video descriptions/IDs contain parseable date patterns.",
      );
      return;
    }

    const confirmed = confirm(
      `🤖 Automatic Date Parsing\n\n` +
        `This will parse creation dates from video descriptions/IDs and update:\n` +
        `• Video createdTime field\n\n` +
        `Found ${videosNeedingDates.length} video(s) that could benefit from date parsing.\n\n` +
        `⚠️ This will make changes to the database and may take time to process.\n\n` +
        `Continue?`,
    );

    if (!confirmed) return;

    try {
      setParsingDates(true);
      setError(null);
      setProcessingVideos(new Set()); // Clear any previous processing state

      let successCount = 0;
      let failCount = 0;
      const results = [];
      const updatedVideos = [...videos]; // Create a copy to batch updates

      console.log(
        `Starting automatic date parsing for ${videosNeedingDates.length} videos...`,
      );

      for (const video of videosNeedingDates) {
        try {
          // Add video to processing set to show visual feedback
          setProcessingVideos((prev) => {
            const newSet = new Set(prev);
            newSet.add(video.id);
            return newSet;
          });

          const titleSource = video.description || video.id || "";
          const parsedDate = parseRecordingDateFromTitle(titleSource);
          if (parsedDate) {
            console.log(
              `📅 Parsing date for "${titleSource}": ${parsedDate.toISOString()}`,
            );

            // Use service layer to update the video
            await videoService.updateVideo(video.id, {
              createdTime: parsedDate,
            });

            console.log(`✅ Database updated for ${titleSource}`);

            // Update the local copy
            const videoIndex = updatedVideos.findIndex(
              (vid) => vid.id === video.id,
            );
            if (videoIndex !== -1) {
              updatedVideos[videoIndex] = {
                ...updatedVideos[videoIndex],
                createdTime: parsedDate,
              };
            }

            successCount++;
            results.push({
              video: titleSource,
              date: parsedDate.toISOString().split("T")[0],
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
          const titleSource = video.description || video.id || "";
          console.error(`❌ Error processing ${titleSource}:`, error);
          failCount++;
          results.push({
            video: titleSource,
            success: false,
            error:
              error instanceof Error ? error.message : "Date parsing failed",
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
      let resultMessage = `🎉 Automatic Date Parsing Complete!\n\n`;
      resultMessage += `✅ Successfully processed: ${successCount} videos\n`;
      if (failCount > 0) {
        resultMessage += `❌ Failed: ${failCount} videos\n`;
      }
      resultMessage += `\n📋 Detailed Results:\n`;

      results.forEach((result) => {
        if (result.success) {
          resultMessage += `✅ ${result.video} → ${result.date}\n`;
        } else {
          resultMessage += `❌ ${result.video} → ${result.error}\n`;
        }
      });

      alert(resultMessage);
      console.log("📊 Date parsing completed:", {
        successCount,
        failCount,
        results,
      });
    } catch (error) {
      console.error("❌ Error during automatic date parsing:", error);
      setError(
        "Failed to parse dates: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
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
    setBatchTags(selectedCatNames.join(", "));
  };

  const handleBatchTagsInputClick = () => {
    setCatSelectorContext("batch");
    setShowCatSelector(true);
    // Parse existing batch tags to pre-select cats
    const existingTags = batchTags
      .split(",")
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
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const updatedTags = currentTags.filter((tag) => tag !== tagToRemove);
    const newTagsString = updatedTags.join(", ");
    setYoutubeTags(newTagsString);
  };

  const handleYoutubeTagsInputClick = () => {
    setCatSelectorContext("youtube-individual");
    setShowCatSelector(true);
    // Parse existing YouTube tags to pre-select cats
    const existingTags = youtubeTags
      .split(",")
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
    setYoutubeTags(selectedCatNames.join(", "));
  };

  // Playlist selector handler
  const handlePlaylistSelectorClick = () => {
    setPlaylistSelectorContext("individual");
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
    if (!selectedVideo || selectedVideo.videoType !== "youtube") {
      return;
    }

    try {
      setSavingPlaylists(true);

      const videoId = selectedVideo.youtubeId || selectedVideo.id;
      const currentPlaylistIds = new Set(
        selectedVideo.allPlaylists?.map((p) => p.id) || [],
      );
      const newPlaylistIds = selectedPlaylists;

      console.log("Saving playlist changes for video:", videoId);
      console.log("Current playlists:", Array.from(currentPlaylistIds));
      console.log("New playlists:", Array.from(newPlaylistIds));

      // Use the manage-playlists API to update playlist membership
      const response = await fetch("/api/manage-playlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "batch_update_playlists",
          videoId: videoId,
          playlistIds: Array.from(newPlaylistIds),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Playlist update failed:", errorData);
        throw new Error(errorData.error || "Failed to update playlists");
      }

      const result = await response.json();
      console.log("Playlist update result:", result);

      // Check if there were any failures in the batch operation
      if (result.summary && result.summary.failed > 0) {
        console.warn("Some playlist operations failed:", result.results);
        const failedOperations = result.results.filter((r: any) => !r.success);
        const errorMessages = failedOperations.map(
          (r: any) => `${r.action} ${r.playlistId}: ${r.error}`,
        );
        console.warn("Failed operations:", errorMessages);

        // Still continue with the sync if some operations succeeded
        if (result.summary.added > 0 || result.summary.removed > 0) {
          console.log(
            `Partial success: ${result.summary.added} added, ${result.summary.removed} removed, ${result.summary.failed} failed`,
          );
        }
      }

      // After updating YouTube, refresh the video's metadata from YouTube to sync to Firestore
      console.log(
        "Refreshing video metadata to sync playlist changes to Firestore...",
      );
      const refreshResponse = await fetch("/api/refresh-video-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoIds: [videoId],
        }),
      });

      if (!refreshResponse.ok) {
        const refreshErrorData = await refreshResponse.json();
        console.warn(
          "Failed to refresh metadata after playlist update:",
          refreshErrorData.error,
        );
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
      let message = `Playlist membership updated successfully! ${result.summary?.added || 0} playlists added, ${result.summary?.removed || 0} playlists removed.`;
      if (result.summary?.failed > 0) {
        message += `\n\nNote: ${result.summary.failed} operations failed. Check console for details.`;
      }

      alert(message);
    } catch (error) {
      console.error("Error saving playlist changes:", error);
      alert(
        "Failed to save playlist changes: " +
          (error instanceof Error ? error.message : "Unknown error"),
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
        let recordingDateStr = "";
        if (video.createdTime) {
          try {
            let date: Date;
            if (video.createdTime instanceof Date) {
              date = video.createdTime;
            } else if (
              typeof video.createdTime === "object" &&
              video.createdTime !== null &&
              "seconds" in video.createdTime
            ) {
              // Firebase Timestamp
              date = new Date((video.createdTime as any).seconds * 1000);
            } else {
              // String or other format
              date = new Date(video.createdTime as any);
            }

            if (!isNaN(date.getTime())) {
              recordingDateStr = date.toISOString().split("T")[0];
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

      if (sortBy === "created") {
        // Handle createdTime which could be Date, Firebase Timestamp, or string
        aValue = a.createdTime
          ? (() => {
              if (a.createdTime instanceof Date) {
                return a.createdTime;
              } else if (
                typeof a.createdTime === "object" &&
                a.createdTime !== null &&
                "seconds" in a.createdTime
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
                typeof b.createdTime === "object" &&
                b.createdTime !== null &&
                "seconds" in b.createdTime
              ) {
                return new Date((b.createdTime as any).seconds * 1000);
              } else {
                return new Date(b.createdTime as any);
              }
            })()
          : null;
      } else if (sortBy === "uploaded") {
        aValue = a.uploadDate ? new Date(a.uploadDate) : null;
        bValue = b.uploadDate ? new Date(b.uploadDate) : null;
      } else if (sortBy === "updated") {
        aValue = a.updated ? new Date(a.updated) : null;
        bValue = b.updated ? new Date(b.updated) : null;
      }

      // Handle null values
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return sortOrder === "asc" ? 1 : -1;
      if (bValue === null) return sortOrder === "asc" ? -1 : 1;

      // Check for invalid dates
      if (isNaN(aValue.getTime()) && isNaN(bValue.getTime())) return 0;
      if (isNaN(aValue.getTime())) return sortOrder === "asc" ? 1 : -1;
      if (isNaN(bValue.getTime())) return sortOrder === "asc" ? -1 : 1;

      const comparison = aValue.getTime() - bValue.getTime();
      return sortOrder === "asc" ? comparison : -comparison;
    });

  // Filtered cats for search
  const filteredCats = cats.filter(
    (cat) =>
      cat.name.toLowerCase().includes(catSearchQuery.toLowerCase()) ||
      (cat.alt_name &&
        cat.alt_name.toLowerCase().includes(catSearchQuery.toLowerCase())),
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
  const untaggedVideos = videos.filter(
    (video) => !video.tags || video.tags.length === 0,
  );
  const taggedVideos = videos.filter(
    (video) => video.tags && video.tags.length > 0,
  );

  if (loading) {
    return (
      <div className="p-6" data-oid="0eria1m">
        <h1 className="text-2xl font-bold mb-4" data-oid=".htxxbr">
          Tag Videos (Service Layer)
        </h1>
        <div
          className="flex items-center justify-center min-h-64"
          data-oid="fbvswfe"
        >
          <div className="text-lg text-gray-600" data-oid="es52ihu">
            Loading videos...
          </div>
        </div>
      </div>
    );
  }

  const getVideoThumbnail = (video: AdminVideo) => {
    // Return thumbnail URL if available, otherwise a default placeholder
    return video.thumbnailUrl || "/images/video-placeholder.png";
  };

  return (
    <div className="p-6" data-oid="cy2_nrz">
      <h1 className="text-2xl font-bold mb-4" data-oid="4cbulgx">
        Tag Videos (Service Layer)
      </h1>

      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
          data-oid=":pwcywz"
        >
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
            data-oid="d-.0pmy"
          >
            ×
          </button>
        </div>
      )}

      {/* Service Configuration Status */}
      <div
        className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6"
        data-oid="p1ffr9u"
      >
        <h3
          className="text-sm font-semibold text-green-800 mb-2"
          data-oid="l:q9:v2"
        >
          Service Layer Configuration
        </h3>
        <div className="text-sm space-y-1" data-oid="5ywio68">
          <div data-oid="uc0_-dk">
            <span className="text-green-700" data-oid="qbzpub3">
              Videos:
            </span>{" "}
            <span className="text-green-600" data-oid="kax-3::">
              ✅ Using Video Service Abstraction
            </span>
          </div>
          <div data-oid="zdqe1y1">
            <span className="text-green-700" data-oid="6jlo8f6">
              Operations:
            </span>{" "}
            <span className="text-green-600" data-oid=":hkzf0:">
              ✅ CRUD operations via service layer
            </span>
          </div>
          <div className="text-xs text-green-600 mt-2" data-oid="3.keutz">
            All database operations go through the service layer for better
            maintainability and multi-tenant support.
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6" data-oid="vmdw_k_">
        <div className="mb-4 flex gap-3" data-oid="vczbsqz">
          <button
            onClick={syncWithYouTube}
            disabled={batchSaving}
            className={`px-3 py-2 text-white text-sm rounded ${
              batchSaving
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-red-500 hover:bg-red-600 cursor-pointer"
            }`}
            data-oid="d1km6o:"
          >
            📺 {batchSaving ? "Syncing..." : "Sync with YouTube"}
          </button>

          <button
            onClick={() => loadVideos()}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 text-sm"
            data-oid="p:qvj83"
          >
            {loading ? "Loading..." : "🔄 Refresh Videos"}
          </button>

          <button
            onClick={handleAutomaticDateParsing}
            disabled={parsingDates || loading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300 text-sm"
            data-oid="8:g9.zs"
          >
            {parsingDates ? "Parsing Dates..." : "📅 Automatic Date Parsing"}
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        data-oid="w9mt55j"
      >
        <div className="bg-white p-4 rounded-lg shadow" data-oid="8foupf7">
          <h3
            className="text-lg font-semibold text-gray-700"
            data-oid="kjh5y_p"
          >
            Total Videos
          </h3>
          <p className="text-3xl font-bold text-blue-600" data-oid=":rh0s9m">
            {videos.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow" data-oid="qhb_v3t">
          <h3
            className="text-lg font-semibold text-gray-700"
            data-oid="a34ai:r"
          >
            Untagged Videos
          </h3>
          <p className="text-3xl font-bold text-orange-600" data-oid="ihj.1jr">
            {untaggedVideos.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow" data-oid="65nmn0d">
          <h3
            className="text-lg font-semibold text-gray-700"
            data-oid="zvyj6i2"
          >
            Tagged Videos
          </h3>
          <p className="text-3xl font-bold text-green-600" data-oid="jbzqk4a">
            {taggedVideos.length}
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <div
        className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-6"
        data-oid="lb2s.3l"
      >
        {/* Tag Filters */}
        <div className="flex gap-6 mb-4" data-oid="ddnkpf5">
          <label
            className="flex items-center cursor-pointer"
            data-oid="ns:r1s9"
          >
            <input
              type="checkbox"
              checked={showTaggedVideos}
              onChange={(e) => setShowTaggedVideos(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500 mr-2"
              data-oid="60qbj8m"
            />

            <span className="text-sm text-gray-700" data-oid="c-4p4ry">
              Show Tagged Videos ({taggedVideos.length})
            </span>
          </label>
          <label
            className="flex items-center cursor-pointer"
            data-oid="h:a2hdk"
          >
            <input
              type="checkbox"
              checked={showUntaggedVideos}
              onChange={(e) => setShowUntaggedVideos(e.target.checked)}
              className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 mr-2"
              data-oid="2o:gxn0"
            />

            <span className="text-sm text-gray-700" data-oid="80ywcy4">
              Show Untagged Videos ({untaggedVideos.length})
            </span>
          </label>
        </div>

        {/* Date Range Filter */}
        <div
          className="flex flex-wrap items-center gap-4 mb-4"
          data-oid="c40x5dv"
        >
          <label
            className="flex items-center cursor-pointer"
            data-oid="34hnmnn"
          >
            <input
              type="checkbox"
              checked={enableDateFilter}
              onChange={(e) => {
                setEnableDateFilter(e.target.checked);
                if (!e.target.checked) {
                  setDateFilterFrom("");
                  setDateFilterTo("");
                }
              }}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 mr-2"
              data-oid="e3nl61c"
            />

            <span className="text-sm text-gray-700" data-oid="7tnhxu_">
              Apply date range filter
            </span>
          </label>
          <div className="flex items-center gap-2" data-oid="s-ws0ho">
            <label
              className={`text-sm ${enableDateFilter ? "text-gray-700" : "text-gray-400"}`}
              data-oid="-9d__jg"
            >
              From:
            </label>
            <input
              type="date"
              value={dateFilterFrom}
              onChange={(e) => setDateFilterFrom(e.target.value)}
              disabled={!enableDateFilter}
              className={`border border-gray-300 rounded px-2 py-1 text-sm ${
                enableDateFilter ? "bg-white" : "bg-gray-100 text-gray-400"
              }`}
              data-oid="dz4cuo5"
            />
          </div>
          <div className="flex items-center gap-2" data-oid="7etto.7">
            <label
              className={`text-sm ${enableDateFilter ? "text-gray-700" : "text-gray-400"}`}
              data-oid="x00klw9"
            >
              To:
            </label>
            <input
              type="date"
              value={dateFilterTo}
              onChange={(e) => setDateFilterTo(e.target.value)}
              disabled={!enableDateFilter}
              className={`border border-gray-300 rounded px-2 py-1 text-sm ${
                enableDateFilter ? "bg-white" : "bg-gray-100 text-gray-400"
              }`}
              data-oid="6nhfmiv"
            />
          </div>
          {enableDateFilter && (dateFilterFrom || dateFilterTo) && (
            <button
              onClick={() => {
                setDateFilterFrom("");
                setDateFilterTo("");
              }}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
              data-oid="vg8t-pp"
            >
              Clear dates
            </button>
          )}
          <label
            className="flex items-center cursor-pointer"
            data-oid="w:moga8"
          >
            <input
              type="checkbox"
              checked={showVideosWithoutTimestamp}
              onChange={(e) => setShowVideosWithoutTimestamp(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mr-2"
              data-oid="8s99zpo"
            />

            <span className="text-sm text-gray-700" data-oid="uzt9ypi">
              Show Videos Without Timestamp (
              {videos.filter((v) => !v.createdTime).length})
            </span>
          </label>
        </div>

        {/* Selection and Display Controls */}
        <div className="border-t border-gray-300 pt-4" data-oid="2u2f829">
          <div className="flex flex-wrap items-center gap-4" data-oid="hzoa:e-">
            <button
              onClick={selectAllVideos}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
              data-oid="engu7xy"
            >
              Select All
            </button>
            {selectedVideos.size > 0 && (
              <button
                onClick={clearSelection}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                data-oid="gua_mvz"
              >
                Clear Selection ({selectedVideos.size})
              </button>
            )}
            <div className="flex items-center gap-2" data-oid="hpft.99">
              <label className="text-sm text-gray-700" data-oid="gzkwzbe">
                Sort by:
              </label>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as "created" | "uploaded" | "updated",
                  )
                }
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                data-oid="9ab9jyw"
              >
                <option value="created" data-oid="t:6jpnw">
                  Created
                </option>
                <option value="uploaded" data-oid="y.y7:-z">
                  Published
                </option>
                <option value="updated" data-oid="83f4hix">
                  Metadata Updated
                </option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                data-oid="f7r09q6"
              >
                <option value="desc" data-oid="-pkqd::">
                  Newest First
                </option>
                <option value="asc" data-oid="8-nprn5">
                  Oldest First
                </option>
              </select>
            </div>
            <div className="flex items-center gap-2" data-oid="yclknj8">
              <label className="text-sm text-gray-700" data-oid="htqbcdg">
                Videos per page:
              </label>
              <select
                value={videosPerPage}
                onChange={(e) => {
                  setVideosPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                data-oid="rps.4.l"
              >
                <option value={10} data-oid="1f1ujz8">
                  10
                </option>
                <option value={25} data-oid=":sgck9r">
                  25
                </option>
                <option value={50} data-oid="gj:1cc-">
                  50
                </option>
              </select>
            </div>
            <div className="text-sm text-gray-600" data-oid="6aj_cci">
              Showing {startIndex + 1}-
              {Math.min(endIndex, filteredVideos.length)} of{" "}
              {filteredVideos.length} videos
            </div>
          </div>
        </div>
      </div>

      {/* Batch Actions */}
      {showBatchActions && (
        <div
          className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4"
          data-oid="os-vma7"
        >
          <h3 className="text-lg font-semibold mb-2" data-oid="ejw5ca0">
            Batch Actions ({selectedVideos.size} videos selected)
          </h3>

          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-3"
            data-oid="3mo-8h5"
          >
            {/* Tags Section */}
            <div
              className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg"
              data-oid="eur4s_t"
            >
              <h4
                className="text-sm font-semibold text-yellow-800 mb-2 flex items-center"
                data-oid="8erffwu"
              >
                🏷️ Tags
              </h4>
              <div className="relative mb-2" data-oid="-bos1m5">
                <input
                  type="text"
                  value={batchTags}
                  onChange={(e) => setBatchTags(e.target.value)}
                  onClick={handleBatchTagsInputClick}
                  placeholder="Click to select cats..."
                  className="border border-gray-300 rounded px-2 py-1 w-full cursor-pointer pr-12 text-sm"
                  data-oid="z3nbadg"
                />

                <button
                  type="button"
                  onClick={handleBatchTagsInputClick}
                  className="absolute right-1 top-1 text-blue-500 hover:text-blue-700 text-xs"
                  data-oid="t8ack7l"
                >
                  🐱
                </button>
              </div>

              {/* Tag chips */}
              {batchTags && (
                <div className="flex flex-wrap gap-1 mb-2" data-oid=":elv:dn">
                  {batchTags.split(",").map((tag, index) => {
                    const trimmedTag = tag.trim();
                    if (!trimmedTag) return null;
                    return (
                      <span
                        key={index}
                        className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-1 py-0.5 rounded"
                        data-oid="9df4ed5"
                      >
                        {trimmedTag}
                        <button
                          type="button"
                          onClick={() => {
                            const newTags = batchTags
                              .split(",")
                              .map((t) => t.trim())
                              .filter((t) => t !== trimmedTag)
                              .join(", ");
                            setBatchTags(newTags);
                          }}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          data-oid="4-64hh-"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <button
                onClick={batchUpdateTags}
                disabled={savingTags || !batchTags.trim()}
                className="w-full px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                data-oid="ad2ew56"
              >
                {savingTags ? "Saving..." : "Save Tags"}
              </button>
              <p className="text-xs text-yellow-700 mt-1" data-oid="2ow92xn">
                ⚠️ Updates YouTube directly
              </p>
            </div>

            {/* Recording Date Section */}
            <div
              className="bg-purple-50 border border-purple-200 p-3 rounded-lg"
              data-oid="t5hrno8"
            >
              <h4
                className="text-sm font-semibold text-purple-800 mb-2 flex items-center"
                data-oid="sgsgmoo"
              >
                📅 Recording Date
              </h4>
              <input
                type="datetime-local"
                value={batchYoutubeCreatedTime}
                onChange={(e) => setBatchYoutubeCreatedTime(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 w-full text-sm mb-2"
                data-oid="wgl.wuq"
              />

              <button
                onClick={batchUpdateDate}
                disabled={savingDate || !batchYoutubeCreatedTime.trim()}
                className="w-full px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                data-oid="85y8rsi"
              >
                {savingDate ? "Saving..." : "Save Date"}
              </button>
              <p className="text-xs text-purple-700 mt-1" data-oid="ffi3g5f">
                ⚠️ Updates YouTube directly
              </p>
            </div>

            {/* Playlists Section */}
            <div
              className="bg-green-50 border border-green-200 p-3 rounded-lg"
              data-oid="nijg73s"
            >
              <h4
                className="text-sm font-semibold text-green-800 mb-2 flex items-center"
                data-oid="rz2wy3w"
              >
                🎬 Playlists
              </h4>
              <div
                className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border mb-2 min-h-[1.5rem]"
                data-oid="dxnphfb"
              >
                {selectedPlaylists.size > 0 ? (
                  <div data-oid="lhw3vmm">
                    {Array.from(selectedPlaylists)
                      .slice(0, 2)
                      .map((playlistId) => {
                        const playlist = allPlaylists.find(
                          (p) => p.id === playlistId,
                        );
                        return playlist ? (
                          <div
                            key={playlistId}
                            className="truncate"
                            data-oid=":fuw8ot"
                          >
                            {playlist.title}
                          </div>
                        ) : null;
                      })}
                    {selectedPlaylists.size > 2 && (
                      <div className="text-gray-500" data-oid="x5f3wru">
                        +{selectedPlaylists.size - 2} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 italic" data-oid="hdz_ptg">
                    None selected
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setPlaylistSelectorContext("batch");
                  setShowPlaylistSelector(true);
                }}
                disabled={loadingPlaylists}
                className="w-full px-2 py-1 text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50 text-sm"
                data-oid="fyj91i-"
              >
                {loadingPlaylists ? "Loading..." : "✏️ Select Playlists"}
              </button>
              <p className="text-xs text-green-700 mt-1" data-oid="6-d7gtx">
                ✅ Save button in modal
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-3" data-oid="6kzyw7h">
            {/* Delete Metadata button removed */}
            <button
              onClick={clearSelection}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
              data-oid=":w-flu8"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-oid="bd0mmrp">
        {/* Video List */}
        <div className="lg:col-span-2" data-oid="49jfptk">
          {filteredVideos.length === 0 ? (
            <div className="text-center py-12" data-oid="ojokd-:">
              <p className="text-gray-600 text-lg" data-oid="xs9h_ms">
                No videos match the current filter settings.
              </p>
            </div>
          ) : (
            <>
              {/* Video Grid */}
              <div
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
                data-oid="r1omhzt"
              >
                {paginatedVideos.map((video) => (
                  <div
                    key={video.id}
                    className={`relative bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border-2 ${
                      selectedVideo?.id === video.id
                        ? "border-blue-500"
                        : processingVideos.has(video.id)
                          ? "border-purple-500 shadow-md"
                          : video.tags && video.tags.length > 0
                            ? "border-green-200"
                            : "border-gray-200"
                    }`}
                    data-oid=".pqdrq9"
                  >
                    {/* Processing indicator */}
                    {processingVideos.has(video.id) && (
                      <div
                        className="absolute inset-0 bg-purple-500 bg-opacity-20 z-30 flex items-center justify-center rounded-lg"
                        data-oid="9w0.45b"
                      >
                        <div
                          className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium"
                          data-oid="hq033ld"
                        >
                          📅 Parsing Date...
                        </div>
                      </div>
                    )}

                    {/* Checkbox */}
                    <div
                      className="absolute top-2 left-2 z-10"
                      data-oid="mrjiduz"
                    >
                      <input
                        type="checkbox"
                        checked={selectedVideos.has(video.id)}
                        onChange={() => toggleVideoSelection(video.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                        data-oid="-23:otx"
                      />
                    </div>

                    {/* Status indicator */}
                    <div
                      className="absolute top-2 right-2 z-10 flex gap-1"
                      data-oid="b1bhkdr"
                    >
                      {video.tags && video.tags.length > 0 ? (
                        <span
                          className="bg-green-500 text-white text-xs px-2 py-1 rounded"
                          data-oid="gh7-2b9"
                        >
                          Tagged
                        </span>
                      ) : (
                        <span
                          className="bg-orange-500 text-white text-xs px-2 py-1 rounded"
                          data-oid="u3a6ll."
                        >
                          Untagged
                        </span>
                      )}
                    </div>

                    {/* Video type indicator */}
                    <div
                      className="absolute bottom-2 right-2 z-10"
                      data-oid="zj9cjse"
                    >
                      <span
                        className={`text-white text-xs px-2 py-1 rounded ${
                          video.videoType === "youtube"
                            ? "bg-red-600"
                            : "bg-gray-600"
                        }`}
                        data-oid="tnd6obu"
                      >
                        {video.videoType === "youtube" ? "YouTube" : "Storage"}
                      </span>
                    </div>

                    <div onClick={() => selectVideo(video)} data-oid="eepsae5">
                      {/* Video Thumbnail */}
                      <div className="relative" data-oid="9j_297z">
                        <img
                          src={getVideoThumbnail(video)}
                          alt={video.title || video.id || "Video"}
                          className="w-full h-36 object-cover rounded-t-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/images/arrow_north.svg";
                          }}
                          data-oid="1obude5"
                        />
                      </div>

                      {/* Video Info */}
                      <div className="p-3" data-oid="18mxnxs">
                        <h3
                          className="font-medium text-sm line-clamp-2 mb-1"
                          data-oid=".zmhxr5"
                        >
                          {video.title || video.description || video.id}
                        </h3>
                        {video.uploadDate && (
                          <p
                            className="text-xs text-gray-500 mb-1"
                            data-oid="ii9p4-5"
                          >
                            Published:{" "}
                            {(() => {
                              try {
                                const date = new Date(video.uploadDate);
                                if (!isNaN(date.getTime())) {
                                  return date.toLocaleDateString();
                                }
                                return "Invalid date";
                              } catch (e) {
                                return "Invalid date";
                              }
                            })()}
                          </p>
                        )}
                        <p
                          className="text-xs text-gray-500 mb-1"
                          data-oid="e9gw1x5"
                        >
                          Created:{" "}
                          {video.createdTime
                            ? (() => {
                                try {
                                  let date: Date;
                                  if (video.createdTime instanceof Date) {
                                    date = video.createdTime;
                                  } else if (
                                    typeof video.createdTime === "object" &&
                                    video.createdTime !== null &&
                                    "seconds" in video.createdTime
                                  ) {
                                    // Firebase Timestamp
                                    date = new Date(
                                      (video.createdTime as any).seconds * 1000,
                                    );
                                  } else {
                                    // String or other format
                                    date = new Date(video.createdTime as any);
                                  }
                                  return !isNaN(date.getTime())
                                    ? date.toLocaleDateString()
                                    : "Invalid date";
                                } catch (e) {
                                  return "Invalid date";
                                }
                              })()
                            : "null"}
                        </p>
                        {video.videoType === "youtube" && (
                          <p
                            className="text-xs text-blue-600 mb-2 font-mono break-all"
                            data-oid="xfneyde"
                          >
                            youtu.be/{video.youtubeId || video.id}
                          </p>
                        )}
                        {video.duration && (
                          <p
                            className="text-xs text-gray-500 mb-2"
                            data-oid="zpaawbv"
                          >
                            Duration: {formatDuration(video.duration)}
                          </p>
                        )}
                        {video.tags && video.tags.length > 0 && (
                          <div
                            className="flex flex-wrap gap-1"
                            data-oid="rv4575f"
                          >
                            {video.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                                data-oid="8_c4wek"
                              >
                                {tag}
                              </span>
                            ))}
                            {video.tags.length > 3 && (
                              <span
                                className="text-xs text-gray-500"
                                data-oid="4pipdv4"
                              >
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div
                  className="flex justify-center items-center mt-6 gap-2"
                  data-oid="a:rc87l"
                >
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-oid="f1cqy9w"
                  >
                    Previous
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
                            ? "bg-blue-500 text-white border-blue-500"
                            : "border-gray-300 hover:bg-gray-50"
                        }`}
                        data-oid="g_5f3gt"
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-oid="iq3bpy9"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Tagging Form */}
        <div className="lg:col-span-1" data-oid="fm187zq">
          <div
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm sticky top-6"
            data-oid="5wktwob"
          >
            {selectedVideo ? (
              <>
                <div className="mb-4" data-oid="gx3i_qk">
                  <img
                    src={getVideoThumbnail(selectedVideo)}
                    alt={selectedVideo.title || selectedVideo.id || "Video"}
                    className="w-full h-32 object-cover rounded mb-2"
                    data-oid="r_5z5wo"
                  />

                  {/* Video Information Block */}
                  <h4
                    className="font-medium text-sm line-clamp-2"
                    data-oid="q09zct3"
                  >
                    {selectedVideo.title || selectedVideo.id}
                  </h4>
                  <p className="text-xs text-gray-500 mb-1" data-oid="gqd8lg7">
                    Published:{" "}
                    {(() => {
                      try {
                        const date = selectedVideo.uploadDate
                          ? new Date(selectedVideo.uploadDate)
                          : null;
                        return date && !isNaN(date.getTime())
                          ? date.toLocaleDateString()
                          : "Unknown";
                      } catch (e) {
                        return "Unknown";
                      }
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 mb-1" data-oid="ax3ef2.">
                    Created:{" "}
                    {selectedVideo.createdTime
                      ? (() => {
                          try {
                            let date: Date;
                            if (selectedVideo.createdTime instanceof Date) {
                              date = selectedVideo.createdTime;
                            } else if (
                              typeof selectedVideo.createdTime === "object" &&
                              selectedVideo.createdTime !== null &&
                              "seconds" in selectedVideo.createdTime
                            ) {
                              // Firebase Timestamp
                              date = new Date(
                                (selectedVideo.createdTime as any).seconds *
                                  1000,
                              );
                            } else {
                              // String or other format
                              date = new Date(selectedVideo.createdTime as any);
                            }
                            return !isNaN(date.getTime())
                              ? date.toLocaleDateString()
                              : "Invalid date";
                          } catch (e) {
                            return "Invalid date";
                          }
                        })()
                      : "null"}
                  </p>
                  <p className="text-xs text-gray-500 mb-1" data-oid="y-ugjf4">
                    Metadata Updated:{" "}
                    {selectedVideo.updated
                      ? (() => {
                          try {
                            const date = new Date(selectedVideo.updated);
                            return !isNaN(date.getTime())
                              ? date.toLocaleDateString()
                              : "Unknown";
                          } catch (e) {
                            return "Unknown";
                          }
                        })()
                      : "Never"}
                  </p>
                  {selectedVideo.videoType === "youtube" && (
                    <>
                      <div className="text-xs mb-2" data-oid="9-ggje_">
                        <span className="text-gray-500" data-oid="yu81_t6">
                          YouTube:{" "}
                        </span>
                        <a
                          href={`https://youtu.be/${selectedVideo.youtubeId || selectedVideo.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-mono break-all"
                          data-oid="_2um0rc"
                        >
                          youtu.be/{selectedVideo.youtubeId || selectedVideo.id}
                        </a>
                      </div>
                      <a
                        href={selectedVideo.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 text-xs"
                        data-oid="wb20wks"
                      >
                        View on YouTube →
                      </a>
                    </>
                  )}
                </div>

                <div className="space-y-4" data-oid="zrkakj7">
                  {/* YouTube Title */}
                  {selectedVideo.videoType === "youtube" && (
                    <div data-oid="sl-kt3j">
                      <label
                        className="block text-sm font-medium text-gray-700 mb-1"
                        data-oid="o1vnxxg"
                      >
                        Title (YouTube)
                      </label>
                      <input
                        type="text"
                        value={youtubeTitle}
                        onChange={(e) => setYoutubeTitle(e.target.value)}
                        placeholder="Video title..."
                        className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                        data-oid="q3dgbjk"
                      />

                      <div
                        className="text-xs text-gray-500 mt-1"
                        data-oid="9k-tn-n"
                      >
                        ✏️ Changes will be saved to YouTube and synced to
                        Firebase
                      </div>
                    </div>
                  )}

                  {/* YouTube Tags */}
                  {selectedVideo.videoType === "youtube" && (
                    <div data-oid="resm4:q">
                      <label
                        className="block text-sm font-medium text-gray-700 mb-1"
                        data-oid="p.de6kn"
                      >
                        Tags (YouTube)
                      </label>
                      <div className="relative" data-oid="6fl.tbr">
                        <input
                          type="text"
                          value={youtubeTags}
                          onChange={(e) => setYoutubeTags(e.target.value)}
                          onClick={handleYoutubeTagsInputClick}
                          placeholder="Click to select cats or type manually..."
                          className="border border-gray-300 rounded px-3 py-2 w-full text-sm cursor-pointer pr-16"
                          data-oid=".kmhxap"
                        />

                        <button
                          type="button"
                          onClick={handleYoutubeTagsInputClick}
                          className="absolute right-2 top-2 text-blue-500 hover:text-blue-700 text-sm"
                          data-oid="p_yz6q7"
                        >
                          🐱 Select
                        </button>
                      </div>

                      {/* Tag chips */}
                      {youtubeTags && (
                        <div
                          className="flex flex-wrap gap-1 mt-2"
                          data-oid="bw_0n4v"
                        >
                          {youtubeTags.split(",").map((tag, index) => {
                            const trimmedTag = tag.trim();
                            if (!trimmedTag) return null;
                            return (
                              <span
                                key={index}
                                className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                                data-oid="t_p1jh5"
                              >
                                {trimmedTag}
                                <button
                                  type="button"
                                  onClick={() => removeYoutubeTag(trimmedTag)}
                                  className="ml-1 text-blue-600 hover:text-blue-800"
                                  data-oid="yaj8pkp"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <div
                        className="text-xs text-gray-500 mt-1"
                        data-oid="ahwfywu"
                      >
                        ✏️ Changes will be saved to YouTube and synced to
                        Firebase
                      </div>
                    </div>
                  )}

                  {/* YouTube Description */}
                  {selectedVideo.videoType === "youtube" && (
                    <div data-oid="4ur7nuw">
                      <label
                        className="block text-sm font-medium text-gray-700 mb-1"
                        data-oid="8ij17w9"
                      >
                        YouTube Description
                      </label>
                      <textarea
                        value={youtubeDescription}
                        onChange={(e) => setYoutubeDescription(e.target.value)}
                        placeholder="YouTube video description..."
                        rows={3}
                        className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                        data-oid="7ear5ev"
                      />

                      <div
                        className="text-xs text-gray-500 mt-1"
                        data-oid="duso44y"
                      >
                        ✏️ Changes will be saved to YouTube and synced to
                        Firebase
                      </div>
                    </div>
                  )}

                  {/* Recording Date */}
                  {selectedVideo.videoType === "youtube" && (
                    <div data-oid="28qmljj">
                      <label
                        className="block text-sm font-medium text-gray-700 mb-1"
                        data-oid="0g2fkve"
                      >
                        Created Time (YouTube)
                      </label>
                      <div className="space-y-2" data-oid="-fetov2">
                        <input
                          type="date"
                          value={youtubeCreatedTime}
                          onChange={(e) =>
                            setYoutubeCreatedTime(e.target.value)
                          }
                          className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                          data-oid="m2gf9j7"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            if (selectedVideo && selectedVideo.title) {
                              const parsedDate = parseRecordingDateFromTitle(
                                selectedVideo.title,
                              );
                              if (parsedDate) {
                                // Convert to UTC+9 timezone (Korea Standard Time)
                                const utcTime = parsedDate.getTime();
                                const utcPlus9Time = new Date(
                                  utcTime + 9 * 60 * 60 * 1000,
                                );
                                const dateStr = utcPlus9Time
                                  .toISOString()
                                  .split("T")[0];
                                setYoutubeCreatedTime(dateStr);
                                alert(`✅ Parsed date from title: ${dateStr}`);
                              } else {
                                alert(
                                  "❌ Could not parse date from video title",
                                );
                              }
                            }
                          }}
                          className="w-full px-3 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 text-sm"
                          data-oid="0-utdsv"
                        >
                          📅 Parse Date from Title
                        </button>
                      </div>
                      <div
                        className="text-xs text-gray-500 mt-1"
                        data-oid="d7mu2jd"
                      >
                        ✏️ Changes will be saved to YouTube and synced to
                        Firebase
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2" data-oid="ucr_f.l">
                    <button
                      onClick={saveVideoMetadata}
                      disabled={saving || updatingYoutube}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 text-sm"
                      data-oid="2_fl:op"
                    >
                      {updatingYoutube
                        ? "Updating YouTube..."
                        : saving
                          ? "Saving..."
                          : "Save Changes"}
                    </button>
                    {/* Delete button removed */}
                  </div>

                  {(saving || updatingYoutube) && (
                    <div
                      className="text-xs text-gray-500 bg-blue-50 p-3 rounded border-l-4 border-blue-400"
                      data-oid="bctp:fr"
                    >
                      <div
                        className="font-medium text-blue-700 mb-1"
                        data-oid="nj7xbxg"
                      >
                        Save Process:
                      </div>
                      <div className="space-y-1" data-oid="z2n_tdc">
                        <div
                          className={
                            updatingYoutube ? "text-blue-600" : "text-gray-500"
                          }
                          data-oid="gl1l26k"
                        >
                          1.{" "}
                          {updatingYoutube
                            ? "🔄 Updating YouTube..."
                            : "✅ YouTube updated"}
                        </div>
                        <div
                          className={
                            saving && !updatingYoutube
                              ? "text-blue-600"
                              : "text-gray-500"
                          }
                          data-oid="u:exb7e"
                        >
                          2.{" "}
                          {saving && !updatingYoutube
                            ? "⏳ Waiting for YouTube propagation..."
                            : updatingYoutube
                              ? "⏳ Pending"
                              : "✅ Changes propagated"}
                        </div>
                        <div
                          className={
                            saving && !updatingYoutube
                              ? "text-blue-600"
                              : "text-gray-500"
                          }
                          data-oid="sy5o40z"
                        >
                          3.{" "}
                          {saving && !updatingYoutube
                            ? "🔄 Syncing to Firebase..."
                            : updatingYoutube
                              ? "⏳ Pending"
                              : "✅ Firebase synced"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* YouTube Playlists - Separate Management Section */}
                  {selectedVideo.videoType === "youtube" && (
                    <div
                      className="border-t border-gray-200 pt-4 mt-4"
                      data-oid="ai:l7xb"
                    >
                      <h4
                        className="text-sm font-medium text-gray-700 mb-3"
                        data-oid="4kxx3_o"
                      >
                        Playlist Management
                      </h4>

                      {/* Display current playlists */}
                      <div className="mb-3" data-oid="84ffhro">
                        <label
                          className="block text-xs font-medium text-gray-600 mb-1"
                          data-oid="yzs58:-"
                        >
                          Current Playlists:
                        </label>
                        {selectedVideo.allPlaylists &&
                        selectedVideo.allPlaylists.length > 0 ? (
                          <div
                            className="flex flex-wrap gap-1"
                            data-oid="u2lgzsn"
                          >
                            {selectedVideo.allPlaylists.map((playlist) => (
                              <span
                                key={playlist.id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                                data-oid="719ywg5"
                              >
                                {playlist.title}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span
                            className="text-xs text-gray-500 italic"
                            data-oid=".yu8h-i"
                          >
                            Not in any playlists
                          </span>
                        )}
                      </div>

                      {/* Playlist management button */}
                      <button
                        type="button"
                        onClick={handlePlaylistSelectorClick}
                        disabled={loadingPlaylists || savingPlaylists}
                        className="w-full px-3 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50 text-sm"
                        data-oid="nwpg90y"
                      >
                        {loadingPlaylists
                          ? "⏳ Loading Playlists..."
                          : savingPlaylists
                            ? "💾 Saving Changes..."
                            : "📋 Manage Playlists"}
                      </button>

                      <div
                        className="text-xs text-gray-500 mt-2"
                        data-oid="nxk_mmg"
                      >
                        💡 Playlist changes are saved directly to YouTube and
                        synced to Firebase automatically
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12" data-oid="k9_yh-a">
                <p className="text-gray-500" data-oid=":riseiz">
                  Select a video to edit its metadata
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
          data-oid="sjfrpqp"
        >
          <div
            className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 flex flex-col"
            data-oid="8woup5l"
          >
            <div
              className="flex justify-between items-center mb-4"
              data-oid="48m1:4h"
            >
              <h3 className="text-lg font-semibold" data-oid="vhn-bfg">
                Select Cats{" "}
                {catSelectorContext === "batch"
                  ? "(Batch Tagging)"
                  : catSelectorContext === "youtube-individual"
                    ? "(YouTube Tags - Individual)"
                    : catSelectorContext === "youtube-batch"
                      ? "(YouTube Tags - Batch)"
                      : "(Individual Video)"}
              </h3>
              <button
                onClick={() => setShowCatSelector(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
                data-oid="26zopi3"
              >
                ×
              </button>
            </div>

            {/* Search input */}
            <div className="mb-4" data-oid="tdsf57n">
              <input
                type="text"
                placeholder="Search cats..."
                value={catSearchQuery}
                onChange={(e) => setCatSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                data-oid="3unafjv"
              />
            </div>

            {/* Cat list */}
            <div
              className="flex-1 overflow-y-auto border border-gray-200 rounded"
              data-oid="n4idtxh"
            >
              {filteredCats.length === 0 ? (
                <div
                  className="p-4 text-center text-gray-500"
                  data-oid="gh5cpbb"
                >
                  {cats.length === 0
                    ? "No cats found in database"
                    : "No cats match your search"}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 p-4" data-oid="5ph7o03">
                  {filteredCats.map((cat) => (
                    <label
                      key={cat.id}
                      className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-50 ${
                        selectedCats.has(cat.id)
                          ? "bg-blue-50 border border-blue-200"
                          : "border border-gray-200"
                      }`}
                      data-oid="of_j328"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCats.has(cat.id)}
                        onChange={() => {
                          if (catSelectorContext === "batch") {
                            handleCatToggleBatch(cat.id, cat.name);
                          } else if (
                            catSelectorContext === "youtube-individual"
                          ) {
                            handleCatToggleYoutubeIndividual(cat.id, cat.name);
                          }
                          // Note: individual local tags context has been removed
                        }}
                        className="mr-2"
                        data-oid=":p8v37z"
                      />

                      <div className="flex-1" data-oid="g9nhtu-">
                        <div className="font-medium text-sm" data-oid="nze-chd">
                          {cat.name}
                        </div>
                        {cat.alt_name && (
                          <div
                            className="text-xs text-gray-500"
                            data-oid="p71awbe"
                          >
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
            <div className="flex justify-end gap-2 mt-4" data-oid="o-xl6a9">
              <button
                onClick={() => {
                  setSelectedCats(new Set());
                  if (catSelectorContext === "batch") {
                    setBatchTags("");
                  } else if (catSelectorContext === "youtube-individual") {
                    setYoutubeTags("");
                  } else if (catSelectorContext === "youtube-batch") {
                    // Clear YouTube batch tags if implemented
                  }
                }}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                data-oid="0y9gott"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowCatSelector(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                data-oid="4n::7cr"
              >
                Done ({selectedCats.size} selected)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Playlist Selector Modal */}
      {showPlaylistSelector && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          data-oid="0nybz5:"
        >
          <div
            className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 flex flex-col"
            data-oid="i-lms4x"
          >
            <div
              className="flex justify-between items-center mb-4"
              data-oid="j-gmwxy"
            >
              <h3 className="text-lg font-semibold" data-oid="nqfw.py">
                Select Playlists{" "}
                {playlistSelectorContext === "batch" ? "(Batch Action)" : ""}
              </h3>
              <button
                onClick={() => setShowPlaylistSelector(false)}
                disabled={savingPlaylists}
                className="text-gray-500 hover:text-gray-700 text-xl disabled:opacity-50"
                data-oid="k:iiw:d"
              >
                ×
              </button>
            </div>

            {/* Saving indicator */}
            {savingPlaylists && (
              <div
                className="mb-4 bg-blue-50 border border-blue-200 p-3 rounded"
                data-oid="c6-2xm0"
              >
                <div className="flex items-center" data-oid=":gbue:7">
                  <div
                    className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"
                    data-oid="2.ibjjh"
                  ></div>
                  <span className="text-blue-800 text-sm" data-oid="g1otcn:">
                    Saving playlist changes to YouTube and syncing to
                    Firestore...
                  </span>
                </div>
              </div>
            )}

            {/* Playlist list */}
            <div
              className="flex-1 overflow-y-auto border border-gray-200 rounded"
              data-oid="aptm4-c"
            >
              {allPlaylists.length === 0 ? (
                <div
                  className="p-4 text-center text-gray-500"
                  data-oid="d:qo7.5"
                >
                  No playlists found. Create a playlist first.
                </div>
              ) : (
                <div className="space-y-2" data-oid="46aqwtt">
                  {allPlaylists.map((playlist) => (
                    <label
                      key={playlist.id}
                      className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-50 ${
                        selectedPlaylists.has(playlist.id)
                          ? "bg-blue-50 border border-blue-200"
                          : "border border-gray-200"
                      } ${
                        savingPlaylists ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      data-oid="u.2otl7"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlaylists.has(playlist.id)}
                        onChange={() => handlePlaylistToggle(playlist.id)}
                        disabled={savingPlaylists}
                        className="mr-2"
                        data-oid="n8x6_1u"
                      />

                      <div className="flex-1" data-oid="ahl2rs:">
                        <div className="font-medium text-sm" data-oid="pd0zuyl">
                          {playlist.title}
                        </div>
                        <div
                          className="text-xs text-gray-500"
                          data-oid="2_j2h2z"
                        >
                          {playlist.description}
                        </div>
                        <div
                          className="text-xs text-gray-400"
                          data-oid="40xddo0"
                        >
                          {playlist.itemCount} video
                          {playlist.itemCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 mt-4" data-oid="g1nltz3">
              <button
                onClick={() => {
                  setShowPlaylistSelector(false);
                  // Reset selected playlists to original state
                  const videoPlaylists = selectedVideo?.allPlaylists || [];
                  const preSelectedPlaylists = new Set(
                    videoPlaylists.map((p) => p.id),
                  );
                  setSelectedPlaylists(preSelectedPlaylists);
                }}
                disabled={savingPlaylists}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 text-sm disabled:opacity-50"
                data-oid="8ssv8l8"
              >
                Cancel
              </button>
              <button
                onClick={savePlaylistChanges}
                disabled={savingPlaylists}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm disabled:opacity-50"
                data-oid="pee9jzt"
              >
                {savingPlaylists
                  ? "Saving..."
                  : `Save Changes (${selectedPlaylists.size} selected)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to parse recording date from video title
const parseRecordingDateFromTitle = (title: string): Date | null => {
  try {
    // Pattern 1: yyyy-mm-dd hh.MM.ss (with spaces or special chars around)
    const pattern1 = /(\d{4}-\d{2}-\d{2}\s+\d{2}\.\d{2}\.\d{2})/;
    const match1 = title.match(pattern1);

    if (match1) {
      const dateTimeStr = match1[1];
      // Convert format: "2024-03-15 14.30.45" -> "2024-03-15T14:30:45"
      const isoFormat = dateTimeStr.replace(/\s+/, "T").replace(/\./g, ":");
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
      const date = new Date(dateStr + "T00:00:00");
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
};

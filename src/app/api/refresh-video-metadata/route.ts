import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getYouTubeApiKey, getMountainConfig } from '@/utils/config';
import { NextURL } from 'next/dist/server/web/next-url';

const YOUTUBE_API_KEY = getYouTubeApiKey();

export async function POST(request: NextRequest) {
  try {
    console.log('=== REFRESH METADATA API CALLED ===');
    const { videoIds, expectedRecordingDate, retryCount = 0 } = await request.json();
    console.log('Received videoIds:', videoIds);
    console.log('Expected recording date:', expectedRecordingDate);
    console.log('Retry count:', retryCount);

    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      console.log('ERROR: Invalid videoIds array');
      return NextResponse.json({ error: 'videoIds array is required' }, { status: 400 });
    }

    if (!YOUTUBE_API_KEY) {
      console.log('ERROR: YouTube API key not configured');
      return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
    }

    console.log(`Refreshing metadata for ${videoIds.length} videos`);

    // Fetch fresh metadata from YouTube API - include location data
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,recordingDetails,liveStreamingDetails&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`
    );

    if (!videosResponse.ok) {
      throw new Error(`Failed to fetch video details: ${videosResponse.status} ${videosResponse.statusText}`);
    }

    const videosData = await videosResponse.json();
    const refreshedVideos = videosData.items || [];

    if (refreshedVideos.length === 0) {
      return NextResponse.json({ error: 'No videos found with provided IDs' }, { status: 404 });
    }

    // Check if recording date has been updated (if we're expecting a specific recording date)
    if (expectedRecordingDate && refreshedVideos.length === 1) {
      const video = refreshedVideos[0];
      const currentRecordingDate = video.recordingDetails?.recordingDate;

      console.log(`Expected recording date: ${expectedRecordingDate}`);
      console.log(`Current recording date from YouTube: ${currentRecordingDate}`);

      // Compare dates properly (handle different ISO string formats)
      const expectedDate = expectedRecordingDate ? new Date(expectedRecordingDate).getTime() : null;
      const currentDate = currentRecordingDate ? new Date(currentRecordingDate).getTime() : null;
      const datesMatch = expectedDate === currentDate;

      // If the recording date doesn't match and we haven't retried too many times
      if (!datesMatch && retryCount < 5) {
        console.log(`Recording date mismatch, retrying in 2 seconds (attempt ${retryCount + 1}/5)...`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Retry the request by recursively calling POST (simulated by returning a new response from a new call would be ideal, but here we just recurse logic or return error to client to retry?
        // Actually, recursing in API route is tricky without internal redirect.
        // Let's just return a specific status that client can retry, OR just do the recursion IF we can.
        // The original code tried to POST to itself: return POST(new NextRequest(request.url...))
        // We will keep that logic.
        return POST(new NextRequest(request.url, {
          method: 'POST',
          headers: request.headers,
          body: JSON.stringify({
            videoIds,
            expectedRecordingDate,
            retryCount: retryCount + 1
          })
        }));
      }

      if (!datesMatch && retryCount >= 5) {
        console.warn(`Recording date still doesn't match after 5 retries. Expected: ${expectedRecordingDate}, Got: ${currentRecordingDate}. Proceeding anyway.`);
      } else if (datesMatch) {
        console.log(`✅ Recording date matches expected value: ${expectedRecordingDate}`);
      }
    }

    // Fetch playlist information for each video
    console.log('Fetching playlist information for videos...');

    // First, get all playlists from the channel
    const config = getMountainConfig();
    const channelId = config.social?.youtubeChannelId;

    // Proper Map initialization
    const playlistMap = new Map<string, any[]>();

    if (!channelId) {
      console.warn('No channel ID configured, skipping playlist fetch');
      videoIds.forEach(videoId => playlistMap.set(videoId as string, []));
    } else {
      console.log('Fetching channel playlists...');
      const channelPlaylistsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${channelId}&key=${YOUTUBE_API_KEY}&maxResults=50`
      );

      let allPlaylists: any[] = [];
      if (channelPlaylistsResponse.ok) {
        const channelPlaylistsData = await channelPlaylistsResponse.json();
        allPlaylists = channelPlaylistsData.items || [];
        console.log(`Found ${allPlaylists.length} playlists in channel`);
      } else {
        console.warn('Failed to fetch channel playlists');
      }

      // Now check each playlist to see which videos it contains
      const playlistPromises = videoIds.map(async (videoId: string) => {
        const videoPlaylists = [];

        for (const playlist of allPlaylists) {
          try {
            const playlistItemsResponse = await fetch(
              `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlist.id}&key=${YOUTUBE_API_KEY}&maxResults=50`
            );

            if (playlistItemsResponse.ok) {
              const playlistItemsData = await playlistItemsResponse.json();
              const containsVideo = playlistItemsData.items?.some((item: any) =>
                item.snippet?.resourceId?.videoId === videoId
              );

              if (containsVideo) {
                videoPlaylists.push({
                  id: playlist.id,
                  title: playlist.snippet?.title || 'Unknown Playlist'
                });
              }
            }
          } catch (error) {
            console.error(`Error checking playlist ${playlist.id} for video ${videoId}:`, error);
          }
        }

        console.log(`Video ${videoId} found in ${videoPlaylists.length} playlists:`,
          videoPlaylists.length > 0 ? videoPlaylists.map(p => `${p.title} (${p.id})`).join(', ') : 'None'
        );
        return { videoId, playlists: videoPlaylists };
      });

      const playlistResults = await Promise.all(playlistPromises);
      playlistResults.forEach(result => {
        playlistMap.set(result.videoId, result.playlists);
      });
    }

    // Update each video's metadata in Firestore
    const updatePromises = refreshedVideos.map(async (video: any) => {
      const videoId = video.id;
      console.log(`Processing video: ${videoId} (${video.snippet?.title})`);

      // Find the corresponding Firestore document using Admin SDK
      const querySnapshot = await db.collection('cat_videos').where('youtubeId', '==', videoId).get();
      console.log(`Firestore query result for ${videoId}:`, querySnapshot.empty ? 'EMPTY' : `Found ${querySnapshot.docs.length} documents`);

      if (querySnapshot.empty) {
        console.warn(`No Firestore document found for YouTube video ${videoId}`);
        return { videoId, status: 'not_found' };
      }

      const docRef = querySnapshot.docs[0];
      const existingData = docRef.data();

      // Extract YouTube data - these fields are now YouTube-sourced and read-only
      const youtubeTitle = video.snippet?.title || 'Untitled';
      const youtubeTags = video.snippet?.tags || []; // YOUTUBE-SOURCED: tags (ALWAYS OVERWRITE)
      const youtubeRecordingDate = video.recordingDetails?.recordingDate;
      const youtubeLocation = video.recordingDetails?.location; // YOUTUBE-SOURCED: location (ALWAYS OVERWRITE)
      const youtubeVideoUrl = `https://www.youtube.com/watch?v=${videoId}`; // YOUTUBE-SOURCED: videoUrl (ALWAYS OVERWRITE)
      const videoPlaylists = playlistMap.get(videoId) || [];

      // CRITICAL: These YouTube-sourced fields MUST always be overwritten from YouTube
      const updatedData = {
        title: youtubeTitle,
        description: video.snippet?.description || '',
        thumbnailUrl: video.snippet?.thumbnails?.medium?.url ||
          video.snippet?.thumbnails?.default?.url ||
          `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        publishedAt: video.snippet?.publishedAt || '',
        duration: video.contentDetails?.duration || '',
        channelTitle: video.snippet?.channelTitle || '',

        // YOUTUBE READ-ONLY FIELDS
        videoUrl: youtubeVideoUrl,
        storagePath: youtubeVideoUrl,
        tags: youtubeTags,
        createdTime: youtubeRecordingDate ? new Date(youtubeRecordingDate) : null,
        location: youtubeLocation ? {
          latitude: youtubeLocation.latitude,
          longitude: youtubeLocation.longitude,
          altitude: youtubeLocation.altitude
        } : null,

        // YouTube specific fields
        youtubeId: videoId,
        videoType: 'youtube',

        // System fields
        uploadDate: new Date(),
        uploadedBy: 'admin',

        // Playlist information
        allPlaylists: videoPlaylists,

        // Update timestamp
        lastMetadataRefresh: new Date(),
      };

      console.log(`Updating Firestore document for ${videoId}...`);
      await docRef.ref.update(updatedData);
      console.log(`✅ Successfully updated ${videoId} in Firestore`);

      return {
        videoId,
        status: 'updated',
        title: updatedData.title,
        firestoreId: docRef.id
      };
    });

    const results = await Promise.all(updatePromises);
    const successCount = results.filter(r => r.status === 'updated').length;
    const notFoundCount = results.filter(r => r.status === 'not_found').length;

    console.log(`Metadata refresh completed: ${successCount} updated, ${notFoundCount} not found`);

    return NextResponse.json({
      success: true,
      message: `Refreshed metadata for ${successCount} videos`,
      results,
      summary: {
        total: videoIds.length,
        updated: successCount,
        notFound: notFoundCount
      }
    });

  } catch (error) {
    console.error('Error refreshing video metadata:', error);
    return NextResponse.json(
      { error: 'Failed to refresh video metadata', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

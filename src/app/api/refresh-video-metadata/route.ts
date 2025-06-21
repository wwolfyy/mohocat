import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const serviceAccountPath = path.join(process.cwd(), 'mountaincats-61543-7329e795c352.json');

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else {
    throw new Error('Service account file not found: ' + serviceAccountPath);
  }
}

const db = getFirestore();
const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

export async function POST(request: NextRequest) {
  try {
    console.log('=== REFRESH METADATA API CALLED ===');
    const { videoIds } = await request.json();
    console.log('Received videoIds:', videoIds);

    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      console.log('ERROR: Invalid videoIds array');
      return NextResponse.json({ error: 'videoIds array is required' }, { status: 400 });
    }

    if (!YOUTUBE_API_KEY) {
      console.log('ERROR: YouTube API key not configured');
      return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
    }    console.log(`Refreshing metadata for ${videoIds.length} videos`);    // Fetch fresh metadata from YouTube API - include location data
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
    }    // Fetch playlist information for each video
    console.log('Fetching playlist information for videos...');

    // First, get all playlists from the channel
    const channelId = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID;
    if (!channelId) {
      console.warn('No channel ID configured, skipping playlist fetch');
      var playlistMap = new Map();
      videoIds.forEach(videoId => playlistMap.set(videoId, []));
    } else {
      console.log('Fetching channel playlists...');
      const channelPlaylistsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${channelId}&key=${YOUTUBE_API_KEY}&maxResults=50`
      );

      let allPlaylists = [];
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
      var playlistMap = new Map();
      playlistResults.forEach(result => {
        playlistMap.set(result.videoId, result.playlists);
      });
    }// Update each video's metadata in Firestore
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
      console.log(`Existing data for ${videoId}:`, {
        title: existingData.title,
        youtubeId: existingData.youtubeId,
        tags: existingData.tags?.length || 0
      });      // Extract YouTube data - these fields are now YouTube-sourced and read-only
      const youtubeTitle = video.snippet?.title || 'Untitled';
      const youtubeTags = video.snippet?.tags || []; // YOUTUBE-SOURCED: tags (ALWAYS OVERWRITE)
      const youtubeRecordingDate = video.recordingDetails?.recordingDate;
      const youtubeLocation = video.recordingDetails?.location; // YOUTUBE-SOURCED: location (ALWAYS OVERWRITE)
      const youtubeVideoUrl = `https://www.youtube.com/watch?v=${videoId}`; // YOUTUBE-SOURCED: videoUrl (ALWAYS OVERWRITE)
      const videoPlaylists = playlistMap.get(videoId) || [];

      console.log(`YouTube-sourced data for ${videoId}:`, {
        tags: youtubeTags,
        videoUrl: youtubeVideoUrl,
        recordingDate: youtubeRecordingDate,
        location: youtubeLocation || 'No location data',
        playlistCount: videoPlaylists.length
      });

      // CRITICAL: These YouTube-sourced fields MUST always be overwritten from YouTube
      // Any manual edits to these fields in Firebase will be lost during metadata refresh
      // This is intentional to enforce YouTube as the single source of truth
      const updatedData = {
        // Core YouTube metadata
        title: youtubeTitle,
        description: video.snippet?.description || '',
        thumbnailUrl: video.snippet?.thumbnails?.medium?.url ||
                     video.snippet?.thumbnails?.default?.url ||
                     `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        publishedAt: video.snippet?.publishedAt || '',
        recordingDate: youtubeRecordingDate || null,
        duration: video.contentDetails?.duration || '',
        channelTitle: video.snippet?.channelTitle || '',

        // ========================================================================
        // YOUTUBE READ-ONLY FIELDS - THESE ARE FORCIBLY OVERWRITTEN FROM YOUTUBE
        // ========================================================================
        videoUrl: youtubeVideoUrl, // ENFORCED: Always from YouTube, cannot be edited in Firebase
        storagePath: youtubeVideoUrl, // ENFORCED: Same as videoUrl for YouTube videos
        tags: youtubeTags, // ENFORCED: Always from YouTube tags, cannot be edited in Firebase
        createdTime: youtubeRecordingDate ? new Date(youtubeRecordingDate) : null, // ENFORCED: Always from YouTube recordingDate
        location: youtubeLocation ? {
          latitude: youtubeLocation.latitude,
          longitude: youtubeLocation.longitude,
          altitude: youtubeLocation.altitude
        } : null, // ENFORCED: Always from YouTube location data
        // ========================================================================

        // YouTube specific fields
        youtubeId: videoId,
        videoType: 'youtube',

        // System fields
        uploadDate: new Date(), // Update to current time
        uploadedBy: 'admin',

        // Playlist information from YouTube - using allPlaylists as the source of truth
        allPlaylists: videoPlaylists, // Complete playlist information

        // Update timestamp to track when metadata was last refreshed
        lastMetadataRefresh: new Date(),
      };console.log(`Updated data for ${videoId}:`, {
        title: updatedData.title,
        description: updatedData.description?.substring(0, 50) + '...',
        tags: updatedData.tags?.length || 0,
        recordingDate: updatedData.recordingDate,
        createdTime: updatedData.createdTime,
        recordingDateMapped: youtubeRecordingDate ? `${youtubeRecordingDate} → ${updatedData.createdTime}` : 'No recording date',
        playlists: videoPlaylists.length > 0 ? videoPlaylists.map((p: any) => `${p.title} (${p.id})`).join(', ') : 'No playlists',
        allPlaylistsCount: videoPlaylists.length,
        lastRefresh: updatedData.lastMetadataRefresh
      });console.log(`Updating Firestore document for ${videoId}...`);
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

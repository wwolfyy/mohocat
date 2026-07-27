import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { getVideoService } from '@/services';
import { getRequestMountainId } from '@/lib/tenant';
import { requireApiPermission } from '@/lib/auth/requireApiPermission';
import { getYouTubeOAuthCredentials } from '@/lib/youtube/credentials';
import { getYouTubePlaylistId } from '@/utils/config';

// Gated: uploads a video to the shared YouTube channel with the operator's OAuth
// credential AND writes a `cat_videos` record via the Admin SDK (bypassing
// firestore.rules) — require 'manage-video', the permission that rule enforces.
export async function POST(request: NextRequest) {
  const authz = await requireApiPermission(request, 'manage-video');
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  try {
    // The tenant this upload belongs to (Host-resolved) — used for the video's
    // own playlist and for the `cat_videos` write below.
    const mountainId = getRequestMountainId(request);

    // Client identity from env + the freshest refresh token (Firestore first)
    const tokenConfig = await getYouTubeOAuthCredentials();
    if (!tokenConfig) {
      return NextResponse.json(
        {
          error: 'YouTube OAuth credentials not configured',
        },
        { status: 500 }
      );
    } // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('video') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string; // Enhanced metadata options
    const tags = formData.get('tags') as string; // Comma-separated tags
    const createdTime = formData.get('createdTime') as string; // ISO date string
    // Repeated field: a video is filed into its mountain's playlist, and 입양홍보
    // additionally into the cross-mountain adoption playlist (plan D8).
    const playlistIds = formData
      .getAll('playlistId')
      .map((value) => String(value).trim())
      .filter((value) => value.length > 0);

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      tokenConfig.clientId,
      tokenConfig.clientSecret,
      tokenConfig.redirectUri
    );
    oauth2Client.setCredentials({
      refresh_token: tokenConfig.refreshToken,
    });

    try {
      await oauth2Client.getAccessToken();
    } catch (authError) {
      console.error('OAuth2 authentication failed:', authError);
      return NextResponse.json(
        {
          error: 'YouTube authentication failed',
          details: authError instanceof Error ? authError.message : 'Unknown auth error',
        },
        { status: 401 }
      );
    }

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const buffer = Buffer.from(await file.arrayBuffer()); // Convert buffer to readable stream for YouTube API
    const stream = Readable.from(buffer); // Prepare snippet data with enhanced metadata
    const snippetData: any = {
      title: title || file.name,
      // No invented default: an empty description means the uploader left it
      // empty on purpose, and the video goes up without one (plan B3.4). The
      // other callers (공지사항/입양홍보) always send their own non-empty text, so
      // dropping the old 'Uploaded via Mountain Cats app' changes nothing there.
      description: description || '',
    };

    // Add tags if provided
    if (tags && tags.trim()) {
      snippetData.tags = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
    }

    // Prepare recording details if provided
    let recordingDetails: any = undefined;
    if (createdTime) {
      try {
        const date = new Date(createdTime);
        if (!isNaN(date.getTime())) {
          recordingDetails = {
            recordingDate: date.toISOString(),
          };
        }
      } catch (e) {
        console.warn('Invalid created time provided:', createdTime);
      }
    }

    // Prepare status data
    const statusData: any = {
      privacyStatus: 'public',
    };

    // Prepare request body with proper structure
    const requestBody: any = {
      snippet: snippetData,
      status: statusData,
    }; // Add recording details as a separate top-level property
    if (recordingDetails) {
      requestBody.recordingDetails = recordingDetails;
    }

    console.log('YouTube upload request body:', JSON.stringify(requestBody, null, 2));

    const response = await youtube.videos.insert({
      part: ['snippet', 'status', ...(recordingDetails ? ['recordingDetails'] : [])],
      requestBody,
      media: {
        body: stream,
      },
    });

    const videoId = response.data.id;
    if (!videoId) {
      throw new Error('No video ID returned from YouTube');
    }

    // File the video into each requested playlist. Non-fatal per playlist (the
    // video is already on YouTube), but log WHICH one failed: with more than one
    // target, "the upload succeeded but it isn't in a playlist" would otherwise be
    // an ambiguous warning.
    for (const playlistId of playlistIds) {
      try {
        await youtube.playlistItems.insert({
          part: ['snippet'],
          requestBody: {
            snippet: {
              playlistId,
              resourceId: {
                kind: 'youtube#video',
                videoId: videoId,
              },
            },
          },
        });
      } catch (playlistError) {
        console.warn(`Failed to add video ${videoId} to playlist ${playlistId}:`, playlistError);
        // Don't fail the entire upload if playlist addition fails
      }
    }
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Create Firestore entry in cat_videos collection
    try {
      const tagsArray =
        tags && tags.trim()
          ? tags
              .split(',')
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0)
          : [];
      const videoData = {
        videoUrl,
        fileName: response.data.snippet?.title || title || file.name,
        storagePath: videoUrl, // For YouTube videos, this is the same as videoUrl
        tags: tagsArray,
        uploadDate: new Date(),
        createdTime: createdTime ? new Date(createdTime) : new Date(), // Use created time or current date
        uploadedBy: 'user', // or get from authentication context
        description: response.data.snippet?.description || description || '',
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        duration: undefined, // YouTube doesn't return duration in upload response
        needsTagging: tagsArray.length === 0, // Needs tagging if no tags provided
        videoType: 'youtube' as const,
        youtubeId: videoId, // Important: YouTube video ID
        title: response.data.snippet?.title || title || file.name,
        publishedAt: new Date().toISOString(),
        channelTitle: 'Mountain Cats', // or get from YouTube API
        catName: '', // Empty initially, can be filled later through tagging
        // The owning mountain's playlist — resolved from config, not from the
        // request, so it does not depend on the order the caller sent them in
        // (an 입양홍보 upload sends two). Ownership itself lives in `mountainId`.
        playlist: getYouTubePlaylistId(mountainId) ?? '',
        autoTagged: false, // User manually provided tags
        // fileSize omitted for YouTube uploads to avoid Firestore undefined errors
      };

      console.log('Creating Firestore entry for uploaded video:', videoData);

      const videoService = getVideoService(mountainId);
      const firestoreVideoId = await videoService.createVideo(videoData);
      console.log('Created cat_videos entry with ID:', firestoreVideoId);
    } catch (firestoreError) {
      console.error('Failed to create Firestore entry:', firestoreError);
      // Don't fail the entire upload if Firestore creation fails
    }

    return NextResponse.json({
      videoId,
      videoUrl,
      title: response.data.snippet?.title,
      description: response.data.snippet?.description,
    });
  } catch (error) {
    console.error('Error uploading video to YouTube:', error);

    return NextResponse.json(
      {
        error: 'Failed to upload video to YouTube',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.name : 'UnknownError',
      },
      { status: 500 }
    );
  }
}

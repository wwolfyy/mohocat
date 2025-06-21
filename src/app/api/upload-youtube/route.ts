import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';

export async function POST(request: NextRequest) {
  try {
    // Check environment variables first
    if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET || !process.env.YOUTUBE_REFRESH_TOKEN) {
      return NextResponse.json({
        error: 'YouTube API credentials not configured'
      }, { status: 500 });
    }    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('video') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;    // Enhanced metadata options
    const tags = formData.get('tags') as string; // Comma-separated tags
    const recordingDate = formData.get('recordingDate') as string; // ISO date string
    const playlistId = formData.get('playlistId') as string; // Playlist ID

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
    });

    try {
      await oauth2Client.getAccessToken();
    } catch (authError) {
      console.error('OAuth2 authentication failed:', authError);
      return NextResponse.json({
        error: 'YouTube authentication failed',
        details: authError instanceof Error ? authError.message : 'Unknown auth error'
      }, { status: 401 });
    }

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const buffer = Buffer.from(await file.arrayBuffer());    // Convert buffer to readable stream for YouTube API
    const stream = Readable.from(buffer);    // Prepare snippet data with enhanced metadata
    const snippetData: any = {
      title: title || file.name,
      description: description || 'Uploaded via Mountain Cats app',
    };

    // Add tags if provided
    if (tags && tags.trim()) {
      snippetData.tags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }

    // Prepare recording details if provided
    let recordingDetails: any = undefined;
    if (recordingDate) {
      try {
        const date = new Date(recordingDate);
        if (!isNaN(date.getTime())) {
          recordingDetails = {
            recordingDate: date.toISOString()
          };
        }
      } catch (e) {
        console.warn('Invalid recording date provided:', recordingDate);
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
    };    // Add recording details as a separate top-level property
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

    // Add video to playlist if specified
    if (playlistId && playlistId.trim()) {
      try {
        await youtube.playlistItems.insert({
          part: ['snippet'],
          requestBody: {
            snippet: {
              playlistId: playlistId,
              resourceId: {
                kind: 'youtube#video',
                videoId: videoId
              }
            }
          }
        });      } catch (playlistError) {
        console.warn('Failed to add video to playlist:', playlistError);
        // Don't fail the entire upload if playlist addition fails
      }
    }    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Create Firestore entry in cat_videos collection
    try {
      const tagsArray = tags && tags.trim()
        ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];      const videoData = {
        videoUrl,
        fileName: response.data.snippet?.title || title || file.name,
        storagePath: videoUrl, // For YouTube videos, this is the same as videoUrl
        tags: tagsArray,
        uploadDate: new Date(),
        createdTime: recordingDate ? new Date(recordingDate) : new Date(), // Use recording date or current date
        uploadedBy: 'user', // or get from authentication context
        description: response.data.snippet?.description || description || '',
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        duration: undefined, // YouTube doesn't return duration in upload response
        needsTagging: tagsArray.length === 0, // Needs tagging if no tags provided
        videoType: 'youtube' as const,
        youtubeId: videoId, // Important: YouTube video ID
        title: response.data.snippet?.title || title || file.name,
        publishedAt: new Date().toISOString(),
        recordingDate: recordingDate ? new Date(recordingDate).toISOString() : null, // Add this field explicitly
        channelTitle: 'Mountain Cats', // or get from YouTube API
        catName: '', // Empty initially, can be filled later through tagging
        playlist: playlistId || '', // Add playlist field
        fileSize: undefined, // Not available for YouTube uploads
        autoTagged: false, // User manually provided tags
      };

      console.log('Creating Firestore entry for uploaded video:', videoData);

      const docRef = await addDoc(collection(db, 'cat_videos'), videoData);
      console.log('Created cat_videos entry with ID:', docRef.id);

    } catch (firestoreError) {
      console.error('Failed to create Firestore entry:', firestoreError);
      // Don't fail the entire upload if Firestore creation fails
    }

    return NextResponse.json({
      videoId,
      videoUrl,
      title: response.data.snippet?.title,
      description: response.data.snippet?.description
    });
  } catch (error) {
    console.error('Error uploading video to YouTube:', error);

    return NextResponse.json({
      error: 'Failed to upload video to YouTube',
      details: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.name : 'UnknownError'
    }, { status: 500 });
  }
}

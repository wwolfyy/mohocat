import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';

export async function POST(request: NextRequest) {
  try {
    // Check environment variables first
    if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET || !process.env.YOUTUBE_REFRESH_TOKEN) {
      return NextResponse.json({
        error: 'YouTube API credentials not configured'
      }, { status: 500 });
    }

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('video') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

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

    const buffer = Buffer.from(await file.arrayBuffer());
    // Convert buffer to readable stream for YouTube API
    const stream = Readable.from(buffer);

    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: title || file.name,
          description: description || 'Uploaded via Mountain Cats app',
        },
        status: {
          privacyStatus: 'public',
        },
      },
      media: {
        body: stream,
      },
    });    const videoId = response.data.id;
    if (!videoId) {
      throw new Error('No video ID returned from YouTube');
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

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

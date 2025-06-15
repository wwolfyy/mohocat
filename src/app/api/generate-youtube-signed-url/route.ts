import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileType, title, description } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'Missing fileName or fileType' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
    });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    console.log('Starting YouTube video insert...');

    // Instead of using resumable upload, let's use the direct upload approach
    // This is simpler and will return the video ID immediately
    const uploadUrl = `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`;

    const accessToken = await oauth2Client.getAccessToken();
    console.log('Got access token for YouTube upload');

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken?.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          title: title || fileName,
          description: description || 'Uploaded via Mountain Cats app',
        },
        status: {
          privacyStatus: 'public',
        },
      }),
    });

    console.log('YouTube API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('YouTube API error:', errorText);
      throw new Error(`Failed to initiate YouTube upload: ${response.status}`);
    }

    const signedUrl = response.headers.get('Location');

    if (!signedUrl) {
      throw new Error('No upload URL returned from YouTube API');
    }

    console.log('Successfully got upload URL from YouTube');

    return NextResponse.json({ signedUrl });
  } catch (error) {
    console.error('Error generating YouTube signed URL:', error);
    return NextResponse.json({
      error: 'Failed to generate signed URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

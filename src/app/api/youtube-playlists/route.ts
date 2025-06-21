import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET || !process.env.YOUTUBE_REFRESH_TOKEN) {
      return NextResponse.json({
        error: 'YouTube API credentials not configured'
      }, { status: 500 });
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
        error: 'YouTube authentication failed'
      }, { status: 401 });
    }    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    console.log('Fetching YouTube playlists...');

    // Fetch user's playlists
    const response = await youtube.playlists.list({
      part: ['snippet'],
      mine: true,
      maxResults: 50
    });

    console.log('YouTube API response:', {
      itemCount: response.data.items?.length || 0,
      items: response.data.items?.map(item => ({ id: item.id, title: item.snippet?.title }))
    });

    const playlists = response.data.items?.map(playlist => ({
      id: playlist.id,
      title: playlist.snippet?.title,
      description: playlist.snippet?.description,
      thumbnails: playlist.snippet?.thumbnails
    })) || [];

    console.log('Processed playlists:', playlists);

    return NextResponse.json({ playlists });

  } catch (error) {
    console.error('Error fetching YouTube playlists:', error);
    return NextResponse.json({
      error: 'Failed to fetch YouTube playlists',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

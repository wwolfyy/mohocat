import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { getYouTubeOAuthConfig } from '@/utils/config';
import { requireApiPermission } from '@/lib/auth/requireApiPermission';

// Gated: lists the shared YouTube channel's playlists via the operator's OAuth
// credential — require 'manage-video', mirroring the cat_videos rule.
export async function GET(request: NextRequest) {
  const authz = await requireApiPermission(request, 'manage-video');
  if (!authz.ok) {
    // Keep the caller's degrade-gracefully contract (an empty playlist list) while
    // still reporting the real status — the content forms only use this to populate
    // an optional dropdown.
    return NextResponse.json({ error: authz.error, playlists: [] }, { status: authz.status });
  }

  try {
    // Get YouTube OAuth configuration from centralized config
    const youtubeOAuth = getYouTubeOAuthConfig();
    if (!youtubeOAuth) {
      return NextResponse.json(
        {
          error: 'YouTube OAuth credentials not configured',
          playlists: [],
        },
        { status: 200 }
      ); // Return empty array instead of error
    }

    const oauth2Client = new google.auth.OAuth2(
      youtubeOAuth.clientId,
      youtubeOAuth.clientSecret,
      youtubeOAuth.redirectUri
    );
    oauth2Client.setCredentials({
      refresh_token: youtubeOAuth.refreshToken,
    });

    try {
      await oauth2Client.getAccessToken();
    } catch (authError) {
      console.error('OAuth2 authentication failed:', authError);
      return NextResponse.json(
        {
          error: 'YouTube authentication failed',
          playlists: [],
        },
        { status: 200 }
      ); // Return empty array instead of error
    }
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    console.log('Fetching YouTube playlists...');

    // Fetch user's playlists
    const response = await youtube.playlists.list({
      part: ['snippet'],
      mine: true,
      maxResults: 50,
    });

    console.log('YouTube API response:', {
      itemCount: response.data.items?.length || 0,
      items: response.data.items?.map((item) => ({ id: item.id, title: item.snippet?.title })),
    });

    const playlists =
      response.data.items?.map((playlist) => ({
        id: playlist.id,
        title: playlist.snippet?.title,
        description: playlist.snippet?.description,
        thumbnails: playlist.snippet?.thumbnails,
      })) || [];

    console.log('Processed playlists:', playlists);

    return NextResponse.json({ playlists });
  } catch (error) {
    console.error('Error fetching YouTube playlists:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch YouTube playlists',
        details: error instanceof Error ? error.message : 'Unknown error',
        playlists: [],
      },
      { status: 200 }
    ); // Return empty array instead of error
  }
}

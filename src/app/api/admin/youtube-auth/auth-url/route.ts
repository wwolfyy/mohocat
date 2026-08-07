import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { requireApiPermission } from '@/lib/auth/requireApiPermission';
import { getYouTubeOAuthClient } from '@/lib/youtube/credentials';

// Gated: only video managers may initiate the YouTube OAuth flow.
export async function GET(request: Request) {
  const authz = await requireApiPermission(request, 'manage-video');
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }
  try {
    // Client identity only — this route *obtains* a refresh token, so requiring one to
    // already exist would be a bootstrap deadlock on a fresh deployment.
    const oauthConfig = getYouTubeOAuthClient();

    if (!oauthConfig) {
      return NextResponse.json(
        {
          error: 'YouTube OAuth not configured',
        },
        { status: 500 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      oauthConfig.clientId,
      oauthConfig.clientSecret,
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/admin/youtube-auth/callback`
    );

    // Generate the auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      // The full set the retired scripts/auth/generate_youtube_refresh_token.js requested —
      // i.e. the scopes the token that actually worked in production carried. `upload` and
      // `readonly` alone cover videos.insert and reads, but NOT videos.update (metadata
      // edits) or playlistItems.insert/delete (playlist membership), which need `youtube`
      // or `youtube.force-ssl` and fail with Google's "Insufficient Permission".
      scope: [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.force-ssl',
      ],
      prompt: 'consent', // Force consent screen to ensure we get a refresh token
    });

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('YouTube auth URL generation failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate auth URL',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getYouTubeOAuthConfig } from '@/utils/config';
import { google } from 'googleapis';

export async function GET() {
  try {
    const oauthConfig = getYouTubeOAuthConfig();

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
      scope: [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly',
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

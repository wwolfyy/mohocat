import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/firebase-admin';
import { getYouTubeOAuthClient } from '@/lib/youtube/credentials';

// NOT gated by requireApiPermission: this is the Google OAuth redirect target, hit by the
// browser after consent — there's no Authorization header to verify. It only acts on a
// valid Google `code` exchanged with our client secret. (Hardening with OAuth `state`/PKCE
// is tracked separately; see PROJECT_PLAN §7.)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.json({ error: `YouTube OAuth error: ${error}` }, { status: 400 });
    }

    if (!code) {
      return NextResponse.json({ error: 'No authentication code provided' }, { status: 400 });
    }

    // Client identity only — exchanging the consent `code` needs the app's id/secret,
    // not a pre-existing refresh token (this is where the new one comes from).
    const oauthConfig = getYouTubeOAuthClient();

    if (!oauthConfig) {
      return NextResponse.json({ error: 'YouTube OAuth not configured' }, { status: 500 });
    }

    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      oauthConfig.clientId,
      oauthConfig.clientSecret,
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/admin/youtube-auth/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return new Response(
        `
          <html>
            <body>
              <h1>Token Error</h1>
              <p>No refresh token received. This might happen if you've already authorized this application.</p>
              <p>Please revoke access in your Google account settings and try again.</p>
              <p><a href="https://myaccount.google.com/permissions" target="_blank">Manage Google Account Permissions</a></p>
            </body>
          </html>
        `,
        {
          headers: { 'Content-Type': 'text/html' },
          status: 400,
        }
      );
    }

    // Store the new refresh token in Firestore
    await db.collection('admin_config').doc('youtube_auth').set(
      {
        refreshToken: tokens.refresh_token,
        updatedAt: new Date().toISOString(),
        // Note: Refresh tokens typically expire in 7-14 days, but Google doesn't provide exact expiry
        refreshTokenGeneratedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return new Response(
      `
        <html>
          <body>
            <h1>YouTube Authorization Successful!</h1>
            <p>✅ New refresh token has been generated and stored.</p>
            <p>🔄 All YouTube functionality (upload, metadata edits, playlists) is now live on
               the new token — no environment-variable change and no redeploy needed.</p>
            <p>📅 This token will be valid for 7-14 days.</p>
            <p>You can now close this window and return to the admin panel.</p>
            <script>
              setTimeout(() => {
                window.close();
              }, 3000);
            </script>
          </body>
        </html>
      `,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } catch (error) {
    console.error('YouTube OAuth callback error:', error);
    return new Response(
      `
        <html>
          <body>
            <h1>Authorization Error</h1>
            <p>Failed to process authorization: ${error instanceof Error ? error.message : 'Unknown error'}</p>
            <p>Please close this window and try again.</p>
          </body>
        </html>
      `,
      {
        headers: { 'Content-Type': 'text/html' },
        status: 500,
      }
    );
  }
}

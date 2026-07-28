import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/auth/requireApiPermission';
import { getYouTubeOAuthCredentials } from '@/lib/youtube/credentials';
import { parseTagList } from '@/lib/youtube/videoMetadata';
import { calendarDateToInstant } from '@/utils/dateParser';

/**
 * Opens a **resumable upload session** on YouTube and hands the session URI back to
 * the browser, which then PUTs the file bytes straight to Google.
 *
 * ⚠️ The bytes deliberately do not pass through this function. Vercel caps a
 * function's request body at **4.5 MB** and rejects anything larger at the proxy with
 * 413 `FUNCTION_PAYLOAD_TOO_LARGE` — before the handler runs, so it cannot be caught
 * or configured away. This route used to receive the whole file as multipart form
 * data, which meant any video worth posting failed (`log/DEBUG_LOG.md` 2026-07-29).
 * Only the metadata crosses this boundary now, so the video size no longer matters.
 *
 * The session URI is itself the upload capability, which is why the browser never
 * needs — and never receives — an OAuth token.
 *
 * Gated: uploading to the shared YouTube channel with the operator's OAuth credential
 * requires 'manage-video', the permission the `cat_videos` rule enforces. The
 * companion `/complete` route re-checks it before writing anything.
 */
export async function POST(request: NextRequest) {
  const authz = await requireApiPermission(request, 'manage-video');
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  try {
    const body = await request.json();
    const { fileName, fileSize, mimeType, title, description, tags, createdTime } = body ?? {};

    // Google needs the exact byte count and content type up front to open the
    // session; without them the upload would fail well after the user committed to it.
    if (!fileName || typeof fileSize !== 'number' || fileSize <= 0 || !mimeType) {
      return NextResponse.json(
        { error: 'fileName, a positive fileSize and mimeType are required' },
        { status: 400 }
      );
    }

    // The origin the browser will send on its PUT — it must match what this session
    // is opened with (see the Origin header below). Browsers send `Origin` on any
    // POST, including same-origin ones, so the header is normally present; the
    // Host-derived fallback covers non-browser callers and keeps this fail-loud
    // rather than silently opening an origin-less session.
    const browserOrigin =
      request.headers.get('origin') ??
      `${request.headers.get('x-forwarded-proto') ?? 'https'}://${request.headers.get('host') ?? ''}`;

    if (!browserOrigin || browserOrigin.endsWith('://')) {
      return NextResponse.json(
        { error: 'Could not determine the request origin for the upload session' },
        { status: 400 }
      );
    }

    // Client identity from env + the freshest refresh token (Firestore).
    const tokenConfig = await getYouTubeOAuthCredentials();
    if (!tokenConfig) {
      return NextResponse.json(
        { error: 'YouTube OAuth credentials not configured' },
        { status: 500 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      tokenConfig.clientId,
      tokenConfig.clientSecret,
      tokenConfig.redirectUri
    );
    oauth2Client.setCredentials({ refresh_token: tokenConfig.refreshToken });

    let accessToken: string | null | undefined;
    try {
      const token = await oauth2Client.getAccessToken();
      accessToken = token?.token;
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

    if (!accessToken) {
      return NextResponse.json({ error: 'YouTube authentication failed' }, { status: 401 });
    }

    const snippet: Record<string, unknown> = {
      title: title || fileName,
      // No invented default: an empty description means the uploader left it empty on
      // purpose, and the video goes up without one (plan B3.4).
      description: description || '',
    };

    const tagList = parseTagList(tags);
    if (tagList.length > 0) {
      snippet.tags = tagList;
    }

    const parts = ['snippet', 'status'];
    const videoResource: Record<string, unknown> = {
      snippet,
      status: { privacyStatus: 'public' },
    };

    if (createdTime) {
      try {
        // UTC midnight of that calendar date — the same encoding the admin editor
        // writes, so one field never carries two conventions.
        videoResource.recordingDetails = {
          recordingDate: calendarDateToInstant(createdTime).toISOString(),
        };
        parts.push('recordingDetails');
      } catch (e) {
        console.warn('Invalid created time provided:', createdTime, e);
      }
    }

    const initResponse = await fetch(
      `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=${parts.join(',')}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Length': String(fileSize),
          'X-Upload-Content-Type': mimeType,
          // 🚨 Load-bearing. Google decides the `Access-Control-Allow-Origin` for
          // **every request in the session** from the Origin on this initiating call
          // — and this call is server-side, so without forwarding it there is no
          // Origin at all. The browser then delivers all the bytes and gets a
          // response it is not allowed to read: the upload reaches 100%, XHR fires
          // `onerror` with status 0, and the video lands on YouTube unrecorded.
          // Verified the hard way (`log/DEBUG_LOG.md` 2026-07-29).
          Origin: browserOrigin,
        },
        body: JSON.stringify(videoResource),
      }
    );

    if (!initResponse.ok) {
      const details = await initResponse.text();
      console.error('Failed to open a YouTube upload session:', initResponse.status, details);
      return NextResponse.json(
        { error: 'Failed to open a YouTube upload session', details },
        { status: 502 }
      );
    }

    // The session URI arrives in the Location header and has a finite lifetime.
    const sessionUrl = initResponse.headers.get('location');
    if (!sessionUrl) {
      throw new Error('YouTube returned no upload session URL');
    }

    return NextResponse.json({ sessionUrl });
  } catch (error) {
    console.error('Error opening a YouTube upload session:', error);

    return NextResponse.json(
      {
        error: 'Failed to open a YouTube upload session',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.name : 'UnknownError',
      },
      { status: 500 }
    );
  }
}

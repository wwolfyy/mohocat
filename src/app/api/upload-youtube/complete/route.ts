import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getRequestMountainId } from '@/lib/tenant';
import { requireApiPermission } from '@/lib/auth/requireApiPermission';
import { getYouTubeOAuthCredentials } from '@/lib/youtube/credentials';
import { parseTagList } from '@/lib/youtube/videoMetadata';
import { getYouTubePlaylistId } from '@/utils/config';
import { calendarDateToInstant } from '@/utils/dateParser';

/**
 * Second half of the resumable upload: the browser has PUT the bytes straight to
 * Google and holds the new video id, so this route does everything the old
 * single-shot upload did *after* `videos.insert` — files the video into its
 * playlist(s) and writes the `cat_videos` record.
 *
 * Split out because the bytes can no longer pass through a Vercel function (4.5 MB
 * request-body cap — see the sibling route's note). The video already exists on
 * YouTube by the time this runs, which shapes the error handling below: a failure
 * here leaves an uploaded-but-unrecorded video, never a lost one.
 *
 * Gated on 'manage-video' independently of the session route — this is the half that
 * writes to Firestore via the Admin SDK, bypassing the rules that would otherwise
 * enforce it.
 */
export async function POST(request: NextRequest) {
  const authz = await requireApiPermission(request, 'manage-video');
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  try {
    const body = await request.json();
    const { videoId, fileName, title, description, tags, createdTime, playlistIds } = body ?? {};

    if (!videoId || typeof videoId !== 'string') {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    // The tenant this upload belongs to (Host-resolved) — used for the video's own
    // playlist and for the `cat_videos` write below.
    const mountainId = getRequestMountainId(request);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const resolvedTitle = title || fileName || videoId;
    const tagsArray = parseTagList(tags);

    const requestedPlaylists: string[] = Array.isArray(playlistIds)
      ? playlistIds.map((id: unknown) => String(id).trim()).filter((id: string) => id.length > 0)
      : [];

    if (requestedPlaylists.length > 0) {
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
      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

      // Non-fatal per playlist (the video is already on YouTube), but log WHICH one
      // failed: with more than one target, "the upload succeeded but it isn't in a
      // playlist" would otherwise be an ambiguous warning.
      for (const playlistId of requestedPlaylists) {
        try {
          await youtube.playlistItems.insert({
            part: ['snippet'],
            requestBody: {
              snippet: {
                playlistId,
                resourceId: { kind: 'youtube#video', videoId },
              },
            },
          });
        } catch (playlistError) {
          console.warn(`Failed to add video ${videoId} to playlist ${playlistId}:`, playlistError);
        }
      }
    }

    // Create the Firestore entry in cat_videos.
    //
    // 🚨 Admin SDK, deliberately. This used to go through `getVideoService()`, whose
    // implementation is the **client** Firestore SDK — which on the server carries no
    // authenticated user, so `firestore.rules` denied the write (`cat_videos` requires
    // `manage-video`). `addVideoRecord` caught that, returned null, and the route
    // logged and moved on: every form-uploaded video reached YouTube and was never
    // recorded, surfacing in 영상첩 only after somebody ran 📺 YouTube와 동기화.
    // Fixed 2026-07-29; `refresh-video-metadata` already wrote this collection the
    // same way. **Do not route a server-side write through the service layer.**
    let recorded = false;
    try {
      const videoData = {
        videoUrl,
        fileName: resolvedTitle,
        storagePath: videoUrl, // For YouTube videos, this is the same as videoUrl
        tags: tagsArray,
        // Stamped here rather than by the service layer, which used to add it.
        mountainId,
        uploadDate: new Date(),
        // The recorded day if given, else the upload moment. ⚠️ That fallback is a
        // known gap: the date should come from the file's own metadata and only then
        // from the filename (see HANDOFF open threads).
        createdTime: createdTime ? calendarDateToInstant(createdTime) : new Date(),
        uploadedBy: 'user',
        description: description || '',
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        // `duration` is deliberately absent rather than undefined — YouTube doesn't
        // return it on upload, and Firestore rejects an undefined field value.
        needsTagging: tagsArray.length === 0,
        videoType: 'youtube' as const,
        youtubeId: videoId, // Important: YouTube video ID
        title: resolvedTitle,
        publishedAt: new Date().toISOString(),
        channelTitle: 'Mountain Cats',
        catName: '', // Empty initially, can be filled later through tagging
        // The owning mountain's playlist — resolved from config, not from the request,
        // so it does not depend on the order the caller sent them in (an 입양홍보
        // upload sends two). Ownership itself lives in `mountainId`.
        playlist: getYouTubePlaylistId(mountainId) ?? '',
        autoTagged: false, // User manually provided tags
        // fileSize omitted for YouTube uploads to avoid Firestore undefined errors
      };

      const docRef = await db.collection('cat_videos').add(videoData);
      recorded = true;
      console.log('Created cat_videos entry with ID:', docRef.id);
    } catch (firestoreError) {
      // Still not fatal — the video is already public on YouTube, and failing here
      // would push the operator into a retry that double-posts. But it is reported
      // now (`recorded: false`) instead of being swallowed, which is precisely how
      // the client-SDK bug above stayed invisible.
      console.error('Failed to create the cat_videos entry:', firestoreError);
    }

    return NextResponse.json({ videoId, videoUrl, title: resolvedTitle, recorded });
  } catch (error) {
    console.error('Error completing the YouTube upload:', error);

    return NextResponse.json(
      {
        error: 'Failed to complete the YouTube upload',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.name : 'UnknownError',
      },
      { status: 500 }
    );
  }
}

/**
 * Single source of truth for the shared YouTube OAuth credential.
 *
 * There is exactly **one** YouTube channel and one OAuth credential for the whole
 * platform (owner decision 2026-07-26 — per-mountain channels were considered and
 * rejected: each channel would have to clear YouTube's monetization thresholds on its
 * own, and N credentials means N refresh tokens to rotate). Per-mountain attribution
 * comes from `cat_videos.mountainId`, not from separate channels.
 *
 * The credential has two halves that live in different places, which is what this
 * module exists to reconcile:
 *
 * - **Client identity** (`YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` /
 *   `YOUTUBE_REDIRECT_URI`) — env-only. It identifies the Google Cloud OAuth app and
 *   effectively never changes.
 * - **The refresh token** — rotated every 7–14 days by Google, and stored **only** in
 *   Firestore (`admin_config/youtube_auth`), written via the OAuth callback by the admin
 *   panel's 「토큰 갱신」 button (which, despite the name, runs the full consent flow — it
 *   is the re-authorization, not a silent refresh).
 *
 * ⚠️ **There is deliberately no `YOUTUBE_REFRESH_TOKEN` env fallback** (removed
 * 2026-07-26). Until then every route read the token from env only, so a stale env
 * value silently shadowed the token the re-authorize button had just written —
 * re-authorizing appeared to succeed and changed nothing (`log/DEBUG_LOG.md`). Keeping
 * env even as a *fallback* would have preserved that failure shape for the case where
 * the Firestore doc goes missing. It also isn't needed to bootstrap: obtaining a token
 * requires client identity only, so a deployment with no token anywhere recovers by
 * clicking 「토큰 갱신」. **Don't reintroduce an env token path.**
 *
 * Never log a token value.
 */
import { db } from '@/lib/firebase-admin';

/**
 * The env-sourced half of the credential: enough to construct an OAuth2 client and
 * start the consent flow, with no refresh token needed.
 */
export interface YouTubeOAuthClient {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

export interface YouTubeOAuthCredentials extends YouTubeOAuthClient {
  refreshToken: string;
}

export interface StoredRefreshToken {
  refreshToken: string;
  updatedAt?: string;
}

/**
 * Client identity from env. Returns `null` when the OAuth app isn't configured at all.
 *
 * Deliberately independent of the refresh token: `auth-url` and the OAuth callback
 * need only this half, and requiring a token to obtain a token was a bootstrap
 * deadlock on any deployment that never had one.
 */
export function getYouTubeOAuthClient(): YouTubeOAuthClient | null {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri: process.env.YOUTUBE_REDIRECT_URI,
  };
}

/**
 * The refresh token written by the OAuth callback, if the flow has ever completed.
 *
 * Throws on a Firestore failure rather than reporting "no token" — a broken Admin SDK
 * read is a real fault the route should surface, not something to disguise as an
 * unauthorized app. Callers that want a partial answer (the status panel) catch it
 * themselves.
 */
export async function getStoredRefreshToken(): Promise<StoredRefreshToken | null> {
  try {
    const doc = await db.collection('admin_config').doc('youtube_auth').get();
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data?.refreshToken) {
      return null;
    }

    return { refreshToken: data.refreshToken, updatedAt: data.updatedAt };
  } catch (error) {
    console.error('Failed to read the stored YouTube refresh token from Firestore:', error);
    throw error;
  }
}

/**
 * The full credential every YouTube API route should use: client identity from env +
 * the stored refresh token.
 *
 * Returns `null` when the OAuth app is unconfigured or the flow has never run — routes
 * map that to "credentials not configured", and the operator's fix is 「토큰 갱신」.
 */
export async function getYouTubeOAuthCredentials(): Promise<YouTubeOAuthCredentials | null> {
  const client = getYouTubeOAuthClient();
  if (!client) {
    return null;
  }

  const stored = await getStoredRefreshToken();
  if (!stored) {
    return null;
  }

  return { ...client, refreshToken: stored.refreshToken };
}

/**
 * Unit coverage for the shared YouTube OAuth credential resolver.
 *
 * This pins what the 2026-07-26 fix established: the refresh token comes from Firestore
 * and **only** Firestore (a `YOUTUBE_REFRESH_TOKEN` env fallback is what let a stale
 * token shadow the one the admin "re-authorize" button had just written), while client
 * identity must resolve with no token at all — otherwise the OAuth flow can't be started
 * on a fresh deployment. No automated test can reach the real YouTube API, so this is the
 * only regression net these rules get.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const getDocMock = vi.fn();

vi.mock('@/lib/firebase-admin', () => ({
  db: {
    collection: () => ({
      doc: () => ({ get: getDocMock }),
    }),
  },
}));

import {
  getStoredRefreshToken,
  getYouTubeOAuthClient,
  getYouTubeOAuthCredentials,
} from '@/lib/youtube/credentials';

const storedDoc = (data: Record<string, unknown> | null) => ({
  exists: data !== null,
  data: () => data,
});

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  getDocMock.mockReset();
  process.env.YOUTUBE_CLIENT_ID = 'client-id';
  process.env.YOUTUBE_CLIENT_SECRET = 'client-secret';
  process.env.YOUTUBE_REDIRECT_URI = 'https://example.test/callback';
  delete process.env.YOUTUBE_REFRESH_TOKEN;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('getYouTubeOAuthClient', () => {
  it('resolves client identity with no refresh token present', () => {
    expect(getYouTubeOAuthClient()).toEqual({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'https://example.test/callback',
    });
  });

  it('returns null when the OAuth app is not configured', () => {
    delete process.env.YOUTUBE_CLIENT_SECRET;
    expect(getYouTubeOAuthClient()).toBeNull();
  });
});

describe('getStoredRefreshToken', () => {
  it('returns the stored token and its timestamp', async () => {
    getDocMock.mockResolvedValue(
      storedDoc({ refreshToken: 'firestore-token', updatedAt: '2026-07-26T00:00:00.000Z' })
    );

    await expect(getStoredRefreshToken()).resolves.toEqual({
      refreshToken: 'firestore-token',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });
  });

  it('returns null when the OAuth flow has never completed', async () => {
    getDocMock.mockResolvedValue(storedDoc(null));
    await expect(getStoredRefreshToken()).resolves.toBeNull();
  });

  it('re-raises a Firestore read failure instead of degrading silently', async () => {
    getDocMock.mockRejectedValue(new Error('permission denied'));
    await expect(getStoredRefreshToken()).rejects.toThrow('permission denied');
  });
});

describe('getYouTubeOAuthCredentials', () => {
  it('combines env client identity with the stored refresh token', async () => {
    getDocMock.mockResolvedValue(storedDoc({ refreshToken: 'firestore-token' }));

    await expect(getYouTubeOAuthCredentials()).resolves.toEqual({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'https://example.test/callback',
      refreshToken: 'firestore-token',
    });
  });

  it('ignores a YOUTUBE_REFRESH_TOKEN env var entirely — Firestore is the only source', async () => {
    // The env fallback was removed deliberately: it is what let a stale token shadow a
    // freshly authorized one. A leftover var must not resurrect that path.
    process.env.YOUTUBE_REFRESH_TOKEN = 'stale-env-token';
    getDocMock.mockResolvedValue(storedDoc(null));

    await expect(getYouTubeOAuthCredentials()).resolves.toBeNull();
  });

  it('returns null when the OAuth flow has never run', async () => {
    getDocMock.mockResolvedValue(storedDoc(null));
    await expect(getYouTubeOAuthCredentials()).resolves.toBeNull();
  });

  it('returns null without touching Firestore when the OAuth app is unconfigured', async () => {
    delete process.env.YOUTUBE_CLIENT_ID;

    await expect(getYouTubeOAuthCredentials()).resolves.toBeNull();
    expect(getDocMock).not.toHaveBeenCalled();
  });
});

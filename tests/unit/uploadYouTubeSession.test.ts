/**
 * Unit coverage for the resumable-upload session route (`POST /api/upload-youtube`).
 *
 * This exists for one reason: **the `Origin` header it forwards to Google is
 * load-bearing and invisible everywhere else.** Google fixes the
 * `Access-Control-Allow-Origin` for an entire upload session from the Origin on the
 * initiating call — which is server-side here, so omitting it opens a session the
 * browser may write to but never read from. The symptom is maximally misleading: the
 * upload reaches 100%, then fails, with the video sitting on YouTube unrecorded
 * (`log/DEBUG_LOG.md` 2026-07-29).
 *
 * No automated test reaches the real YouTube API, and the e2e authz suite only proves
 * the gate — so this is the only net under that header.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// `vi.mock` factories are hoisted above module-level consts, so the mocks these
// factories reference directly have to be hoisted with them.
const { requireApiPermissionMock, getCredentialsMock, getAccessTokenMock } = vi.hoisted(() => ({
  requireApiPermissionMock: vi.fn(),
  getCredentialsMock: vi.fn(),
  getAccessTokenMock: vi.fn(),
}));

vi.mock('@/lib/auth/requireApiPermission', () => ({
  requireApiPermission: requireApiPermissionMock,
}));

vi.mock('@/lib/youtube/credentials', () => ({
  getYouTubeOAuthCredentials: getCredentialsMock,
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: class {
        setCredentials() {}
        getAccessToken() {
          return getAccessTokenMock();
        }
      },
    },
  },
}));

import { POST } from '@/app/api/upload-youtube/route';

const VALID_BODY = {
  fileName: 'v.mp4',
  fileSize: 48_000_000,
  mimeType: 'video/mp4',
  title: '산책',
  description: '설명',
};

/**
 * A request shaped like the browser's, with controllable headers. The route only
 * uses the standard `Request` surface (`headers`, `json()`), so a plain Request
 * stands in for `NextRequest`.
 */
const makeRequest = (headers: Record<string, string>, body: unknown = VALID_BODY) =>
  new Request('https://mohocats.org/api/upload-youtube', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  }) as unknown as NextRequest;

const fetchMock = vi.fn();

/** Google's answer to a session-initiation POST. */
const sessionOpened = (
  sessionUrl = 'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=xyz'
) => ({
  ok: true,
  status: 200,
  headers: new Headers({ location: sessionUrl }),
  text: async () => '',
});

beforeEach(() => {
  requireApiPermissionMock.mockReset().mockResolvedValue({
    ok: true,
    uid: 'admin-uid',
    mountainId: 'geyang',
  });
  getCredentialsMock.mockReset().mockResolvedValue({
    clientId: 'client-id',
    clientSecret: 'client-secret',
    redirectUri: 'https://mohocats.org/callback',
    refreshToken: 'refresh-token',
  });
  getAccessTokenMock.mockReset().mockResolvedValue({ token: 'access-token' });
  fetchMock.mockReset().mockResolvedValue(sessionOpened());
  vi.stubGlobal('fetch', fetchMock);
});

const initHeaders = () => fetchMock.mock.calls[0][1].headers as Record<string, string>;

describe('POST /api/upload-youtube — resumable session', () => {
  it("opens the session with the browser's Origin, so the PUT response is readable", async () => {
    const response = await POST(makeRequest({ origin: 'https://mohocats.org' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      sessionUrl: expect.stringContaining('upload_id=xyz'),
    });
    expect(initHeaders().Origin).toBe('https://mohocats.org');
  });

  it('carries a preview deployment origin through unchanged', async () => {
    await POST(makeRequest({ origin: 'https://mohocat-git-dev.vercel.app' }));

    expect(initHeaders().Origin).toBe('https://mohocat-git-dev.vercel.app');
  });

  it('falls back to the forwarded host when no Origin header is present', async () => {
    await POST(makeRequest({ host: 'mohocats.org', 'x-forwarded-proto': 'https' }));

    expect(initHeaders().Origin).toBe('https://mohocats.org');
  });

  it('refuses rather than opening an origin-less session it cannot attribute', async () => {
    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('declares the byte count and content type up front', async () => {
    await POST(makeRequest({ origin: 'https://mohocats.org' }));

    expect(initHeaders()['X-Upload-Content-Length']).toBe('48000000');
    expect(initHeaders()['X-Upload-Content-Type']).toBe('video/mp4');
  });

  it('rejects a body with no usable file description before calling Google', async () => {
    const response = await POST(
      makeRequest({ origin: 'https://mohocats.org' }, { title: 't', fileSize: 0 })
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('passes the gate result through untouched when permission is refused', async () => {
    requireApiPermissionMock.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Insufficient permissions',
    });

    const response = await POST(makeRequest({ origin: 'https://mohocats.org' }));

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

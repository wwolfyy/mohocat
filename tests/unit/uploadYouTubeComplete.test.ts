/**
 * Unit coverage for the upload-completion route (`POST /api/upload-youtube/complete`) —
 * specifically the **`cat_videos` record it writes**.
 *
 * This exists for one reason: 촬영일 (`createdTime`) must never be invented. The route
 * used to fall back to `new Date()` when no recording date was supplied, so every video
 * whose filename carries no parseable date — every iPhone `IMG_1234.MOV` — was recorded
 * as having been filmed at the moment of upload (owner-reported, `log/DEBUG_LOG.md`
 * 2026-08-02).
 *
 * That failure mode is invisible to every other net: the write succeeds, the value looks
 * like a plausible date, and it is only contradicted later, when a metadata sync replaces
 * it with `null` because YouTube was never sent a `recordingDate` on this path. So the
 * assertion has to be made here, directly on the written document.
 *
 * The playlist branch is skipped throughout (`playlistIds: []`) — it reaches the real
 * googleapis client, and the record is what is under test.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { requireApiPermissionMock, addMock, getPlaylistIdMock } = vi.hoisted(() => ({
  requireApiPermissionMock: vi.fn(),
  addMock: vi.fn(),
  getPlaylistIdMock: vi.fn(),
}));

vi.mock('@/lib/auth/requireApiPermission', () => ({
  requireApiPermission: requireApiPermissionMock,
}));

vi.mock('@/lib/firebase-admin', () => ({
  db: { collection: () => ({ add: addMock }) },
}));

vi.mock('@/lib/tenant', () => ({
  getRequestMountainId: () => 'geyang',
}));

vi.mock('@/utils/config', () => ({
  getYouTubePlaylistId: getPlaylistIdMock,
}));

import { POST } from '@/app/api/upload-youtube/complete/route';

/** A request shaped like the browser's completion call. */
function makeRequest(body: Record<string, unknown>): NextRequest {
  return {
    json: async () => body,
    headers: new Headers({ host: 'localhost:3000' }),
  } as unknown as NextRequest;
}

const BASE_BODY = {
  videoId: 'yt-video-123',
  fileName: 'IMG_1234.MOV',
  title: '냥이 영상',
  description: '',
  tags: '',
  playlistIds: [],
};

/** The document handed to Firestore by the last call. */
const writtenDoc = () => addMock.mock.calls.at(-1)?.[0] as Record<string, unknown>;

describe('POST /api/upload-youtube/complete — the cat_videos record', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiPermissionMock.mockResolvedValue({
      ok: true,
      uid: 'admin-uid',
      mountainId: 'geyang',
    });
    addMock.mockResolvedValue({ id: 'firestore-doc-id' });
    getPlaylistIdMock.mockReturnValue('PL-geyang');
  });

  // §10p: a 집사톡 member holds `upload-own-video`, an admin only `manage-video`, and
  // this route is the ONLY gate on a member's video record (the write below goes
  // through the Admin SDK, which bypasses firestore.rules). Both must stay accepted —
  // dropping either locks out one of the two groups that legitimately upload.
  it('accepts either the admin or the narrow member video permission', async () => {
    await POST(makeRequest(BASE_BODY));

    expect(requireApiPermissionMock).toHaveBeenCalledWith(expect.anything(), [
      'manage-video',
      'upload-own-video',
    ]);
  });

  it('stamps uploadedByUid from the verified caller, not from the request body', async () => {
    requireApiPermissionMock.mockResolvedValue({
      ok: true,
      uid: 'member-uid',
      mountainId: 'geyang',
    });

    // A hand-crafted client sending its own uid must not be able to set it.
    await POST(makeRequest({ ...BASE_BODY, uploadedByUid: 'someone-else' }));

    expect(writtenDoc().uploadedByUid).toBe('member-uid');
  });

  it('leaves 촬영일 empty when no recording date is known, rather than inventing one', async () => {
    const res = await POST(makeRequest(BASE_BODY));

    expect(res.status).toBe(200);
    // null, NOT the upload moment: a fabricated date is indistinguishable from a real
    // one, and the next sync would overwrite it with null anyway.
    expect(writtenDoc().createdTime).toBeNull();
  });

  it('treats an empty-string recording date as unknown too', async () => {
    // The composers send '' when the filename yielded nothing — the exact shape that
    // used to slip through the truthiness check into the `new Date()` fallback.
    await POST(makeRequest({ ...BASE_BODY, createdTime: '' }));

    expect(writtenDoc().createdTime).toBeNull();
  });

  it('stores the supplied recording date as UTC midnight of that calendar day', async () => {
    await POST(makeRequest({ ...BASE_BODY, createdTime: '2026-03-15' }));

    const stored = writtenDoc().createdTime as Date;
    expect(stored).toBeInstanceOf(Date);
    // Calendar date in, calendar date out — no KST shift (DEBUG_LOG 2026-07-27).
    expect(stored.toISOString()).toBe('2026-03-15T00:00:00.000Z');
  });

  it('still stamps uploadDate with the upload moment, which is a different fact', async () => {
    const before = Date.now();
    await POST(makeRequest(BASE_BODY));
    const after = Date.now();

    // 게시일 legitimately IS "now" for a fresh upload — the fix above must not be
    // over-applied to this field, which the album sorts on.
    const uploadDate = writtenDoc().uploadDate as Date;
    expect(uploadDate).toBeInstanceOf(Date);
    expect(uploadDate.getTime()).toBeGreaterThanOrEqual(before);
    expect(uploadDate.getTime()).toBeLessThanOrEqual(after);
  });

  it('refuses without the manage-video permission, before writing anything', async () => {
    requireApiPermissionMock.mockResolvedValue({ ok: false, error: 'Forbidden', status: 403 });

    const res = await POST(makeRequest(BASE_BODY));

    expect(res.status).toBe(403);
    expect(addMock).not.toHaveBeenCalled();
  });
});

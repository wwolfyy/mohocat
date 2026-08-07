/**
 * Unit coverage for the server-side API permission gate — specifically its **any-of**
 * form (§10p, 2026-08-03).
 *
 * The upload routes accept a broad admin permission OR a narrow member one
 * (`['manage-photo', 'upload-own-photo']`), because an admin holds only the first and a
 * member only the second. 🔑 **§10n shipped the single-permission version of this bug
 * once already**: gating on the new member permission alone locked admins out, since
 * `manage-posts` and `write-own-*` are different permissions. These tests pin both
 * directions so it cannot regress silently.
 *
 * Firebase Admin is mocked — the point is the decision, not the SDK.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { verifyIdTokenMock, userGetMock, configGetMock } = vi.hoisted(() => ({
  verifyIdTokenMock: vi.fn(),
  userGetMock: vi.fn(),
  configGetMock: vi.fn(),
}));

vi.mock('@/lib/firebase-admin', () => ({
  auth: { verifyIdToken: verifyIdTokenMock },
  db: {
    collection: (name: string) => ({
      doc: () => ({ get: name === 'users' ? userGetMock : configGetMock }),
    }),
  },
}));

vi.mock('@/lib/tenant', () => ({
  getRequestMountainId: () => 'geyang',
}));

import { requireApiPermission } from '@/lib/auth/requireApiPermission';

const request = () =>
  ({ headers: new Headers({ authorization: 'Bearer test-token' }) }) as unknown as Request;

/** Sign the caller in as `role` on geyang, with the real-shaped role matrix. */
function signInAs(role: string) {
  verifyIdTokenMock.mockResolvedValue({ uid: 'caller-uid' });
  userGetMock.mockResolvedValue({
    exists: true,
    data: () => ({ roles: { geyang: { role, isActive: true } } }),
  });
  configGetMock.mockResolvedValue({
    exists: true,
    data: () => ({
      roles: {
        admin: { permissions: ['manage-photo', 'manage-video', 'manage-posts'] },
        'butler-ground': { permissions: ['upload-own-photo', 'upload-own-video'] },
        viewer: { permissions: [] },
      },
    }),
  });
}

beforeEach(() => vi.clearAllMocks());

describe('requireApiPermission — any-of', () => {
  it('admits an admin, who holds only the broad permission', async () => {
    signInAs('admin');
    const result = await requireApiPermission(request(), ['manage-photo', 'upload-own-photo']);
    expect(result).toMatchObject({ ok: true, uid: 'caller-uid', mountainId: 'geyang' });
  });

  it('admits a member, who holds only the narrow permission', async () => {
    signInAs('butler-ground');
    const result = await requireApiPermission(request(), ['manage-photo', 'upload-own-photo']);
    expect(result).toMatchObject({ ok: true, uid: 'caller-uid' });
  });

  it('refuses someone holding neither, with 403', async () => {
    signInAs('viewer');
    const result = await requireApiPermission(request(), ['manage-photo', 'upload-own-photo']);
    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it('refuses a member on a route that takes the broad permission ALONE', async () => {
    // The narrow grant is only worth having because it is not accepted elsewhere: the
    // tagging/album routes must keep refusing it. If this ever passes, `upload-own-photo`
    // has quietly become `manage-photo`.
    signInAs('butler-ground');
    const result = await requireApiPermission(request(), 'manage-photo');
    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it('still accepts a plain string (the other seven routes are unchanged)', async () => {
    signInAs('admin');
    await expect(requireApiPermission(request(), 'manage-posts')).resolves.toMatchObject({
      ok: true,
    });
    await expect(requireApiPermission(request(), 'manage-users')).resolves.toMatchObject({
      ok: false,
      status: 403,
    });
  });

  it('refuses an unauthenticated caller with 401 before any permission check', async () => {
    signInAs('admin');
    const noAuth = { headers: new Headers() } as unknown as Request;
    const result = await requireApiPermission(noAuth, ['manage-photo', 'upload-own-photo']);
    expect(result).toMatchObject({ ok: false, status: 401 });
    expect(verifyIdTokenMock).not.toHaveBeenCalled();
  });

  it('grants nothing from a role on a DIFFERENT mountain', async () => {
    verifyIdTokenMock.mockResolvedValue({ uid: 'caller-uid' });
    userGetMock.mockResolvedValue({
      exists: true,
      data: () => ({ roles: { manisan: { role: 'butler-ground', isActive: true } } }),
    });
    configGetMock.mockResolvedValue({
      exists: true,
      data: () => ({ roles: { 'butler-ground': { permissions: ['upload-own-photo'] } } }),
    });

    const result = await requireApiPermission(request(), ['manage-photo', 'upload-own-photo']);
    expect(result).toMatchObject({ ok: false, status: 403 });
  });
});

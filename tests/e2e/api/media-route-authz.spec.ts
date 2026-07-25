/**
 * Auth gating on the media / credential API routes.
 *
 * These routes mint Firebase Storage upload URLs or drive the shared YouTube channel
 * with the operator's OAuth credential, and several write Firestore through the Admin
 * SDK (which bypasses firestore.rules). They shipped with **no auth gate at all** —
 * any unauthenticated caller could reach them (surfaced by the M5.3 route audit,
 * 2026-07-23). Each now runs `requireApiPermission` with the permission that
 * firestore.rules already enforces on the resource it touches:
 *   - generate-signed-url  → 'manage-photo'  (its uploads become `cat_images`)
 *   - every YouTube route  → 'manage-video'  (mirrors the `cat_videos` rule)
 *
 * Pure HTTP (Playwright request context, no browser), so it pins the enforcement
 * itself rather than any UI path. Tenant resolves to the default (geyang) from the
 * request Host, matching the seeded admin's `roles.geyang`.
 *
 * Seeded actors (tests/e2e/fixtures/users.json):
 *   - admin@test.local  — admin  (holds manage-photo + manage-video)
 *   - member@test.local — butler-ground (view-* only; holds neither)
 *
 * The third case asserts the response carries none of the guard's rejection messages,
 * rather than checking the status: the emulator has no YouTube OAuth credentials, so an
 * authorized call still fails downstream — and `update-youtube-video` reports that
 * failure as its own 401 (see GATE_ERRORS below). Downstream failures are expected and
 * fine; what must not happen is the *gate* turning away a permitted caller.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';

const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'demo-key';

/** Sign a seeded user in against the Auth emulator and return their ID token. */
async function idTokenFor(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<string> {
  const res = await request.post(
    `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    { data: { email, password, returnSecureToken: true } }
  );
  expect(res.ok(), `emulator sign-in failed for ${email}: ${res.status()}`).toBeTruthy();
  return (await res.json()).idToken as string;
}

type Method = 'get' | 'post' | 'put';

interface GatedRoute {
  name: string;
  method: Method;
  path: string;
  /** Minimal body; the gate runs before any body parsing, so it only matters post-gate. */
  data?: Record<string, unknown>;
}

const GATED_ROUTES: GatedRoute[] = [
  {
    name: 'POST /api/generate-signed-url',
    method: 'post',
    path: '/api/generate-signed-url',
    data: { fileName: 'a.jpg', fileType: 'image/jpeg' },
  },
  { name: 'POST /api/upload-youtube', method: 'post', path: '/api/upload-youtube' },
  {
    name: 'PUT /api/update-youtube-video',
    method: 'put',
    path: '/api/update-youtube-video',
    data: { videoId: 'abc', updates: { title: 't' } },
  },
  {
    name: 'POST /api/refresh-video-metadata',
    method: 'post',
    path: '/api/refresh-video-metadata',
    data: { videoIds: ['abc'] },
  },
  { name: 'GET /api/manage-playlists', method: 'get', path: '/api/manage-playlists' },
  {
    name: 'POST /api/manage-playlists',
    method: 'post',
    path: '/api/manage-playlists',
    data: { action: 'list_playlists' },
  },
  { name: 'GET /api/youtube-playlists', method: 'get', path: '/api/youtube-playlists' },
];

function call(request: APIRequestContext, route: GatedRoute, headers: Record<string, string> = {}) {
  return request[route.method](route.path, { headers, data: route.data });
}

/**
 * The three rejection messages `requireApiPermission` can produce. Assertions key on
 * these rather than on status alone, because status is ambiguous here: with no YouTube
 * OAuth credentials in the emulator, `update-youtube-video` answers an `invalid_grant`
 * with its own **401** ("YouTube authentication failed…"). That is a downstream
 * credential failure, not the gate — only the body tells them apart.
 */
const GATE_ERRORS = ['Authentication required', 'Invalid token', 'Insufficient permissions'];

function isGateRejection(body: string): boolean {
  return GATE_ERRORS.some((message) => body.includes(message));
}

test.describe('media/credential API routes reject unauthenticated callers', () => {
  for (const route of GATED_ROUTES) {
    test(`${route.name} → 401 without a token`, async ({ request }) => {
      const res = await call(request, route);
      expect(res.status()).toBe(401);
      expect(await res.text()).toContain('Authentication required');
    });
  }
});

test.describe('media/credential API routes reject insufficient permissions', () => {
  for (const route of GATED_ROUTES) {
    test(`${route.name} → 403 for a butler without manage-photo/manage-video`, async ({
      request,
    }) => {
      const token = await idTokenFor(request, 'member@test.local', 'Passw0rd!member');
      const res = await call(request, route, { Authorization: `Bearer ${token}` });
      expect(res.status()).toBe(403);
      expect(await res.text()).toContain('Insufficient permissions');
    });
  }
});

test.describe('media/credential API routes admit a permitted admin', () => {
  for (const route of GATED_ROUTES) {
    test(`${route.name} → past the gate for an admin`, async ({ request }) => {
      const token = await idTokenFor(request, 'admin@test.local', 'Passw0rd!admin');
      const res = await call(request, route, { Authorization: `Bearer ${token}` });
      const body = await res.text();
      // Downstream failures (no YouTube creds in the emulator) are expected and fine;
      // what must not happen is the *gate* rejecting a permitted caller.
      expect(
        isGateRejection(body),
        `${route.name} rejected an admin holding the required permission ` +
          `(status ${res.status()}, body: ${body})`
      ).toBe(false);
    });
  }
});

/**
 * API security assertions (main plan §5.5) — Playwright request context, no browser.
 *
 * Regression-guards the 2026-06-28 auth fixes on the API surface. Two gate styles:
 *   - admin routes use `requireApiPermission(req, '<perm>')` → 401 without a Bearer
 *     token, 403 with a valid token whose role lacks the permission;
 *   - contact / account-delete / revalidate do a direct Bearer + `verifyIdToken`
 *     check → 401 without a valid token (any signed-in user is otherwise allowed).
 * One admin route is intentionally public: `GET /api/admin/resource-permissions`.
 *
 * The non-admin ID token is minted straight from the Auth emulator's Identity
 * Toolkit REST endpoint (the §5 blocker is the client login *redirect* flow —
 * `ensureUserExists` — not token issuance, so signed-in API coverage is unblocked).
 * Uses the base `test` (no page / console-watchdog fixture): these are pure HTTP.
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

/** Issue a request, omitting a body on GET (some servers reject a GET payload). */
function call(
  request: APIRequestContext,
  method: string,
  path: string,
  headers: Record<string, string> = {}
) {
  return request.fetch(path, {
    method,
    headers,
    ...(method === 'GET' ? {} : { data: {} }),
  });
}

// Admin routes guarded by requireApiPermission → 401 anon, 403 non-admin. The
// permission each needs is noted; `member@test.local` (butler-ground) holds none.
const GATED = [
  { method: 'POST', path: '/api/admin/role-permissions' }, // manage-users
  { method: 'GET', path: '/api/admin/get-all-user-permissions-client' }, // manage-users
  { method: 'GET', path: '/api/admin/youtube-auth/status' }, // manage-video (leaked refresh token)
  { method: 'POST', path: '/api/admin/resource-permissions' }, // manage-users (write)
];

// Direct Bearer-check routes → 401 without a valid token (any signed-in user else).
const AUTH_REQUIRED = [
  { method: 'POST', path: '/api/contact' },
  { method: 'POST', path: '/api/account/delete' },
  { method: 'POST', path: '/api/revalidate' },
];

test.describe('API security', () => {
  test('unauthenticated calls are rejected with 401', async ({ request }) => {
    for (const { method, path } of [...GATED, ...AUTH_REQUIRED]) {
      const res = await call(request, method, path);
      expect(res.status(), `${method} ${path} unauthenticated`).toBe(401);
    }
  });

  test('authenticated non-admin gets 403 on manage-* routes', async ({ request }) => {
    // A valid token that lacks the required permission. Getting 403 (not 401) here
    // also proves the token itself verified — i.e. the gate is permission-based.
    const token = await idTokenFor(request, 'member@test.local', 'Passw0rd!member');
    const headers = { Authorization: `Bearer ${token}` };
    for (const { method, path } of GATED) {
      const res = await call(request, method, path, headers);
      expect(res.status(), `${method} ${path} as non-admin`).toBe(403);
    }
  });

  test('GET /api/admin/resource-permissions is open by design (200)', async ({ request }) => {
    const res = await request.get('/api/admin/resource-permissions');
    expect(res.status()).toBe(200);
  });
});

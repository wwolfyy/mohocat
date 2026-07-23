/**
 * Two-tenant isolation — API / data layer (multi-mountain plan M5.4b).
 *
 * The enforcement-side proof that geyang and manisan are isolated. Pure HTTP
 * (Playwright request context, no browser), so it's robust against DOM churn.
 * The rendered-content half lives in `tests/e2e/public/tenant-isolation.spec.ts`.
 *
 * Tenant is resolved from the request **Host** header (`getRequestMountainId` —
 * `/api/*` is excluded from the host-rewrite middleware), so each call targets a
 * mountain by setting Host to that mountain's configured `domains[0]`. Both hosts
 * hit the same emulator-backed server on 127.0.0.1; only the Host differs.
 *
 * Seeded actors (tests/e2e/fixtures/manisan.json + users.json):
 *   - manisan-admin@test.local — admin on **manisan only**
 *   - dual-admin@test.local    — admin on **both** geyang and manisan
 *   - admin@test.local         — admin on **geyang only** (the reverse case)
 *
 * What this asserts:
 *   (a/d) content reads are partitioned by tenant Host — each mountain sees only
 *         its own seeded docs (which also proves the seeded creates landed with
 *         the right `mountainId`);
 *   (b)   a single-mountain admin is denied on the OTHER mountain's gated API;
 *   (c)   a dual-mountain admin is allowed on each of their mountains.
 *
 * Not duplicated here: the `contacts` PII read-isolation (a geyang admin must not
 * read a manisan 동참 submission) is a client-SDK + firestore.rules concern and is
 * already covered by `tests/rules/users.rules.test.ts`.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';

const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'demo-key';

// Each mountain's configured production host (config/mountains/mountains.json → domains).
const GEYANG_HOST = 'geyangsan.mohocats.org';
const MANISAN_HOST = 'manisan.mohocats.org';

// Distinct seeded content markers (geyang fixtures vs manisan.json).
const GEYANG_CAT = '테스트냥이일';
const MANISAN_CAT = '마니산냥이일';
const GEYANG_POINT = '테스트 급식소 1';
const MANISAN_POINT = '마니산 급식소 1';

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

// A gated admin route (requireApiPermission → mountain-scoped manage-users). Its
// tenant comes from Host, so the same token yields 200 or 403 by which mountain
// the caller holds the role on — the core of the M5.3 mountain enforcement.
const GATED_PATH = '/api/admin/get-all-user-permissions-client';

test.describe('two-tenant isolation — data reads partitioned by Host', () => {
  test('GET /api/admin/cats returns only the Host mountain’s cats', async ({ request }) => {
    const geyang = await request.get('/api/admin/cats', { headers: { host: GEYANG_HOST } });
    expect(geyang.ok()).toBeTruthy();
    const geyangNames = ((await geyang.json()).cats as Array<{ name: string }>).map((c) => c.name);
    expect(geyangNames).toContain(GEYANG_CAT);
    expect(geyangNames).not.toContain(MANISAN_CAT);

    const manisan = await request.get('/api/admin/cats', { headers: { host: MANISAN_HOST } });
    expect(manisan.ok()).toBeTruthy();
    const manisanNames = ((await manisan.json()).cats as Array<{ name: string }>).map(
      (c) => c.name
    );
    expect(manisanNames).toContain(MANISAN_CAT);
    expect(manisanNames).not.toContain(GEYANG_CAT);
  });

  test('GET /api/points returns only the Host mountain’s points', async ({ request }) => {
    const geyang = await request.get('/api/points', { headers: { host: GEYANG_HOST } });
    expect(geyang.ok()).toBeTruthy();
    const geyangTitles = ((await geyang.json()).points as Array<{ title: string }>).map(
      (p) => p.title
    );
    expect(geyangTitles).toContain(GEYANG_POINT);
    expect(geyangTitles).not.toContain(MANISAN_POINT);

    const manisan = await request.get('/api/points', { headers: { host: MANISAN_HOST } });
    expect(manisan.ok()).toBeTruthy();
    const manisanTitles = ((await manisan.json()).points as Array<{ title: string }>).map(
      (p) => p.title
    );
    expect(manisanTitles).toContain(MANISAN_POINT);
    expect(manisanTitles).not.toContain(GEYANG_POINT);
  });
});

test.describe('two-tenant isolation — API authorization is mountain-scoped', () => {
  test('single-mountain (manisan-only) admin is allowed on manisan, denied on geyang', async ({
    request,
  }) => {
    const token = await idTokenFor(request, 'manisan-admin@test.local', 'Passw0rd!manisan');
    const headers = { Authorization: `Bearer ${token}` };

    const onManisan = await request.get(GATED_PATH, {
      headers: { ...headers, host: MANISAN_HOST },
    });
    expect(onManisan.status(), 'manisan-admin on manisan').toBe(200);

    const onGeyang = await request.get(GATED_PATH, { headers: { ...headers, host: GEYANG_HOST } });
    expect(onGeyang.status(), 'manisan-admin on geyang').toBe(403);
  });

  test('single-mountain (geyang-only) admin is allowed on geyang, denied on manisan', async ({
    request,
  }) => {
    const token = await idTokenFor(request, 'admin@test.local', 'Passw0rd!admin');
    const headers = { Authorization: `Bearer ${token}` };

    const onGeyang = await request.get(GATED_PATH, { headers: { ...headers, host: GEYANG_HOST } });
    expect(onGeyang.status(), 'geyang-admin on geyang').toBe(200);

    const onManisan = await request.get(GATED_PATH, {
      headers: { ...headers, host: MANISAN_HOST },
    });
    expect(onManisan.status(), 'geyang-admin on manisan').toBe(403);
  });

  test('multi-role (dual) admin is allowed on both mountains', async ({ request }) => {
    const token = await idTokenFor(request, 'dual-admin@test.local', 'Passw0rd!dual');
    const headers = { Authorization: `Bearer ${token}` };

    const onGeyang = await request.get(GATED_PATH, { headers: { ...headers, host: GEYANG_HOST } });
    expect(onGeyang.status(), 'dual-admin on geyang').toBe(200);

    const onManisan = await request.get(GATED_PATH, {
      headers: { ...headers, host: MANISAN_HOST },
    });
    expect(onManisan.status(), 'dual-admin on manisan').toBe(200);
  });
});

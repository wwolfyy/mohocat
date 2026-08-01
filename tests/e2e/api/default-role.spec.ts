/**
 * POST /api/account/default-role — the signup default-role grant.
 *
 * WHY THIS ROUTE NEEDS ITS OWN SUITE. It runs the **Admin SDK**, so it bypasses
 * `firestore.rules` entirely, and — unlike every `/api/admin/*` route — it is
 * callable by **any authenticated user**. That combination is exactly the shape of
 * a privilege-escalation bug, so its guards are the contract under test here, not
 * an implementation detail:
 *
 *   1. uid comes from the verified ID token, never the body → you can only act on
 *      yourself;
 *   2. the role comes from `config/permissions.json`, never the body → you cannot
 *      ask for `admin`;
 *   3. it refuses when a role already exists → you cannot overwrite or downgrade
 *      an admin-assigned role, and re-calling it is a no-op.
 *
 * Cases 4 and 5 below are the two that would matter if someone "simplified" the
 * route later: they assert a caller cannot name their own role, and cannot use it
 * to clobber an existing one.
 *
 * Pure HTTP (Playwright request context, no browser). Firestore setup/verification
 * goes through the Admin SDK against the emulator — mirroring
 * `scripts/test/seed-emulators.mjs`, including its demo-project safety guard —
 * because the states under test (a member with an EMPTY roles map; an Auth account
 * with no profile doc at all) are not in the seeded fixtures and must not be added
 * there: this suite mutates roles, and seeded users are shared with other specs.
 *
 * Every user created here is unique per run and torn down in `afterAll`.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import { initializeApp, deleteApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'demo-key';
const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID_OVERRIDE ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  'demo-mohocat';

/** The tenant a request to the test server's Host resolves to. */
const MOUNTAIN_ID = 'geyang';
/** `defaultRole` for that mountain in config/permissions.json. */
const EXPECTED_ROLE = 'viewer';
/** Its permissions in the seeded role matrix (tests/e2e/fixtures/role-config.json). */
const EXPECTED_PERMISSIONS = ['view-video', 'view-photo'];

const ROUTE = '/api/account/default-role';

let app: App;
let db: Firestore;
let adminAuth: Auth;
const createdUids: string[] = [];

// Mirrors the seed script's belt-and-suspenders guard: this file creates and
// DELETES users, so it must be impossible to point at a real project.
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('default-role.spec: FIRESTORE_EMULATOR_HOST unset — run via `npm run test:e2e`.');
}
if (!PROJECT_ID.startsWith('demo-')) {
  throw new Error(`default-role.spec: refusing to run against non-demo project "${PROJECT_ID}".`);
}

test.beforeAll(() => {
  app = initializeApp({ projectId: PROJECT_ID }, `default-role-spec-${Date.now()}`);
  db = getFirestore(app);
  adminAuth = getAuth(app);
});

test.afterAll(async () => {
  for (const uid of createdUids) {
    await adminAuth.deleteUser(uid).catch(() => {});
    await db
      .collection('users')
      .doc(uid)
      .delete()
      .catch(() => {});
    const logs = await db.collection('permission_logs').where('userId', '==', uid).get();
    await Promise.all(logs.docs.map((d) => d.ref.delete()));
  }
  await deleteApp(app);
});

/** A brand-new Auth account, unique per run. Returns its uid + credentials. */
async function createFreshUser(label: string) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const uid = `test-${label}-${stamp}`;
  const email = `${label}.${stamp}@test.local`;
  const password = 'Passw0rd!fresh';
  await adminAuth.createUser({ uid, email, password, emailVerified: true });
  createdUids.push(uid);
  return { uid, email, password };
}

/**
 * The profile doc as the CLIENT would create it at signup — `roles` empty, which
 * is all `firestore.rules` permits a user to self-create.
 */
async function createProfileDoc(uid: string, email: string) {
  await db.collection('users').doc(uid).set({
    uid,
    email,
    displayName: '기본역할테스트',
    roles: {},
    roleHistory: [],
    mountainId: MOUNTAIN_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

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

const readRoles = async (uid: string) =>
  (await db.collection('users').doc(uid).get()).data()?.roles ?? {};

test.describe('POST /api/account/default-role', () => {
  test('rejects an unauthenticated caller', async ({ request }) => {
    const res = await request.post(ROUTE);
    expect(res.status()).toBe(401);
  });

  test('rejects a malformed bearer token', async ({ request }) => {
    const res = await request.post(ROUTE, {
      headers: { Authorization: 'Bearer not-a-real-token' },
    });
    expect(res.status()).toBe(401);
  });

  test('grants the mountain default role to a member who has none', async ({ request }) => {
    const { uid, email, password } = await createFreshUser('norole');
    await createProfileDoc(uid, email);

    const res = await request.post(ROUTE, {
      headers: { Authorization: `Bearer ${await idTokenFor(request, email, password)}` },
    });

    expect(res.ok()).toBeTruthy();
    expect(await res.json()).toMatchObject({ assigned: true, role: EXPECTED_ROLE });

    const entry = (await readRoles(uid))[MOUNTAIN_ID];
    expect(entry).toBeTruthy();
    expect(entry.role).toBe(EXPECTED_ROLE);
    expect(entry.mountainId).toBe(MOUNTAIN_ID);
    expect(entry.isActive).toBe(true);
    // Permissions are resolved from the live matrix, not hard-coded in the route.
    expect(entry.permissions).toEqual(EXPECTED_PERMISSIONS);
    // Distinguishes an automatic default from an admin grant in the audit trail.
    expect(entry.assignedBy).toBe('system');

    const logs = await db.collection('permission_logs').where('userId', '==', uid).get();
    expect(logs.size).toBe(1);
    expect(logs.docs[0].data()).toMatchObject({
      action: 'role-assigned',
      newRole: EXPECTED_ROLE,
      mountainId: MOUNTAIN_ID,
      changedBy: 'system',
      metadata: { source: 'signup-default' },
    });
  });

  test('ignores the request body — a caller cannot name their own role', async ({ request }) => {
    const { uid, email, password } = await createFreshUser('selfgrant');
    await createProfileDoc(uid, email);

    const res = await request.post(ROUTE, {
      headers: { Authorization: `Bearer ${await idTokenFor(request, email, password)}` },
      // Everything an attacker would try: a privileged role, and someone else's uid.
      data: { role: 'admin', userId: 'test-admin-uid', mountainId: 'manisan' },
    });

    expect(res.ok()).toBeTruthy();
    expect(await res.json()).toMatchObject({ assigned: true, role: EXPECTED_ROLE });

    const roles = await readRoles(uid);
    expect(roles[MOUNTAIN_ID].role).toBe(EXPECTED_ROLE);
    // The named role was not granted, and no role leaked onto the named mountain.
    expect(roles[MOUNTAIN_ID].role).not.toBe('admin');
    expect(roles.manisan).toBeUndefined();

    // The seeded admin named in the body is untouched.
    const seededAdmin = await readRoles('test-admin-uid');
    expect(seededAdmin[MOUNTAIN_ID]?.role).toBe('admin');
  });

  test('refuses to overwrite an existing role, and is a no-op on repeat', async ({ request }) => {
    const { uid, email, password } = await createFreshUser('existing');
    await createProfileDoc(uid, email);
    const token = `Bearer ${await idTokenFor(request, email, password)}`;

    // First call assigns.
    expect(
      await (await request.post(ROUTE, { headers: { Authorization: token } })).json()
    ).toMatchObject({ assigned: true });
    const afterFirst = (await readRoles(uid))[MOUNTAIN_ID];

    // Second call must change nothing — including the assignedAt timestamp, so a
    // repeat cannot quietly re-date an existing grant.
    const second = await request.post(ROUTE, { headers: { Authorization: token } });
    expect(second.ok()).toBeTruthy();
    expect(await second.json()).toMatchObject({ assigned: false, role: null });

    expect((await readRoles(uid))[MOUNTAIN_ID]).toEqual(afterFirst);

    // And only the original audit entry exists.
    const logs = await db.collection('permission_logs').where('userId', '==', uid).get();
    expect(logs.size).toBe(1);
  });

  test('cannot downgrade an admin who already holds a role', async ({ request }) => {
    const before = await readRoles('test-admin-uid');
    expect(before[MOUNTAIN_ID].role).toBe('admin'); // guard: fixture is as expected

    const res = await request.post(ROUTE, {
      headers: {
        Authorization: `Bearer ${await idTokenFor(request, 'admin@test.local', 'Passw0rd!admin')}`,
      },
    });

    expect(res.ok()).toBeTruthy();
    expect(await res.json()).toMatchObject({ assigned: false });
    expect(await readRoles('test-admin-uid')).toEqual(before);
  });

  test('assigns nothing when the caller has no profile doc', async ({ request }) => {
    // The orphan state: an Auth account exists, membership does not.
    const { uid, email, password } = await createFreshUser('nodoc');

    const res = await request.post(ROUTE, {
      headers: { Authorization: `Bearer ${await idTokenFor(request, email, password)}` },
    });

    expect(res.ok()).toBeTruthy();
    expect(await res.json()).toMatchObject({ assigned: false, role: null });

    // The route must not conjure a profile doc — that is the signup path's job,
    // and creating one here would turn a bare Auth account into a membership.
    expect((await db.collection('users').doc(uid).get()).exists).toBe(false);
  });
});

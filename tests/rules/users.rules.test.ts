/**
 * Firestore security-rules tests — multi-mountain role model (plan §2.4, M5.2b).
 *
 * Covers:
 *  - `users/{userId}` self-write: a client may seed its own profile doc (empty
 *    `roles`) and refresh profile fields, but may NOT self-grant a role; reads
 *    are self-only (admin roster reads go through the Admin SDK route).
 *  - Content-write mountain dimension: a role on mountain A authorizes writes to
 *    A's docs only — never B's — and cannot move a doc between mountains. A
 *    multi-role user is authorized on each of their mountains.
 *  - Sensitive read scoping: `contacts` are readable only by a manage-users
 *    holder on the contact's own mountain.
 *
 * Run via `npm run test:rules` (starts the Firestore emulator). See
 * config/firebase/firestore.rules.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, type Firestore } from 'firebase/firestore';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES = readFileSync(
  path.resolve(__dirname, '..', '..', 'config', 'firebase', 'firestore.rules'),
  'utf-8'
);

const PROJECT_ID = 'demo-rules-users';
const GEYANG = 'geyang';
const MANISAN = 'manisan';

const SELF_UID = 'self-uid';
const OTHER_UID = 'other-uid';
const GEYANG_ADMIN = 'geyang-admin';
const MANISAN_ADMIN = 'manisan-admin';
const MULTI_ADMIN = 'multi-admin'; // admin on BOTH mountains

/** A role-map entry. */
const adminOn = (mountainId: string) => ({
  role: 'admin',
  mountainId,
  isActive: true,
  permissions: [] as string[],
});

let testEnv: RulesTestEnvironment;

/** Seed a doc bypassing the rules (for update/read fixtures). */
async function seed(collectionPath: string, id: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore() as unknown as Firestore, collectionPath, id), data);
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: RULES, host: '127.0.0.1', port: 8088 },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // hasPermissionFor() resolves role -> permissions from this matrix.
  await seed('role_permissions', 'role-config', {
    roles: {
      admin: { permissions: ['manage-users', 'manage-cat', 'manage-posts'] },
      viewer: { permissions: [] },
    },
  });
  // Admin fixtures used by the content-write + contacts tests.
  await seed('users', GEYANG_ADMIN, { displayName: 'G', roles: { [GEYANG]: adminOn(GEYANG) } });
  await seed('users', MANISAN_ADMIN, { displayName: 'M', roles: { [MANISAN]: adminOn(MANISAN) } });
  await seed('users', MULTI_ADMIN, {
    displayName: 'Both',
    roles: { [GEYANG]: adminOn(GEYANG), [MANISAN]: adminOn(MANISAN) },
  });
});

const dbFor = (uid: string) =>
  testEnv.authenticatedContext(uid).firestore() as unknown as Firestore;

describe('users/{userId} self-write rule', () => {
  it('lets a signed-in user CREATE their own doc with an empty roles map', async () => {
    const db = dbFor(SELF_UID);
    await assertSucceeds(setDoc(doc(db, 'users', SELF_UID), { displayName: 'Me', roles: {} }));
  });

  it('lets a user UPDATE their own profile fields when roles is unchanged', async () => {
    await seed('users', SELF_UID, { displayName: 'Old', roles: {} });
    const db = dbFor(SELF_UID);
    await assertSucceeds(
      updateDoc(doc(db, 'users', SELF_UID), { displayName: 'New', email: 'me@example.com' })
    );
  });

  it('BLOCKS a user from self-granting a role on CREATE', async () => {
    const db = dbFor(SELF_UID);
    await assertFails(
      setDoc(doc(db, 'users', SELF_UID), {
        displayName: 'Me',
        roles: { [GEYANG]: adminOn(GEYANG) },
      })
    );
  });

  it('BLOCKS a user from self-granting a role on UPDATE', async () => {
    await seed('users', SELF_UID, { displayName: 'Me', roles: {} });
    const db = dbFor(SELF_UID);
    await assertFails(
      updateDoc(doc(db, 'users', SELF_UID), { roles: { [GEYANG]: adminOn(GEYANG) } })
    );
  });

  it("BLOCKS writing ANOTHER user's doc from the client", async () => {
    await seed('users', OTHER_UID, { displayName: 'Other', roles: {} });
    const db = dbFor(SELF_UID);
    await assertFails(updateDoc(doc(db, 'users', OTHER_UID), { displayName: 'Hacked' }));
  });

  it('lets a user READ their own doc but not another user doc (roster is Admin-SDK only)', async () => {
    await seed('users', SELF_UID, { displayName: 'Me', roles: {} });
    const db = dbFor(SELF_UID);
    await assertSucceeds(getDoc(doc(db, 'users', SELF_UID)));
    await assertFails(getDoc(doc(db, 'users', GEYANG_ADMIN)));
  });
});

describe('content-write mountain dimension (cats)', () => {
  it('lets a geyang admin CREATE a geyang cat', async () => {
    const db = dbFor(GEYANG_ADMIN);
    await assertSucceeds(setDoc(doc(db, 'cats', 'c1'), { name: 'nabi', mountainId: GEYANG }));
  });

  it('BLOCKS a geyang admin from creating a MANISAN cat', async () => {
    const db = dbFor(GEYANG_ADMIN);
    await assertFails(setDoc(doc(db, 'cats', 'c2'), { name: 'nabi', mountainId: MANISAN }));
  });

  it('BLOCKS moving a cat from geyang to manisan on UPDATE', async () => {
    await seed('cats', 'c3', { name: 'nabi', mountainId: GEYANG });
    const db = dbFor(GEYANG_ADMIN);
    await assertFails(updateDoc(doc(db, 'cats', 'c3'), { mountainId: MANISAN }));
  });

  it('lets a MULTI-role admin write to each of their mountains', async () => {
    const db = dbFor(MULTI_ADMIN);
    await assertSucceeds(setDoc(doc(db, 'cats', 'g1'), { name: 'g', mountainId: GEYANG }));
    await assertSucceeds(setDoc(doc(db, 'cats', 'm1'), { name: 'm', mountainId: MANISAN }));
  });
});

describe('sensitive read scoping (contacts)', () => {
  it('lets a geyang admin read a geyang contact but not a manisan one', async () => {
    await seed('contacts', 'g', { name: 'g', mountainId: GEYANG });
    await seed('contacts', 'm', { name: 'm', mountainId: MANISAN });
    const db = dbFor(GEYANG_ADMIN);
    await assertSucceeds(getDoc(doc(db, 'contacts', 'g')));
    await assertFails(getDoc(doc(db, 'contacts', 'm')));
  });
});

/**
 * Firestore security-rules tests for `users/{userId}` — the self-write clause added
 * so a non-admin's login/signup profile sync (`PermissionService.ensureUserExists`,
 * client SDK) is allowed, WITHOUT letting a user grant themselves a role.
 *
 * Run via `npm run test:rules` (starts the Firestore emulator). See
 * config/firebase/firestore.rules → `match /users/{userId}` and DEBUG_LOG 2026-07-11.
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
import { doc, setDoc, updateDoc, type Firestore } from 'firebase/firestore';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES = readFileSync(
  path.resolve(__dirname, '..', '..', 'config', 'firebase', 'firestore.rules'),
  'utf-8'
);

const PROJECT_ID = 'demo-rules-users';
const ADMIN_UID = 'admin-uid';
const SELF_UID = 'viewer-self';
const OTHER_UID = 'other-uid';

// A `currentRole` an unprivileged user is allowed to self-assign.
const VIEWER_ROLE = { role: 'viewer', isActive: true, permissions: [] as string[] };
const ADMIN_ROLE = { role: 'admin', isActive: true, permissions: [] as string[] };

let testEnv: RulesTestEnvironment;

/** Seed a doc bypassing the rules (for update/read-target/hasPermission fixtures). */
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
  // hasPermission() resolves the user's role -> permissions from this matrix.
  await seed('role_permissions', 'role-config', {
    roles: { admin: { permissions: ['manage-users'] }, viewer: { permissions: [] } },
  });
});

const dbFor = (uid: string) =>
  testEnv.authenticatedContext(uid).firestore() as unknown as Firestore;

describe('users/{userId} self-write rule', () => {
  it('lets a signed-in user CREATE their own doc with the default viewer role', async () => {
    const db = dbFor(SELF_UID);
    await assertSucceeds(
      setDoc(doc(db, 'users', SELF_UID), { displayName: 'Me', currentRole: VIEWER_ROLE })
    );
  });

  it('lets a user UPDATE their own profile fields when currentRole is unchanged', async () => {
    await seed('users', SELF_UID, { displayName: 'Old', currentRole: VIEWER_ROLE });
    const db = dbFor(SELF_UID);
    await assertSucceeds(
      updateDoc(doc(db, 'users', SELF_UID), { displayName: 'New', email: 'me@example.com' })
    );
  });

  it('BLOCKS a user from self-assigning a privileged role on CREATE', async () => {
    const db = dbFor(SELF_UID);
    await assertFails(
      setDoc(doc(db, 'users', SELF_UID), { displayName: 'Me', currentRole: ADMIN_ROLE })
    );
  });

  it('BLOCKS a user from escalating their own currentRole on UPDATE', async () => {
    await seed('users', SELF_UID, { displayName: 'Me', currentRole: VIEWER_ROLE });
    const db = dbFor(SELF_UID);
    await assertFails(updateDoc(doc(db, 'users', SELF_UID), { currentRole: ADMIN_ROLE }));
  });

  it("BLOCKS a non-admin from writing ANOTHER user's doc", async () => {
    await seed('users', OTHER_UID, { displayName: 'Other', currentRole: VIEWER_ROLE });
    const db = dbFor(SELF_UID);
    await assertFails(updateDoc(doc(db, 'users', OTHER_UID), { displayName: 'Hacked' }));
  });

  it("ALLOWS an admin (manage-users) to write another user's doc (role assignment)", async () => {
    await seed('users', ADMIN_UID, { displayName: 'Admin', currentRole: ADMIN_ROLE });
    await seed('users', OTHER_UID, { displayName: 'Other', currentRole: VIEWER_ROLE });
    const db = dbFor(ADMIN_UID);
    await assertSucceeds(
      updateDoc(doc(db, 'users', OTHER_UID), {
        currentRole: { ...VIEWER_ROLE, role: 'butler-ground' },
      })
    );
  });
});

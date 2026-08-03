/**
 * Firestore security-rules tests — member media upload (§10p, 2026-08-03).
 *
 * §10n let butler roles write 집사톡 posts and stopped there. 집사톡 is also the only
 * board that **uploads**, and every upload surface was gated on `manage-photo` /
 * `manage-video` — which only `admin` holds — so a member who attached a file lost the
 * whole post. `upload-own-photo` closes that, and the point of the narrow grant is
 * everything it still refuses.
 *
 * Covers:
 *  - a member may CREATE a `cat_images` record attributed to themselves, and may not
 *    attribute one to anyone else (or to nobody).
 *  - the grant is **create-only**: no update, no delete, not even of their own record.
 *    A member who may add a photo must not be able to retag or remove the album.
 *  - `cat_videos` stays admin-only from the client — the member path writes it through
 *    the Admin SDK in `/api/upload-youtube/complete`, which never consults these rules.
 *  - the mountain dimension holds, and admins keep working everywhere.
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
import { doc, setDoc, updateDoc, deleteDoc, type Firestore } from 'firebase/firestore';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoFile = (...parts: string[]) => path.resolve(__dirname, '..', '..', ...parts);

const RULES = readFileSync(repoFile('config', 'firebase', 'firestore.rules'), 'utf-8');

/** Seeded from the real matrix — see the note in posts.rules.test.ts. */
const PERMISSIONS_CONFIG = JSON.parse(
  readFileSync(repoFile('config', 'permissions.json'), 'utf-8')
) as { roles: Record<string, { permissions: string[] }> };

const PROJECT_ID = 'demo-rules-media';
const GEYANG = 'geyang';
const MANISAN = 'manisan';

const ADMIN_UID = 'geyang-admin';
const GROUND_UID = 'geyang-ground';
const OTHER_GROUND_UID = 'geyang-ground-2';
const INTERNET_UID = 'geyang-internet';
const VIEWER_UID = 'geyang-viewer';

const roleOn = (role: string, mountainId: string) => ({
  role,
  mountainId,
  isActive: true,
  permissions: [] as string[],
});

let testEnv: RulesTestEnvironment;

async function seed(collectionPath: string, id: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore() as unknown as Firestore, collectionPath, id), data);
  });
}

/** A `cat_images` record as `uploadImagesWithSignedUrls` writes it. */
const image = (overrides: Record<string, unknown> = {}) => ({
  imageUrl: 'https://example.invalid/a.jpg',
  fileName: 'a.jpg',
  storagePath: 'uploads/a.jpg',
  tags: [] as string[],
  uploadDate: new Date(),
  uploadedBy: 'ground@example.com',
  uploadedByUid: GROUND_UID,
  description: '',
  mountainId: GEYANG,
  ...overrides,
});

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
  await seed('role_permissions', 'role-config', { roles: PERMISSIONS_CONFIG.roles });
  await seed('users', ADMIN_UID, { roles: { [GEYANG]: roleOn('admin', GEYANG) } });
  await seed('users', GROUND_UID, { roles: { [GEYANG]: roleOn('butler-ground', GEYANG) } });
  await seed('users', OTHER_GROUND_UID, {
    roles: { [GEYANG]: roleOn('butler-ground', GEYANG) },
  });
  await seed('users', INTERNET_UID, { roles: { [GEYANG]: roleOn('butler-internet', GEYANG) } });
  await seed('users', VIEWER_UID, { roles: { [GEYANG]: roleOn('viewer', GEYANG) } });
});

const dbFor = (uid: string) =>
  testEnv.authenticatedContext(uid).firestore() as unknown as Firestore;

describe('cat_images — a member may record their own upload', () => {
  it('lets a butler-ground member create a record attributed to themselves', async () => {
    await assertSucceeds(setDoc(doc(dbFor(GROUND_UID), 'cat_images', 'i1'), image()));
  });

  it('lets a butler-internet member do the same (집사톡 is their board too)', async () => {
    await assertSucceeds(
      setDoc(doc(dbFor(INTERNET_UID), 'cat_images', 'i2'), image({ uploadedByUid: INTERNET_UID }))
    );
  });

  it("BLOCKS attributing an upload to SOMEONE ELSE's uid", async () => {
    await assertFails(
      setDoc(doc(dbFor(GROUND_UID), 'cat_images', 'i3'), image({ uploadedByUid: OTHER_GROUND_UID }))
    );
  });

  it('BLOCKS an unattributed record (no uploadedByUid at all)', async () => {
    const { uploadedByUid: _omitted, ...anonymous } = image();
    await assertFails(setDoc(doc(dbFor(GROUND_UID), 'cat_images', 'i4'), anonymous));
  });

  it('BLOCKS attribution by the DISPLAY field alone (uploadedBy is not identity)', async () => {
    // `uploadedBy` holds emails and literals like 'admin' / 'system_sync'. Matching on
    // it must not authorize anything — only `uploadedByUid` counts.
    const { uploadedByUid: _omitted, ...byDisplayName } = image({ uploadedBy: GROUND_UID });
    await assertFails(setDoc(doc(dbFor(GROUND_UID), 'cat_images', 'i5'), byDisplayName));
  });

  it('BLOCKS creating a record on ANOTHER mountain', async () => {
    await assertFails(
      setDoc(doc(dbFor(GROUND_UID), 'cat_images', 'i6'), image({ mountainId: MANISAN }))
    );
  });

  it('BLOCKS a viewer, who holds no upload grant', async () => {
    await assertFails(
      setDoc(doc(dbFor(VIEWER_UID), 'cat_images', 'i7'), image({ uploadedByUid: VIEWER_UID }))
    );
  });
});

describe('cat_images — the grant is CREATE-only, which is its whole point', () => {
  beforeEach(async () => {
    await seed('cat_images', 'own', image());
    await seed('cat_images', 'theirs', image({ uploadedByUid: OTHER_GROUND_UID }));
  });

  it('BLOCKS a member updating their OWN record (no retagging)', async () => {
    await assertFails(updateDoc(doc(dbFor(GROUND_UID), 'cat_images', 'own'), { tags: ['나비'] }));
  });

  it("BLOCKS a member updating someone else's record", async () => {
    await assertFails(
      updateDoc(doc(dbFor(GROUND_UID), 'cat_images', 'theirs'), { description: '가로채기' })
    );
  });

  it('BLOCKS a member deleting any record, their own included', async () => {
    await assertFails(deleteDoc(doc(dbFor(GROUND_UID), 'cat_images', 'own')));
    await assertFails(deleteDoc(doc(dbFor(GROUND_UID), 'cat_images', 'theirs')));
  });

  it('lets an admin update and delete freely (manage-photo — the control)', async () => {
    await assertSucceeds(updateDoc(doc(dbFor(ADMIN_UID), 'cat_images', 'own'), { tags: ['나비'] }));
    await assertSucceeds(deleteDoc(doc(dbFor(ADMIN_UID), 'cat_images', 'theirs')));
  });

  it('lets an admin create a record with no uploadedByUid (legacy shape still works)', async () => {
    const { uploadedByUid: _omitted, ...legacy } = image();
    await assertSucceeds(setDoc(doc(dbFor(ADMIN_UID), 'cat_images', 'a1'), legacy));
  });
});

describe('cat_videos — no client-side member path exists, and the rules say so', () => {
  it('BLOCKS a member creating a video record, even attributed to themselves', async () => {
    // The member's real path is POST /api/upload-youtube/complete, which writes via the
    // Admin SDK and bypasses these rules. A client write must stay refused.
    await assertFails(
      setDoc(doc(dbFor(GROUND_UID), 'cat_videos', 'v1'), {
        title: 'v',
        uploadedByUid: GROUND_UID,
        mountainId: GEYANG,
      })
    );
  });

  it('BLOCKS butler-internet too', async () => {
    await assertFails(
      setDoc(doc(dbFor(INTERNET_UID), 'cat_videos', 'v2'), {
        title: 'v',
        uploadedByUid: INTERNET_UID,
        mountainId: GEYANG,
      })
    );
  });

  it('lets an admin write cat_videos (manage-video — the control)', async () => {
    await assertSucceeds(
      setDoc(doc(dbFor(ADMIN_UID), 'cat_videos', 'v3'), { title: 'v', mountainId: GEYANG })
    );
  });
});

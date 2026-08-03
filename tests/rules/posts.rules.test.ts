/**
 * Firestore security-rules tests — member post authoring (§10n, 2026-08-02).
 *
 * `posts_butler` (집사톡) and `posts_feeding` (급식현황) are the only boards a
 * non-admin may write. The e2e suite covers them *indirectly*, by driving the
 * UI, which proves the happy paths a member is offered — it cannot prove what a
 * hand-crafted client is refused, and that is the half that matters for a
 * security boundary. These tests assert the rules file directly.
 *
 * Covers:
 *  - create: a post may only be attributed to the person writing it
 *    (`authoringAsSelf`), and only on a mountain the actor holds the permission on.
 *  - update: only the author may edit, and an edit may not rewrite provenance
 *    (`authorUid` / `username` / `date` / `time`).
 *  - the legacy pre-`authorUid` era: authorship falls back to the recorded
 *    email, and the fallback closes for good once `authorUid` is present.
 *  - `replyCount`: a non-author may move it, but ONLY by +1 and ONLY alone.
 *  - delete: never granted by `write-own-*` — only `manage-posts`.
 *  - the per-board split: `butler-internet` may write 집사톡 and must not reach
 *    급식현황 at all.
 *  - `feeding_spots` member check-in: only `last_attended` /
 *    `last_attended_by`, and only on the actor's own mountain.
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

/**
 * The role→permission matrix is seeded from the REAL config rather than a
 * hand-written fixture: "butler-internet must not reach 급식현황" is a claim
 * about the shipped grants, so a local copy would let the two drift apart and
 * still pass. `role_permissions/role-config` in Firestore is the live matrix;
 * config/permissions.json is its seed (and the API route's fallback).
 */
const PERMISSIONS_CONFIG = JSON.parse(
  readFileSync(repoFile('config', 'permissions.json'), 'utf-8')
) as { roles: Record<string, { permissions: string[] }> };

const PROJECT_ID = 'demo-rules-posts';
const GEYANG = 'geyang';
const MANISAN = 'manisan';

const ADMIN_UID = 'geyang-admin';
const GROUND_UID = 'geyang-ground'; // butler-ground: both boards
const GROUND_EMAIL = 'ground@example.com';
const INTERNET_UID = 'geyang-internet'; // butler-internet: 집사톡 only
const OTHER_GROUND_UID = 'geyang-ground-2'; // a second member, author of nothing
const VIEWER_UID = 'geyang-viewer';
const MANISAN_GROUND_UID = 'manisan-ground';

/** A role-map entry. */
const roleOn = (role: string, mountainId: string) => ({
  role,
  mountainId,
  isActive: true,
  permissions: [] as string[],
});

let testEnv: RulesTestEnvironment;

/** Seed a doc bypassing the rules (for update/delete/read fixtures). */
async function seed(collectionPath: string, id: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore() as unknown as Firestore, collectionPath, id), data);
  });
}

/** A post as the composers write it. */
const post = (overrides: Record<string, unknown> = {}) => ({
  title: '오늘의 급식',
  content: '밥 줬어요',
  authorUid: GROUND_UID,
  username: GROUND_EMAIL,
  date: '2026-08-03',
  time: '09:00',
  replyCount: 0,
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
  await seed('users', OTHER_GROUND_UID, { roles: { [GEYANG]: roleOn('butler-ground', GEYANG) } });
  await seed('users', INTERNET_UID, { roles: { [GEYANG]: roleOn('butler-internet', GEYANG) } });
  await seed('users', VIEWER_UID, { roles: { [GEYANG]: roleOn('viewer', GEYANG) } });
  await seed('users', MANISAN_GROUND_UID, {
    roles: { [MANISAN]: roleOn('butler-ground', MANISAN) },
  });
});

const dbFor = (uid: string, email?: string) =>
  testEnv
    .authenticatedContext(uid, email ? { email } : undefined)
    .firestore() as unknown as Firestore;

describe('posts_butler / posts_feeding — create', () => {
  it('lets a member create a post attributed to themselves', async () => {
    const db = dbFor(GROUND_UID, GROUND_EMAIL);
    await assertSucceeds(setDoc(doc(db, 'posts_butler', 'p1'), post()));
    await assertSucceeds(setDoc(doc(db, 'posts_feeding', 'p1'), post()));
  });

  it("BLOCKS a member creating a post attributed to SOMEONE ELSE's uid", async () => {
    const db = dbFor(GROUND_UID, GROUND_EMAIL);
    await assertFails(setDoc(doc(db, 'posts_butler', 'p2'), post({ authorUid: OTHER_GROUND_UID })));
    await assertFails(
      setDoc(doc(db, 'posts_feeding', 'p2'), post({ authorUid: OTHER_GROUND_UID }))
    );
  });

  it('BLOCKS a member creating a post with NO authorUid (unattributable)', async () => {
    const db = dbFor(GROUND_UID, GROUND_EMAIL);
    const { authorUid: _omitted, ...anonymous } = post();
    await assertFails(setDoc(doc(db, 'posts_butler', 'p3'), anonymous));
  });

  it("BLOCKS a member creating a post on ANOTHER mountain's board", async () => {
    const db = dbFor(GROUND_UID, GROUND_EMAIL);
    await assertFails(setDoc(doc(db, 'posts_butler', 'p4'), post({ mountainId: MANISAN })));
  });

  it('BLOCKS a viewer (no write permission) creating a post', async () => {
    const db = dbFor(VIEWER_UID);
    await assertFails(setDoc(doc(db, 'posts_butler', 'p5'), post({ authorUid: VIEWER_UID })));
  });

  it('lets an admin create a post attributed to anyone (manage-posts)', async () => {
    const db = dbFor(ADMIN_UID);
    await assertSucceeds(setDoc(doc(db, 'posts_butler', 'p6'), post()));
  });
});

// The two boards carry SEPARATE, near-identical rule blocks, so every case runs
// against both — a mutation test proved a provenance hole in one is invisible
// while only the other is asserted.
describe.each(['posts_butler', 'posts_feeding'])('%s — update by the author', (collection) => {
  beforeEach(async () => {
    await seed(collection, 'own', post());
  });

  it('lets the author edit their own post', async () => {
    const db = dbFor(GROUND_UID, GROUND_EMAIL);
    await assertSucceeds(updateDoc(doc(db, collection, 'own'), { content: '수정' }));
  });

  it("BLOCKS a member editing ANOTHER member's post", async () => {
    const db = dbFor(OTHER_GROUND_UID);
    await assertFails(updateDoc(doc(db, collection, 'own'), { content: '남의 글' }));
  });

  it('BLOCKS the author rewriting authorUid', async () => {
    const db = dbFor(GROUND_UID, GROUND_EMAIL);
    await assertFails(updateDoc(doc(db, collection, 'own'), { authorUid: OTHER_GROUND_UID }));
  });

  it('BLOCKS the author rewriting username / date / time', async () => {
    const db = dbFor(GROUND_UID, GROUND_EMAIL);
    await assertFails(updateDoc(doc(db, collection, 'own'), { username: 'someone@example.com' }));
    await assertFails(updateDoc(doc(db, collection, 'own'), { date: '2020-01-01' }));
    await assertFails(updateDoc(doc(db, collection, 'own'), { time: '23:59' }));
  });

  it('BLOCKS the author moving their post to another mountain', async () => {
    const db = dbFor(GROUND_UID, GROUND_EMAIL);
    await assertFails(updateDoc(doc(db, collection, 'own'), { mountainId: MANISAN }));
  });
});

describe.each(['posts_butler', 'posts_feeding'])(
  '%s — the legacy pre-authorUid era',
  (collection) => {
    /** Written before `authorUid` existed: authorship is the recorded email. */
    const legacy = () => {
      const { authorUid: _omitted, ...rest } = post({ username: GROUND_EMAIL });
      return rest;
    };

    it('lets the recorded author edit a post that predates authorUid', async () => {
      await seed(collection, 'legacy', legacy());
      const db = dbFor(GROUND_UID, GROUND_EMAIL);
      await assertSucceeds(updateDoc(doc(db, collection, 'legacy'), { content: '수정' }));
    });

    it('BLOCKS a member whose email does not match the legacy author', async () => {
      await seed(collection, 'legacy', legacy());
      const db = dbFor(OTHER_GROUND_UID, 'someone-else@example.com');
      await assertFails(updateDoc(doc(db, collection, 'legacy'), { content: '남의 글' }));
    });

    it('BLOCKS the legacy author from stamping authorUid onto the post (provenance is fixed)', async () => {
      await seed(collection, 'legacy', legacy());
      const db = dbFor(GROUND_UID, GROUND_EMAIL);
      await assertFails(updateDoc(doc(db, collection, 'legacy'), { authorUid: GROUND_UID }));
    });

    it('BLOCKS the email fallback once authorUid is present (a stale username cannot re-open a post)', async () => {
      // The stored post is owned by OTHER_GROUND_UID but still carries the old
      // author's email — the fallback must be unreachable, or a rename re-opens it.
      await seed(collection, 'reassigned', post({ authorUid: OTHER_GROUND_UID }));
      const db = dbFor(GROUND_UID, GROUND_EMAIL);
      await assertFails(updateDoc(doc(db, collection, 'reassigned'), { content: '수정' }));
    });

    it('BLOCKS a legacy admin@mtcat.com post from ever matching a member', async () => {
      await seed(collection, 'ancient', { ...legacy(), username: 'admin@mtcat.com' });
      const db = dbFor(GROUND_UID, GROUND_EMAIL);
      await assertFails(updateDoc(doc(db, collection, 'ancient'), { content: '수정' }));
    });
  }
);

describe('posts_butler / posts_feeding — the replyCount bump', () => {
  beforeEach(async () => {
    await seed('posts_butler', 'parent', post({ replyCount: 2 }));
    await seed('posts_feeding', 'parent', post({ replyCount: 2 }));
  });

  it("lets a NON-author bump the parent's replyCount by exactly +1", async () => {
    const db = dbFor(OTHER_GROUND_UID);
    await assertSucceeds(updateDoc(doc(db, 'posts_butler', 'parent'), { replyCount: 3 }));
    await assertSucceeds(updateDoc(doc(db, 'posts_feeding', 'parent'), { replyCount: 3 }));
  });

  it('BLOCKS a replyCount that moves by anything other than +1', async () => {
    const db = dbFor(OTHER_GROUND_UID);
    await assertFails(updateDoc(doc(db, 'posts_butler', 'parent'), { replyCount: 4 }));
    await assertFails(updateDoc(doc(db, 'posts_butler', 'parent'), { replyCount: 1 }));
    await assertFails(updateDoc(doc(db, 'posts_butler', 'parent'), { replyCount: 2 }));
  });

  it('BLOCKS a replyCount bump that carries a second field with it', async () => {
    const db = dbFor(OTHER_GROUND_UID);
    await assertFails(
      updateDoc(doc(db, 'posts_butler', 'parent'), { replyCount: 3, content: '탈취' })
    );
  });

  it("BLOCKS a replyCount bump on ANOTHER mountain's post", async () => {
    await seed('posts_butler', 'manisan-parent', post({ mountainId: MANISAN, replyCount: 2 }));
    const db = dbFor(OTHER_GROUND_UID); // butler-ground on geyang only
    await assertFails(updateDoc(doc(db, 'posts_butler', 'manisan-parent'), { replyCount: 3 }));
  });

  it('BLOCKS a viewer bumping replyCount (no write permission at all)', async () => {
    const db = dbFor(VIEWER_UID);
    await assertFails(updateDoc(doc(db, 'posts_butler', 'parent'), { replyCount: 3 }));
  });
});

describe('posts_butler / posts_feeding — delete stays admin-only', () => {
  beforeEach(async () => {
    await seed('posts_butler', 'own', post());
    await seed('posts_feeding', 'own', post());
  });

  it('BLOCKS the author deleting their OWN post (replies belong to other people)', async () => {
    const db = dbFor(GROUND_UID, GROUND_EMAIL);
    await assertFails(deleteDoc(doc(db, 'posts_butler', 'own')));
    await assertFails(deleteDoc(doc(db, 'posts_feeding', 'own')));
  });

  it('lets an admin delete a post (manage-posts)', async () => {
    const db = dbFor(ADMIN_UID);
    await assertSucceeds(deleteDoc(doc(db, 'posts_butler', 'own')));
    await assertSucceeds(deleteDoc(doc(db, 'posts_feeding', 'own')));
  });
});

describe('the per-board split — butler-internet has no 급식현황 grant', () => {
  it('lets butler-internet create a 집사톡 post', async () => {
    const db = dbFor(INTERNET_UID);
    await assertSucceeds(setDoc(doc(db, 'posts_butler', 'i1'), post({ authorUid: INTERNET_UID })));
  });

  it('BLOCKS butler-internet creating a 급식현황 post', async () => {
    const db = dbFor(INTERNET_UID);
    await assertFails(setDoc(doc(db, 'posts_feeding', 'i2'), post({ authorUid: INTERNET_UID })));
  });

  it('BLOCKS butler-internet editing a 급식현황 post it somehow authored', async () => {
    await seed('posts_feeding', 'i3', post({ authorUid: INTERNET_UID }));
    const db = dbFor(INTERNET_UID);
    await assertFails(updateDoc(doc(db, 'posts_feeding', 'i3'), { content: '수정' }));
  });

  it('BLOCKS butler-internet bumping a 급식현황 replyCount', async () => {
    await seed('posts_feeding', 'i4', post({ replyCount: 0 }));
    const db = dbFor(INTERNET_UID);
    await assertFails(updateDoc(doc(db, 'posts_feeding', 'i4'), { replyCount: 1 }));
  });

  it('BLOCKS butler-internet stamping a feeding spot', async () => {
    await seed('feeding_spots', 's1', { name: '1번 급식소', mountainId: GEYANG });
    const db = dbFor(INTERNET_UID);
    await assertFails(
      updateDoc(doc(db, 'feeding_spots', 's1'), {
        last_attended: '2026-08-03',
        last_attended_by: INTERNET_UID,
      })
    );
  });
});

describe('feeding_spots — the member check-in is bounded to two fields', () => {
  beforeEach(async () => {
    await seed('feeding_spots', 'spot', {
      name: '1번 급식소',
      last_attended: '2026-07-01',
      last_attended_by: 'someone',
      mountainId: GEYANG,
    });
  });

  it('lets a 급식현황 author stamp last_attended + last_attended_by', async () => {
    const db = dbFor(GROUND_UID, GROUND_EMAIL);
    await assertSucceeds(
      updateDoc(doc(db, 'feeding_spots', 'spot'), {
        last_attended: '2026-08-03',
        last_attended_by: GROUND_UID,
      })
    );
  });

  it('BLOCKS a write touching any OTHER field, alone or alongside the stamp', async () => {
    const db = dbFor(GROUND_UID, GROUND_EMAIL);
    await assertFails(updateDoc(doc(db, 'feeding_spots', 'spot'), { name: '이름 변경' }));
    await assertFails(
      updateDoc(doc(db, 'feeding_spots', 'spot'), {
        last_attended: '2026-08-03',
        name: '이름 변경',
      })
    );
  });

  it('BLOCKS a member CREATING or DELETING a feeding spot (admin territory)', async () => {
    const db = dbFor(GROUND_UID, GROUND_EMAIL);
    await assertFails(
      setDoc(doc(db, 'feeding_spots', 'new'), { name: '새 급식소', mountainId: GEYANG })
    );
    await assertFails(deleteDoc(doc(db, 'feeding_spots', 'spot')));
  });

  it("BLOCKS stamping ANOTHER mountain's feeding spot", async () => {
    await seed('feeding_spots', 'manisan-spot', { name: 'm', mountainId: MANISAN });
    const db = dbFor(GROUND_UID, GROUND_EMAIL);
    await assertFails(
      updateDoc(doc(db, 'feeding_spots', 'manisan-spot'), {
        last_attended: '2026-08-03',
        last_attended_by: GROUND_UID,
      })
    );
  });

  it('lets an admin write a feeding spot freely (manage-posts)', async () => {
    const db = dbFor(ADMIN_UID);
    await assertSucceeds(updateDoc(doc(db, 'feeding_spots', 'spot'), { name: '이름 변경' }));
  });
});

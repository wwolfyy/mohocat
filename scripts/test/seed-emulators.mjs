/**
 * Seed the Firebase Emulator Suite with e2e fixtures.
 *
 * Runs inside `firebase emulators:exec` (which sets FIRESTORE_EMULATOR_HOST /
 * FIREBASE_AUTH_EMULATOR_HOST / FIREBASE_STORAGE_EMULATOR_HOST). Loads the
 * hand-authored JSON fixtures under tests/e2e/fixtures/ into Firestore + Auth +
 * Storage. Idempotent: every doc/user/file is deleted-then-written, so re-running
 * mid-session is safe.
 *
 * SAFETY: refuses to run unless the Firestore emulator host is set AND the project
 * id is `demo-*` — belt-and-suspenders so this can never touch a real project.
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { readFile } from 'node:fs/promises';
import { readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '..', '..', 'tests', 'e2e', 'fixtures');

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID_OVERRIDE ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  'demo-mohocat';
const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-mohocat.appspot.com';

// --- Safety guard ----------------------------------------------------------
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error(
    '[seed] REFUSING TO RUN: FIRESTORE_EMULATOR_HOST is not set. Run via `firebase emulators:exec`.'
  );
  process.exit(1);
}
if (!PROJECT_ID.startsWith('demo-')) {
  console.error(
    `[seed] REFUSING TO RUN: project id "${PROJECT_ID}" is not a demo-* project. Aborting to avoid touching real data.`
  );
  process.exit(1);
}

const app = initializeApp({ projectId: PROJECT_ID, storageBucket: STORAGE_BUCKET });
const db = getFirestore(app);
const auth = getAuth(app);
const bucket = getStorage(app).bucket();

const readJson = async (name) => JSON.parse(await readFile(path.join(FIXTURES, name), 'utf-8'));

/**
 * Tenant the seeded content belongs to (multi-mountain M4). The app's default
 * tenant answers every unmapped host — localhost and the e2e harness included —
 * so seeding this id is what keeps the existing specs seeing their data once M5
 * scopes reads by mountain. Stamped here rather than in each fixture file so the
 * value can't drift between them.
 */
const SEED_MOUNTAIN_ID = process.env.MOUNTAIN_ID || 'geyang';

/** Collections that carry `mountainId`; identity/config collections do not. */
const TENANT_SCOPED = new Set([
  'about_content',
  'admin_data',
  'cat_images',
  'cat_videos',
  'cats',
  'contacts',
  'feeding_spots',
  'points',
  'posts_adoption',
  'posts_announcements',
  'posts_butler',
  'posts_feeding',
  'permission_logs',
]);

const withTenant = (collection, data, mountainId) =>
  TENANT_SCOPED.has(collection) ? { ...data, mountainId } : data;

/** Delete-then-write a set of docs (each with an `id`) into a collection, stamped `mountainId`. */
async function seedCollection(collection, docs, mountainId) {
  for (const { id, ...data } of docs) {
    await db
      .collection(collection)
      .doc(id)
      .delete()
      .catch(() => {});
    await db.collection(collection).doc(id).set(withTenant(collection, data, mountainId));
  }
  console.log(`[seed] ${collection}: ${docs.length} doc(s) [${mountainId}]`);
}

/** Delete-then-write a single fixed-id doc (stamped `mountainId` if the collection is tenant-scoped). */
async function seedDoc(collection, docId, data, mountainId) {
  await db
    .collection(collection)
    .doc(docId)
    .delete()
    .catch(() => {});
  await db.collection(collection).doc(docId).set(withTenant(collection, data, mountainId));
  console.log(`[seed] ${collection}/${docId}`);
}

/**
 * Seed Auth accounts + their `users/{uid}` docs. Two fixture shapes are
 * supported: a single `role` (keyed under `defaultMountainId` — the geyang
 * fixtures) or an explicit `roles: [{ mountainId, role }]` list (the manisan
 * fixtures, including a dual-mountain admin). `roles[mountainId]` drives both
 * firestore.rules `hasPermissionFor()` and `requireApiPermission`; `permissions[]`
 * is intentionally empty — the role resolves to permissions via
 * `role_permissions/role-config`.
 */
async function seedAuthAndUsers(users, defaultMountainId) {
  for (const u of users) {
    await auth.deleteUser(u.uid).catch(() => {});
    const createReq = { uid: u.uid, displayName: u.displayName };
    if (u.email) {
      createReq.email = u.email;
      createReq.password = u.password;
      createReq.emailVerified = true;
    }
    if (u.phoneNumber) createReq.phoneNumber = u.phoneNumber;
    await auth.createUser(createReq);

    const roleSpecs = u.roles ?? [{ mountainId: defaultMountainId, role: u.role }];
    const roles = {};
    for (const { mountainId, role } of roleSpecs) {
      roles[mountainId] = { role, mountainId, isActive: true, permissions: [] };
    }

    await seedDoc(
      'users',
      u.uid,
      {
        email: u.email ?? null,
        phoneNumber: u.phoneNumber ?? null,
        displayName: u.displayName,
        nickname: u.nickname,
        roles,
        createdAt: new Date().toISOString(),
      },
      defaultMountainId
    );
  }
  console.log(`[seed] auth users: ${users.length}`);
}

/**
 * Seed the second (manisan) tenant for the M5.4 two-tenant isolation e2e —
 * distinct docs stamped `mountainId='manisan'` + a manisan-only admin and a
 * dual-mountain admin (tests/e2e/fixtures/manisan.json). Kept minimal: only the
 * surfaces the isolation spec asserts on (map points/cats, photo album,
 * announcements, admin contacts PII, about).
 */
async function seedManisanTenant() {
  const MANISAN = 'manisan';
  const fx = await readJson('manisan.json');
  for (const collection of ['points', 'cats', 'cat_images', 'posts_announcements', 'contacts']) {
    if (fx[collection]?.length) await seedCollection(collection, fx[collection], MANISAN);
  }
  await seedDoc('about_content', MANISAN, fx.about_content, MANISAN);
  await seedAuthAndUsers(fx.users, MANISAN);
  console.log('[seed] manisan tenant seeded');
}

async function uploadStorageFixtures() {
  // Thumbnails: tests/e2e/fixtures/images/thumbnails/*.jpg -> thumbnails/<name>
  const thumbDir = path.join(FIXTURES, 'images', 'thumbnails');
  for (const name of readdirSync(thumbDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f))) {
    await bucket.upload(path.join(thumbDir, name), { destination: `thumbnails/${name}` });
  }
  // About photo: images/about-photos/geyang/<file> -> about-photos/geyang/<file>
  const aboutDir = path.join(FIXTURES, 'images', 'about-photos', 'geyang');
  for (const name of readdirSync(aboutDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f))) {
    await bucket.upload(path.join(aboutDir, name), {
      destination: `about-photos/geyang/${name}`,
    });
  }
  console.log('[seed] storage: thumbnails + about photo uploaded');
}

/**
 * Album media is served from `public/` (spike S3), not emulator Storage — so
 * `next/image` needs no localhost remotePattern. Lay the committed source
 * fixtures down where the seeded `media.json` URLs (`/images/test-fixtures/*`)
 * expect them, before the build. The destination is gitignored.
 */
function copyPublicFixtures() {
  const srcDir = path.join(FIXTURES, 'images', 'test-fixtures');
  const destDir = path.resolve(__dirname, '..', '..', 'public', 'images', 'test-fixtures');
  mkdirSync(destDir, { recursive: true });
  const files = readdirSync(srcDir).filter((f) => /\.(jpe?g|png|webp|svg)$/i.test(f));
  for (const name of files) copyFileSync(path.join(srcDir, name), path.join(destDir, name));
  console.log(
    `[seed] public fixtures: ${files.length} album file(s) -> public/images/test-fixtures`
  );
}

async function main() {
  console.log(`[seed] project=${PROJECT_ID} bucket=${STORAGE_BUCKET}`);
  console.log(`[seed] firestore=${process.env.FIRESTORE_EMULATOR_HOST}`);
  console.log(`[seed] mountainId=${SEED_MOUNTAIN_ID}`);

  const [points, cats, posts, media, aboutContent, roleConfig, resourceConfig, users] =
    await Promise.all([
      readJson('points.json'),
      readJson('cats.json'),
      readJson('posts.json'),
      readJson('media.json'),
      readJson('about-content.json'),
      readJson('role-config.json'),
      readJson('resource-config.json'),
      readJson('users.json'),
    ]);

  // --- Default tenant (geyang) pass ---
  await seedCollection('points', points, SEED_MOUNTAIN_ID);
  await seedCollection('cats', cats, SEED_MOUNTAIN_ID);

  for (const [collection, docs] of Object.entries(posts)) {
    if (collection.startsWith('_')) continue; // skip _comment
    await seedCollection(collection, docs, SEED_MOUNTAIN_ID);
  }
  for (const [collection, docs] of Object.entries(media)) {
    if (collection.startsWith('_')) continue;
    await seedCollection(collection, docs, SEED_MOUNTAIN_ID);
  }

  await seedDoc('about_content', SEED_MOUNTAIN_ID, aboutContent, SEED_MOUNTAIN_ID);
  // role_permissions is central (not tenant-scoped) — mountainId arg is ignored.
  await seedDoc('role_permissions', 'role-config', roleConfig, SEED_MOUNTAIN_ID);
  await seedDoc('role_permissions', 'resource-config', resourceConfig, SEED_MOUNTAIN_ID);

  await seedAuthAndUsers(users, SEED_MOUNTAIN_ID);

  // --- Second tenant (manisan) pass — for the M5.4 isolation e2e ---
  await seedManisanTenant();

  await uploadStorageFixtures();
  copyPublicFixtures();

  console.log('[seed] done.');
}

main().catch((e) => {
  console.error('[seed] fatal', e);
  process.exit(1);
});

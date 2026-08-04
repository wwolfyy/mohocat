/**
 * End-to-end coverage for `scripts/migration/rename-cat.js`, against the
 * Firestore emulator (2026-08-04).
 *
 * 🔑 **Why this is not a unit test.** The script's value is the *cascade* — that
 * renaming a cat also reaches its media tags, four post collections, the about
 * page's nested `sections[]`, and every other cat's prose, while leaving a second
 * tenant's identically-named cat alone. None of that is observable from the pure
 * helpers `tests/unit/renameCat.test.ts` covers; it only exists once a database
 * is involved.
 *
 * ⚠️ **The fixtures here are hand-written rather than reused from
 * `tests/e2e/fixtures/`, and deliberately so: those tag media by cat *id*
 * (`['test-cat-01']`), while production tags by *name*.** Running against them
 * would exercise nothing and pass — the exact shape of vacuous test this repo has
 * been bitten by before.
 *
 * 📌 **Each case spawns the script as a child process.** It reads `APPLY` /
 * `OLD_NAME` / `NEW_NAME` at module load, so importing it once could not vary the
 * environment per case — and spawning is the more faithful test anyway: it proves
 * the real entry point, argument handling and exit codes, not just the internals.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(ROOT, 'scripts/migration/rename-cat.js');

const M = 'geyang';
const OTHER_M = 'manisan';
const OLD = '아롱이';
const NEW = '다롱이';

const TOUCHED_COLLECTIONS = [
  'cats',
  'cat_images',
  'cat_videos',
  'posts_feeding',
  'posts_butler',
  'posts_announcements',
  'posts_adoption',
  'about_content',
];

let db: Firestore;

/** Run the script as the operator would. Throws (with output) on a non-zero exit. */
function runScript(env: Record<string, string>): string {
  return execFileSync('node', [SCRIPT], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

/** Run expecting a refusal; returns the message the operator would see. */
function runScriptExpectingRefusal(env: Record<string, string>): string {
  try {
    const output = runScript(env);
    throw new Error(`Expected a refusal, but the script ran:\n${output}`);
  } catch (error: any) {
    if (error.status === undefined) throw error; // our own assertion above
    return `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }
}

const doc = (collection: string, id: string) => db.collection(collection).doc(id).get();
const dataOf = async (collection: string, id: string) => (await doc(collection, id)).data()!;

async function seed() {
  for (const collection of TOUCHED_COLLECTIONS) {
    const snapshot = await db.collection(collection).get();
    await Promise.all(snapshot.docs.map((d) => d.ref.delete()));
  }

  await db.collection('cats').doc('cat-a').set({
    mountainId: M,
    name: OLD,
    thumbnailUrl: 'https://example.com/arong.jpg',
    dwelling: 'point-3',
    name_origin: '무늬가 아롱아롱해서요.',
  });
  // A second cat whose prose links to the one being renamed — AND whose 애 row
  // names it. Modelled on the real cats/엄마조로, which carries both; it is the
  // document that proves the two passes merge into one patch.
  await db.collection('cats').doc('cat-b').set({
    mountainId: M,
    name: '까미',
    thumbnailUrl: '',
    note: '[catmodal:아롱이]와 자주 다녀요. 아롱이 얘기가 많아요.',
    offspring: OLD,
  });
  // A list, and a name that merely *starts with* the one being renamed — the
  // shape of cats/예쁜이엄마 (offspring="순돌이,예쁜이,블타").
  await db
    .collection('cats')
    .doc('cat-list')
    .set({
      mountainId: M,
      name: '보리',
      thumbnailUrl: '',
      offspring: `까미,${OLD},아롱이몬`,
      parents: '아롱이몬',
    });
  // Another tenant's cat with the SAME name — the cascade must not reach it.
  await db.collection('cats').doc('cat-other').set({
    mountainId: OTHER_M,
    name: OLD,
    thumbnailUrl: '',
    note: '[catmodal:아롱이]',
  });

  await db
    .collection('cat_images')
    .doc('img-1')
    .set({ mountainId: M, tags: ['보리', OLD, '까미'] });
  await db
    .collection('cat_images')
    .doc('img-2')
    .set({ mountainId: M, tags: ['까미'] });
  // Already carries both names (a re-run, or a hand-typed tag in the editor).
  await db
    .collection('cat_images')
    .doc('img-3')
    .set({ mountainId: M, tags: [OLD, NEW] });
  await db
    .collection('cat_images')
    .doc('img-other')
    .set({ mountainId: OTHER_M, tags: [OLD] });

  await db
    .collection('cat_videos')
    .doc('vid-1')
    .set({
      mountainId: M,
      tags: [OLD],
      videoType: 'youtube',
      youtubeId: 'yt-AAA',
      title: '아롱이 산책',
    });

  await db.collection('posts_butler').doc('post-1').set({
    mountainId: M,
    title: '오늘의 기록',
    message: '아롱이는 밥을 잘 먹어요. [catmodal:아롱이] 사진도 올려요.',
  });
  await db.collection('posts_adoption').doc('post-2').set({
    mountainId: M,
    title: '[catmodal:아롱이] 입양 홍보',
    message: '[catmodal:아롱이몬]은 다른 냥이예요.',
  });

  await db
    .collection('about_content')
    .doc(M)
    .set({
      mountainId: M,
      title: '소개',
      subtitle: '',
      mainContent: '대표 냥이는 [catmodal:아롱이]예요.',
      sections: [{ title: '활동', content: '[catmodal:아롱이]와 [catmodal:까미]' }],
    });
}

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      'These tests need the Firestore emulator. Run them with `npm run test:scripts`.'
    );
  }
  if (getApps().length === 0) {
    initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID_OVERRIDE || 'demo-mohocat' });
  }
  db = getFirestore();
});

beforeEach(seed);

describe('rename-cat.js — audit mode (the default)', () => {
  it('reports what it would change and writes nothing', async () => {
    const output = runScript({ MOUNTAIN_ID: M, OLD_NAME: OLD, NEW_NAME: NEW });

    expect(output).toContain('AUDIT (no writes)');
    expect(output).toContain('cat_images/img-1');
    expect(output).toContain('Re-run with APPLY=true');

    expect((await dataOf('cats', 'cat-a')).name).toBe(OLD);
    expect((await dataOf('cat_images', 'img-1')).tags).toEqual(['보리', OLD, '까미']);
    expect((await dataOf('posts_butler', 'post-1')).message).toContain('[catmodal:아롱이]');
  });

  it('names the emulator as its target, so a misdirected run is visible', () => {
    const output = runScript({ MOUNTAIN_ID: M, OLD_NAME: OLD, NEW_NAME: NEW });

    expect(output).toContain('TARGET: Firestore EMULATOR');
    expect(output).toContain('Production is not being touched');
  });
});

describe('rename-cat.js — APPLY', () => {
  const apply = () => runScript({ MOUNTAIN_ID: M, OLD_NAME: OLD, NEW_NAME: NEW, APPLY: 'true' });

  it('renames the cat without disturbing its other fields or its id', async () => {
    apply();
    const cat = await dataOf('cats', 'cat-a');

    expect(cat.name).toBe(NEW);
    // The id is the whole reason ?cat= links survive a rename (§10c C2).
    expect((await doc('cats', 'cat-a')).exists).toBe(true);
    expect(cat.dwelling).toBe('point-3');
    expect(cat.thumbnailUrl).toBe('https://example.com/arong.jpg');
  });

  it('re-tags media in place, leaving the other tags and their order alone', async () => {
    apply();

    expect((await dataOf('cat_images', 'img-1')).tags).toEqual(['보리', NEW, '까미']);
    expect((await dataOf('cat_videos', 'vid-1')).tags).toEqual([NEW]);
  });

  it('does not touch media that never carried the name', async () => {
    apply();
    expect((await dataOf('cat_images', 'img-2')).tags).toEqual(['까미']);
  });

  it('does not end up with the new name twice', async () => {
    apply();
    expect((await dataOf('cat_images', 'img-3')).tags).toEqual([NEW]);
  });

  it('rewrites the token but never the bare name', async () => {
    apply();
    // ⚠️ The destructive case: a cat's name is often an ordinary word, and
    // rewriting prose would silently edit posts nobody asked it to.
    expect((await dataOf('posts_butler', 'post-1')).message).toBe(
      '아롱이는 밥을 잘 먹어요. [catmodal:다롱이] 사진도 올려요.'
    );
  });

  it('rewrites tokens in a post title and leaves another cat’s token alone', async () => {
    apply();
    const post = await dataOf('posts_adoption', 'post-2');

    expect(post.title).toBe('[catmodal:다롱이] 입양 홍보');
    expect(post.message).toBe('[catmodal:아롱이몬]은 다른 냥이예요.');
  });

  it('reaches into the about page’s nested sections array', async () => {
    apply();
    const about = await dataOf('about_content', M);

    expect(about.mainContent).toBe('대표 냥이는 [catmodal:다롱이]예요.');
    expect(about.sections).toEqual([
      { title: '활동', content: '[catmodal:다롱이]와 [catmodal:까미]' },
    ]);
  });

  it('rewrites another cat’s prose', async () => {
    apply();
    expect((await dataOf('cats', 'cat-b')).note).toBe(
      '[catmodal:다롱이]와 자주 다녀요. 아롱이 얘기가 많아요.'
    );
  });

  it('updates the 엄마/애 rows that name the renamed cat', async () => {
    apply();
    expect((await dataOf('cats', 'cat-b')).offspring).toBe(NEW);
  });

  it('rewrites one member of a family list and leaves near-miss names alone', async () => {
    apply();
    const cat = await dataOf('cats', 'cat-list');

    // 아롱이몬 merely starts with 아롱이 — a replace would have eaten it.
    expect(cat.offspring).toBe(`까미,${NEW},아롱이몬`);
    expect(cat.parents).toBe('아롱이몬');
  });

  it('writes a cat touched by BOTH the prose and family passes exactly once', async () => {
    // cat-b has a [catmodal:] token in `note` and the name in `offspring`.
    // Firestore rejects two writes to one document in a single commit, so the
    // patches must merge — this fails loudly if they ever stop merging.
    const output = apply();
    const cat = await dataOf('cats', 'cat-b');

    expect(cat.note).toContain('[catmodal:다롱이]');
    expect(cat.offspring).toBe(NEW);
    // Reported in both passes, counted once.
    expect(output).toContain('가족 관계 updated');
    expect(output).toContain('"familyDocs":2');
  });

  it('leaves another tenant’s identically-named cat and its media untouched', async () => {
    apply();

    expect((await dataOf('cats', 'cat-other')).name).toBe(OLD);
    expect((await dataOf('cats', 'cat-other')).note).toBe('[catmodal:아롱이]');
    expect((await dataOf('cat_images', 'img-other')).tags).toEqual([OLD]);
  });

  it('warns that YouTube will revert the video tags, and names the video', () => {
    // The one part of the cascade that does not stick: /api/refresh-video-metadata
    // overwrites cat_videos.tags from YouTube on every 동기화 run.
    const output = apply();

    expect(output).toContain('YouTube, which OWNS their tags');
    expect(output).toContain('yt-AAA');
    expect(output).toContain('일괄 태그 저장');
  });

  it('is a no-op on a second run, because the old name is gone', async () => {
    apply();
    const second = runScriptExpectingRefusal({
      MOUNTAIN_ID: M,
      OLD_NAME: OLD,
      NEW_NAME: NEW,
      APPLY: 'true',
    });

    expect(second).toContain(`No cat named '${OLD}'`);
    expect((await dataOf('cats', 'cat-a')).name).toBe(NEW);
  });
});

describe('rename-cat.js — refusals', () => {
  it('refuses a name another cat in the tenant already holds', () => {
    const output = runScriptExpectingRefusal({
      MOUNTAIN_ID: M,
      OLD_NAME: OLD,
      NEW_NAME: '까미',
      APPLY: 'true',
    });
    expect(output).toContain('already the name of');
  });

  it('refuses a cat it cannot find', () => {
    const output = runScriptExpectingRefusal({
      MOUNTAIN_ID: M,
      OLD_NAME: '없는냥이',
      NEW_NAME: '뭐든',
    });
    expect(output).toContain("No cat named '없는냥이'");
  });

  it('refuses without a NEW_NAME', () => {
    expect(runScriptExpectingRefusal({ MOUNTAIN_ID: M, OLD_NAME: OLD })).toContain('Set NEW_NAME');
  });

  it('refuses a rename to the name it already has', () => {
    const output = runScriptExpectingRefusal({ MOUNTAIN_ID: M, OLD_NAME: OLD, NEW_NAME: OLD });
    expect(output).toContain('already named');
  });

  it('refuses a CAT_ID from a different mountain than MOUNTAIN_ID', () => {
    // Otherwise the rename lands on one tenant and the cascade searches another.
    const output = runScriptExpectingRefusal({
      MOUNTAIN_ID: M,
      CAT_ID: 'cat-other',
      NEW_NAME: '뭐든',
    });
    expect(output).toContain(`belongs to mountain '${OTHER_M}'`);
  });

  it('refuses an ambiguous OLD_NAME rather than picking one', async () => {
    await db.collection('cats').doc('cat-dupe').set({ mountainId: M, name: OLD, thumbnailUrl: '' });

    const output = runScriptExpectingRefusal({ MOUNTAIN_ID: M, OLD_NAME: OLD, NEW_NAME: NEW });
    expect(output).toContain('Re-run with CAT_ID=');
  });

  /**
   * 🔑 The guard that makes CI safe. Without it this suite would need a real
   * service-account key, and the same key would let a stray emulator-less run
   * write to production.
   */
  it('refuses to touch a non-demo project while pointed at an emulator', () => {
    const output = runScriptExpectingRefusal({
      MOUNTAIN_ID: M,
      OLD_NAME: OLD,
      NEW_NAME: NEW,
      FIREBASE_PROJECT_ID_OVERRIDE: 'mountaincats-61543',
    });

    expect(output).toContain('REFUSING TO RUN');
    expect(output).toContain('not a demo-* project');
  });
});

/**
 * Rename a cat, and carry the name everywhere it is stored (2026-08-04).
 *
 * 🔑 **Why a rename needs a script at all.** A cat's *identity* is its Firestore
 * document id, and `updateCat` patches the doc in place — so `?cat=<id>` share
 * links survive a rename untouched (a deliberate choice, PROJECT_PLAN §10c C2).
 * But four other things store the **name string**, and none of them is updated
 * by editing the cat:
 *
 *   1. `cat_images[].tags` / `cat_videos[].tags` — the album queries are
 *      `where('tags', 'array-contains', cat.name)` (`media-albums.ts`), so after
 *      a bare rename the cat's 사진첩 and 영상첩 come back **empty**. Nothing is
 *      deleted; the media is simply unreachable from the cat.
 *   2. `[catmodal:이름]` tokens in CMS-authored text — resolved by
 *      `getCatByName()` at click time (`CatLinkedText`, `CatInfo`). After a bare
 *      rename the link still renders, still looks clickable, and does nothing
 *      but `console.warn`.
 *   3. Other cats' prose — the same tokens can sit in any cat's 작명 사유 / 특이사항.
 *   4. `cats[].parents` / `cats[].offspring` — free-text **names** printed in the
 *      modal's 엄마 / 애 rows (added 2026-08-04, after a dry run showed
 *      `엄마조로` holding `offspring: "아들조로"`). Nothing resolves these, so a
 *      stale one does not break; it just names a cat that no longer exists.
 *
 * ⚠️ **Every one of those failures is silent.** That is the whole reason this
 * exists: an operator who renames a cat in the CMS gets no error, and the damage
 * shows up later as an empty album nobody can date.
 *
 * ⚠️⚠️ **YouTube is the source of truth for video tags, and this script cannot
 * write to it.** `/api/refresh-video-metadata` overwrites `cat_videos.tags` from
 * `video.snippet.tags` on every 📺 YouTube와 동기화 run — the code says
 * `// YOUTUBE-SOURCED: tags (ALWAYS OVERWRITE)`. So the Firestore fix below is
 * **correct but not durable for videos**: the next sync reverts it. The script
 * prints the affected YouTube ids and refuses to let you forget them — re-tag
 * those videos in /admin → 동영상 태깅 (일괄 태그 저장 writes through to YouTube),
 * or the rename undoes itself the next time anyone presses 동기화.
 *
 * What it does NOT touch, because none of it is keyed by name: `thumbnailUrl`
 * (a stored Storage URL), `dwelling` / `prev_dwelling` (point ids), the cat's
 * document id, and any `?cat=` link already in circulation.
 *
 * Usage:
 *   CAT_ID=abc123 NEW_NAME=새이름 node scripts/migration/rename-cat.js            # audit
 *   CAT_ID=abc123 NEW_NAME=새이름 APPLY=true node scripts/migration/rename-cat.js  # rename
 *   OLD_NAME=옛이름 NEW_NAME=새이름 node scripts/migration/rename-cat.js            # by name
 *   MOUNTAIN_ID=manisan OLD_NAME=… NEW_NAME=… node ...                          # target tenant
 *
 * Against the emulator (`firebase emulators:exec` sets FIRESTORE_EMULATOR_HOST)
 * it connects credential-free and **refuses to run unless the project is
 * `demo-*`** — see `initFirestore`. `npm run test:scripts` exercises the whole
 * cascade that way; production runs need the real key and say so on every run.
 *
 * 📌 Snapshot before APPLY, as with every migration here. And re-run
 * `stamp-missing-mountain-id.js` afterwards if anything looks off — this script
 * only ever touches documents it found *through* a `mountainId` query, so it
 * cannot create unstamped docs, but the audit is cheap.
 */

'use strict';

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.resolve(
  __dirname,
  '../../config/firebase/mountaincats-61543-7329e795c352.json'
);

const APPLY = process.env.APPLY === 'true';
const MOUNTAIN_ID = process.env.MOUNTAIN_ID || 'geyang';
const CAT_ID = process.env.CAT_ID || '';
const OLD_NAME = process.env.OLD_NAME || '';
const NEW_NAME = process.env.NEW_NAME || '';

/** Firestore caps a batch at 500 writes. */
const BATCH_LIMIT = 450;

const POST_COLLECTIONS = ['posts_feeding', 'posts_butler', 'posts_announcements', 'posts_adoption'];

/**
 * Free-text fields that are rendered through `processTextWithLinks` /
 * `CatLinkedText`, i.e. the ones where a `[catmodal:…]` token is live.
 *
 * 📌 Post `title` is included even though no surface renders tokens in a title:
 * a token stored there is already displayed literally, so rewriting it keeps the
 * text consistent and costs nothing. Under-reaching is the expensive direction.
 */
const POST_TEXT_FIELDS = ['title', 'message'];
const CAT_TEXT_FIELDS = [
  'description',
  'character',
  'sickness',
  'note',
  'adoption_info',
  'name_origin',
];
const ABOUT_TEXT_FIELDS = ['title', 'subtitle', 'mainContent'];

/**
 * Cat fields holding **other cats' names** as free text — the 엄마 / 애 rows in
 * the modal. Not link tokens and not tags; see `rewriteNameList` for why they
 * need whole-member matching rather than a replace.
 */
const FAMILY_FIELDS = ['parents', 'offspring'];

/**
 * Whether we are pointed at the Firebase Emulator Suite. `firebase emulators:exec`
 * sets this for every child process, which is how the automated test drives this
 * script for real instead of importing its parts.
 */
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '';
const USING_EMULATOR = EMULATOR_HOST !== '';

/**
 * Connect, and **say out loud which database**.
 *
 * 🔑 **The guard runs in both directions, because both mistakes are possible.**
 *
 *  - *Test → production.* Against an emulator the SDK needs no credentials at all,
 *    so this takes the credential-less path (the same one `seed-emulators.mjs` and
 *    the asset script use) and then **refuses to proceed unless the project id is
 *    `demo-*`** — a namespace the Firebase SDKs can never route to a real project.
 *    That is what lets CI run this against live data-shaped fixtures without a
 *    service-account secret, and what makes "the test accidentally renamed a
 *    production cat" unreachable rather than merely unlikely.
 *  - *Production → emulator.* The reverse is quieter and so worth naming: a stray
 *    `FIRESTORE_EMULATOR_HOST` left in an operator's shell would send an `APPLY`
 *    run to a throwaway database, report a tidy success, and leave production
 *    untouched. Hence the banner — the target is stated before any work, every run.
 */
function initFirestore() {
  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  if (USING_EMULATOR) {
    const projectId =
      process.env.FIREBASE_PROJECT_ID_OVERRIDE ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      'demo-mohocat';

    if (!projectId.startsWith('demo-')) {
      throw new Error(
        `REFUSING TO RUN: FIRESTORE_EMULATOR_HOST is set (${EMULATOR_HOST}) but the project id ` +
          `is '${projectId}', not a demo-* project. Emulator runs must use a demo-* namespace ` +
          `so they can never reach real data; unset FIRESTORE_EMULATOR_HOST to target production.`
      );
    }

    console.log(`TARGET: Firestore EMULATOR at ${EMULATOR_HOST} (project '${projectId}').`);
    console.log('        Production is not being touched.');
    admin.initializeApp({ projectId });
    return admin.firestore();
  }

  let serviceAccount;
  if (process.env.SERVICE_ACCOUNT_KEY) {
    console.log('Using SERVICE_ACCOUNT_KEY from the environment.');
    serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY.replace(/\n/g, '\\n'));
  } else {
    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      throw new Error(
        `Service account key not found at ${SERVICE_ACCOUNT_PATH} and SERVICE_ACCOUNT_KEY is unset.`
      );
    }
    serviceAccount = require(SERVICE_ACCOUNT_PATH);
  }

  console.log(`TARGET: PRODUCTION Firestore (project '${serviceAccount.project_id}').`);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  return admin.firestore();
}

function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Rewrite `[catmodal:OLD]` → `[catmodal:NEW]` in one string.
 *
 * ⚠️ Matches the token, never the bare name: a cat called 별이 must not turn
 * every occurrence of the word 별이 in a post body into the new name. The token
 * text is compared verbatim because `convertCatModalLinks` passes the captured
 * text to `getCatByName` **untrimmed** — so ` 별이 ` is already a broken link
 * today and is not this script's to silently repair.
 */
function rewriteTokens(text, oldName, newName) {
  if (typeof text !== 'string' || text.length === 0) return { text, count: 0 };

  const pattern = new RegExp(`\\[catmodal:${escapeForRegExp(oldName)}\\]`, 'g');
  const matches = text.match(pattern);
  if (!matches) return { text, count: 0 };

  return { text: text.replace(pattern, `[catmodal:${newName}]`), count: matches.length };
}

/** Replace `oldName` inside a tag array, preserving order and never duplicating. */
function rewriteTags(tags, oldName, newName) {
  if (!Array.isArray(tags)) return null;
  if (!tags.includes(oldName)) return null;

  const rewritten = [];
  for (const tag of tags) {
    const next = tag === oldName ? newName : tag;
    // A doc already carrying both names (mid-rename retry, or a hand-typed tag
    // in the tagging editor) would otherwise end up with the new name twice.
    if (!rewritten.includes(next)) rewritten.push(next);
  }
  return rewritten;
}

/**
 * Rewrite `oldName` inside a family field (`parents` / `offspring`).
 *
 * These hold **cat names as free text**, one name or a comma-separated list
 * (`offspring: "순돌이,예쁜이,블타"`), and `CatInfo` prints them verbatim in the
 * 엄마 / 애 rows. Nothing resolves them, so a stale entry does not break — it just
 * names a cat that no longer goes by that name.
 *
 * ⚠️⚠️ **Whole members only, never a substring, and this is not hypothetical.**
 * The rename that prompted this field being added at all was 아들조로 → 조로, and
 * the new name is a substring of **two** existing cats (아들조로, 엄마조로). A
 * substring replace would have turned `엄마조로` into `엄마조로`'s corruption on
 * the first run. Members are compared with `===` after trimming, and the original
 * separators and spacing are preserved so an untouched field round-trips exactly.
 */
function rewriteNameList(value, oldName, newName) {
  if (typeof value !== 'string' || value.trim() === '') return null;

  let changed = false;
  const rewritten = value.split(',').map((member) => {
    const [, leading, name, trailing] = member.match(/^(\s*)(.*?)(\s*)$/);
    if (name !== oldName) return member;
    changed = true;
    return `${leading}${newName}${trailing}`;
  });

  return changed ? rewritten.join(',') : null;
}

/** Resolve the cat to rename, refusing anything ambiguous. */
async function resolveCat(db) {
  if (CAT_ID) {
    const snapshot = await db.collection('cats').doc(CAT_ID).get();
    if (!snapshot.exists) {
      throw new Error(`No cat document with id '${CAT_ID}'.`);
    }
    const data = snapshot.data();
    if (data.mountainId && data.mountainId !== MOUNTAIN_ID) {
      throw new Error(
        `Cat '${CAT_ID}' belongs to mountain '${data.mountainId}', not '${MOUNTAIN_ID}'. ` +
          `Set MOUNTAIN_ID to match, so the cascade searches the right tenant's content.`
      );
    }
    return { ref: snapshot.ref, id: snapshot.id, name: data.name };
  }

  if (!OLD_NAME) {
    throw new Error('Set CAT_ID or OLD_NAME.');
  }

  const matches = await db
    .collection('cats')
    .where('mountainId', '==', MOUNTAIN_ID)
    .where('name', '==', OLD_NAME)
    .get();

  if (matches.empty) {
    throw new Error(`No cat named '${OLD_NAME}' in mountain '${MOUNTAIN_ID}'.`);
  }
  if (matches.size > 1) {
    // Duplicate names are exactly what makes `getCatByName` (first match wins)
    // unreliable, so renaming one of them by name is not a safe instruction.
    const ids = matches.docs.map((d) => d.id).join(', ');
    throw new Error(
      `${matches.size} cats are named '${OLD_NAME}' in '${MOUNTAIN_ID}' (${ids}). ` +
        `Re-run with CAT_ID=<the one you mean>.`
    );
  }

  const doc = matches.docs[0];
  return { ref: doc.ref, id: doc.id, name: doc.data().name };
}

/** Refuse a rename that would create the ambiguity above. */
async function assertNameIsFree(db, newName, selfId) {
  const clash = await db
    .collection('cats')
    .where('mountainId', '==', MOUNTAIN_ID)
    .where('name', '==', newName)
    .get();

  const others = clash.docs.filter((d) => d.id !== selfId);
  if (others.length > 0) {
    throw new Error(
      `'${newName}' is already the name of ${others.length} other cat(s) in '${MOUNTAIN_ID}' ` +
        `(${others.map((d) => d.id).join(', ')}). ` +
        `Two cats with one name makes every [catmodal:${newName}] token resolve to whichever ` +
        `getCatByName() returns first — pick a distinct name.`
    );
  }
}

/** Media whose tags carry the old name, per collection. */
async function collectTagWrites(db, collectionName, oldName, newName) {
  const snapshot = await db
    .collection(collectionName)
    .where('mountainId', '==', MOUNTAIN_ID)
    .where('tags', 'array-contains', oldName)
    .get();

  const writes = [];
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const tags = rewriteTags(data.tags, oldName, newName);
    if (!tags) continue;
    writes.push({
      ref: doc.ref,
      update: { tags },
      label: `${collectionName}/${doc.id}`,
      detail: `[${data.tags.join(', ')}] → [${tags.join(', ')}]`,
      youtubeId: data.videoType === 'youtube' ? data.youtubeId || data.id : null,
      title: data.title || '',
    });
  }
  return writes;
}

/** Cats whose 엄마 / 애 rows name the cat being renamed. */
async function collectFamilyWrites(db, oldName, newName) {
  const snapshot = await db.collection('cats').where('mountainId', '==', MOUNTAIN_ID).get();

  const writes = [];
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const update = {};
    const changes = [];

    for (const field of FAMILY_FIELDS) {
      const rewritten = rewriteNameList(data[field], oldName, newName);
      if (rewritten === null) continue;
      update[field] = rewritten;
      changes.push(`${field}: "${data[field]}" → "${rewritten}"`);
    }

    if (changes.length > 0) {
      writes.push({
        ref: doc.ref,
        update,
        label: `cats/${doc.id}`,
        detail: changes.join('; '),
      });
    }
  }
  return writes;
}

/** `[catmodal:…]` token rewrites across every collection that stores prose. */
async function collectTokenWrites(db, oldName, newName) {
  const writes = [];

  const scan = async (collectionName, fields, scoped = true) => {
    let query = db.collection(collectionName);
    if (scoped) query = query.where('mountainId', '==', MOUNTAIN_ID);
    const snapshot = await query.get();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const update = {};
      let count = 0;

      for (const field of fields) {
        const { text, count: hits } = rewriteTokens(data[field], oldName, newName);
        if (hits > 0) {
          update[field] = text;
          count += hits;
        }
      }

      // The about page's sections are an array of objects, so a field patch
      // cannot reach inside one — rewrite and resend the whole array.
      if (collectionName === 'about_content' && Array.isArray(data.sections)) {
        let sectionHits = 0;
        const sections = data.sections.map((section) => {
          const title = rewriteTokens(section.title, oldName, newName);
          const content = rewriteTokens(section.content, oldName, newName);
          sectionHits += title.count + content.count;
          return { ...section, title: title.text, content: content.text };
        });
        if (sectionHits > 0) {
          update.sections = sections;
          count += sectionHits;
        }
      }

      if (count > 0) {
        writes.push({
          ref: doc.ref,
          update,
          label: `${collectionName}/${doc.id}`,
          detail: `${count} token(s) in ${Object.keys(update).join(', ')}`,
        });
      }
    }
  };

  for (const collectionName of POST_COLLECTIONS) {
    await scan(collectionName, POST_TEXT_FIELDS);
  }
  // Includes the renamed cat itself: a cat may reference itself, and its own
  // prose is scanned by the same pass as everyone else's.
  await scan('cats', CAT_TEXT_FIELDS);
  await scan('about_content', ABOUT_TEXT_FIELDS);

  return writes;
}

/**
 * Commit every patch, **merged per document**.
 *
 * ⚠️ One cat can legitimately appear in two passes — 엄마조로 carries both a
 * `[catmodal:아들조로]` link in its description and `offspring: "아들조로"`. The
 * passes are reported separately (an operator wants to see prose and family
 * fields as different things) but must reach Firestore as **one** patch per
 * document: two `batch.update()` calls on the same ref in a single commit is a
 * shape Firestore rejects. The field sets are disjoint, so merging is lossless.
 */
async function commit(db, writes) {
  const merged = new Map();
  for (const write of writes) {
    const key = write.ref.path;
    const existing = merged.get(key);
    if (existing) {
      Object.assign(existing.update, write.update);
    } else {
      merged.set(key, { ref: write.ref, update: { ...write.update } });
    }
  }

  const patches = [...merged.values()];
  for (let i = 0; i < patches.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const patch of patches.slice(i, i + BATCH_LIMIT)) {
      batch.update(patch.ref, patch.update);
    }
    await batch.commit();
  }
  return patches.length;
}

function report(heading, writes) {
  console.log(`\n${heading}: ${writes.length}`);
  for (const write of writes) {
    console.log(`  ${write.label}  ${write.detail}`);
  }
}

async function main() {
  if (!NEW_NAME) {
    throw new Error('Set NEW_NAME to the cat’s new name.');
  }

  const db = initFirestore();
  const cat = await resolveCat(db);
  const oldName = cat.name;

  if (!oldName) {
    throw new Error(`Cat '${cat.id}' has no name field to rename.`);
  }
  if (oldName === NEW_NAME) {
    throw new Error(`'${cat.id}' is already named '${NEW_NAME}'. Nothing to do.`);
  }
  if (OLD_NAME && OLD_NAME !== oldName) {
    throw new Error(
      `Cat '${cat.id}' is named '${oldName}', not '${OLD_NAME}'. Refusing to guess which you meant.`
    );
  }

  await assertNameIsFree(db, NEW_NAME, cat.id);

  console.log(`\nMode: ${APPLY ? 'APPLY (writes)' : 'AUDIT (no writes)'}`);
  console.log(`Mountain: '${MOUNTAIN_ID}'`);
  console.log(`Cat: ${cat.id}`);
  console.log(`Rename: '${oldName}' → '${NEW_NAME}'`);

  const imageWrites = await collectTagWrites(db, 'cat_images', oldName, NEW_NAME);
  const videoWrites = await collectTagWrites(db, 'cat_videos', oldName, NEW_NAME);
  const tokenWrites = await collectTokenWrites(db, oldName, NEW_NAME);
  const familyWrites = await collectFamilyWrites(db, oldName, NEW_NAME);

  report('사진 re-tagged (cat_images)', imageWrites);
  report('동영상 re-tagged (cat_videos)', videoWrites);
  report('[catmodal:…] tokens rewritten', tokenWrites);
  report('가족 관계 updated (엄마/애)', familyWrites);

  const allWrites = [...imageWrites, ...videoWrites, ...tokenWrites, ...familyWrites];

  console.log(
    `\n→ ${JSON.stringify({
      cat: 1,
      images: imageWrites.length,
      videos: videoWrites.length,
      textDocs: tokenWrites.length,
      familyDocs: familyWrites.length,
      // A cat can appear in both the prose and family passes, so this counts
      // documents, not patches.
      totalDocs: new Set([...allWrites.map((w) => w.ref.path), cat.ref.path]).size,
    })}`
  );

  if (APPLY) {
    const patched = await commit(db, allWrites);
    await cat.ref.update({ name: NEW_NAME });
    console.log(`\n✅ Renamed '${oldName}' → '${NEW_NAME}' and updated ${patched} doc(s).`);
    console.log('   Existing ?cat= links still resolve — they address the document id.');
  } else {
    console.log('\nRe-run with APPLY=true to write (snapshot first).');
  }

  // ⚠️ Last, and loudly: the one part of the cascade that does not stick.
  const youtubeIds = videoWrites.map((w) => w.youtubeId).filter(Boolean);
  if (youtubeIds.length > 0) {
    console.log(
      `\n⚠️  ${youtubeIds.length} of those videos live on YouTube, which OWNS their tags.\n` +
        `    /api/refresh-video-metadata overwrites cat_videos.tags from YouTube on every\n` +
        `    📺 YouTube와 동기화 run, so the re-tag above is REVERTED the next time anyone\n` +
        `    presses it — silently, and the album empties again.\n\n` +
        `    Fix it at the source: /admin → 동영상 태깅, select these videos, 일괄 태그 저장\n` +
        `    (that path writes through to YouTube).\n`
    );
    for (const write of videoWrites) {
      if (!write.youtubeId) continue;
      console.log(`      ${write.youtubeId}  ${write.title}`);
    }
    console.log('');
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\nRename failed:', error.message);
      process.exit(1);
    });
}

module.exports = { rewriteTokens, rewriteTags, rewriteNameList };

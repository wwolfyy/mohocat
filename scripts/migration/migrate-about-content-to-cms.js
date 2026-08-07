/**
 * Migration (2026-08-02): make the CMS the sole source of the about page.
 *
 * `config/mountains/mountains.json` used to carry an `about` block that was a
 * second copy of the 소개 — it shadowed the CMS record for the 대표 사진 (the
 * photo was downloaded into `public/` at build time and served from a path baked
 * back into the config, so changing the photo in the CMS silently kept rendering
 * the old one) and stood in as a fallback for a mountain with no record yet.
 * That block is gone; `about_content/{mountainId}` is now the only copy. This
 * script brings Firestore in line with that.
 *
 *   Phase 1 — seed `about_content/manisan`. manisan had no record at all, so it
 *     rendered entirely from the config block. Its text is inlined below,
 *     verbatim from the block that was deleted, so nothing regresses. Skips if
 *     the doc already exists — it never overwrites a 소개 someone has written.
 *
 *   Phase 2 — drop `mainPhoto.localPath` from every `about_content` doc. It is a
 *     build artifact (`/images/about-photos/...`) that leaked into a content
 *     record; nothing reads it any more, and leaving it invites someone to wire
 *     it back up.
 *
 *   Phase 3 — delete the legacy `about_content/about`. M5.2a copied it to
 *     `about_content/{mountainId}` and deliberately left the original in place
 *     until the cutover was verified. It has been verified; the duplicate now
 *     only misleads. ⚠️ This is the one DESTRUCTIVE phase — take the snapshot.
 *
 * Every phase skips work already done, so re-running is safe.
 *
 * Usage:
 *   # 1. Dry run (default) — reads + planned writes, no mutation.
 *   node scripts/migration/migrate-about-content-to-cms.js
 *
 *   # 2. Apply — after eyeballing the dry-run output AND taking a snapshot
 *   #    (npm run backup:firestore — the standing snapshot-first rule).
 *   APPLY=true node scripts/migration/migrate-about-content-to-cms.js
 *
 * Against the emulator, set FIRESTORE_EMULATOR_HOST first.
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
const COLLECTION = 'about_content';
const LEGACY_DOC_ID = 'about';

/**
 * manisan's 소개, verbatim from the `about` block deleted from
 * `config/mountains/mountains.json`. Inlined rather than imported precisely
 * because the config no longer has it — this is a one-shot transcription, not a
 * new dependency on static config.
 *
 * `mainPhoto` is blank: manisan never declared one, and an invented filename
 * would render as a broken image. An operator adds it in the CMS.
 */
const MANISAN_SEED = {
  title: '마니산에서 만나는 고양이 이야기',
  subtitle: '마니산에서 만나는 특별한 이야기들',
  mainContent: '마니산 산냥이집냥이는 강화도 마니산에 살고 있거나 살았던 고양이들의 이야기입니다.',
  mainPhoto: { filename: '', caption: '', altText: '' },
  sections: [
    {
      title: '우리의 미션',
      content: '마니산의 고양이들이 안전하고 행복하게 살 수 있도록 보호하고 돌봅니다.',
    },
  ],
};

function initFirestore() {
  if (admin.apps.length > 0) {
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

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  return admin.firestore();
}

/**
 * Phase 1 — seed `about_content/manisan`. Logs and re-raises on failure so a
 * partial run surfaces rather than reporting success.
 */
async function seedManisan(db) {
  try {
    const ref = db.collection(COLLECTION).doc('manisan');
    const snap = await ref.get();

    if (snap.exists) {
      console.log(`  ${COLLECTION}/manisan already exists — skipping.`);
      return { seeded: 0, skipped: 1 };
    }

    console.log(`  ${COLLECTION}/manisan → seeding "${MANISAN_SEED.title}"`);

    if (APPLY) {
      await ref.set({
        ...MANISAN_SEED,
        mountainId: 'manisan',
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdatedBy: 'migrate-about-content-to-cms',
      });
    }

    return { seeded: 1, skipped: 0 };
  } catch (error) {
    console.error('Phase 1 (seed manisan) failed:', error);
    throw error;
  }
}

/** Phase 2 — remove the build-artifact `mainPhoto.localPath` from every doc. */
async function stripLocalPath(db) {
  try {
    const snapshot = await db.collection(COLLECTION).get();

    let stripped = 0;
    let alreadyClean = 0;

    for (const doc of snapshot.docs) {
      const localPath = doc.data()?.mainPhoto?.localPath;

      if (localPath === undefined) {
        alreadyClean += 1;
        continue;
      }

      console.log(`  ${COLLECTION}/${doc.id} → dropping mainPhoto.localPath ('${localPath}')`);

      if (APPLY) {
        await doc.ref.update({
          'mainPhoto.localPath': admin.firestore.FieldValue.delete(),
        });
      }

      stripped += 1;
    }

    return { stripped, alreadyClean };
  } catch (error) {
    console.error('Phase 2 (strip localPath) failed:', error);
    throw error;
  }
}

/**
 * Phase 3 — delete the legacy `about_content/about`.
 *
 * ⚠️ Destructive and NOT reversible from this script. It refuses to run unless
 * the per-mountain doc it was copied to exists, so a mis-ordered run cannot
 * delete the only remaining copy of anyone's 소개.
 */
async function deleteLegacyDoc(db) {
  try {
    const legacyRef = db.collection(COLLECTION).doc(LEGACY_DOC_ID);
    const legacySnap = await legacyRef.get();

    if (!legacySnap.exists) {
      console.log(`  ${COLLECTION}/${LEGACY_DOC_ID} does not exist — nothing to delete.`);
      return { deleted: 0 };
    }

    const owner = legacySnap.data()?.mountainId;
    if (!owner) {
      throw new Error(
        `${COLLECTION}/${LEGACY_DOC_ID} has no mountainId — cannot confirm it was migrated. ` +
          'Inspect it by hand before deleting.'
      );
    }

    const successorSnap = await db.collection(COLLECTION).doc(owner).get();
    if (!successorSnap.exists) {
      throw new Error(
        `${COLLECTION}/${LEGACY_DOC_ID} claims mountainId '${owner}', but ` +
          `${COLLECTION}/${owner} does not exist — refusing to delete the only copy.`
      );
    }

    console.log(
      `  ${COLLECTION}/${LEGACY_DOC_ID} → deleting (superseded by ${COLLECTION}/${owner})`
    );

    if (APPLY) {
      await legacyRef.delete();
    }

    return { deleted: 1 };
  } catch (error) {
    console.error('Phase 3 (delete legacy doc) failed:', error);
    throw error;
  }
}

async function main() {
  const db = initFirestore();

  console.log(`\nMode: ${APPLY ? 'APPLY (writes)' : 'DRY RUN (no writes)'}\n`);

  console.log('Phase 1 — seed about_content/manisan');
  console.log(`  → ${JSON.stringify(await seedManisan(db))}\n`);

  console.log('Phase 2 — drop mainPhoto.localPath');
  console.log(`  → ${JSON.stringify(await stripLocalPath(db))}\n`);

  console.log('Phase 3 — delete the legacy about_content/about');
  console.log(`  → ${JSON.stringify(await deleteLegacyDoc(db))}\n`);

  if (!APPLY) {
    console.log('Dry run complete. Re-run with APPLY=true to write (snapshot first).');
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

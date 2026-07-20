/**
 * Migration: stamp `mountainId` onto every pre-multi-tenant document
 * (multi-mountain refactor M4, plan §3).
 *
 * Every document that existed before the tenant refactor belongs to the single
 * mountain the platform ran as. This backfill writes that id onto the 12 content
 * collections plus `contacts` and `permission_logs`, so M5 can add
 * `where('mountainId','==',…)` scoping and mountain-aware rules without orphaning
 * existing data.
 *
 * ⚠️ Writes use `set(..., { merge: true })` — never a bare `set`. The Sheets
 * importer's full-document overwrite once wiped app-only fields (`adoptable`);
 * merge is what keeps this additive. Documents that already carry a `mountainId`
 * are skipped, so re-running is safe.
 *
 * Usage:
 *   # 1. Dry run first — reads + per-collection counts, no writes.
 *   DRY_RUN=true node scripts/migration/backfill-mountain-id.js
 *
 *   # 2. Real run, after eyeballing the dry-run counts.
 *   node scripts/migration/backfill-mountain-id.js
 *
 *   # Override the target tenant (defaults to MOUNTAIN_ID, then 'geyang'):
 *   MOUNTAIN_ID=geyang node scripts/migration/backfill-mountain-id.js
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

const MOUNTAIN_ID = process.env.MOUNTAIN_ID || 'geyang';
const DRY_RUN = process.env.DRY_RUN === 'true';

/**
 * The 12 content collections (plan §2.3) plus the two audit/PII collections
 * whose reads M5 scopes by mountain (`contacts`, `permission_logs`).
 */
const COLLECTIONS = [
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
];

// Firestore caps a batch at 500 writes.
const BATCH_LIMIT = 400;

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
 * Stamp one collection. Returns its counts; logs and re-raises on failure so a
 * partial run surfaces rather than reporting success.
 */
async function backfillCollection(db, collectionName) {
  try {
    const snapshot = await db.collection(collectionName).get();

    let stamped = 0;
    let alreadyTagged = 0;
    let batch = db.batch();
    let pending = 0;

    for (const doc of snapshot.docs) {
      if (doc.data().mountainId) {
        alreadyTagged += 1;
        continue;
      }

      stamped += 1;
      if (DRY_RUN) {
        continue;
      }

      // merge:true — additive by construction; every other field is untouched.
      batch.set(doc.ref, { mountainId: MOUNTAIN_ID }, { merge: true });
      pending += 1;

      if (pending >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        pending = 0;
      }
    }

    if (!DRY_RUN && pending > 0) {
      await batch.commit();
    }

    return { total: snapshot.size, stamped, alreadyTagged };
  } catch (error) {
    console.error(`Failed to backfill '${collectionName}':`, error);
    throw error;
  }
}

async function main() {
  console.log(`=== Backfill mountainId='${MOUNTAIN_ID}' ===`);
  console.log(DRY_RUN ? 'MODE: DRY RUN (no writes)\n' : 'MODE: LIVE (writing)\n');

  const db = initFirestore();
  const results = [];

  for (const collectionName of COLLECTIONS) {
    const counts = await backfillCollection(db, collectionName);
    results.push({ collection: collectionName, ...counts });
    console.log(
      `${collectionName.padEnd(22)} total=${String(counts.total).padStart(5)}  ` +
        `${DRY_RUN ? 'would stamp' : 'stamped'}=${String(counts.stamped).padStart(5)}  ` +
        `already=${String(counts.alreadyTagged).padStart(5)}`
    );
  }

  const totalStamped = results.reduce((sum, r) => sum + r.stamped, 0);
  console.log(
    `\n${DRY_RUN ? 'Would stamp' : 'Stamped'} ${totalStamped} document(s) across ${COLLECTIONS.length} collections.`
  );
  if (DRY_RUN) {
    console.log('Re-run without DRY_RUN=true to apply.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\nBackfill failed:', error);
    process.exit(1);
  });

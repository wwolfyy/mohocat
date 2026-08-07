/**
 * Audit + repair (2026-08-03): content documents with no `mountainId`.
 *
 * 🔑 **Why this matters, and why the failure is silent.** Every write goes
 * through `canWrite()` in `firestore.rules`, which resolves the doc's mountain:
 *
 *     function writeMountainId() {
 *       return request.resource != null ? request.resource.data.mountainId
 *                                       : resource.data.mountainId;  // ← delete
 *     }
 *
 * On a **delete** `request.resource` is null, so it reads the STORED field —
 * and `hasPermissionFor()` requires `mountainId != null`. A document without it
 * is therefore **undeletable and unwritable by everyone, admins included**, and
 * nothing surfaces that until someone tries. Proven against the real rules in
 * the emulator: the same doc deletes fine with the field and is denied without
 * it.
 *
 * That is what left `posts_feeding/brftRGjV7XWkPaZ91Gap` in place after the
 * owner deleted it — created 2026-07-21, one day AFTER the M4 backfill ran, so
 * nothing ever stamped it.
 *
 * ⚠️ **Run this as an AUDIT after any migration or bulk import.** A one-shot
 * backfill cannot catch what is written after it, and the resulting breakage
 * hides until someone happens to edit or delete the affected document.
 *
 * Usage:
 *   node scripts/migration/stamp-missing-mountain-id.js                 # audit
 *   APPLY=true node scripts/migration/stamp-missing-mountain-id.js      # repair
 *   MOUNTAIN_ID=geyang APPLY=true node ...                              # target
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
const TARGET_MOUNTAIN = process.env.MOUNTAIN_ID || 'geyang';

/**
 * Collections whose documents are per-mountain content and are governed by
 * `canWrite()`. `users` is identity-domain (roles are keyed by mountain inside
 * the doc) and `role_permissions` / `admin_config` are global, so none of them
 * carry a top-level `mountainId` — they are deliberately absent here.
 */
const CONTENT_COLLECTIONS = [
  'posts_feeding',
  'posts_butler',
  'posts_announcements',
  'posts_adoption',
  'cats',
  'cat_images',
  'cat_videos',
  'points',
  'feeding_spots',
  'about_content',
  'contacts',
];

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

async function run(db) {
  let scanned = 0;
  let stamped = 0;
  const offenders = [];

  for (const collection of CONTENT_COLLECTIONS) {
    const snapshot = await db.collection(collection).get();
    scanned += snapshot.size;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.mountainId) continue;

      const label = data.title || data.name || doc.id;
      offenders.push(`${collection}/${doc.id}`);
      console.log(
        `  ${collection}/${doc.id} → stamping mountainId='${TARGET_MOUNTAIN}'  (${String(label).slice(0, 40)})`
      );

      if (APPLY) {
        // ⚠️ Admin SDK: bypasses the very rule that makes this doc unwritable
        // from the client. That is the only reason a repair is possible at all.
        await doc.ref.update({ mountainId: TARGET_MOUNTAIN });
      }
      stamped += 1;
    }
  }

  return { scanned, stamped, offenders };
}

async function main() {
  const db = initFirestore();

  console.log(`\nMode: ${APPLY ? 'APPLY (writes)' : 'AUDIT (no writes)'}`);
  console.log(`Target mountain for unstamped docs: '${TARGET_MOUNTAIN}'\n`);
  console.log(`Scanning ${CONTENT_COLLECTIONS.length} content collections...`);

  const result = await run(db);

  console.log(
    `\n→ ${JSON.stringify({ scanned: result.scanned, missingMountainId: result.stamped })}`
  );

  if (result.stamped === 0) {
    console.log('✅ Every content document carries a mountainId.');
  } else if (!APPLY) {
    console.log('\nRe-run with APPLY=true to stamp them (snapshot first).');
  } else {
    console.log(`\n✅ Stamped ${result.stamped} document(s). They are now writable/deletable.`);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Audit/repair failed:', error);
      process.exit(1);
    });
}

/**
 * Migration (multi-mountain M5.2a): two additive, reversible transforms.
 *
 *   Phase 1 — role model: `users/{uid}.currentRole` (a single role) →
 *     `users/{uid}.roles[mountainId]` (a map keyed by mountainId), so one
 *     account can hold a role on several mountains and the host picks which
 *     applies (plan §0 sub-decision 6). The old `currentRole` is LEFT IN PLACE
 *     (additive → trivially reversible: revert the code and it reads again).
 *
 *     ⚠️ Legacy `mountainId: 'default'` is normalized to the real default
 *     mountain (MOUNTAIN_ID, i.e. 'geyang'). Before multi-tenancy the platform
 *     auto-provisioned users with the placeholder `'default'`; the prod admin
 *     account carries it. Keying its role under `roles.default` would strand it
 *     on a non-existent mountain and lock the admin out of geyang. The role's
 *     own inner `mountainId` is normalized to match the key.
 *
 *   Phase 2 — about page doc id: copy `about_content/about` (a single shared
 *     doc both tenants would collide on) to `about_content/{mountainId}`, so
 *     each mountain owns its about content. The old `about_content/about` is
 *     LEFT IN PLACE (reversible); it can be deleted once the cutover is
 *     verified.
 *
 * Both phases skip already-migrated docs, so re-running is safe.
 *
 * Usage:
 *   # 1. Dry run (default) — reads + planned writes, no mutation.
 *   node scripts/migration/migrate-m5-role-and-about.js
 *
 *   # 2. Apply — after eyeballing the dry-run output AND taking a snapshot
 *   #    (npm run backup:firestore — the standing snapshot-first rule).
 *   APPLY=true node scripts/migration/migrate-m5-role-and-about.js
 *
 *   # Override the target/default mountain (defaults to MOUNTAIN_ID, then 'geyang'):
 *   MOUNTAIN_ID=geyang APPLY=true node scripts/migration/migrate-m5-role-and-about.js
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
const APPLY = process.env.APPLY === 'true';
const LEGACY_PLACEHOLDER = 'default';

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

/** Normalize the pre-multitenant `'default'` placeholder to the real mountain. */
function normalizeMountainId(mountainId) {
  return mountainId && mountainId !== LEGACY_PLACEHOLDER ? mountainId : MOUNTAIN_ID;
}

/**
 * Phase 1 — users: currentRole → roles[mountainId]. Logs and re-raises on
 * failure so a partial run surfaces rather than reporting success.
 */
async function migrateRoles(db) {
  try {
    const snapshot = await db.collection('users').get();

    let migrated = 0;
    let alreadyMigrated = 0;
    let noRole = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const currentRole = data.currentRole;

      if (!currentRole || !currentRole.role) {
        noRole += 1;
        continue;
      }

      const key = normalizeMountainId(currentRole.mountainId);

      if (data.roles && data.roles[key]) {
        alreadyMigrated += 1;
        continue;
      }

      // Normalize the role's own inner mountainId to match its key.
      const role = { ...currentRole, mountainId: key };
      const normalized =
        currentRole.mountainId !== key
          ? ` (normalized '${currentRole.mountainId}' → '${key}')`
          : '';
      console.log(`  users/${doc.id}: roles.${key} = ${role.role}${normalized}`);

      migrated += 1;
      if (!APPLY) {
        continue;
      }

      // merge:true — additive; currentRole and every other field are untouched.
      await doc.ref.set({ roles: { [key]: role } }, { merge: true });
    }

    return { total: snapshot.size, migrated, alreadyMigrated, noRole };
  } catch (error) {
    console.error('Phase 1 (roles) failed:', error);
    throw error;
  }
}

/**
 * Phase 2 — about_content/about → about_content/{mountainId}. Logs and
 * re-raises on failure.
 */
async function migrateAbout(db) {
  try {
    const legacyRef = db.collection('about_content').doc('about');
    const legacySnap = await legacyRef.get();

    if (!legacySnap.exists) {
      console.log('  about_content/about does not exist — nothing to copy.');
      return { copied: false, reason: 'no-source' };
    }

    const data = legacySnap.data();
    const targetId = normalizeMountainId(data.mountainId);
    const targetRef = db.collection('about_content').doc(targetId);
    const targetSnap = await targetRef.get();

    if (targetSnap.exists) {
      console.log(`  about_content/${targetId} already exists — skipping.`);
      return { copied: false, reason: 'target-exists', targetId };
    }

    console.log(
      `  about_content/about → about_content/${targetId} (${Object.keys(data).length} fields)`
    );
    if (APPLY) {
      // merge:true so a re-run never clobbers; source doc left in place (reversible).
      await targetRef.set({ ...data, mountainId: targetId }, { merge: true });
    }
    return { copied: true, targetId };
  } catch (error) {
    console.error('Phase 2 (about_content) failed:', error);
    throw error;
  }
}

async function main() {
  console.log(`=== M5.2a migration (default mountain='${MOUNTAIN_ID}') ===`);
  console.log(APPLY ? '⚠️  MODE: APPLY (writing)\n' : 'MODE: DRY RUN (no writes)\n');

  const db = initFirestore();

  console.log('Phase 1 — users: currentRole → roles[mountainId]');
  const roleCounts = await migrateRoles(db);
  console.log(
    `  → total=${roleCounts.total}  ${APPLY ? 'migrated' : 'would migrate'}=${roleCounts.migrated}  ` +
      `already=${roleCounts.alreadyMigrated}  no-role=${roleCounts.noRole}\n`
  );

  console.log('Phase 2 — about_content/about → about_content/{mountainId}');
  const aboutResult = await migrateAbout(db);
  console.log(`  → ${JSON.stringify(aboutResult)}\n`);

  if (!APPLY) {
    console.log('Re-run with APPLY=true to apply (snapshot first: npm run backup:firestore).');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\nMigration failed:', error);
    process.exit(1);
  });

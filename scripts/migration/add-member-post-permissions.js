/**
 * Migration (2026-08-02): member authoring on 집사톡 + 급식현황.
 *
 * Plan: docs/planning/pending/member-post-authoring-20260802.md
 *
 * The Firestore rules resolve every permission against
 * `role_permissions/role-config` — `config/permissions.json` is only its seed
 * and fallback (`api/admin/role-permissions/route.ts`). So granting a role a new
 * permission in the repo does nothing until that document is updated too; this
 * script is the other half of the P2 task.
 *
 *   Phase 1 — grant the two new permissions:
 *     butler-ground   → write-own-post-butler, write-own-post-feeding
 *     butler-internet → write-own-post-butler  (it has no 급식현황 read grant,
 *                       so giving it a feeding write would contradict the
 *                       per-board split the roles already encode)
 *
 *   Phase 2 — backfill `authorUid` on existing posts, so their authors can edit
 *     them without relying on the rules' legacy email fallback. Maps
 *     `username` → uid via the `users` collection. ⚠️ Posts whose username
 *     matches no account (the legacy `admin@mtcat.com` ones) are LEFT ALONE and
 *     stay admin-only — that is correct, not a gap to close.
 *
 * Both phases skip work already done, so re-running is safe. Neither removes
 * anything, so both are reversible by deleting the added fields/entries.
 *
 * ⚠️ ORDER: deploy `firestore.rules` BEFORE running this. The rules reference
 * the new permissions; granting them first would be inert but pointless, while
 * deploying rules first is inert *and* safe (no UI exposes the capability yet).
 *
 * Usage:
 *   node scripts/migration/add-member-post-permissions.js              # dry run
 *   APPLY=true node scripts/migration/add-member-post-permissions.js   # writes
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

/** role → permissions to add. Additive; existing entries are untouched. */
const GRANTS = {
  'butler-ground': ['write-own-post-butler', 'write-own-post-feeding'],
  'butler-internet': ['write-own-post-butler'],
};

const POST_COLLECTIONS = ['posts_butler', 'posts_feeding'];

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

/** Phase 1 — grant the new permissions in role_permissions/role-config. */
async function grantPermissions(db) {
  try {
    const ref = db.collection('role_permissions').doc('role-config');
    const snap = await ref.get();

    if (!snap.exists) {
      throw new Error(
        'role_permissions/role-config does not exist — the rules would deny everything. ' +
          'Seed it first (GET /api/admin/role-permissions seeds from config/permissions.json).'
      );
    }

    const config = snap.data();
    const roles = config.roles || {};
    let added = 0;
    let alreadyHeld = 0;

    for (const [role, permissions] of Object.entries(GRANTS)) {
      if (!roles[role]) {
        throw new Error(`Role '${role}' is not in the live matrix — refusing to invent it.`);
      }
      const current = roles[role].permissions || [];
      for (const permission of permissions) {
        if (current.includes(permission)) {
          console.log(`  ${role} already holds ${permission} — skipping.`);
          alreadyHeld += 1;
          continue;
        }
        console.log(`  ${role} → granting ${permission}`);
        current.push(permission);
        added += 1;
      }
      roles[role].permissions = current;
    }

    if (APPLY && added > 0) {
      await ref.set({ ...config, roles }, { merge: true });
    }

    return { added, alreadyHeld };
  } catch (error) {
    console.error('Phase 1 (grant permissions) failed:', error);
    throw error;
  }
}

/** Phase 2 — backfill authorUid on existing posts from their username email. */
async function backfillAuthorUid(db) {
  try {
    const users = await db.collection('users').get();
    const uidByEmail = new Map();
    users.forEach((doc) => {
      const email = doc.data().email;
      if (email) uidByEmail.set(email.toLowerCase(), doc.id);
    });
    console.log(`  ${uidByEmail.size} account(s) available to match against.`);

    let stamped = 0;
    let alreadyStamped = 0;
    const unmatched = new Map();

    for (const collection of POST_COLLECTIONS) {
      const snapshot = await db.collection(collection).get();
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.authorUid) {
          alreadyStamped += 1;
          continue;
        }

        const uid = uidByEmail.get(String(data.username || '').toLowerCase());
        if (!uid) {
          const key = data.username || '(no username)';
          unmatched.set(key, (unmatched.get(key) || 0) + 1);
          continue;
        }

        console.log(`  ${collection}/${doc.id} → authorUid=${uid} (${data.username})`);
        if (APPLY) {
          await doc.ref.update({ authorUid: uid });
        }
        stamped += 1;
      }
    }

    if (unmatched.size > 0) {
      console.log('  Left without authorUid (no matching account — admin-only by design):');
      for (const [name, count] of unmatched) {
        console.log(`    ${name}: ${count} post(s)`);
      }
    }

    return { stamped, alreadyStamped, unmatchedAuthors: unmatched.size };
  } catch (error) {
    console.error('Phase 2 (backfill authorUid) failed:', error);
    throw error;
  }
}

async function main() {
  const db = initFirestore();

  console.log(`\nMode: ${APPLY ? 'APPLY (writes)' : 'DRY RUN (no writes)'}\n`);

  console.log('Phase 1 — grant write-own-post-* in role_permissions/role-config');
  console.log(`  → ${JSON.stringify(await grantPermissions(db))}\n`);

  console.log('Phase 2 — backfill authorUid on existing posts');
  console.log(`  → ${JSON.stringify(await backfillAuthorUid(db))}\n`);

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

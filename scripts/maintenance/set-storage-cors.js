/**
 * Apply the Storage bucket's CORS configuration from
 * `config/firebase/cors_fbstorage.json`.
 *
 * WHY THIS EXISTS: that file is the source of truth for which browser origins may
 * upload to the bucket, but nothing in the repo ever applied it — the step lived only
 * as prose in the deployment runbook, and needed the Google Cloud SDK, which isn't
 * installed here. So it drifted, invisibly: the Seoul migration moved everything to
 * `mountaincats-61543` and left the CORS config behind on the old
 * `mountaincats-61543.firebasestorage.app`. The live bucket had **no CORS at all**, so
 * 집사톡's browser→bucket image upload (signed URL) failed on every deployed origin with
 * a bare `TypeError: Failed to fetch` — while still working locally, because local `.env`
 * named the old bucket (`log/DEBUG_LOG.md` 2026-07-29).
 *
 * This uses the `@google-cloud/storage` client that `firebase-admin` already depends
 * on, with the same service-account credential as the other maintenance scripts — so
 * no `gcloud` install and no second auth flow.
 *
 * ⚠️ CORS is browser-only. This list decides which **web origins** a browser will let
 * talk to the bucket; it is not an access control. The real guard on an upload is the
 * short-lived signed URL, which only a `manage-photo` holder can mint
 * (`/api/generate-signed-url`). Widening this list does not grant anyone access.
 *
 * ⚠️ This OVERWRITES the bucket's live CORS configuration — `setCorsConfiguration`
 * replaces, it does not merge. So, like `import-firestore.js`, dry-run is the DEFAULT
 * and applying needs two explicit env vars.
 *
 * Usage:
 *   # 1. Inspect: prints the live config and the diff, writes nothing.
 *   node scripts/maintenance/set-storage-cors.js
 *
 *   # 2. Apply. CONFIRM_PROJECT must match the resolved target project id.
 *   APPLY=true CONFIRM_PROJECT=mountaincats-61543 \
 *     node scripts/maintenance/set-storage-cors.js
 *
 * The bucket comes from NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET (load your env first,
 * e.g. `npx dotenv -e .env.local -- node scripts/maintenance/set-storage-cors.js`).
 */

'use strict';

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.resolve(
  __dirname,
  '../../config/firebase/mountaincats-61543-7329e795c352.json'
);

const CORS_CONFIG_PATH = path.resolve(__dirname, '../../config/firebase/cors_fbstorage.json');

const APPLY = process.env.APPLY === 'true';
const CONFIRM_PROJECT = process.env.CONFIRM_PROJECT;

function loadServiceAccount() {
  if (process.env.SERVICE_ACCOUNT_KEY) {
    return JSON.parse(process.env.SERVICE_ACCOUNT_KEY.replace(/\n/g, '\\n'));
  }

  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    throw new Error(
      `Service account key not found at ${SERVICE_ACCOUNT_PATH} and SERVICE_ACCOUNT_KEY is unset.`
    );
  }

  return require(SERVICE_ACCOUNT_PATH);
}

/**
 * Read and sanity-check the desired configuration. Throws rather than applying a
 * shape the bucket would accept but that would silently block every upload — an
 * empty list is indistinguishable from "no CORS" once it is live.
 */
function loadDesiredCors() {
  if (!fs.existsSync(CORS_CONFIG_PATH)) {
    throw new Error(`CORS config not found at ${CORS_CONFIG_PATH}`);
  }

  const parsed = JSON.parse(fs.readFileSync(CORS_CONFIG_PATH, 'utf8'));

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`${CORS_CONFIG_PATH} must be a non-empty array of CORS rules.`);
  }

  parsed.forEach((rule, index) => {
    if (!Array.isArray(rule.origin) || rule.origin.length === 0) {
      throw new Error(`CORS rule #${index} has no origins.`);
    }
    if (!Array.isArray(rule.method) || rule.method.length === 0) {
      throw new Error(`CORS rule #${index} has no methods.`);
    }
    // GCS matches origins exactly; a wildcard here would be accepted and then never
    // match anything, which reads as "configured" while failing every request.
    rule.origin.forEach((origin) => {
      if (origin.includes('*') && origin !== '*') {
        throw new Error(
          `CORS rule #${index} origin "${origin}" uses a wildcard. GCS matches origins ` +
            `exactly — only a bare "*" is special. List each origin in full.`
        );
      }
    });
  });

  return parsed;
}

async function main() {
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error(
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is unset. Load your env first, e.g. ' +
        '`npx dotenv -e .env.local -- node scripts/maintenance/set-storage-cors.js`.'
    );
  }

  const serviceAccount = loadServiceAccount();
  const desired = loadDesiredCors();
  const targetProject = serviceAccount.project_id;

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: targetProject,
      storageBucket: bucketName,
    });
  }

  console.log(
    [
      '',
      `source:       ${path.relative(process.cwd(), CORS_CONFIG_PATH)}`,
      `target:       ⚠️  LIVE project ${targetProject}`,
      `bucket:       gs://${bucketName}`,
      APPLY
        ? 'MODE:         APPLY (overwriting the bucket CORS config)'
        : 'MODE:         DRY RUN (no writes)',
      '',
    ].join('\n')
  );

  if (APPLY && CONFIRM_PROJECT !== targetProject) {
    throw new Error(
      `Refusing to write: CONFIRM_PROJECT="${CONFIRM_PROJECT ?? '(unset)'}" does not match the ` +
        `target project "${targetProject}". Re-run with CONFIRM_PROJECT=${targetProject} if that is intended.`
    );
  }

  const bucket = admin.storage().bucket(bucketName);

  // Read the live config first — a dry run that opens no connection proves nothing
  // (a lesson from the Firestore import script's own dry-run gap).
  const [metadata] = await bucket.getMetadata();
  const live = metadata.cors ?? [];

  console.log('live config on the bucket:');
  console.log(JSON.stringify(live, null, 2));
  console.log('\ndesired config:');
  console.log(JSON.stringify(desired, null, 2));

  const unchanged = JSON.stringify(live) === JSON.stringify(desired);
  if (unchanged) {
    console.log('\n✅ Already matches — nothing to do.\n');
    return;
  }

  const liveOrigins = new Set(live.flatMap((rule) => rule.origin ?? []));
  const desiredOrigins = new Set(desired.flatMap((rule) => rule.origin ?? []));
  const added = [...desiredOrigins].filter((origin) => !liveOrigins.has(origin));
  const removed = [...liveOrigins].filter((origin) => !desiredOrigins.has(origin));

  console.log('\norigin changes:');
  added.forEach((origin) => console.log(`  + ${origin}`));
  removed.forEach((origin) => console.log(`  - ${origin}`));
  if (added.length === 0 && removed.length === 0) {
    console.log('  (origins unchanged; methods/headers differ)');
  }

  if (!APPLY) {
    console.log(
      `\nDry run — nothing was written. Re-run with ` +
        `APPLY=true CONFIRM_PROJECT=${targetProject} to apply.\n`
    );
    return;
  }

  await bucket.setCorsConfiguration(desired);

  // Read back rather than trusting the write: this replaces live config, and the
  // whole point of the script is that nobody could see what was actually applied.
  const [after] = await bucket.getMetadata();
  console.log('\napplied. bucket now reports:');
  console.log(JSON.stringify(after.cors ?? [], null, 2));
  console.log('');
}

main().catch((error) => {
  console.error('\nFailed to apply the Storage CORS configuration:');
  console.error(error);
  process.exitCode = 1;
});

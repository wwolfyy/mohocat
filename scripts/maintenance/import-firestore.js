/**
 * Restore a Firestore dump produced by `export-firestore.js`.
 *
 * The inverse of the export: reads a dump directory, rebuilds the `__type`-tagged
 * values back into real Firestore types (Timestamp / GeoPoint / DocumentReference /
 * Buffer / NaN / Infinity), and writes each document back under its original id.
 *
 * ⚠️ THIS OVERWRITES DOCUMENTS. Each write is a full `set()` without merge — that is
 * what "restore" means: the document ends up exactly as the dump has it, and any
 * field added since the dump is gone. This is the same operation shape that once
 * wiped app-only fields via the Sheets importer, so it is deliberately hard to fire:
 * dry-run is the DEFAULT, and applying needs two explicit env vars.
 *
 * It does NOT delete documents that exist now but are absent from the dump — a
 * restore only puts back what it has. Removing extra documents is a separate,
 * manual decision.
 *
 * Usage:
 *   # 1. Preview (default — reads only, writes nothing)
 *   node scripts/maintenance/import-firestore.js backups/firestore/<stamp>
 *
 *   # 2. Apply. CONFIRM_PROJECT must match the resolved target project id.
 *   APPLY=true CONFIRM_PROJECT=mountaincats-61543 \
 *     node scripts/maintenance/import-firestore.js backups/firestore/<stamp>
 *
 *   # Restore a single collection
 *   ONLY=cats node scripts/maintenance/import-firestore.js backups/firestore/<stamp>
 *
 * Against the emulator, set FIRESTORE_EMULATOR_HOST — the banner says which target
 * is in play, so a dry-run against prod is never mistaken for one against a sandbox.
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
const CONFIRM_PROJECT = process.env.CONFIRM_PROJECT;
const ONLY = process.env.ONLY;
const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST;

// Firestore caps a batch at 500 writes.
const BATCH_LIMIT = 400;

function initFirestore() {
  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  let serviceAccount;
  if (process.env.SERVICE_ACCOUNT_KEY) {
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
 * Rebuild one exported value into its Firestore representation.
 *
 * Mirrors `serialize()` in export-firestore.js. Throws on an unrecognized
 * `__type` rather than writing the tag object through as a plain map — a
 * half-understood restore is worse than a refused one.
 */
function deserialize(value, db, fieldPath) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item, i) => deserialize(item, db, `${fieldPath}[${i}]`));
  }

  if (typeof value === 'object') {
    if (typeof value.__type === 'string') {
      switch (value.__type) {
        case 'timestamp':
          // Prefer seconds/nanoseconds — the ISO string is millisecond-precision
          // and would silently round away sub-millisecond nanos.
          return typeof value.seconds === 'number' && typeof value.nanoseconds === 'number'
            ? new admin.firestore.Timestamp(value.seconds, value.nanoseconds)
            : admin.firestore.Timestamp.fromDate(new Date(value.iso));
        case 'geopoint':
          return new admin.firestore.GeoPoint(value.latitude, value.longitude);
        case 'reference':
          return db.doc(value.path);
        case 'bytes':
          return Buffer.from(value.base64, 'base64');
        case 'number':
          return Number(value.value);
        case 'undefined':
          // Firestore cannot store undefined; signal the caller to drop the key.
          return undefined;
        default:
          throw new Error(
            `Unknown __type "${value.__type}" at "${fieldPath}". ` +
              'Add a deserializer branch — refusing to write a half-understood restore.'
          );
      }
    }

    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const rebuilt = deserialize(v, db, `${fieldPath}.${k}`);
      if (rebuilt !== undefined) {
        out[k] = rebuilt;
      }
    }
    return out;
  }

  throw new Error(`Unexpected value at "${fieldPath}": ${typeof value}`);
}

/**
 * Queue writes for one collection's documents, recursing into subcollections.
 * `writer` receives (docRef, data) and handles batching.
 */
async function importCollection(collectionRef, docs, db, writer, stats) {
  for (const record of docs) {
    const docRef = collectionRef.doc(record.id);
    const data = deserialize(record.data, db, `${collectionRef.path}/${record.id}`);

    await writer(docRef, data);
    stats.documents += 1;

    for (const [subId, subDocs] of Object.entries(record.subcollections ?? {})) {
      await importCollection(docRef.collection(subId), subDocs, db, writer, stats);
    }
  }
}

function readDump(dumpDir) {
  if (!fs.existsSync(dumpDir)) {
    throw new Error(`Dump directory not found: ${dumpDir}`);
  }

  const manifestPath = path.join(dumpDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `No manifest.json in ${dumpDir} — refusing to import a directory that is not an export.`
    );
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const files = fs
    .readdirSync(dumpDir)
    .filter((f) => f.endsWith('.json') && f !== 'manifest.json')
    .filter((f) => !ONLY || path.basename(f, '.json') === ONLY);

  if (ONLY && files.length === 0) {
    throw new Error(`ONLY="${ONLY}" matched no collection file in ${dumpDir}.`);
  }

  return { manifest, files };
}

async function main() {
  const dumpDir = process.argv[2];
  if (!dumpDir) {
    console.error('Usage: node scripts/maintenance/import-firestore.js <dump-directory>');
    console.error('       (dry-run by default; APPLY=true CONFIRM_PROJECT=<id> to write)');
    process.exit(1);
  }

  const { manifest, files } = readDump(dumpDir);
  const db = initFirestore();
  const targetProject = admin.app().options.projectId;

  console.log('=== Firestore restore ===');
  console.log(`source dump:  ${dumpDir}`);
  console.log(`  exported:   ${manifest.exportedAt} (${manifest.documentCount} docs)`);
  console.log(`  from:       ${manifest.projectId}`);
  console.log(
    `target:       ${EMULATOR ? `EMULATOR at ${EMULATOR} (project ${targetProject})` : `⚠️  LIVE project ${targetProject}`}`
  );
  if (ONLY) console.log(`filter:       ONLY=${ONLY}`);
  console.log(
    APPLY ? 'MODE:         APPLY (overwriting documents)\n' : 'MODE:         DRY RUN (no writes)\n'
  );

  if (APPLY && CONFIRM_PROJECT !== targetProject) {
    throw new Error(
      `Refusing to write: CONFIRM_PROJECT="${CONFIRM_PROJECT ?? '(unset)'}" does not match the ` +
        `target project "${targetProject}". Re-run with CONFIRM_PROJECT=${targetProject} if that is intended.`
    );
  }

  let batch = db.batch();
  let pending = 0;
  const commit = async () => {
    if (pending > 0) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  };

  const writer = async (docRef, data) => {
    if (!APPLY) return;
    // Full set(), no merge — restore means "the document as the dump has it".
    batch.set(docRef, data);
    pending += 1;
    if (pending >= BATCH_LIMIT) await commit();
  };

  const totals = { documents: 0 };

  for (const file of files) {
    const collectionId = path.basename(file, '.json');
    const docs = JSON.parse(fs.readFileSync(path.join(dumpDir, file), 'utf-8'));
    const stats = { documents: 0 };

    try {
      await importCollection(db.collection(collectionId), docs, db, writer, stats);
    } catch (error) {
      console.error(`[import] Failed on "${collectionId}":`, error);
      throw error;
    }

    totals.documents += stats.documents;
    console.log(
      `${collectionId.padEnd(22)} ${APPLY ? 'restored' : 'would restore'}=${String(stats.documents).padStart(4)}`
    );
  }

  await commit();

  console.log(
    `\n${APPLY ? 'Restored' : 'Would restore'} ${totals.documents} document(s) from ${files.length} collection(s).`
  );
  if (!APPLY) {
    console.log(
      `Re-run with APPLY=true CONFIRM_PROJECT=${targetProject} to write.\n` +
        '⚠️  Writes are full overwrites; documents absent from the dump are left untouched.'
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\nRestore failed:', error.message ?? error);
    process.exit(1);
  });

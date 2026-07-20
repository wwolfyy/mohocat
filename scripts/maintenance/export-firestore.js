/**
 * Offline Firestore export — a full, type-preserving JSON snapshot on local disk.
 *
 * Complements (does not replace) Firestore PITR: PITR is a rolling 7-day window
 * that lives inside Google and disappears if the project does. This produces a
 * copy you hold, that survives project loss, and that can be diffed and read.
 *
 * ⚠️ THE OUTPUT CONTAINS SECRETS AND PERSONAL DATA.
 *   - `admin_config/youtube_auth` holds a live OAuth **refreshToken**.
 *   - `contacts` holds 동참 submissions (name / phone / email); `users` holds
 *     member email + phone.
 * Treat a dump like a credential file: it is written 0600 into a git-ignored
 * directory, but if you copy it elsewhere (cloud drive, email, another machine)
 * that copy is a PIPA-relevant personal-data store and a live credential leak
 * risk. Delete dumps you no longer need.
 *
 * Collections are DISCOVERED, never hard-coded — `listCollections()` at the root
 * and per document, recursing into subcollections. A hard-coded list silently
 * misses data: `image_uploader` (13 docs) exists in prod and is referenced
 * nowhere in the codebase, which is exactly the case a fixed list would drop.
 *
 * Usage:
 *   node scripts/maintenance/export-firestore.js
 *   OUT_DIR=/secure/path node scripts/maintenance/export-firestore.js
 *
 * Output: <OUT_DIR>/<UTC-timestamp>/
 *   manifest.json          run metadata + per-collection document counts
 *   <collection>.json      one file per root collection
 *
 * Restore is NOT implemented here — see the manifest's `restoreNote`.
 */

'use strict';

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.resolve(
  __dirname,
  '../../config/firebase/mountaincats-61543-7329e795c352.json'
);

const OUT_DIR = process.env.OUT_DIR || path.resolve(__dirname, '../../backups/firestore');

/** Collections whose contents are credentials or personal data (for the warning). */
const SENSITIVE = new Set(['admin_config', 'contacts', 'users', 'permission_logs']);

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
 * Convert one Firestore value into JSON that round-trips.
 *
 * Firestore types with no JSON equivalent (Timestamp, GeoPoint, reference,
 * bytes) are tagged with `__type` so an importer can rebuild them exactly;
 * a naive `JSON.stringify` would flatten a Timestamp into `{_seconds,
 * _nanoseconds}` or an ISO string and lose which one it was.
 *
 * Throws on any type not handled — a backup that silently drops a field is
 * worse than one that fails loudly, since the loss only surfaces at restore.
 */
function serialize(value, fieldPath) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    // NaN/±Infinity are valid Firestore doubles but not valid JSON.
    return Number.isFinite(value) ? value : { __type: 'number', value: String(value) };
  }

  if (value === undefined) {
    // Firestore never stores undefined; if the SDK hands one back, record it
    // rather than letting JSON.stringify drop the key silently.
    return { __type: 'undefined' };
  }

  if (value instanceof admin.firestore.Timestamp) {
    return {
      __type: 'timestamp',
      iso: value.toDate().toISOString(),
      seconds: value.seconds,
      nanoseconds: value.nanoseconds,
    };
  }

  if (value instanceof Date) {
    return { __type: 'timestamp', iso: value.toISOString() };
  }

  if (value instanceof admin.firestore.GeoPoint) {
    return { __type: 'geopoint', latitude: value.latitude, longitude: value.longitude };
  }

  if (value instanceof admin.firestore.DocumentReference) {
    return { __type: 'reference', path: value.path };
  }

  if (Buffer.isBuffer(value)) {
    return { __type: 'bytes', base64: value.toString('base64') };
  }

  if (Array.isArray(value)) {
    return value.map((item, i) => serialize(item, `${fieldPath}[${i}]`));
  }

  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = serialize(v, `${fieldPath}.${k}`);
    }
    return out;
  }

  throw new Error(
    `Unsupported Firestore value at "${fieldPath}": ${Object.getPrototypeOf(value)?.constructor?.name ?? typeof value}. ` +
      'Add a serializer branch for it — refusing to write a lossy backup.'
  );
}

/**
 * Read one collection into plain objects, recursing into any subcollections.
 * Logs and re-raises on failure so a partial export never reports success.
 */
async function exportCollection(collectionRef, trail) {
  try {
    const snapshot = await collectionRef.get();
    const docs = [];

    for (const doc of snapshot.docs) {
      const record = { id: doc.id, data: serialize(doc.data(), `${trail}/${doc.id}`) };

      // Subcollections are invisible to a collection read — enumerate per doc.
      const subRefs = await doc.ref.listCollections();
      if (subRefs.length > 0) {
        record.subcollections = {};
        for (const sub of subRefs) {
          record.subcollections[sub.id] = await exportCollection(
            sub,
            `${trail}/${doc.id}/${sub.id}`
          );
        }
      }

      docs.push(record);
    }

    return docs;
  } catch (error) {
    console.error(`[export] Failed reading "${trail}":`, error);
    throw error;
  }
}

/** Count documents including nested subcollections. */
function countDocs(docs) {
  return docs.reduce(
    (sum, d) =>
      sum +
      1 +
      Object.values(d.subcollections ?? {}).reduce((s, nested) => s + countDocs(nested), 0),
    0
  );
}

async function main() {
  const startedAt = new Date();
  const stamp = startedAt.toISOString().replace(/[:.]/g, '-');
  const destination = path.join(OUT_DIR, stamp);

  console.log('=== Firestore offline export ===');
  console.log(`destination: ${destination}\n`);

  const db = initFirestore();

  // 0700: the dump holds credentials and personal data.
  fs.mkdirSync(destination, { recursive: true, mode: 0o700 });

  const collections = await db.listCollections();
  const summary = [];
  let sensitiveIncluded = false;

  for (const collectionRef of collections) {
    const docs = await exportCollection(collectionRef, collectionRef.id);
    const total = countDocs(docs);

    fs.writeFileSync(
      path.join(destination, `${collectionRef.id}.json`),
      JSON.stringify(docs, null, 2),
      {
        mode: 0o600,
      }
    );

    const sensitive = SENSITIVE.has(collectionRef.id);
    if (sensitive) sensitiveIncluded = true;

    summary.push({ collection: collectionRef.id, documents: total, sensitive });
    console.log(
      `${collectionRef.id.padEnd(22)} docs=${String(total).padStart(4)}${sensitive ? '   ⚠️ sensitive' : ''}`
    );
  }

  const manifest = {
    exportedAt: startedAt.toISOString(),
    projectId: db.projectId ?? admin.app().options.projectId,
    collectionCount: summary.length,
    documentCount: summary.reduce((sum, c) => sum + c.documents, 0),
    collections: summary,
    format:
      'One JSON file per root collection: [{ id, data, subcollections? }]. Firestore-native ' +
      'types are tagged with __type (timestamp | geopoint | reference | bytes | number | undefined).',
    restoreNote:
      'No import script exists yet. Restoring means walking each file and writing docs back ' +
      'by id, rebuilding __type-tagged values into Timestamp/GeoPoint/reference/Buffer first. ' +
      'Prefer Firestore PITR for recent accidents; use this for project-loss or older recovery.',
    warning:
      'Contains OAuth refresh token (admin_config) and personal data (contacts, users). ' +
      'Handle as credentials + PIPA-regulated personal data.',
  };
  fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2), {
    mode: 0o600,
  });

  console.log(
    `\nExported ${manifest.documentCount} document(s) from ${manifest.collectionCount} collection(s).`
  );
  console.log(`→ ${destination}`);
  if (sensitiveIncluded) {
    console.log(
      '\n⚠️  This dump contains an OAuth refresh token and personal data (name/phone/email).\n' +
        '    Files are 0600 in a git-ignored directory. Do not copy it to shared storage,\n' +
        '    and delete dumps you no longer need.'
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\nExport failed:', error);
    process.exit(1);
  });

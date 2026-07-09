/**
 * Migration: Rewrite Firebase Storage URLs from the US bucket to the Korea bucket.
 *
 * Run AFTER:
 *   1. New Seoul bucket created in Firebase Console (asia-northeast3)
 *   2. Files transferred to new bucket (Storage Transfer Service or gsutil)
 *   3. NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET updated in Vercel to new bucket name
 *
 * Usage:
 *   OLD_BUCKET=mountaincats-61543.firebasestorage.app \
 *   NEW_BUCKET=<new-bucket-name> \
 *   node scripts/migration/rewrite-storage-bucket-urls.js
 *
 * Dry run (reads + logs, no writes):
 *   DRY_RUN=true OLD_BUCKET=... NEW_BUCKET=... node scripts/migration/rewrite-storage-bucket-urls.js
 */

'use strict';

const admin = require('firebase-admin');
const crypto = require('crypto');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SERVICE_ACCOUNT_PATH = path.resolve(
  __dirname,
  '../../config/firebase/mountaincats-61543-7329e795c352.json'
);

const OLD_BUCKET = process.env.OLD_BUCKET;
const NEW_BUCKET = process.env.NEW_BUCKET;
const DRY_RUN = process.env.DRY_RUN === 'true';

if (!OLD_BUCKET || !NEW_BUCKET) {
  console.error('❌  Set OLD_BUCKET and NEW_BUCKET environment variables before running.');
  console.error('    Example:');
  console.error(
    '    OLD_BUCKET=mountaincats-61543.firebasestorage.app NEW_BUCKET=<new> node scripts/migration/rewrite-storage-bucket-urls.js'
  );
  process.exit(1);
}

if (OLD_BUCKET === NEW_BUCKET) {
  console.error('❌  OLD_BUCKET and NEW_BUCKET are the same — nothing to migrate.');
  process.exit(1);
}

// Firestore collections and which fields in each may contain Storage URLs.
// Fields listed as arrays contain string[] values; others are plain strings.
const COLLECTIONS = [
  {
    name: 'cat_images',
    scalarFields: ['imageUrl', 'thumbnailUrl'],
    arrayFields: [],
  },
  {
    name: 'cat_videos',
    scalarFields: ['thumbnailUrl'],
    arrayFields: [],
  },
  {
    name: 'cats',
    scalarFields: ['thumbnailUrl'],
    arrayFields: [],
  },
  {
    name: 'posts_feeding',
    scalarFields: ['thumbnailUrl'],
    arrayFields: ['imageUrls'],
  },
  {
    name: 'posts_adoption',
    scalarFields: ['thumbnailUrl'],
    arrayFields: ['imageUrls'],
  },
  {
    name: 'posts_butler',
    scalarFields: ['thumbnailUrl'],
    arrayFields: ['imageUrls'],
  },
];

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------
function initFirebase() {
  if (admin.apps.length) return;
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: NEW_BUCKET,
  });
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/** Returns true if this looks like a Firebase Storage URL for OLD_BUCKET. */
function isOldBucketUrl(url) {
  if (typeof url !== 'string' || !url) return false;
  return url.includes(`/b/${OLD_BUCKET}/`);
}

/**
 * Extracts the storage file path from a Firebase Storage download URL.
 * e.g. "https://firebasestorage.googleapis.com/v0/b/bucket/o/thumbnails%2Fcat.jpg?alt=media&token=..."
 *   → "thumbnails/cat.jpg"
 */
function extractFilePath(url) {
  const oIndex = url.indexOf('/o/');
  if (oIndex === -1) throw new Error(`Cannot parse storage path from URL: ${url}`);
  const afterO = url.slice(oIndex + 3);
  const queryStart = afterO.indexOf('?');
  const encoded = queryStart === -1 ? afterO : afterO.slice(0, queryStart);
  return decodeURIComponent(encoded);
}

/**
 * Constructs a Firebase Storage download URL for the new bucket.
 * Ensures the file has a download token (generating one if the transfer didn't preserve it).
 */
async function getNewUrl(newBucket, filePath) {
  const file = newBucket.file(filePath);

  // Check the file exists in the new bucket before doing anything.
  const [exists] = await file.exists();
  if (!exists) {
    throw new Error(`File not found in new bucket: ${filePath}`);
  }

  // Retrieve (or generate) a download token from the file metadata.
  const [metadata] = await file.getMetadata();
  let token = metadata.metadata?.firebaseStorageDownloadTokens;

  if (!token) {
    token = crypto.randomUUID();
    await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } });
  }

  return (
    `https://firebasestorage.googleapis.com/v0/b/${NEW_BUCKET}/o/` +
    `${encodeURIComponent(filePath)}?alt=media&token=${token}`
  );
}

// ---------------------------------------------------------------------------
// URL resolution cache (avoid hitting Storage API for the same path twice)
// ---------------------------------------------------------------------------
const urlCache = new Map(); // filePath → newUrl

async function resolveUrl(newBucket, oldUrl) {
  const filePath = extractFilePath(oldUrl);
  if (urlCache.has(filePath)) return urlCache.get(filePath);
  const newUrl = await getNewUrl(newBucket, filePath);
  urlCache.set(filePath, newUrl);
  return newUrl;
}

// ---------------------------------------------------------------------------
// Per-collection migration
// ---------------------------------------------------------------------------
async function migrateCollection(db, newBucket, collectionConfig) {
  const { name, scalarFields, arrayFields } = collectionConfig;
  console.log(`\n📂  Collection: ${name}`);

  const snapshot = await db.collection(name).get();
  if (snapshot.empty) {
    console.log('    (empty — skipping)');
    return;
  }

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const updates = {};
    let dirty = false;

    // Scalar string fields
    for (const field of scalarFields) {
      const val = data[field];
      if (!isOldBucketUrl(val)) continue;
      try {
        updates[field] = await resolveUrl(newBucket, val);
        dirty = true;
      } catch (err) {
        console.error(`    ❌  ${name}/${docSnap.id} [${field}]: ${err.message}`);
        errors++;
      }
    }

    // Array-of-string fields (e.g. imageUrls)
    for (const field of arrayFields) {
      const arr = data[field];
      if (!Array.isArray(arr) || arr.length === 0) continue;
      let arrayDirty = false;
      const newArr = [];
      for (const url of arr) {
        if (!isOldBucketUrl(url)) {
          newArr.push(url);
          continue;
        }
        try {
          newArr.push(await resolveUrl(newBucket, url));
          arrayDirty = true;
        } catch (err) {
          console.error(`    ❌  ${name}/${docSnap.id} [${field}[]]: ${err.message}`);
          newArr.push(url); // keep old url on failure; don't lose the field
          errors++;
        }
      }
      if (arrayDirty) {
        updates[field] = newArr;
        dirty = true;
      }
    }

    if (!dirty) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`    🔍  [DRY RUN] Would update ${name}/${docSnap.id}:`, updates);
    } else {
      await db.collection(name).doc(docSnap.id).update(updates);
    }
    updated++;
  }

  console.log(
    `    ✅  ${updated} updated, ${skipped} unchanged, ${errors} error(s) — total ${snapshot.size}`
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== Firebase Storage bucket URL migration ===');
  console.log(`  Old bucket : ${OLD_BUCKET}`);
  console.log(`  New bucket : ${NEW_BUCKET}`);
  console.log(`  Dry run    : ${DRY_RUN}`);

  initFirebase();
  const db = admin.firestore();
  const newBucket = admin.storage().bucket(NEW_BUCKET);

  for (const collectionConfig of COLLECTIONS) {
    await migrateCollection(db, newBucket, collectionConfig);
  }

  console.log('\n=== Migration complete ===');
  if (DRY_RUN) {
    console.log('  (dry run — no Firestore documents were written)');
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});

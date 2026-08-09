'use strict';

/**
 * work_tracking/tests/store.test.js — integrity checks against the **real, committed** store,
 * not a throwaway one.
 *
 * `lib.test.js` and `workflow.test.js` prove the tooling behaves; this file proves the data it
 * produced is actually there. That is a different question, and the migration learned it the
 * hard way: `handoff.js` rendered `entry.body` when the body lives on the **span**, so all 57
 * records it imported were written with a correct header and **no prose at all**. Nothing threw
 * — `Array.join()` renders `undefined` as an empty string — the row count was right, the CI gate
 * was green, and the loss was invisible for a day. See `R-0429`.
 *
 * 🔑 **A row that points at empty prose is worse than a missing row**, because everything that
 * counts records reports success. These assertions are the thing that would have caught it.
 *
 * Run with `node work_tracking/tests/run.js`.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const lib = require('../scripts/lib');

let pass = 0,
  fail = 0;
function check(name, fn) {
  try {
    fn();
    pass += 1;
    console.log(`  ok   ${name}`);
  } catch (error) {
    fail += 1;
    console.log(`  FAIL ${name}\n       ${error.message}`);
  }
}

const { db } = lib.openStore();
const records = lib.currentRecords(db);

/** Records whose prose this repo owns — `records/R-XXXX.md`, not a pointer at some other doc. */
const owned = records.filter((r) => r.detail_ref && r.detail_ref.startsWith('records/'));

function bodyOf(text) {
  const rule = text.indexOf('\n---\n');
  return rule < 0 ? '' : text.slice(rule + 5).trim();
}

console.log('\n-- every detail_ref resolves --');

check('the store is not empty', () => {
  assert(records.length > 0, 'no records loaded');
  assert(owned.length > 0, 'no records own their prose');
});

check('every detail_ref points at a file that exists', () => {
  const missing = records
    .filter((r) => r.detail_ref)
    .filter((r) => !fs.existsSync(path.join(lib.WORK_TRACKING_DIR, r.detail_ref)))
    .map((r) => `${r.id} -> ${r.detail_ref}`);
  assert.deepEqual(missing, [], `dangling detail_ref: ${missing.join(', ')}`);
});

console.log('\n-- the prose is actually in the prose file --');

check('no record file is header-only', () => {
  const empty = owned
    .filter((r) => !bodyOf(fs.readFileSync(path.join(lib.WORK_TRACKING_DIR, r.detail_ref), 'utf8')))
    .map((r) => r.id);
  assert.deepEqual(empty, [], `record file has no body: ${empty.join(', ')}`);
});

check('every record file names its own record in the H1', () => {
  const wrong = owned
    .filter((r) => {
      const text = fs.readFileSync(path.join(lib.WORK_TRACKING_DIR, r.detail_ref), 'utf8');
      return text.split('\n')[0] !== `# ${r.id} — ${r.title}`;
    })
    .map((r) => r.id);
  assert.deepEqual(wrong, [], `H1 does not match id + title: ${wrong.join(', ')}`);
});

check('no record file is orphaned — every file in records/ has a record', () => {
  const referenced = new Set(owned.map((r) => path.basename(r.detail_ref)));
  const orphans = fs
    .readdirSync(path.join(lib.WORK_TRACKING_DIR, 'records'))
    .filter((file) => file.endsWith('.md'))
    .filter((file) => !referenced.has(file));
  assert.deepEqual(orphans, [], `no record points at: ${orphans.join(', ')}`);
});

db.close();

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

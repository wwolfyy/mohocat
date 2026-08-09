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
 * ⚠️ It happened a second time, in the same import, and the empty-body check did not catch it:
 * ten records were written **truncated mid-sentence** — `R-0186` stopped at ``(`uploadDate: new``
 * — because the source markdown indents a list item's continuation lines to column 0, which by
 * the markdown spec ends the item there. A truncated record is still a **valid** record, so
 * counts, determinism and `build --check` all stayed green again. See `R-0435`. Hence the
 * completeness check below: prose that stops mid-sentence is prose that went missing.
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

/**
 * Code spans are stripped before backticks are counted, longest delimiter first, or a record that
 * legitimately quotes a backtick inside a ``double-tick`` span reads as unbalanced. `R-0435` is
 * exactly such a record — it quotes the truncation it describes.
 */
function strippedOfCode(body) {
  return body.replace(/```[\s\S]*?```/g, '').replace(/``[\s\S]*?``/g, '');
}

/** The last line that carries text, with any blockquote marker removed. */
function lastProseLine(body) {
  const lines = body.split('\n');
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i].replace(/^>\s?/, '').trim();
    if (line && line !== '>') return line;
  }
  return '';
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

console.log('\n-- the prose is complete, not just present (2026-08-09) --');

check('no record file ends mid-sentence', () => {
  // `---` closes a record that ends on a horizontal rule inside its quoted block.
  const truncated = owned
    .filter((r) => {
      const body = bodyOf(fs.readFileSync(path.join(lib.WORK_TRACKING_DIR, r.detail_ref), 'utf8'));
      const last = lastProseLine(body);
      return last && last !== '---' && !/[.!?:;)\]`*_"”…-]$/.test(last);
    })
    .map((r) => r.id);
  assert.deepEqual(truncated, [], `record body stops mid-sentence: ${truncated.join(', ')}`);
});

check('no record file leaves a code span unclosed', () => {
  const unbalanced = owned
    .filter((r) => {
      const body = bodyOf(fs.readFileSync(path.join(lib.WORK_TRACKING_DIR, r.detail_ref), 'utf8'));
      return (strippedOfCode(body).match(/`/g) || []).length % 2 !== 0;
    })
    .map((r) => r.id);
  assert.deepEqual(unbalanced, [], `odd number of backticks: ${unbalanced.join(', ')}`);
});

console.log('\n-- no record file is orphaned --');

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

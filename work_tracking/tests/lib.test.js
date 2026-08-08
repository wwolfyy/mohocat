'use strict';

/**
 * work_tracking/tests/lib.test.js — the store's read side and, more importantly, the
 * Phase 1 gate: every malformed record shape must be rejected before real data is imported.
 *
 * Run with `node work_tracking/tests/run.js`. No test framework, on purpose — this tooling
 * has no dependencies and adding one to test it would be the only reason it needed any.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const lib = require('../scripts/lib');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-'));
const reg = path.join(tmp, 'registry.ndjson');

const rec = (o) => ({
  id: 'R-0001',
  rev: 1,
  ts: '2026-08-09',
  type: 'task',
  status: 'open',
  outcome: null,
  title: 'Parent',
  plan: null,
  detail_ref: null,
  note: null,
  supersedes: null,
  split_from: null,
  files: null,
  source_ref: null,
  ...o,
});

let pass = 0,
  fail = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ok   ${name}`);
    pass++;
  } catch (e) {
    console.log(`  FAIL ${name}\n       ${e.message}`);
    fail++;
  }
}
function throws(fn, re, name) {
  check(name, () => {
    let threw = null;
    try {
      fn();
    } catch (e) {
      threw = e;
    }
    assert(threw, 'expected a throw, got none');
    assert(re.test(threw.message), `message did not match ${re}\n       got: ${threw.message}`);
  });
}

console.log('\n-- happy path --');
const rows = [
  rec({}),
  rec({ rev: 2, status: 'in-progress', note: 'started' }),
  rec({ id: 'R-0002', title: 'Child A', split_from: 'R-0001', status: 'done' }),
  rec({ id: 'R-0003', title: 'Child B', split_from: 'R-0001', status: 'open' }),
  rec({
    id: 'R-0004',
    type: 'decision',
    status: 'done',
    outcome: 'rejected',
    title: 'Firestore rename',
    supersedes: ['R-0003'],
    files: ['a.md'],
  }),
];
fs.writeFileSync(reg, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');

const { db, records } = lib.openStore({ registryPath: reg });
check('all 5 lines parsed', () => assert.equal(records.length, 5));
const cur = lib.currentRecords(db);
check('folds to 4 current records', () => assert.equal(cur.length, 4));
check('R-0001 folds to rev 2', () => {
  const r = cur.find((x) => x.id === 'R-0001');
  assert.equal(r.rev, 2);
  assert.equal(r.status, 'in-progress');
});
check('JSON fields round-trip as arrays', () => {
  const r = cur.find((x) => x.id === 'R-0004');
  assert.deepEqual(r.supersedes, ['R-0003']);
  assert.deepEqual(r.files, ['a.md']);
});
check('revisionsOf returns the timeline oldest-first', () => {
  const t = lib.revisionsOf(db, 'R-0001');
  assert.deepEqual(
    t.map((r) => r.rev),
    [1, 2]
  );
});
check('children_progress rolls up 1/2 done', () => {
  const p = db.prepare('SELECT * FROM children_progress').all();
  assert.equal(p.length, 1);
  assert.equal(p[0].parent_id, 'R-0001');
  assert.equal(p[0].children, 2);
  assert.equal(p[0].children_done, 1);
});
check('stale is derived: rev 1 stale, rev 2 not', () => {
  const s = db
    .prepare("SELECT rev, stale FROM records_with_stale WHERE id='R-0001' ORDER BY rev")
    .all();
  assert.deepEqual(s, [
    { rev: 1, stale: 1 },
    { rev: 2, stale: 0 },
  ]);
});
check('serialize round-trips byte-identically', () => {
  const line = lib.serializeRecord(cur.find((x) => x.id === 'R-0004'));
  const back = lib.parseRegistry(line, 'x')[0];
  assert.equal(lib.serializeRecord(back), line);
});
check('serialize emits canonical field order', () => {
  const line = lib.serializeRecord(rec({}));
  assert.deepEqual(Object.keys(JSON.parse(line)), lib.FIELDS);
});
db.close();

console.log('\n-- malformed records must be rejected --');
const bad = (o, name, re) => {
  const p = path.join(tmp, `bad-${name.replace(/\W+/g, '-')}.ndjson`);
  fs.writeFileSync(p, JSON.stringify(rec(o)) + '\n');
  throws(() => lib.openStore({ registryPath: p }), re, name);
};
bad({ id: 'R-1' }, 'malformed id', /schema|CHECK/i);
bad({ id: 'nope' }, 'non-id id', /schema|CHECK/i);
bad({ rev: 0 }, 'rev below 1', /schema|CHECK/i);
bad({ ts: '09-08-2026' }, 'wrong date format', /schema|CHECK/i);
bad({ type: 'chore' }, 'unknown type', /schema|CHECK/i);
bad({ status: 'wip' }, 'unknown status', /schema|CHECK/i);
bad({ outcome: 'maybe' }, 'unknown outcome', /schema|CHECK/i);
bad({ title: '   ' }, 'blank title', /schema|CHECK/i);
bad({ title: null }, 'missing title', /schema|NOT NULL/i);
bad({ split_from: 'R-1' }, 'malformed split_from', /schema|CHECK/i);
bad({ supersedes: 'R-0003' }, 'supersedes not an array', /must be an array/);
bad({ files: { a: 1 } }, 'files not an array', /must be an array/);
bad({ rev: 1.5 }, 'non-integer rev', /must be an integer/);
bad({ title: { a: 1 } }, 'object where text expected', /must be a string/);
bad({ typ: 'task' }, 'typo-d field name', /Unknown field 'typ'/);

check("'question' is an accepted type (2026-08-09 additive change)", () => {
  const p = path.join(tmp, 'q.ndjson');
  fs.writeFileSync(p, JSON.stringify(rec({ type: 'question' })) + '\n');
  const s = lib.openStore({ registryPath: p });
  assert.equal(lib.currentRecords(s.db).length, 1);
  s.db.close();
});

console.log('\n-- the collision detector --');
const dup = path.join(tmp, 'dup.ndjson');
fs.writeFileSync(
  dup,
  [JSON.stringify(rec({})), JSON.stringify(rec({ title: 'other' }))].join('\n')
);
throws(
  () => lib.openStore({ registryPath: dup }),
  /dup\.ndjson:2/,
  'duplicate (id, rev) rejected, naming line 2'
);

console.log('\n-- file-level behaviour --');
const junk = path.join(tmp, 'junk.ndjson');
fs.writeFileSync(junk, JSON.stringify(rec({})) + '\nnot json\n');
throws(
  () => lib.openStore({ registryPath: junk }),
  /Malformed JSON at junk\.ndjson:2/,
  'bad JSON names its line'
);

check('blank lines are skipped, not errors', () => {
  const p = path.join(tmp, 'blank.ndjson');
  fs.writeFileSync(p, '\n' + JSON.stringify(rec({})) + '\n\n');
  const s = lib.openStore({ registryPath: p });
  assert.equal(s.records.length, 1);
  s.db.close();
});
throws(
  () => lib.openStore({ registryPath: path.join(tmp, 'nope.ndjson') }),
  /ENOENT/,
  'missing registry throws by default'
);
check('missing registry is empty when allowMissing', () => {
  const s = lib.openStore({ registryPath: path.join(tmp, 'nope.ndjson'), allowMissing: true });
  assert.deepEqual(lib.currentRecords(s.db), []);
  s.db.close();
});
check('FIELDS matches the columns in schema.sql', () => {
  const d = lib.createDatabase();
  const cols = d
    .prepare('SELECT name FROM pragma_table_info(?)')
    .all('records')
    .map((c) => c.name);
  assert.deepEqual([...cols].sort(), [...lib.FIELDS].sort());
  d.close();
});
check('no .db file is written to disk', () => {
  const before = fs.readdirSync(lib.WORK_TRACKING_DIR);
  const d = lib.createDatabase();
  d.close();
  assert.deepEqual(fs.readdirSync(lib.WORK_TRACKING_DIR), before);
  assert(!before.some((f) => f.endsWith('.db')));
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

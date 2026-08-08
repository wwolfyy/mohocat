'use strict';

/**
 * work_tracking/tests/workflow.test.js — checkout → edit → checkin → build, driven through
 * the real CLIs against a throwaway store (`WORK_TRACKING_STORE`).
 *
 * It covers the failure modes the design was built around: the referential rules SQL cannot
 * enforce, all-or-nothing check-in, and the git-conflict recovery in restructure §4.3.
 *
 * Run with `node work_tracking/tests/run.js`.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

const SCRIPTS = path.resolve(__dirname, '..', 'scripts');
const store = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-e2e-'));
const REG = path.join(store, 'registry.ndjson');
const WORK = path.join(store, 'work.json');
const MD = path.join(store, 'registry.md');

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
function run(script, ...args) {
  return spawnSync('node', [path.join(SCRIPTS, script), ...args], {
    encoding: 'utf8',
    env: { ...process.env, WORK_TRACKING_STORE: store },
  });
}
const work = () => JSON.parse(fs.readFileSync(WORK, 'utf8'));
const writeWork = (records) => fs.writeFileSync(WORK, JSON.stringify({ records }, null, 2));
const registry = () =>
  fs.existsSync(REG)
    ? fs.readFileSync(REG, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
    : [];

console.log('\n-- checkout on an empty store --');
let r = run('checkout.js', '--new');
check('--new succeeds on an empty store', () => assert.equal(r.status, 0, r.stderr));
check('next_free_id starts at R-0001', () => assert.equal(work().next_free_id, 'R-0001'));

console.log('\n-- first check-in --');
writeWork([
  { id: 'R-0001', type: 'task', status: 'open', title: 'Migrate the backlog', plan: '§10' },
  {
    id: 'R-0002',
    type: 'decision',
    status: 'done',
    outcome: 'rejected',
    title: 'Rename the Firestore database',
    note: 'investigated, dropped',
  },
]);
r = run('checkin.js');
check('checkin succeeds', () => assert.equal(r.status, 0, r.stderr));
check('two records appended at rev 1', () => {
  const rows = registry();
  assert.equal(rows.length, 2);
  assert(rows.every((x) => x.rev === 1));
});
check('absent optional fields are stored as explicit nulls', () => {
  assert.strictEqual(registry()[0].split_from, null);
  assert.deepEqual(Object.keys(registry()[0]).length, 14);
});
check('ts is stamped when omitted', () => assert.match(registry()[0].ts, /^\d{4}-\d{2}-\d{2}$/));
check('checkin keeps work.json and stamps it', () => {
  assert(fs.existsSync(WORK), 'work.json is the git-conflict recovery file — it must survive');
  assert.match(work().checked_in, /^\d{4}-\d{2}-\d{2}$/);
});

console.log('\n-- checkout tells finished from unfinished --');
r = run('checkout.js', '--id', 'R-0001');
check('a checked-in work.json may be replaced without --force', () => {
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /Replacing the checkout that was checked in/);
});
r = run('checkout.js', '--id', 'R-0002');
check('an unfinished checkout is protected', () => {
  assert.equal(r.status, 1);
  assert.match(r.stderr, /unfinished checkout/);
});
check('--force overrides the protection', () =>
  assert.equal(run('checkout.js', '--id', 'R-0002', '--force').status, 0)
);
check('unreadable work.json is treated as unfinished, not as safe', () => {
  fs.writeFileSync(WORK, 'garbage');
  const c = run('checkout.js', '--id', 'R-0001');
  assert.equal(c.status, 1);
  assert.match(c.stderr, /unfinished work/);
});

console.log('\n-- unmodified records are dropped --');
run('checkout.js', '--id', 'R-0001', '--force');
r = run('checkin.js');
check('no-op checkin writes nothing', () => {
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /unchanged — dropped/);
  assert.equal(registry().length, 2);
});
check('a no-op checkin keeps work.json', () => assert(fs.existsSync(WORK)));

console.log('\n-- an update appends the next rev --');
let w = work().records;
w[0].status = 'in-progress';
writeWork(w);
r = run('checkin.js');
check('update appended at rev 2', () => {
  assert.equal(r.status, 0, r.stderr);
  const rows = registry();
  assert.equal(rows.length, 3);
  assert.equal(rows[2].id, 'R-0001');
  assert.equal(rows[2].rev, 2);
  assert.equal(rows[2].status, 'in-progress');
});
check('rev is computed, not taken from work.json', () => {
  // work.json still said rev 1; checkin must have derived 2 from the store.
  assert.equal(registry()[2].rev, 2);
});

console.log('\n-- the referential rules --');
run('checkout.js', '--new', '--force');
writeWork([{ id: 'R-0003', type: 'task', status: 'open', title: 'Child', split_from: 'R-0001' }]);
r = run('checkin.js');
check('split_from outside the checkout is rejected', () => {
  assert.equal(r.status, 1);
  assert.match(r.stderr, /not in the checkout/);
});
check('...and nothing was written', () => assert.equal(registry().length, 3));

writeWork([
  {
    id: 'R-0001',
    rev: 2,
    type: 'task',
    status: 'in-progress',
    title: 'Migrate the backlog',
    plan: '§10',
  },
  { id: 'R-0003', type: 'task', status: 'open', title: 'Child', split_from: 'R-0001' },
]);
r = run('checkin.js');
check('an unchanged parent that would be dropped is rejected', () => {
  assert.equal(r.status, 1);
  assert.match(r.stderr, /would be dropped/);
  assert.match(r.stderr, /timeline goes silent/);
});
check('...and nothing was written', () => assert.equal(registry().length, 3));

writeWork([
  {
    id: 'R-0001',
    rev: 2,
    type: 'task',
    status: 'in-progress',
    title: 'Migrate the backlog',
    plan: '§10',
    note: 'split R-0003 and R-0004 out of this',
  },
  { id: 'R-0003', type: 'task', status: 'done', title: 'Child A', split_from: 'R-0001' },
  { id: 'R-0004', type: 'task', status: 'open', title: 'Child B', split_from: 'R-0001' },
]);
r = run('checkin.js');
check('a note on the parent makes the split valid', () => {
  assert.equal(r.status, 0, r.stderr);
  const rows = registry();
  assert.equal(rows.length, 6);
  assert.equal(
    rows.find((x) => x.id === 'R-0001' && x.rev === 3).note,
    'split R-0003 and R-0004 out of this'
  );
});

console.log('\n-- self-reference and bad data --');
run('checkout.js', '--new', '--force');
writeWork([{ id: 'R-0005', type: 'task', status: 'open', title: 'Loop', split_from: 'R-0005' }]);
r = run('checkin.js');
check('a record cannot reference itself', () => {
  assert.equal(r.status, 1);
  assert.match(r.stderr, /points at itself/);
});

writeWork([{ id: 'R-0005', type: 'chore', status: 'open', title: 'Bad type' }]);
r = run('checkin.js');
check('a bad enum aborts the run', () => {
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Dry run failed — nothing was written/);
  assert.equal(registry().length, 6);
});

writeWork([
  { id: 'R-0005', type: 'task', status: 'open', title: 'Good' },
  { id: 'R-0006', type: 'task', status: 'open', title: 'Bad', ts: 'yesterday' },
]);
r = run('checkin.js');
check('one bad record aborts the whole batch', () => {
  assert.equal(r.status, 1);
  assert.equal(registry().length, 6, 'the good record must not have been written');
});

console.log('\n-- git-conflict recovery (design section 4.3) --');
// Two branches both appended a rev 3 of R-0001. Resolve by taking the incoming file
// wholesale, then re-run checkin: work.json still holds the intent and rev is recomputed.
const mine = fs.readFileSync(REG, 'utf8');
run('checkout.js', '--id', 'R-0001', '--force');
w = work().records;
w[0].status = 'done';
w[0].note = 'my branch closed it';
writeWork(w);
r = run('checkin.js');
const myRev = registry()
  .filter((x) => x.id === 'R-0001')
  .pop().rev;
check('my branch appended the next rev', () => assert.equal(r.status, 0, r.stderr));
// Their branch, meanwhile, appended a rev claiming the same number.
const theirs =
  mine +
  JSON.stringify({
    id: 'R-0001',
    rev: myRev,
    ts: '2026-08-09',
    type: 'task',
    status: 'abandoned',
    outcome: null,
    title: 'Migrate the backlog',
    plan: '§10',
    detail_ref: null,
    note: 'their branch abandoned it',
    supersedes: null,
    split_from: null,
    files: null,
    source_ref: null,
  }) +
  '\n';
check('taking both sides would collide on (id, rev)', () => {
  fs.writeFileSync(
    REG,
    mine + theirs.slice(mine.length) + fs.readFileSync(REG, 'utf8').slice(mine.length)
  );
  const c = run('build.js');
  assert.equal(c.status, 1);
  assert.match(c.stderr, /schema/i);
});
check('taking theirs wholesale and re-running checkin recovers my intent', () => {
  fs.writeFileSync(REG, theirs); // take the incoming file wholesale
  const c = run('checkin.js'); // work.json still holds the intent
  assert.equal(c.status, 0, c.stderr);
  const revs = registry().filter((x) => x.id === 'R-0001');
  const latest = revs[revs.length - 1];
  assert.equal(latest.rev, myRev + 1, 'rev must be recomputed above theirs');
  assert.equal(latest.status, 'done');
  assert.equal(latest.note, 'my branch closed it');
  assert.equal(new Set(revs.map((x) => x.rev)).size, revs.length, 'no duplicate revs');
});

console.log('\n-- deferred round-trips, and build cannot silently drop an unknown value --');
run('checkout.js', '--new', '--force');
writeWork([
  {
    id: 'R-0007',
    type: 'task',
    status: 'deferred',
    title: 'Parked work',
    note: 'blocked on the Kakao review',
  },
]);
r = run('checkin.js');
check('a deferred record with a note checks in', () => assert.equal(r.status, 0, r.stderr));
check('checkin refuses a deferred record with no note', () => {
  writeWork([{ id: 'R-0008', type: 'task', status: 'deferred', title: 'No reason given' }]);
  const c = run('checkin.js');
  assert.equal(c.status, 1);
  assert.match(c.stderr, /deferred_needs_note/);
});
check('registry.md shows the parked item AND its reason', () => {
  fs.rmSync(WORK, { force: true });
  run('build.js');
  const out = fs.readFileSync(MD, 'utf8');
  assert(out.includes('## Deferred'), 'no Deferred section');
  assert(out.includes('blocked on the Kakao review'), 'the reason is not rendered');
  const summary = out.slice(out.indexOf('## Summary'), out.indexOf('## Open work'));
  assert(summary.includes('deferred'), 'the summary has no deferred column');
});
check('build throws rather than drop a status it does not know', () => {
  const build = require(path.join(SCRIPTS, 'build.js'));
  const wtlib = require(path.join(SCRIPTS, 'lib.js'));
  const db = wtlib.createDatabase();
  let threw = null;
  try {
    build.render(db, [
      {
        id: 'R-0001',
        rev: 1,
        ts: '2026-08-09',
        type: 'task',
        status: 'invented',
        outcome: null,
        title: 'x',
        plan: null,
        detail_ref: null,
        note: null,
        supersedes: null,
        split_from: null,
        files: null,
        source_ref: null,
      },
    ]);
  } catch (e) {
    threw = e;
  }
  db.close();
  assert(threw, 'expected a throw');
  assert.match(threw.message, /does not know about/);
});

console.log('\n-- build --');
fs.rmSync(WORK, { force: true });
r = run('build.js');
check('build succeeds', () => assert.equal(r.status, 0, r.stderr));
const md = fs.readFileSync(MD, 'utf8');
check('registry.md shows one row per id, not one per revision', () => {
  // R-0001 has four revisions in the log by now; the All-records table must show it once.
  const all = md.slice(md.indexOf('## All records'));
  assert.equal((all.match(/\| R-0001 \|/g) || []).length, 1);
  const logged = registry().filter((x) => x.id === 'R-0001').length;
  assert(logged >= 3, `expected several revisions in the log, saw ${logged}`);
});
check('registry.md shows the current status, not an earlier one', () => {
  const row = md
    .slice(md.indexOf('## All records'))
    .split('\n')
    .find((l) => l.startsWith('| R-0001 |'));
  assert(row.includes('done'), row);
  assert(!row.includes('in-progress'), row);
});
check('the roll-up reads 1/2 children done', () => assert.match(md, /\(1\/2 children done\)/));
check('the rejected decision is visible', () => {
  assert(md.includes('Rename the Firestore database'));
  assert(md.includes('rejected'));
});
check('build is deterministic', () => {
  const first = fs.readFileSync(MD, 'utf8');
  run('build.js');
  assert.equal(fs.readFileSync(MD, 'utf8'), first);
});
check('--check passes on a fresh build', () =>
  assert.equal(run('build.js', '--check').status, 0, 'should pass')
);

/**
 * `registry.db` is the browsable view added 2026-08-09. Two properties matter and neither is
 * obvious from reading `build.js`: a build produces it, and **`--check` does not**. The second
 * is the important one — `--check` is the CI gate, and a gate that writes a file is no longer
 * only checking. `VACUUM INTO` also refuses to overwrite, so a rebuild has to clear it first;
 * that is what the second build here would catch.
 */
const DB = path.join(store, 'registry.db');
check('build writes a queryable registry.db', () => {
  fs.rmSync(DB, { force: true });
  assert.equal(run('build.js').status, 0);
  assert(fs.existsSync(DB), 'registry.db should exist after a build');
  const d = new DatabaseSync(DB, { readOnly: true });
  const n = d.prepare('SELECT count(*) AS n FROM current_records').get().n;
  d.close();
  assert(n > 0, 'registry.db should hold the current records');
});
check('rebuilding over an existing registry.db succeeds', () =>
  assert.equal(run('build.js').status, 0, 'VACUUM INTO must not trip over the old file')
);
check('--check writes no registry.db', () => {
  fs.rmSync(DB, { force: true });
  assert.equal(run('build.js', '--check').status, 0);
  assert(!fs.existsSync(DB), 'the CI gate must not write anything');
  run('build.js');
});

console.log('\n-- db.js --');
/**
 * `db.js` regenerates the database **without** touching `registry.md`. That separation is the
 * whole reason it exists — refreshing the browsable view after a pull should not leave a
 * generated markdown file dirty in `git status` — so it is what these pin.
 */
check('db.js regenerates the database', () => {
  fs.rmSync(DB, { force: true });
  const c = run('db.js');
  assert.equal(c.status, 0, c.stderr);
  assert(fs.existsSync(DB));
  const d = new DatabaseSync(DB, { readOnly: true });
  const n = d.prepare('SELECT count(*) AS n FROM current_records').get().n;
  d.close();
  assert(n > 0, 'the current_records view should be populated');
});
check('db.js leaves registry.md untouched', () => {
  const before = fs.readFileSync(MD, 'utf8');
  assert.equal(run('db.js').status, 0);
  assert.equal(fs.readFileSync(MD, 'utf8'), before, 'db.js must not rewrite the markdown view');
});
check('db.js --out writes elsewhere and leaves registry.db alone', () => {
  const elsewhere = path.join(store, 'scratch.db');
  const stamp = fs.statSync(DB).mtimeMs;
  assert.equal(run('db.js', '--out', elsewhere, '--quiet').status, 0);
  assert(fs.existsSync(elsewhere));
  assert.equal(fs.statSync(DB).mtimeMs, stamp, 'the real database must not have been rewritten');
});
check('db.js rejects an unknown flag rather than ignoring it', () => {
  const c = run('db.js', '--nope');
  assert.equal(c.status, 1);
  assert.match(c.stderr, /Unknown argument/);
});
check('--check fails when registry.md drifts', () => {
  fs.appendFileSync(MD, 'stray edit\n');
  const c = run('build.js', '--check');
  assert.equal(c.status, 1);
  assert.match(c.stderr, /does not match the store/);
  run('build.js');
});
check('--check fails when a record is added without rebuilding', () => {
  fs.appendFileSync(
    REG,
    JSON.stringify({
      id: 'R-0009',
      rev: 1,
      ts: '2026-08-09',
      type: 'question',
      status: 'open',
      outcome: null,
      title: 'Owner question',
      plan: null,
      detail_ref: null,
      note: null,
      supersedes: null,
      split_from: null,
      files: null,
      source_ref: null,
    }) + '\n'
  );
  assert.equal(run('build.js', '--check').status, 1);
  run('build.js');
  assert.equal(run('build.js', '--check').status, 0);
});
check('a title containing a pipe does not break the table', () => {
  fs.appendFileSync(
    REG,
    JSON.stringify({
      id: 'R-0010',
      rev: 1,
      ts: '2026-08-09',
      type: 'task',
      status: 'open',
      outcome: null,
      title: 'a | b',
      plan: null,
      detail_ref: null,
      note: null,
      supersedes: null,
      split_from: null,
      files: null,
      source_ref: null,
    }) + '\n'
  );
  run('build.js');
  const out = fs.readFileSync(MD, 'utf8');
  assert(out.includes('a \\| b'));
  const row = out.split('\n').find((l) => l.startsWith('| R-0010 |'));
  assert.equal(row.split(/(?<!\\)\|/).length - 2, 7, 'row must have exactly 7 cells');
});
check('--check catches a corrupt store rather than passing it', () => {
  fs.appendFileSync(REG, 'not json\n');
  const c = run('build.js', '--check');
  assert.equal(c.status, 1);
  assert.match(c.stderr, /Malformed JSON/);
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

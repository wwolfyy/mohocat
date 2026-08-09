'use strict';

/**
 * work_tracking/tests/size.test.js — proves the size gate has teeth.
 *
 * `R-0424` exists because the archive mechanism was never missing; it stopped being applied. A
 * gate that is never exercised is in exactly that position, so these run `size-check.js` as a
 * child process against scratch policies and assert on the **exit code** — the only thing CI
 * reads. A check that always returns 0 would pass every other test in this repo.
 *
 * Run with `node work_tracking/tests/run.js`.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const sizeCheck = require('../scripts/size-check');

/** ⚠️ Must not leak into the child processes below, or they would read a scratch policy. */
delete process.env.WORK_TRACKING_SIZE_POLICY;

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

const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'size-check.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'work-tracking-size-'));

/**
 * Runs the real script against a scratch policy. ⚠️ Deliberately does NOT write to the committed
 * `size-policy.json` — an interrupted run would leave the repo's own gate mangled.
 */
function runWithPolicy(documents) {
  const policyPath = path.join(tmp, `policy-${policyCounter++}.json`);
  fs.writeFileSync(policyPath, JSON.stringify({ documents }, null, 2));
  return spawnSync(process.execPath, [SCRIPT], {
    encoding: 'utf8',
    env: { ...process.env, WORK_TRACKING_SIZE_POLICY: policyPath },
  });
}
let policyCounter = 0;

console.log('\n-- measuring --');

check('lines and the longest line are counted, ignoring a trailing newline', () => {
  const file = path.join(tmp, 'measure.md');
  fs.writeFileSync(file, 'one\ntwelve chars\nxx\n');
  assert.deepEqual(sizeCheck.measure(file), { lines: 3, columns: 12 });
});

check('a file with no trailing newline counts the same', () => {
  const file = path.join(tmp, 'no-newline.md');
  fs.writeFileSync(file, 'one\ntwelve chars\nxx');
  assert.deepEqual(sizeCheck.measure(file), { lines: 3, columns: 12 });
});

check('an empty file is zero lines, not one', () => {
  const file = path.join(tmp, 'empty.md');
  fs.writeFileSync(file, '');
  assert.deepEqual(sizeCheck.measure(file), { lines: 0, columns: 0 });
});

console.log('\n-- the gate fails, which is the whole point --');

check('the committed policy passes against the real documents', () => {
  const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.equal(result.status, 0, `expected 0, got ${result.status}\n${result.stderr}`);
});

check('a document over its LINE budget exits 1', () => {
  const result = runWithPolicy([
    { path: 'work_tracking/HANDOFF.md', lines: 5, columns: 9999, remedy: 'archive it' },
  ]);
  assert.equal(result.status, 1, `expected 1, got ${result.status}`);
  assert.match(result.stderr, /budget 5/);
});

check('a document over its COLUMN budget exits 1 — the failure a line count misses', () => {
  const result = runWithPolicy([
    {
      path: 'work_tracking/PROJECT_PLAN.md',
      lines: 999999,
      columns: 40,
      remedy: 'break the cell up',
    },
  ]);
  assert.equal(result.status, 1, `expected 1, got ${result.status}`);
  assert.match(result.stderr, /longest line/);
});

check('the remedy is printed, so the failure says what to do', () => {
  const result = runWithPolicy([
    {
      path: 'log/DEBUG_LOG.md',
      lines: 1,
      columns: 9999,
      remedy: 'a bug fix is a record, not an entry here',
    },
  ]);
  assert.match(result.stderr, /a bug fix is a record, not an entry here/);
});

check('a governed document that has vanished is a breach, not a silent skip', () => {
  const result = runWithPolicy([
    { path: 'work_tracking/MOVED-AWAY.md', lines: 10, columns: 10, remedy: 'update the policy' },
  ]);
  assert.equal(result.status, 1, `expected 1, got ${result.status}`);
  assert.match(result.stderr, /does not exist/);
});

console.log('\n-- the policy cannot quietly check nothing --');

check('an empty documents array is refused rather than passed', () => {
  const result = runWithPolicy([]);
  assert.notEqual(result.status, 0, 'an empty policy must not report success');
});

check('an entry missing its remedy is refused', () => {
  const result = runWithPolicy([{ path: 'log/DEBUG_LOG.md', lines: 999, columns: 999 }]);
  assert.notEqual(result.status, 0, 'a policy entry with no remedy must not pass');
  assert.match(result.stderr, /remedy/);
});

check('an unknown flag is refused rather than ignored', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--nope'], { encoding: 'utf8' });
  assert.equal(result.status, 2, `expected 2, got ${result.status}`);
});

check('--report prints every document and still exits 0', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--report'], { encoding: 'utf8' });
  assert.equal(result.status, 0, `expected 0, got ${result.status}`);
  assert.match(result.stdout, /HANDOFF\.md/);
  assert.match(result.stdout, /lines of room/);
});

fs.rmSync(tmp, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

'use strict';

/**
 * work_tracking/tests/link.test.js — proves the link gate has teeth, and that it does not fire on
 * the one thing that made an earlier version of it useless.
 *
 * `R-0437` found the false-positive mode by running the throwaway version: markdown link *syntax*
 * quoted inside prose is indistinguishable from a link, so `R-0428`'s explanation of a churn
 * problem — which writes `](sibling.md)` as an example — was reported broken. A gate that cries
 * wolf about its own documentation is a gate people switch off, so the code-span cases below are
 * the load-bearing ones.
 *
 * Run with `node work_tracking/tests/run.js`.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const linkCheck = require('../scripts/link-check');

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

const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'link-check.js');
const REPO_ROOT = path.resolve(__dirname, '..', '..');
/**
 * ⚠️ Scratch files live **inside** the repo, not in os.tmpdir(). A relative link is resolved
 * against its own directory, so a fixture parked outside the tree would sit at an arbitrary depth
 * and `../../work_tracking/SCHEMA.md` would mean something different in every run. They stay
 * invisible to the gate itself, which scans `git ls-files` and therefore never sees them.
 */
const tmp = fs.mkdtempSync(path.join(REPO_ROOT, '.link-test-'));

/** Writes a scratch markdown file inside the repo so relative resolution behaves realistically. */
let scratchCounter = 0;
function scratch(body) {
  const dir = path.join(tmp, `case-${scratchCounter++}`);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'doc.md');
  fs.writeFileSync(file, body);
  return path.relative(REPO_ROOT, file);
}

console.log('\n-- what counts as a link --');

check('an absolute URL is out of scope', () => {
  assert.equal(linkCheck.isRelative('https://example.com/x.md'), false);
});

check('mailto: and tel: are out of scope', () => {
  assert.equal(linkCheck.isRelative('mailto:someone@example.com'), false);
  assert.equal(linkCheck.isRelative('tel:+82-10-0000-0000'), false);
});

check('a same-page anchor is out of scope', () => {
  assert.equal(linkCheck.isRelative('#a-heading'), false);
});

check('a protocol-relative URL is out of scope', () => {
  assert.equal(linkCheck.isRelative('//cdn.example.com/x.png'), false);
});

check('a plain relative path is in scope', () => {
  assert.equal(linkCheck.isRelative('../sibling.md'), true);
});

console.log('\n-- code is not a link (the R-0437 false positive) --');

check('a fenced block is blanked out', () => {
  const src = ['before', '```', '[x](./nope.md)', '```', 'after'].join('\n');
  assert.ok(!linkCheck.blankOutCode(src).includes('nope.md'));
});

check('an inline code span is blanked out', () => {
  assert.ok(!linkCheck.blankOutCode('write `](sibling.md)` as an example').includes('sibling.md'));
});

check('blanking preserves line numbers, so a later report still points at the right line', () => {
  const src = ['a', '```', 'x', '```', '[y](./nope.md)'].join('\n');
  assert.equal(linkCheck.blankOutCode(src).split('\n').length, src.split('\n').length);
});

check('a link inside a fence is not reported', () => {
  const file = scratch(['# t', '', '```md', '[gone](./does-not-exist.md)', '```', ''].join('\n'));
  assert.deepEqual(linkCheck.brokenLinksIn(file), []);
});

check('a link inside an inline span is not reported', () => {
  const file = scratch('# t\n\nthe churn shows up as `](./does-not-exist.md)` in the diff.\n');
  assert.deepEqual(linkCheck.brokenLinksIn(file), []);
});

console.log('\n-- broken links are found --');

check('a relative link to nothing is reported, with its line', () => {
  const file = scratch('# t\n\nsee [the plan](./does-not-exist.md) for detail.\n');
  const broken = linkCheck.brokenLinksIn(file);
  assert.equal(broken.length, 1);
  assert.equal(broken[0].target, './does-not-exist.md');
  assert.equal(broken[0].line, 3);
});

check('a link that resolves is not reported', () => {
  const file = scratch('# t\n\nsee [the schema](../../work_tracking/SCHEMA.md).\n');
  assert.deepEqual(linkCheck.brokenLinksIn(file), []);
});

check('an anchor is checked as far as the file, not the heading', () => {
  const file = scratch('# t\n\n[s](../../work_tracking/SCHEMA.md#no-such-heading)\n');
  assert.deepEqual(
    linkCheck.brokenLinksIn(file),
    [],
    'a fragment that names no heading must not fail the gate — only a missing file does'
  );
});

check('a broken target WITH an anchor is still reported', () => {
  const file = scratch('# t\n\n[s](./does-not-exist.md#somewhere)\n');
  assert.equal(linkCheck.brokenLinksIn(file).length, 1);
});

check('a link with a title attribute is parsed', () => {
  const file = scratch('# t\n\n[s](./does-not-exist.md "a title")\n');
  assert.equal(linkCheck.brokenLinksIn(file).length, 1);
});

console.log('\n-- the gate FAILS, which is the whole point --');

/**
 * Builds a throwaway git repo and runs the real script against it. ⚠️ It has to be a git repo:
 * the gate enumerates files with `git ls-files`, so an untracked scratch file inside this repo
 * would be skipped and the failure path would silently never run.
 */
function runAgainstScratchRepo(files) {
  const root = fs.mkdtempSync(path.join(tmp, 'repo-'));
  for (const [name, body] of Object.entries(files)) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
  }
  const git = (...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  git('init', '-q');
  git('add', '-A');
  return spawnSync(process.execPath, [SCRIPT], {
    encoding: 'utf8',
    env: { ...process.env, WORK_TRACKING_LINK_ROOT: root },
  });
}

check('a broken link exits 1 and names the file, line and target', () => {
  const result = runAgainstScratchRepo({
    'doc.md': '# t\n\nsee [the plan](./missing.md).\n',
  });
  assert.equal(result.status, 1, `expected 1, got ${result.status}\n${result.stdout}`);
  assert.match(result.stderr, /doc\.md:3/);
  assert.match(result.stderr, /\.\/missing\.md/);
});

check('a tree whose links all resolve exits 0', () => {
  const result = runAgainstScratchRepo({
    'doc.md': '# t\n\nsee [the other](./other.md).\n',
    'other.md': '# other\n',
  });
  assert.equal(result.status, 0, `expected 0, got ${result.status}\n${result.stderr}`);
});

check('a link broken only inside a code fence does NOT fail the gate', () => {
  const result = runAgainstScratchRepo({
    'doc.md': '# t\n\n```md\n[gone](./missing.md)\n```\n',
  });
  assert.equal(result.status, 0, `expected 0, got ${result.status}\n${result.stderr}`);
});

check('an unknown flag is refused rather than ignored', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--nope'], { encoding: 'utf8' });
  assert.equal(result.status, 2, `expected 2, got ${result.status}`);
});

console.log('\n-- the gate runs green on the repo as it stands --');

check('the committed tree has no broken links outside the exempt trees', () => {
  const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8', cwd: REPO_ROOT });
  assert.equal(result.status, 0, `expected 0, got ${result.status}\n${result.stderr}`);
});

check('--report names every exempt tree and its count, and still exits 0 when clean', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--report'], {
    encoding: 'utf8',
    cwd: REPO_ROOT,
  });
  assert.equal(result.status, 0, `expected 0, got ${result.status}`);
  assert.match(result.stdout, /docs\/handoff\/archive\//);
  assert.match(result.stdout, /work_tracking\/records\//);
  assert.match(result.stdout, /exempt/);
});

fs.rmSync(tmp, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

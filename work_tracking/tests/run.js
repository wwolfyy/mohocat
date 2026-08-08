#!/usr/bin/env node
'use strict';

/**
 * work_tracking/tests/run.js — runs every test file here, in a child process each, and
 * exits non-zero if any of them failed.
 *
 * ⚠️ Needs Node 22 or newer for `node:sqlite`. The app's own CI runs Node 20, so the
 * work-tracking CI job pins a newer runtime of its own.
 *
 * Usage: node work_tracking/tests/run.js
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const [major] = process.versions.node.split('.').map(Number);
if (major < 22) {
  process.stderr.write(
    `[work_tracking/tests] ERROR Node ${process.versions.node} has no node:sqlite. ` +
      `These tools need Node 22 or newer.\n`
  );
  process.exit(1);
}

const files = fs
  .readdirSync(__dirname)
  .filter((file) => file.endsWith('.test.js'))
  .sort();

let failed = 0;
for (const file of files) {
  process.stdout.write(`\n=== ${file} ===\n`);
  const result = spawnSync(process.execPath, [path.join(__dirname, file)], { stdio: 'inherit' });
  if (result.status !== 0) failed += 1;
}

process.stdout.write(
  failed === 0
    ? `\nAll ${files.length} test file(s) passed.\n`
    : `\n${failed} of ${files.length} test file(s) FAILED.\n`
);
process.exit(failed === 0 ? 0 : 1);

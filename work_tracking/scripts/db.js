#!/usr/bin/env node
'use strict';

/**
 * work_tracking/scripts/db.js — regenerate `registry.db`, the browsable SQLite view.
 *
 * `build.js` already writes this file as a side effect of regenerating `registry.md`. This
 * script exists so you can refresh **only** the database — after a `git pull`, or when you just
 * want to look something up — without rewriting a generated markdown file you did not mean to
 * touch and would then see in `git status`.
 *
 * 🔑 **The file is a view, not a store** (owner, 2026-08-09, amending restructure §4; recorded
 * as `R-0404`). `registry.ndjson` is the only source of truth. This script reads it, builds the
 * same in-memory index every other script builds, and dumps that to disk. ⚠️ **Nothing may read
 * the `.db` back into the tooling** — the moment something does, the store has two sources of
 * truth and the append-only design stops meaning anything. Deleting `registry.db` at any time is
 * safe; it is gitignored and one command away.
 *
 * Because it rebuilds from scratch, it is also a **validation** of the whole store: the schema
 * re-validates every row on load, so a run that succeeds is a store that loads clean.
 *
 * Usage:
 *   db.js                    regenerate work_tracking/registry.db
 *   db.js --out /tmp/x.db    write somewhere else (leaves the real one alone)
 *   db.js --quiet            print nothing on success (exit status still tells you)
 *
 * 📌 `WORK_TRACKING_STORE=/path` relocates the whole store, this output included.
 */

const path = require('node:path');
const lib = require('./lib');

const logger = lib.createLogger('work_tracking/db');

function parseArgs(argv) {
  const args = { out: lib.REGISTRY_DB_PATH, quiet: false };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--out') {
      if (!argv[i + 1]) throw new Error('--out needs a path');
      args.out = path.resolve(argv[i + 1]);
      i += 1;
    } else if (flag === '--quiet' || flag === '-q') {
      args.quiet = true;
    } else if (flag === '--help' || flag === '-h') {
      process.stdout.write('Usage: db.js [--out <path>] [--quiet]\n');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument '${flag}'. Usage: db.js [--out <path>] [--quiet]`);
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  // allowMissing: an empty store is a legitimate thing to browse — it is what the registry
  // looked like on its first day, and failing here would be less useful than an empty file.
  const { db } = lib.openStore({ allowMissing: true });
  let count;
  try {
    count = lib.currentRecords(db).length;
    lib.writeDatabase(db, args.out);
  } finally {
    db.close();
  }

  if (!args.quiet) {
    logger.info(`Wrote ${args.out} — ${count} record(s). Query the 'current_records' view.`);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }
}

module.exports = { parseArgs };

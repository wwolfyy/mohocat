#!/usr/bin/env node
'use strict';

/**
 * work_tracking/scripts/checkin.js — step 3 of the workflow (SCHEMA.md §3).
 *
 * Reads `work.json`, works out which records actually changed, dry-run inserts the result
 * into a fresh schema'd database, rolls that transaction back, and only then appends the
 * changed records to `registry.ndjson` at `rev + 1`.
 *
 * ⚠️ It is all or nothing. Any constraint failure, anywhere in the batch, aborts the whole
 * run and writes nothing.
 *
 * Two rules live here rather than in `schema.sql`, because SQL cannot express them
 * (SCHEMA.md §7):
 *   1. A `split_from` or `supersedes` must point at a record present in `work.json`.
 *   2. A record referenced that way must itself be written — which, if nothing else about
 *      it changed, means it needs a `note`.
 *
 * `rev` is computed here, not taken from `work.json`. That is what makes the git-conflict
 * recovery in the design work: take the incoming registry wholesale and re-run this script,
 * because `work.json` still holds the intent and the revision is recomputed from the new
 * state.
 *
 * Usage:
 *   checkin.js [--in <path>]     (default: work_tracking/work.json)
 */

const fs = require('node:fs');
const path = require('node:path');
const lib = require('./lib');

const logger = lib.createLogger('work_tracking/checkin');

const WORK_PATH = path.join(lib.WORK_TRACKING_DIR, 'work.json');

/** Fields that decide whether a record changed. `id` identifies it; `rev` and `ts` are stamps. */
const COMPARED_FIELDS = lib.FIELDS.filter((field) => !['id', 'rev', 'ts'].includes(field));

function parseArgs(argv) {
  const args = { in: WORK_PATH };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--in') {
      if (!argv[i + 1]) throw new Error('--in needs a path');
      args.in = path.resolve(argv[i + 1]);
      i += 1;
    } else if (flag === '--help' || flag === '-h') {
      process.stdout.write(
        'Usage: checkin.js [--in <path>]   (default: work_tracking/work.json)\n'
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument '${flag}'. Usage: checkin.js [--in <path>]`);
    }
  }
  return args;
}

/** Accepts the object `checkout.js` writes, or a bare array of records. */
function readWorkFile(workPath) {
  let text;
  try {
    text = fs.readFileSync(workPath, 'utf8');
  } catch (error) {
    logger.error(`Cannot read the checkout file at ${workPath} — run checkout.js first.`);
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    logger.error(`${workPath} is not valid JSON.`);
    throw new Error(`${workPath} is not valid JSON: ${error.message}`, { cause: error });
  }

  const records = Array.isArray(parsed) ? parsed : parsed.records;
  if (!Array.isArray(records)) {
    throw new Error(`${workPath} must hold a 'records' array (or be one).`);
  }
  return records;
}

/** Two records are the same work if every field but `id`, `rev` and `ts` matches. */
function isUnmodified(candidate, base) {
  return COMPARED_FIELDS.every(
    (field) => JSON.stringify(candidate[field] ?? null) === JSON.stringify(base[field] ?? null)
  );
}

/**
 * Decide what each record in the checkout becomes: a new record at `rev: 1`, the next
 * revision of an existing one, or nothing at all.
 */
function planWrites(workRecords, currentById) {
  const writes = [];
  const dropped = [];

  for (const record of workRecords) {
    if (!record || typeof record !== 'object' || typeof record.id !== 'string') {
      throw new Error(`Every record in the checkout needs an 'id'. Got: ${JSON.stringify(record)}`);
    }

    const base = currentById.get(record.id);
    if (base && isUnmodified(record, base)) {
      dropped.push(record);
      continue;
    }

    writes.push({
      ...record,
      rev: base ? base.rev + 1 : 1,
      ts: record.ts ?? new Date().toISOString().slice(0, 10),
      isNew: !base,
    });
  }

  return { writes, dropped };
}

/**
 * The referential rules SQL cannot enforce.
 *
 * Scoped to the checkout on purpose: referencing a record you did not check out is the signal
 * that **you should have checked it out first**. You cannot correctly reference a record whose
 * current state you never read, and both kinds of reference require writing the target's next
 * revision anyway.
 *
 * 📌 If a purely informational `related` link is ever added to the schema, it needs an
 * exemption — pointing at a closed record for context should not force a checkout.
 */
function checkReferences(writes, dropped, checkoutIds) {
  const willBeWritten = new Set(writes.map((record) => record.id));
  const droppedIds = new Set(dropped.map((record) => record.id));
  const problems = [];

  for (const record of writes) {
    const targets = [];
    if (record.split_from) targets.push(['split_from', record.split_from]);
    for (const target of record.supersedes ?? []) targets.push(['supersedes', target]);

    for (const [field, target] of targets) {
      if (target === record.id) {
        problems.push(`${record.id}: '${field}' points at itself.`);
        continue;
      }
      if (!checkoutIds.has(target)) {
        problems.push(
          `${record.id}: '${field}' points at ${target}, which is not in the checkout. ` +
            `Check it out too (checkout.js --id ${target}) — a reference always writes the ` +
            `target's next revision, so its current state has to be read first.`
        );
        continue;
      }
      if (droppedIds.has(target) && !willBeWritten.has(target)) {
        problems.push(
          `${record.id}: '${field}' points at ${target}, but ${target} is unchanged and would ` +
            `be dropped. A reference always appends a revision to its target. Give ${target} a ` +
            `'note' saying what happened — without one its timeline goes silent at exactly the ` +
            `moment it was decomposed.`
        );
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`Referential check failed:\n  - ${problems.join('\n  - ')}`);
  }
}

/**
 * Insert the whole store plus the pending writes, then roll back. The schema does the
 * validating; this proves the result would load before a single byte is appended.
 */
function dryRun(existingRecords, writes) {
  const db = lib.createDatabase();
  try {
    db.exec('BEGIN');
    lib.insertRecords(db, existingRecords);
    lib.insertRecords(db, writes);
    db.exec('ROLLBACK');
  } catch (error) {
    logger.error('Dry run failed — nothing was written.');
    throw error;
  } finally {
    db.close();
  }
}

function appendToRegistry(registryPath, writes) {
  const lines = writes.map((record) => lib.serializeRecord(record));
  const needsNewline =
    fs.existsSync(registryPath) &&
    fs.statSync(registryPath).size > 0 &&
    !fs.readFileSync(registryPath, 'utf8').endsWith('\n');

  fs.appendFileSync(registryPath, `${needsNewline ? '\n' : ''}${lines.join('\n')}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const workRecords = readWorkFile(args.in);
  const { db, records: existingRecords } = lib.openStore({ allowMissing: true });

  let writes;
  let dropped;
  try {
    const currentById = new Map(lib.currentRecords(db).map((record) => [record.id, record]));
    ({ writes, dropped } = planWrites(workRecords, currentById));
    checkReferences(writes, dropped, new Set(workRecords.map((record) => record.id)));
  } finally {
    db.close();
  }

  for (const record of dropped) {
    logger.info(`${record.id} unchanged — dropped.`);
  }

  if (writes.length === 0) {
    logger.info('Nothing changed. The registry was not touched, and the checkout was kept.');
    return;
  }

  // `isNew` is a planning flag, not a column — strip it before anything sees a record.
  const rows = writes.map(({ isNew, ...record }) => record);

  dryRun(existingRecords, rows);
  appendToRegistry(lib.REGISTRY_PATH, rows);

  for (const record of writes) {
    const what = record.isNew ? 'new' : `rev ${record.rev}`;
    logger.info(`${record.id} written (${what}) — ${record.title}`);
  }
  logger.info(`Appended ${rows.length} record(s) to ${lib.REGISTRY_PATH}.`);

  stampCheckedIn(args.in, workRecords);
  logger.info(`Stamped ${args.in} as checked in. Run build.js next.`);
}

/**
 * Mark the checkout as done without deleting it.
 *
 * ⚠️ The file has to survive, because it is the whole of the git-conflict recovery
 * procedure: when two branches both append a revision of the same record, you resolve the
 * conflict by taking the incoming `registry.ndjson` wholesale and re-running this script —
 * which only works while `work.json` still holds the intent, since `rev` is recomputed from
 * the new state. Deleting it here would leave a conflicted merge with nothing to replay.
 *
 * The stamp is what lets `checkout.js` tell a finished checkout (safe to replace) from an
 * unfinished one (replacing it loses work), so nobody has to reach for `--force` routinely.
 */
function stampCheckedIn(workPath, workRecords) {
  const existing = JSON.parse(fs.readFileSync(workPath, 'utf8'));
  const stamped = Array.isArray(existing) ? { records: workRecords } : { ...existing };
  stamped.checked_in = new Date().toISOString().slice(0, 10);
  stamped.records = workRecords;
  fs.writeFileSync(workPath, `${JSON.stringify(stamped, null, 2)}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  readWorkFile,
  isUnmodified,
  planWrites,
  checkReferences,
  dryRun,
  stampCheckedIn,
};

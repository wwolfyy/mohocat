#!/usr/bin/env node
'use strict';

/**
 * work_tracking/scripts/checkout.js — step 1 of the workflow (WORKFLOW.md §1).
 *
 * Builds the in-memory index from `registry.ndjson`, runs your query against it, and writes
 * the **current** revision of each matching record to `work.json`. You then edit that file
 * and run `checkin.js`.
 *
 * Usage:
 *   checkout.js --id R-0142 [--id R-0031 …]
 *   checkout.js --query "status = 'open' AND plan = '§10'"
 *   checkout.js --new                      empty checkout, for adding records only
 *   checkout.js --id R-0142 --force        overwrite an existing work.json
 *
 * ⚠️ Check out everything you intend to reference. `checkin.js` rejects a `split_from` or
 * `supersedes` pointing at a record that is not in `work.json`, because you cannot correctly
 * reference a record whose current state you never read.
 */

const fs = require('node:fs');
const path = require('node:path');
const lib = require('./lib');

const logger = lib.createLogger('work_tracking/checkout');

const WORK_PATH = path.join(lib.WORK_TRACKING_DIR, 'work.json');

const USAGE = `
Usage:
  checkout.js --id R-0142 [--id R-0031 …]      check out records by id
  checkout.js --query "status = 'open'"        check out records by SQL predicate
  checkout.js --new                            empty checkout, for adding records only

Options:
  --out <path>   where to write the checkout   (default: work_tracking/work.json)
  --force        overwrite an existing work.json
`.trim();

function parseArgs(argv) {
  const args = { ids: [], query: null, isNew: false, out: WORK_PATH, force: false };

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    switch (flag) {
      case '--id':
        if (!value) throw new Error('--id needs a record id, e.g. --id R-0142');
        args.ids.push(value);
        i += 1;
        break;
      case '--query':
        if (!value)
          throw new Error('--query needs a SQL predicate, e.g. --query "status = \'open\'"');
        args.query = value;
        i += 1;
        break;
      case '--out':
        if (!value) throw new Error('--out needs a path');
        args.out = path.resolve(value);
        i += 1;
        break;
      case '--new':
        args.isNew = true;
        break;
      case '--force':
        args.force = true;
        break;
      case '--help':
      case '-h':
        process.stdout.write(`${USAGE}\n`);
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument '${flag}'.\n\n${USAGE}`);
    }
  }

  const selectors = [args.ids.length > 0, args.query !== null, args.isNew].filter(Boolean).length;
  if (selectors === 0)
    throw new Error(`Nothing selected — pass --id, --query or --new.\n\n${USAGE}`);
  if (selectors > 1) throw new Error(`Pass only one of --id, --query or --new.\n\n${USAGE}`);

  return args;
}

/** The current revision of each requested id. Missing ids are an error, not an empty result. */
function selectByIds(db, ids) {
  const found = [];
  const missing = [];

  for (const id of ids) {
    const row = db.prepare('SELECT * FROM current_records WHERE id = ?').get(id);
    if (row) found.push(lib.fromRow(row));
    else missing.push(id);
  }

  if (missing.length > 0) {
    throw new Error(`No such record(s) in the store: ${missing.join(', ')}`);
  }
  return found;
}

/**
 * The current revision of every record matching a SQL predicate.
 *
 * The predicate is interpolated into the query. That is safe here and only here: the database
 * is in-memory, built fresh from a file the caller already has on disk, discarded on exit, and
 * driven by the person who typed the predicate. Nothing reaches this from outside the repo.
 */
function selectByQuery(db, predicate) {
  try {
    return db
      .prepare(`SELECT * FROM current_records WHERE ${predicate} ORDER BY id`)
      .all()
      .map(lib.fromRow);
  } catch (error) {
    logger.error(`The query is not valid SQL: ${predicate}`);
    throw new Error(`The query is not valid SQL: ${predicate} — ${error.message}`, {
      cause: error,
    });
  }
}

/**
 * The lowest unused id, offered so that adding a record does not mean guessing one.
 * It is a convenience, not a safety net: a new record always starts at `rev: 1`, so a
 * colliding id is caught by the primary key regardless.
 */
function nextFreeId(db) {
  const row = db.prepare('SELECT MAX(CAST(substr(id, 3) AS INTEGER)) AS n FROM records').get();
  return `R-${String((row.n ?? 0) + 1).padStart(4, '0')}`;
}

/**
 * Refuse to overwrite an unfinished checkout.
 *
 * `work.json` is gitignored, so an overwrite is unrecoverable. `checkin.js` stamps the file
 * with `checked_in` once its records are in the store, and a stamped file is safe to replace
 * — which is what keeps `--force` from becoming a habit. A file with no stamp holds edits
 * that were never recorded anywhere.
 */
function assertSafeToOverwrite(outPath, force) {
  if (!fs.existsSync(outPath) || force) return;

  let checkedIn = null;
  try {
    checkedIn = JSON.parse(fs.readFileSync(outPath, 'utf8')).checked_in ?? null;
  } catch (error) {
    logger.warn(`${outPath} exists but is not readable JSON — treating it as unfinished work.`);
  }

  if (checkedIn) {
    logger.info(`Replacing the checkout that was checked in on ${checkedIn}.`);
    return;
  }

  throw new Error(
    `${outPath} holds an unfinished checkout — it has no 'checked_in' stamp, and it is ` +
      `gitignored, so overwriting it loses that work for good. Run checkin.js first, or pass ` +
      `--force if you are sure you want to discard it.`
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  assertSafeToOverwrite(args.out, args.force);

  const { db } = lib.openStore({ allowMissing: true });
  try {
    let records = [];
    if (args.ids.length > 0) records = selectByIds(db, args.ids);
    else if (args.query) records = selectByQuery(db, args.query);

    const checkout = {
      checked_out: new Date().toISOString().slice(0, 10),
      selector: args.isNew ? '--new' : (args.query ?? args.ids.join(', ')),
      next_free_id: nextFreeId(db),
      records,
    };

    fs.writeFileSync(args.out, `${JSON.stringify(checkout, null, 2)}\n`);
    logger.info(
      `Checked out ${records.length} record(s) to ${args.out}. ` +
        `Next free id is ${checkout.next_free_id}.`
    );
  } finally {
    db.close();
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

module.exports = { parseArgs, selectByIds, selectByQuery, nextFreeId, assertSafeToOverwrite };

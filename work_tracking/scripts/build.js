#!/usr/bin/env node
'use strict';

/**
 * work_tracking/scripts/build.js — step 4 of the workflow (WORKFLOW.md §1).
 *
 * Regenerates `registry.md`: the current revision of every record, rendered for the people
 * who read pull requests. Nobody reads `registry.ndjson` by choice.
 *
 * ⚠️ The output must be a pure function of the store. No timestamps, no clock, no
 * environment — `--check` compares a fresh render against the committed file, so anything
 * that varies between runs would fail CI on every commit.
 *
 * Usage:
 *   build.js            regenerate registry.md AND registry.db (gitignored, for browsing)
 *   build.js --check    verify the committed registry.md matches the store (CI gate)
 */

const fs = require('node:fs');
const path = require('node:path');
const lib = require('./lib');

const logger = lib.createLogger('work_tracking/build');

const REGISTRY_MD_PATH = path.join(lib.WORK_TRACKING_DIR, 'registry.md');
/** Generated + gitignored. `lib.writeDatabase` owns how; `db.js` regenerates it on demand. */
const REGISTRY_DB_PATH = lib.REGISTRY_DB_PATH;

/**
 * Column order for the summary. These duplicate the enums in `schema.sql`, which is a drift
 * risk, so `assertKnownValues` below turns that drift into a loud failure rather than a
 * silent one: when `deferred` was added, this list still said four statuses and the summary
 * quietly dropped seven records while its per-type totals stayed right — the columns simply
 * stopped adding up. That is exactly the undercount this whole migration exists to prevent.
 */
const TYPES = ['task', 'bug', 'change', 'decision', 'question'];
const STATUSES = ['open', 'in-progress', 'deferred', 'done', 'abandoned'];

function parseArgs(argv) {
  const args = { check: false, out: REGISTRY_MD_PATH };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--check') {
      args.check = true;
    } else if (flag === '--out') {
      if (!argv[i + 1]) throw new Error('--out needs a path');
      args.out = path.resolve(argv[i + 1]);
      i += 1;
    } else if (flag === '--help' || flag === '-h') {
      process.stdout.write('Usage: build.js [--check] [--out <path>]\n');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument '${flag}'. Usage: build.js [--check] [--out <path>]`);
    }
  }
  return args;
}

/** Table cells are one line and never break the column. */
function cell(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value)
    .replace(/\|/g, '\\|')
    .replace(/\s*\n\s*/g, ' ');
}

/**
 * Most records point at their prose in `records/`; the §2b companion documents point out of
 * `work_tracking/` at the file where they already live, so a `./` prefix would produce
 * `./../docs/…`. Both forms are relative to this file either way.
 */
function detailCell(record) {
  if (!record.detail_ref) return '—';
  const href = record.detail_ref.startsWith('.') ? record.detail_ref : `./${record.detail_ref}`;
  return `[detail](${href})`;
}

function table(header, rows) {
  const lines = [`| ${header.join(' | ')} |`, `| ${header.map(() => '---').join(' | ')} |`];
  for (const row of rows) lines.push(`| ${row.join(' | ')} |`);
  return lines.join('\n');
}

/** Refuse to render a store holding a `type` or `status` this file does not know about. */
function assertKnownValues(records) {
  const unknown = [];
  for (const record of records) {
    if (!TYPES.includes(record.type)) unknown.push(`${record.id}: type '${record.type}'`);
    if (!STATUSES.includes(record.status)) unknown.push(`${record.id}: status '${record.status}'`);
  }
  if (unknown.length > 0) {
    throw new Error(
      `The store holds values build.js does not know about, and rendering would silently ` +
        `drop them from the summary:\n  - ${unknown.slice(0, 10).join('\n  - ')}\n` +
        `Add them to TYPES / STATUSES in build.js — they are already legal in schema.sql.`
    );
  }
}

function summarySection(records) {
  const rows = TYPES.map((type) => {
    const ofType = records.filter((record) => record.type === type);
    return [
      type,
      ...STATUSES.map((status) => String(ofType.filter((r) => r.status === status).length)),
      `**${ofType.length}**`,
    ];
  });
  rows.push([
    '**total**',
    ...STATUSES.map((status) => `**${records.filter((r) => r.status === status).length}**`),
    `**${records.length}**`,
  ]);
  return table(['type', ...STATUSES, 'total'], rows);
}

function recordRows(records) {
  return records.map((record) => [
    record.id,
    cell(record.type),
    cell(record.status),
    cell(record.outcome),
    cell(record.plan),
    cell(record.title),
    detailCell(record),
  ]);
}

const RECORD_HEADER = ['id', 'type', 'status', 'outcome', 'plan', 'title', 'detail'];

/**
 * Parents and the records broken out of them, with roll-up progress. Only parents that
 * actually have children appear — an exhaustive tree of one-line trees helps nobody.
 */
function hierarchySection(db, records) {
  const byId = new Map(records.map((record) => [record.id, record]));
  const rollups = db.prepare('SELECT * FROM children_progress ORDER BY parent_id').all();

  if (rollups.length === 0) return '_No records have been broken out into children._';

  const lines = [];
  for (const rollup of rollups) {
    const parent = byId.get(rollup.parent_id);
    lines.push(
      `- **${parent.id}** [${parent.status}] ${cell(parent.title)} ` +
        `— _(${rollup.children_done}/${rollup.children} children done)_`
    );
    const children = records
      .filter((record) => record.split_from === parent.id)
      .sort((a, b) => a.id.localeCompare(b.id));
    for (const child of children) {
      lines.push(`  - ${child.id} [${child.status}] ${cell(child.title)}`);
    }
  }
  return lines.join('\n');
}

/**
 * Parked work, with its reason. The reason is the whole point of `deferred` — a parked item
 * whose condition is invisible is indistinguishable from a forgotten one — so it gets its own
 * section rather than a cell in a table too wide to carry it.
 */
function deferredSection(records) {
  const deferred = records.filter((record) => record.status === 'deferred');
  if (deferred.length === 0) return '_Nothing is parked._';

  return deferred
    .map(
      (record) =>
        `- **${record.id}**${record.plan ? ` (${record.plan})` : ''} — ${cell(record.title)}\n` +
        `  - _${cell(record.note)}_`
    )
    .join('\n');
}

function render(db, records) {
  assertKnownValues(records);
  const open = records.filter(
    (record) => record.status === 'open' || record.status === 'in-progress'
  );

  return `${[
    '# Work registry',
    '',
    '> ⚠️ **Generated file — do not edit.** Regenerate with `node work_tracking/scripts/build.js`.',
    '>',
    '> The source of truth is [`registry.ndjson`](./registry.ndjson); this is the current',
    '> revision of every record, rendered for humans and pull-request review. To change',
    '> anything here, run `checkout.js`, edit `work.json`, then `checkin.js`. See',
    '> [SCHEMA.md](./SCHEMA.md).',
    '',
    '## Summary',
    '',
    summarySection(records),
    '',
    '## Open work',
    '',
    open.length > 0 ? table(RECORD_HEADER, recordRows(open)) : '_Nothing open._',
    '',
    '## Deferred — parked, with the condition that would restart it',
    '',
    deferredSection(records),
    '',
    '## Hierarchy',
    '',
    hierarchySection(db, records),
    '',
    '## All records',
    '',
    records.length > 0 ? table(RECORD_HEADER, recordRows(records)) : '_The store is empty._',
  ].join('\n')}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { db } = lib.openStore({ allowMissing: true });

  let markdown;
  try {
    markdown = render(db, lib.currentRecords(db));
    // Only on a real build: `--check` is the CI gate and must not write anything.
    if (!args.check) lib.writeDatabase(db, REGISTRY_DB_PATH);
  } finally {
    db.close();
  }

  if (!args.check) {
    fs.writeFileSync(args.out, markdown);
    logger.info(`Wrote ${args.out} and ${REGISTRY_DB_PATH}.`);
    return;
  }

  const committed = fs.existsSync(args.out) ? fs.readFileSync(args.out, 'utf8') : null;
  if (committed === markdown) {
    logger.info(`${args.out} matches the store.`);
    return;
  }
  throw new Error(
    `${args.out} does not match the store. Run 'node work_tracking/scripts/build.js' and ` +
      `commit the result.`
  );
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }
}

module.exports = { parseArgs, render, REGISTRY_MD_PATH, REGISTRY_DB_PATH };

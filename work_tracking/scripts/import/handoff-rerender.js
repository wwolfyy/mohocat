/**
 * One-off repair: re-render the 57 `records/R-XXXX.md` files the HANDOFF.md import wrote empty.
 *
 * `renderRecordFile()` read `entry.body`, but `locate()` returns the body on the **span**. The
 * result was not a crash — `Array.join()` renders `undefined` as an empty string — so all 57
 * files were written with a correct header, a `---` rule, and no prose at all, and the importer
 * reported success. See `R-0429`.
 *
 * The rows in `registry.ndjson` are unaffected: every field but the prose was correct, so this
 * rewrites files only and touches neither the store nor `registry.md`.
 *
 * ⚠️ It does NOT re-import. Records are matched to their source entry **by title**, which must
 * be unique on both sides — an ambiguous or missing match is a hard error, because guessing
 * which prose belongs to which record is the one mistake that would be invisible afterwards.
 *
 *   node work_tracking/scripts/import/handoff-rerender.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const lib = require('../lib');
const { locate, ITEMS } = require('./handoff');

const SOURCE = 'docs/handoff/HANDOFF.md';
const SOURCE_FILE = 'docs/handoff/archive/2026-08-09-handoff-living-doc.md';
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const RANGE = { first: 347, last: 403 };

const logger = lib.createLogger('work_tracking/import/handoff-rerender');

function renderRecordFile(record, span) {
  const classification = [record.type, record.status, record.outcome].filter(Boolean).join(' · ');
  return [
    `# ${record.id} — ${record.title}`,
    '',
    `> **${classification}** · ${record.ts}${record.plan ? ` · ${record.plan}` : ''}`,
    `> Migrated from \`${SOURCE}\` L${span.start + 1}–${span.end} (\`${record.source_ref}\`).`,
    '',
    '---',
    '',
    span.body,
    '',
  ].join('\n');
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const lines = fs.readFileSync(path.join(REPO_ROOT, SOURCE_FILE), 'utf8').split('\n');

  const byTitle = new Map();
  for (const entry of ITEMS) {
    if (byTitle.has(entry.title)) {
      throw new Error(
        `Two source entries share a title, so the match is ambiguous: ${entry.title}`
      );
    }
    byTitle.set(entry.title, entry);
  }

  const { db } = lib.openStore();
  const targets = lib.currentRecords(db).filter((record) => {
    const number = Number(record.id.slice(2));
    return number >= RANGE.first && number <= RANGE.last;
  });

  const expected = RANGE.last - RANGE.first + 1;
  if (targets.length !== expected) {
    throw new Error(`Expected ${expected} records in range, found ${targets.length}.`);
  }

  const writes = [];
  for (const record of targets) {
    const entry = byTitle.get(record.title);
    if (!entry) {
      throw new Error(`${record.id}: no source entry matches its title — nothing written.`);
    }
    if (record.source_ref !== `${SOURCE}#${entry.key}@${pinOf(record)}`) {
      throw new Error(
        `${record.id}: source_ref does not name the matched entry (${entry.key}) — nothing written.`
      );
    }

    const span = locate(lines, entry);
    if (!span.body.trim()) {
      throw new Error(`${record.id}: the located span is empty — nothing written.`);
    }

    const filePath = path.join(lib.WORK_TRACKING_DIR, 'records', `${record.id}.md`);
    writes.push([filePath, renderRecordFile(record, span), span]);
    logger.info(`${record.id}  L${span.start + 1}–${span.end}  ${span.body.length} chars`);
  }

  const total = writes.reduce((sum, [, , span]) => sum + span.body.length, 0);
  logger.info(`${writes.length} records, ${total} characters of prose recovered.`);

  if (dryRun) {
    logger.info('Dry run — nothing written.');
    return;
  }

  for (const [filePath, contents] of writes) fs.writeFileSync(filePath, contents);
  logger.info(`Rewrote ${writes.length} record file(s). The store is untouched.`);
  db.close();
}

function pinOf(record) {
  return record.source_ref.slice(record.source_ref.lastIndexOf('@') + 1);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }
}

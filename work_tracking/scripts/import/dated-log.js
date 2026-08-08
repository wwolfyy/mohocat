#!/usr/bin/env node
'use strict';

/**
 * work_tracking/scripts/import/dated-log.js — migration importer for the two dated logs.
 *
 * `log/DEBUG_LOG.md` (49 bugs) and `log/FEATURE_MOD_LOG.md` (89 changes) share one markup —
 * `## YYYY-MM-DD — title`, body until the next heading — so one importer covers both.
 *
 * It writes a `work.json` for `checkin.js` to validate and append; it never touches
 * `registry.ndjson` itself. Prose bodies go to `records/R-XXXX.md` **verbatim**, because a
 * row carrying 2.6 KB of prose inline is a row whose diffs are unreadable (restructure §3).
 *
 * 🔑 The count is the gate. It prints extracted-vs-expected and exits non-zero on a
 * mismatch, because the failure this whole migration fears is an extractor that quietly
 * finds nothing and reports success.
 *
 * Usage:
 *   dated-log.js --source log/DEBUG_LOG.md --type bug --expect 49
 *   dated-log.js --source log/DEBUG_LOG.md --type bug --expect 49 --dry-run
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const lib = require('../lib');

const logger = lib.createLogger('work_tracking/import/dated-log');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const HEADING = /^## (\d{4}-\d{2}-\d{2})\s+[—–-]\s+(.+)$/;

function parseArgs(argv) {
  const args = { source: null, type: null, expect: null, dryRun: false, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    switch (flag) {
      case '--source':
        args.source = value;
        i += 1;
        break;
      case '--type':
        args.type = value;
        i += 1;
        break;
      case '--expect':
        args.expect = Number(value);
        i += 1;
        break;
      case '--out':
        args.out = path.resolve(value);
        i += 1;
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      default:
        throw new Error(`Unknown argument '${flag}'`);
    }
  }
  if (!args.source) throw new Error('--source is required');
  if (!args.type) throw new Error('--type is required (bug | change)');
  if (!Number.isInteger(args.expect)) {
    throw new Error('--expect <n> is required — the hand-verified count of entries in the source');
  }
  return args;
}

/**
 * Split the file into entries on its `##` headings.
 *
 * Headings are the only structure trusted here. The files also use `---` rules between
 * entries, but there are 42 of them against 49 entries, so keying on those would drop seven
 * records — exactly the silent-undercount this migration is trying not to repeat.
 */
function extractEntries(markdown, sourceLabel) {
  const lines = markdown.split('\n');
  const starts = [];

  lines.forEach((line, index) => {
    if (!line.startsWith('## ')) return;
    const match = line.match(HEADING);
    if (!match) {
      throw new Error(
        `${sourceLabel}:${index + 1} is a '## ' heading that does not parse as ` +
          `'## YYYY-MM-DD — title':\n  ${line}\n` +
          `Fix the heading or teach this importer the shape — do not let it be skipped.`
      );
    }
    starts.push({ line: index, ts: match[1], title: match[2].trim() });
  });

  return starts.map((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].line : lines.length;
    const body = lines
      .slice(start.line + 1, end)
      .join('\n')
      .replace(/\n+---\s*$/, '') // the rule separating this entry from the next
      .trim();
    return { ...start, lineNumber: start.line + 1, body };
  });
}

/** The commit that last touched the source, so `source_ref` still resolves after the cut-over. */
function pinCommit(sourcePath) {
  const out = execFileSync('git', ['log', '-1', '--format=%h', '--', sourcePath], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();
  if (!out) throw new Error(`Cannot find a commit that touched ${sourcePath}`);
  return out;
}

/** The lowest unused id in the store — imports continue the sequence, never restart it. */
function nextIdNumber() {
  const { db } = lib.openStore({ allowMissing: true });
  try {
    const row = db.prepare('SELECT MAX(CAST(substr(id, 3) AS INTEGER)) AS n FROM records').get();
    return (row.n ?? 0) + 1;
  } finally {
    db.close();
  }
}

/** The prose, verbatim, under a header naming where it came from. */
function renderRecordFile(record, entry, sourceLabel) {
  return [
    `# ${record.id} — ${record.title}`,
    '',
    `> **${record.type}** · ${record.status} · ${record.ts}`,
    `> Migrated from \`${sourceLabel}\` (\`${record.source_ref}\`).`,
    '',
    '---',
    '',
    entry.body,
    '',
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourcePath = path.resolve(REPO_ROOT, args.source);
  const sourceLabel = path.relative(REPO_ROOT, sourcePath);

  const markdown = fs.readFileSync(sourcePath, 'utf8');
  const entries = extractEntries(markdown, sourceLabel);

  logger.info(`Extracted ${entries.length} entries from ${sourceLabel} (expected ${args.expect}).`);
  if (entries.length !== args.expect) {
    throw new Error(
      `Count mismatch: extracted ${entries.length}, expected ${args.expect}. ` +
        `Nothing was written. Re-count the source by hand before changing --expect.`
    );
  }

  const commit = pinCommit(sourceLabel);
  let idNumber = nextIdNumber();
  const recordsDir = path.join(lib.WORK_TRACKING_DIR, 'records');
  fs.mkdirSync(recordsDir, { recursive: true });

  const records = [];
  const files = [];

  for (const entry of entries) {
    const id = `R-${String(idNumber).padStart(4, '0')}`;
    idNumber += 1;

    const record = {
      id,
      rev: 1,
      ts: entry.ts,
      type: args.type,
      status: 'done',
      outcome: null,
      title: entry.title,
      plan: null,
      detail_ref: `records/${id}.md`,
      note: null,
      supersedes: null,
      split_from: null,
      files: null,
      source_ref: `${sourceLabel}#L${entry.lineNumber}@${commit}`,
    };
    records.push(record);
    files.push([path.join(recordsDir, `${id}.md`), renderRecordFile(record, entry, sourceLabel)]);
  }

  if (args.dryRun) {
    logger.info(`Dry run — nothing written. First: ${records[0].id} "${records[0].title}"`);
    logger.info(`Last: ${records[records.length - 1].id} "${records[records.length - 1].title}"`);
    return;
  }

  for (const [filePath, contents] of files) fs.writeFileSync(filePath, contents);
  logger.info(`Wrote ${files.length} prose files to ${recordsDir}.`);

  const outPath = args.out ?? path.join(lib.WORK_TRACKING_DIR, 'work.json');
  fs.writeFileSync(
    outPath,
    `${JSON.stringify(
      {
        checked_out: new Date().toISOString().slice(0, 10),
        selector: `import ${sourceLabel} @ ${commit}`,
        records,
      },
      null,
      2
    )}\n`
  );
  logger.info(`Wrote ${records.length} records to ${outPath}. Run checkin.js next.`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }
}

module.exports = { extractEntries, parseArgs };

#!/usr/bin/env node
'use strict';

/**
 * work_tracking/scripts/import/backlog.js — migration importer for `docs/planning/BACKLOG.md`.
 *
 * Six items, and every one of them needs a judgment the markup does not carry, which is why
 * this is a separate script from `dated-log.js` rather than another flag on it:
 *
 *   - `B3` is struck through and marked ✅ DONE. Importing it as open would launder a stale
 *     claim into a clean-looking store — the exact failure the 2026-08-02 plan audit found
 *     seven of.
 *   - `Q1` is an owner question, not a task. The file's own heading says these are "not tasks
 *     until answered", so filing it as a task is the §2.2 category error the `question` type
 *     was added for.
 *
 * 🔑 **The metadata below is a decision table, not an extraction.** The script guarantees the
 * prose is carried over verbatim; a human decided every `type`, `status`, `ts` and `files`
 * value in `ITEMS`, and each was verified against the code on 2026-08-09 before being
 * imported as open.
 *
 * Usage: backlog.js [--dry-run]
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const lib = require('../lib');

const logger = lib.createLogger('work_tracking/import/backlog');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SOURCE = 'docs/planning/BACKLOG.md';

/**
 * One entry per item. `key` is how the heading identifies it and what `source_ref` preserves;
 * `ts` is the date the source itself records for the item (Found:, or the DONE date).
 *
 * ⚠️ `status: 'open'` on B1, B2, B4 and B5 was verified against the code on 2026-08-09, not
 * taken on trust: `AboutContentEditor` still has no upload control and the signed-url route
 * still hard-codes `uploads/`; `view-analytics` is in `ALL_PERMISSIONS` but granted in no
 * role, and its two readers still have no callers; `npx eslint <file>` still fails to resolve
 * `next/typescript` on ESLint 8.57.1; both login pages still exist and `/pages/login` still
 * has no 집사등록.
 */
const ITEMS = [
  {
    key: 'B1',
    ts: '2026-08-02',
    type: 'task',
    status: 'open',
    // The only item whose source states its own file list, under "Touches:".
    files: [
      'src/components/admin/AboutContentEditor.tsx',
      'src/app/api/generate-signed-url/route.ts',
      'src/services/storage-service.ts',
      'docs/manuals/admin-manual/README.md',
      'docs/manuals/deployment/new-mountain-setup.md',
    ],
  },
  { key: 'B2', ts: '2026-08-03', type: 'task', status: 'open', files: null },
  { key: 'B4', ts: '2026-08-06', type: 'task', status: 'open', files: null },
  { key: 'B5', ts: '2026-08-08', type: 'task', status: 'open', files: null },
  { key: 'B3', ts: '2026-08-05', type: 'task', status: 'done', files: null },
  { key: 'Q1', ts: '2026-08-02', type: 'question', status: 'open', files: null },
];

/** `## B1 — title`, or `## ~~B3 — title~~ ✅ DONE 2026-08-05`. */
const ITEM_HEADING = /^## (?:~~)?(B\d+)\s+[—–-]\s+(.+?)(?:~~)?(?:\s*✅.*)?$/;
/** The section the open questions live under — a container, not an item. */
const QUESTIONS_HEADING = /^## Open questions/;
/** `- **Q1 — title?** (2026-08-02) body…` */
const QUESTION_BULLET = /^- \*\*(Q\d+)\s+[—–-]\s+(.+?)\*\*/;

function pinCommit() {
  return execFileSync('git', ['log', '-1', '--format=%h', '--', SOURCE], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();
}

function nextIdNumber() {
  const { db } = lib.openStore({ allowMissing: true });
  try {
    const row = db.prepare('SELECT MAX(CAST(substr(id, 3) AS INTEGER)) AS n FROM records').get();
    return (row.n ?? 0) + 1;
  } finally {
    db.close();
  }
}

/**
 * Pull out every `B<n>` item and the `Q<n>` bullets inside the questions section.
 *
 * ⚠️ Any `## ` heading that is neither an item nor the questions container throws. The file's
 * intro is above the first heading and is deliberately not a record — it is routing guidance
 * that the registry itself replaces.
 */
function extractItems(markdown) {
  const lines = markdown.split('\n');
  const found = [];
  let questionsAt = null;

  lines.forEach((line, index) => {
    if (!line.startsWith('## ')) return;
    const item = line.match(ITEM_HEADING);
    if (item) {
      found.push({ key: item[1], title: item[2].trim(), line: index });
      return;
    }
    if (QUESTIONS_HEADING.test(line)) {
      questionsAt = index;
      return;
    }
    throw new Error(
      `${SOURCE}:${index + 1} — unrecognised heading, refusing to skip it:\n  ${line}`
    );
  });

  // Item bodies run to the next `## ` heading of any kind.
  const boundaries = [...found.map((f) => f.line), questionsAt, lines.length]
    .filter((n) => n !== null)
    .sort((a, b) => a - b);

  for (const entry of found) {
    const end = boundaries.find((n) => n > entry.line);
    entry.body = trimBody(lines.slice(entry.line + 1, end));
    entry.lineNumber = entry.line + 1;
  }

  if (questionsAt === null) return found;

  // Questions are bullets, not headings: each runs to the next top-level bullet.
  const qLines = [];
  for (let i = questionsAt + 1; i < lines.length; i += 1) {
    if (QUESTION_BULLET.test(lines[i])) qLines.push(i);
  }
  qLines.forEach((start, i) => {
    const end = i + 1 < qLines.length ? qLines[i + 1] : lines.length;
    const match = lines[start].match(QUESTION_BULLET);
    const first = lines[start].slice(match[0].length).trim();
    const rest = lines.slice(start + 1, end);
    found.push({
      key: match[1],
      title: match[2].trim(),
      body: trimBody([first, ...rest]),
      lineNumber: start + 1,
    });
  });

  return found;
}

function trimBody(bodyLines) {
  return bodyLines
    .join('\n')
    .replace(/\n+---\s*$/, '')
    .trim();
}

function renderRecordFile(record, entry) {
  return [
    `# ${record.id} — ${record.title}`,
    '',
    `> **${record.type}** · ${record.status} · ${record.ts}`,
    `> Migrated from \`${SOURCE}\` as **${entry.key}** (\`${record.source_ref}\`).`,
    '',
    '---',
    '',
    entry.body,
    '',
  ].join('\n');
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const sourcePath = path.join(REPO_ROOT, SOURCE);
  const entries = extractItems(fs.readFileSync(sourcePath, 'utf8'));

  const byKey = new Map(entries.map((entry) => [entry.key, entry]));
  const expected = ITEMS.map((item) => item.key);
  const missing = expected.filter((key) => !byKey.has(key));
  const unexpected = [...byKey.keys()].filter((key) => !expected.includes(key));

  logger.info(`Extracted ${entries.length} items: ${[...byKey.keys()].join(', ')}`);
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `Item mismatch — nothing written.` +
        (missing.length ? `\n  Expected but not found: ${missing.join(', ')}` : '') +
        (unexpected.length
          ? `\n  Found but not in the decision table: ${unexpected.join(', ')}`
          : '')
    );
  }

  const commit = pinCommit();
  let idNumber = nextIdNumber();
  const recordsDir = path.join(lib.WORK_TRACKING_DIR, 'records');
  fs.mkdirSync(recordsDir, { recursive: true });

  const records = [];
  const files = [];

  for (const item of ITEMS) {
    const entry = byKey.get(item.key);
    const id = `R-${String(idNumber).padStart(4, '0')}`;
    idNumber += 1;

    const record = {
      id,
      rev: 1,
      ts: item.ts,
      type: item.type,
      status: item.status,
      outcome: null,
      title: entry.title,
      plan: null,
      detail_ref: `records/${id}.md`,
      note: null,
      supersedes: null,
      split_from: null,
      files: item.files,
      source_ref: `${SOURCE}#${item.key}@${commit}`,
    };
    records.push(record);
    files.push([path.join(recordsDir, `${id}.md`), renderRecordFile(record, entry)]);
    logger.info(`${id}  ${item.key}  ${item.type}/${item.status}  ${entry.title}`);
  }

  if (dryRun) {
    logger.info('Dry run — nothing written.');
    return;
  }

  for (const [filePath, contents] of files) fs.writeFileSync(filePath, contents);
  const outPath = path.join(lib.WORK_TRACKING_DIR, 'work.json');
  fs.writeFileSync(
    outPath,
    `${JSON.stringify(
      {
        checked_out: new Date().toISOString().slice(0, 10),
        selector: `import ${SOURCE} @ ${commit}`,
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

module.exports = { extractItems, ITEMS };

#!/usr/bin/env node
'use strict';

/**
 * work_tracking/scripts/import/project-plan.js — migration importer for
 * `docs/planning/PROJECT_PLAN.md`.
 *
 * Unlike the two logs, this file is **not** consumed whole. Restructure §2.4 keeps it as the
 * document a human reads to understand what we are doing; only the checkbox items move into
 * the store. So this script has two halves that share one span computation, on purpose —
 * extraction and deletion cannot disagree about where an item begins and ends:
 *
 *   (no flag)  extract the boxes → records/ + work.json
 *   --cut      delete exactly those spans from the source, leaving the prose and a pointer
 *
 * ⚠️ **The count in the migration plan (171) is wrong, and finding out why is the point of
 * the `--expect` gate.** The plan counted `[ ]` and `[x]` only. The file's own legend defines
 * four states and all four are used: `[~]` in-progress ×5 and `[-]` deferred ×5 were never
 * counted. There is also one item written in prose as a backtick-wrapped box rather than as a
 * list item — the same markup trap the plan flagged for HANDOFF.md, present here too.
 *
 * Two look like boxes and are not: the legend itself (line 21), and a completed item that
 * quotes the notation while describing other entries ("the two `[x]` SECURITY entries
 * below", line 685). Both are excluded by name below.
 *
 * Usage:
 *   project-plan.js --expect 182 [--dry-run]
 *   project-plan.js --cut
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const lib = require('../lib');

const logger = lib.createLogger('work_tracking/import/project-plan');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SOURCE = 'docs/planning/PROJECT_PLAN.md';

const BOX = /^(\s*)- \[([ x~X-])\] ?(.*)$/;
const SECTION = /^## (\S+?)\.\s/;

/**
 * The legend's four states, mapped onto the schema's `status`.
 *
 * 📌 `[-]` is the one judgment here. The legend reads "deferred/out of scope", and the schema
 * has no `deferred`. All five are scope decisions inside §10's Playwright suite — WebKit,
 * visual regression, Lighthouse, and so on, each deliberately left out — so `abandoned`
 * reports them more honestly than `open` would. Marking them open would put five things
 * nobody intends to do into the open-work list, which is the laundering problem in reverse.
 * Their prose says "deferred" in full, so nothing is lost if this is ever revisited.
 */
const STATUS_BY_BOX = { x: 'done', X: 'done', ' ': 'open', '~': 'in-progress', '-': 'abandoned' };

/** Lines that contain box notation but are not items. Pinned by line number AND by content. */
const NOT_ITEMS = [
  { line: 21, contains: '**Legend:**' },
  { line: 685, contains: 'SECURITY entries below' },
];

/**
 * The one item written as prose rather than as a list box (§10d, part 2 of the owner's
 * 2026-07-30 decision). It says "Not started." in its own text, so it is `open`.
 */
const PROSE_ITEM = {
  line: 1420,
  contains: 'A CMS-controlled toggle',
  status: 'open',
  plan: '§10d',
  title: 'A CMS-controlled toggle for whether multiple upload is allowed',
};

function parseArgs(argv) {
  const args = { expect: null, dryRun: false, cut: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--expect') {
      args.expect = Number(argv[i + 1]);
      i += 1;
    } else if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--cut') args.cut = true;
    else throw new Error(`Unknown argument '${argv[i]}'`);
  }
  if (!args.cut && !Number.isInteger(args.expect)) {
    throw new Error('--expect <n> is required — the hand-verified count of items');
  }
  return args;
}

/**
 * Where one item's text ends.
 *
 * An item runs from its box line to the last line indented past it. Any subsequent box ends
 * it, at whatever depth: a nested box is its own record, so it must not also be swallowed
 * into its parent's body.
 */
function spanEnd(lines, start) {
  const indent = lines[start].match(BOX)[1].length;
  let last = start;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === '') continue;
    if (line.startsWith('#')) break;
    if (BOX.test(line)) break;
    if (line.match(/^(\s*)/)[1].length <= indent) break;
    last = i;
  }
  return last;
}

/** Every item, with the section it sits under and the exact lines it occupies. */
function extractItems(lines) {
  const items = [];
  let section = null;

  for (let i = 0; i < lines.length; i += 1) {
    const heading = lines[i].match(SECTION);
    if (heading) section = `§${heading[1]}`;

    const skip = NOT_ITEMS.find((n) => n.line === i + 1);
    if (skip) {
      if (!lines[i].includes(skip.contains)) {
        throw new Error(
          `${SOURCE}:${i + 1} was excluded as "${skip.contains}" but no longer contains it. ` +
            `The file moved under the exclusion list — re-check it before importing.`
        );
      }
      continue;
    }

    if (PROSE_ITEM.line === i + 1) {
      if (!lines[i].includes(PROSE_ITEM.contains)) {
        throw new Error(`${SOURCE}:${i + 1} no longer holds the prose item — re-check it.`);
      }
      const end = spanEndForProse(lines, i);
      items.push({
        title: PROSE_ITEM.title,
        status: PROSE_ITEM.status,
        plan: PROSE_ITEM.plan,
        body: lines
          .slice(i, end + 1)
          .join('\n')
          .trim(),
        start: i,
        end,
        prose: true,
      });
      continue;
    }

    const box = lines[i].match(BOX);
    if (!box) continue;

    const status = STATUS_BY_BOX[box[2]];
    if (!status) throw new Error(`${SOURCE}:${i + 1} — unknown box state '${box[2]}'`);

    const end = spanEnd(lines, i);
    const body = lines
      .slice(i, end + 1)
      .join('\n')
      .trim();
    items.push({
      title: toTitle(box[3]),
      status,
      plan: section,
      body,
      start: i,
      end,
      nested: box[1].length > 0,
    });
  }

  return items;
}

/** The prose item is a numbered list entry; it ends where the next blank-then-dedent does. */
function spanEndForProse(lines, start) {
  let last = start;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '') break;
    if (lines[i].startsWith('#') || BOX.test(lines[i])) break;
    last = i;
  }
  return last;
}

/**
 * A one-line title from the box's first line. The full text always lives in `records/`, so
 * this only has to be recognisable, not complete.
 */
function toTitle(text) {
  const flat = text.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
  if (flat.length <= 120) return flat;
  const cut = flat.slice(0, 120);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

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

function renderRecordFile(record, item) {
  const nesting = item.nested ? '\n> Nested under the item above it in the source.' : '';
  return [
    `# ${record.id} — ${record.title}`,
    '',
    `> **${record.type}** · ${record.status} · ${record.ts}${record.plan ? ` · ${record.plan}` : ''}`,
    `> Migrated from \`${SOURCE}\` (\`${record.source_ref}\`).${nesting}`,
    '',
    '---',
    '',
    item.body,
    '',
  ].join('\n');
}

function buildRecords(items, commit, startId) {
  let idNumber = startId;
  return items.map((item) => {
    const id = `R-${String(idNumber++).padStart(4, '0')}`;
    return {
      record: {
        id,
        rev: 1,
        // The plan records no per-item date, so the pin's own date would be a fabrication.
        // The commit that last touched the file is the only date the source actually gives.
        ts: commitDate(commit),
        type: 'task',
        status: item.status,
        outcome: null,
        title: item.title,
        plan: item.plan,
        detail_ref: `records/${id}.md`,
        note: null,
        supersedes: null,
        // split_from is Phase 3's job: "link only where the source text says so", and
        // indentation alone is not the source saying so. Nesting is recorded in the prose.
        split_from: null,
        files: null,
        source_ref: `${SOURCE}#L${item.start + 1}@${commit}`,
      },
      item,
    };
  });
}

let cachedDate = null;
function commitDate(commit) {
  if (!cachedDate) {
    cachedDate = execFileSync('git', ['log', '-1', '--format=%ad', '--date=short', commit], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }).trim();
  }
  return cachedDate;
}

/**
 * Replace each section's item spans with a single pointer, keeping every other line.
 *
 * The pointer carries the section's roll-up so the plan still answers "how far along is this
 * workstream" without the reader opening the registry.
 */
function cut(lines, entries) {
  const bySection = new Map();
  for (const { record, item } of entries) {
    const key = item.plan ?? '(none)';
    if (!bySection.has(key)) bySection.set(key, []);
    bySection.get(key).push({ record, item });
  }

  const drop = new Set();
  const insertAt = new Map();
  for (const [, group] of bySection) {
    group.sort((a, b) => a.item.start - b.item.start);
    for (const { item } of group) {
      for (let i = item.start; i <= item.end; i += 1) drop.add(i);
    }
    const first = group[0].item.start;
    const ids = group.map((g) => g.record.id);
    const done = group.filter((g) => g.item.status === 'done').length;
    insertAt.set(
      first,
      [
        `> 📋 **${group.length} items — ${done}/${group.length} done — now in the work registry**`,
        `> as \`${ids[0]}\`…\`${ids[ids.length - 1]}\`. See`,
        '> [`work_tracking/registry.md`](../../work_tracking/registry.md); each links to its full',
        '> text in `work_tracking/records/`.',
      ].join('\n')
    );
  }

  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (insertAt.has(i)) out.push(insertAt.get(i));
    if (!drop.has(i)) out.push(lines[i]);
  }
  return out.join('\n').replace(/\n{4,}/g, '\n\n\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourcePath = path.join(REPO_ROOT, SOURCE);
  const lines = fs.readFileSync(sourcePath, 'utf8').split('\n');
  const items = extractItems(lines);
  const commit = pinCommit();

  const byStatus = items.reduce((acc, i) => ({ ...acc, [i.status]: (acc[i.status] ?? 0) + 1 }), {});
  logger.info(`Extracted ${items.length} items: ${JSON.stringify(byStatus)}`);

  if (args.cut) {
    // Ids must match what the import actually wrote, so read them back from the store.
    const { db } = lib.openStore();
    let stored;
    try {
      stored = db
        .prepare('SELECT * FROM current_records WHERE source_ref LIKE ? ORDER BY id')
        .all(`${SOURCE}#%`)
        .map(lib.fromRow);
    } finally {
      db.close();
    }
    if (stored.length !== items.length) {
      throw new Error(
        `Refusing to cut: the store holds ${stored.length} records from ${SOURCE} but the ` +
          `source still yields ${items.length} items. Import first, and only cut what was stored.`
      );
    }
    const byLine = new Map(stored.map((r) => [Number(r.source_ref.match(/#L(\d+)@/)[1]), r]));
    const entries = items.map((item) => {
      const record = byLine.get(item.start + 1);
      if (!record) throw new Error(`No stored record for ${SOURCE}:${item.start + 1}`);
      return { record, item };
    });
    fs.writeFileSync(sourcePath, `${cut(lines, entries).replace(/\n+$/, '')}\n`);
    logger.info(`Cut ${items.length} item spans from ${SOURCE}, leaving the prose.`);
    return;
  }

  if (items.length !== args.expect) {
    throw new Error(
      `Count mismatch: extracted ${items.length}, expected ${args.expect}. Nothing written.`
    );
  }

  const entries = buildRecords(items, commit, nextIdNumber());
  if (args.dryRun) {
    logger.info(
      `Dry run. First ${entries[0].record.id}, last ${entries[entries.length - 1].record.id}`
    );
    for (const { record } of entries.filter((e) => e.record.status !== 'done').slice(0, 30)) {
      logger.info(`  ${record.id} ${record.plan ?? '—'} [${record.status}] ${record.title}`);
    }
    return;
  }

  const recordsDir = path.join(lib.WORK_TRACKING_DIR, 'records');
  fs.mkdirSync(recordsDir, { recursive: true });
  for (const { record, item } of entries) {
    fs.writeFileSync(path.join(recordsDir, `${record.id}.md`), renderRecordFile(record, item));
  }

  fs.writeFileSync(
    path.join(lib.WORK_TRACKING_DIR, 'work.json'),
    `${JSON.stringify(
      {
        checked_out: new Date().toISOString().slice(0, 10),
        selector: `import ${SOURCE} @ ${commit}`,
        records: entries.map((e) => e.record),
      },
      null,
      2
    )}\n`
  );
  logger.info(`Wrote ${entries.length} records. Run checkin.js, then this script with --cut.`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }
}

module.exports = { extractItems, spanEnd, toTitle, STATUS_BY_BOX };

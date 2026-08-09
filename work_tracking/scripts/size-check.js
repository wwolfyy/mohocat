#!/usr/bin/env node
'use strict';

/**
 * work_tracking/scripts/size-check.js — fails when a living work-tracking document has grown
 * past its budget in `work_tracking/size-policy.json`.
 *
 * 🔑 **Why this is code and not a paragraph.** `docs/handoff/archive/` held 34 files before this
 * existed, so the archive mechanism was never missing — it simply stopped being applied, and
 * `HANDOFF.md` regrew to 3,396 lines. `HANDOFF.md` already told its own readers to keep it short.
 * An instruction that nothing enforces is the thing that failed; a step that fails the build is
 * not. See `R-0424`.
 *
 * ⚠️ **Two measures, because the two observed failures are invisible to each other.**
 * `HANDOFF.md` failed on **lines** (3,396). `PROJECT_PLAN.md` failed on **columns** — one table
 * cell of 4,350 characters, which prettier then replayed as padding across all 29 other rows, so
 * 48 % of the file was whitespace while the line count looked healthy (`R-0423`). Checking one
 * without the other catches one failure and misses the other.
 *
 * 📌 A budget is a **ratchet**: set just above the file's real size, so growth needs someone to
 * raise the number in `size-policy.json`, which shows up in a diff. Raising one is allowed — it
 * is meant to be a decision, not an accident.
 *
 * Usage:
 *   node work_tracking/scripts/size-check.js            # exits 1 on any breach
 *   node work_tracking/scripts/size-check.js --report   # prints every document, exits 0
 */

const fs = require('node:fs');
const path = require('node:path');

const lib = require('./lib');

const logger = lib.createLogger('work_tracking/size-check');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

/**
 * `WORK_TRACKING_SIZE_POLICY` points the gate at a different policy file — for the test suite,
 * which must be able to prove the check FAILS without ever writing to the committed policy and
 * risking leaving it mangled if a run is interrupted. Mirrors `WORK_TRACKING_STORE` in `lib.js`.
 */
const POLICY_PATH = process.env.WORK_TRACKING_SIZE_POLICY
  ? path.resolve(process.env.WORK_TRACKING_SIZE_POLICY)
  : path.resolve(__dirname, '..', 'size-policy.json');

const KNOWN_FLAGS = new Set(['--report']);

/** An unknown flag is a typo, and silently ignoring it would silently skip the gate. */
function parseArgs(argv) {
  const unknown = argv.filter((arg) => !KNOWN_FLAGS.has(arg));
  if (unknown.length > 0) {
    logger.error(`Unknown argument(s): ${unknown.join(', ')}. Known flags: --report.`);
    process.exit(2);
  }
  return { report: argv.includes('--report') };
}

function loadPolicy(policyPath) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  } catch (error) {
    logger.error(`Could not read the size policy at ${policyPath}: ${error.message}`);
    throw error;
  }

  const documents = parsed.documents;
  if (!Array.isArray(documents) || documents.length === 0) {
    const message = `${policyPath} has no 'documents' array — refusing to pass a gate that checks nothing.`;
    logger.error(message);
    throw new Error(message);
  }

  for (const entry of documents) {
    for (const field of ['path', 'lines', 'columns', 'remedy']) {
      if (entry[field] === undefined || entry[field] === null || entry[field] === '') {
        const message = `${policyPath}: entry ${JSON.stringify(entry.path ?? entry)} is missing '${field}'.`;
        logger.error(message);
        throw new Error(message);
      }
    }
  }

  return documents;
}

/**
 * Lines, and the longest line in **characters**. A trailing newline does not count as a line —
 * `wc -l` agrees, and a budget that shifted by one depending on the final byte would be a
 * standing source of confusion.
 *
 * 📌 Characters, not bytes and not rendered width: `awk '{print length}'` reports 399 for the
 * same line this reports 385, because Korean is three bytes per character in UTF-8, and a
 * terminal renders those characters double-width again. None of the three is "correct" — what
 * matters is that a runaway table cell is thousands either way, and that the budgets in
 * `size-policy.json` were set with this same function.
 */
function measure(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  let widest = 0;
  for (const line of lines) {
    if (line.length > widest) widest = line.length;
  }
  return { lines: lines.length, columns: widest };
}

function main() {
  const { report } = parseArgs(process.argv.slice(2));
  const documents = loadPolicy(POLICY_PATH);

  const breaches = [];
  const rows = [];

  for (const entry of documents) {
    const filePath = path.join(REPO_ROOT, entry.path);

    // A governed document that has vanished is a breach of its own: either it moved and the
    // policy was not updated with it, or the gate has been quietly pointed at nothing.
    if (!fs.existsSync(filePath)) {
      breaches.push({
        entry,
        message: `${entry.path} does not exist. If it moved, update work_tracking/size-policy.json in the same change.`,
      });
      continue;
    }

    const { lines, columns } = measure(filePath);
    rows.push({ path: entry.path, lines, columns, entry });

    const over = [];
    if (lines > entry.lines) over.push(`${lines} lines, budget ${entry.lines}`);
    if (columns > entry.columns)
      over.push(`longest line ${columns} columns, budget ${entry.columns}`);
    if (over.length > 0) breaches.push({ entry, message: `${entry.path} — ${over.join('; ')}.` });
  }

  if (report) {
    const width = Math.max(...rows.map((r) => r.path.length));
    for (const row of rows) {
      const lineNote = `${row.lines}/${row.entry.lines} lines`;
      const colNote = `${row.columns}/${row.entry.columns} cols`;
      const room = row.entry.lines - row.lines;
      process.stdout.write(
        `${row.path.padEnd(width)}  ${lineNote.padStart(16)}  ${colNote.padStart(14)}  ${room} lines of room\n`
      );
    }
  }

  if (breaches.length === 0) {
    logger.info(`${documents.length} document(s) within budget.`);
    return 0;
  }

  for (const breach of breaches) {
    logger.error(breach.message);
    logger.error(`  → ${breach.entry.remedy}`);
  }
  logger.error(
    `${breaches.length} of ${documents.length} document(s) over budget. ` +
      'Shrink the document, or raise its budget in work_tracking/size-policy.json and say why in the commit.'
  );
  return 1;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { loadPolicy, measure, POLICY_PATH };

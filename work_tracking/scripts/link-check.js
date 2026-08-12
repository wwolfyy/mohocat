#!/usr/bin/env node
/**
 * Relative-link gate for the repo's tracked markdown.
 *
 * Every relative link in a tracked `.md` file must resolve to a file on disk. Absolute URLs,
 * `mailto:`/`tel:`, protocol-relative URLs and same-page anchors are out of scope, and so is
 * anything inside code — see `blankOutCode`.
 *
 * Usage:
 *   node work_tracking/scripts/link-check.js            # names every broken link, exits 1 if any
 *   node work_tracking/scripts/link-check.js --report   # adds the exempt-path tally, same exit code
 *
 * 📌 Anchors are checked as far as the file. A `#section` fragment is not resolved against the
 * target's headings — that is a different check, and a noisier one, because headings are renamed
 * far more often than files move.
 *
 * ⚠️ Three exempt trees, of two kinds — and they are exemptions rather than fixes (`R-0437`):
 *
 *   - `docs/handoff/archive/` and `docs/archive/` are frozen history. Their links broke when the
 *     files were relocated into `archive/`, and repointing them would edit a record of what was
 *     written at the time.
 *   - `work_tracking/records/` holds prose lifted **verbatim** from its source file, which is what
 *     keeps `source_ref` checkable against `git show`. A link that was correct in
 *     `docs/planning/PROJECT_PLAN.md` is wrong once the same text sits under `records/`, and
 *     rewriting it would break that guarantee. The owner's call (2026-08-09) was to leave them.
 *
 * 🔑 The cost of the second exemption is that a genuinely broken link in a **new** record is not
 * caught either. That is the trade the verbatim guarantee buys, and it is the reason this is
 * written down here rather than left as a quiet skip in a list.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const lib = require('./lib');

const logger = lib.createLogger('work_tracking/link-check');

/**
 * `WORK_TRACKING_LINK_ROOT` points the gate at a different tree — for the test suite, which has to
 * prove the check **fails** on a broken link. It cannot do that against the repo itself: a scratch
 * file is untracked, `git ls-files` never returns it, and so the gate would correctly ignore it
 * and the failure path would go untested. Mirrors `WORK_TRACKING_SIZE_POLICY` in `size-check.js`.
 */
const REPO_ROOT = process.env.WORK_TRACKING_LINK_ROOT
  ? path.resolve(process.env.WORK_TRACKING_LINK_ROOT)
  : path.resolve(__dirname, '..', '..');

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

const EXEMPT_PREFIXES = [
  {
    prefix: 'docs/handoff/archive/',
    why: 'frozen history — relocated into archive/, never repointed',
  },
  { prefix: 'docs/archive/', why: 'frozen history' },
  {
    prefix: 'work_tracking/records/',
    why: 'record prose is verbatim from source; rewriting a link breaks source_ref',
  },
];

/**
 * Replace fenced blocks and inline code spans with spaces, so markdown link *syntax* quoted as an
 * example is not read as a link. `R-0428` explains a churn problem by writing `](sibling.md)` in
 * prose; an earlier version of this script reported that as broken — correct by its own rules,
 * wrong by intent. Spaces rather than deletion, so byte offsets and reported line numbers survive.
 */
function blankOutCode(src) {
  const blank = (match) => match.replace(/[^\n]/g, ' ');
  return src.replace(/^```[\s\S]*?^```/gm, blank).replace(/`[^`\n]*`/g, blank);
}

function trackedMarkdown() {
  const out = execFileSync('git', ['ls-files', '*.md'], { cwd: REPO_ROOT, encoding: 'utf8' });
  return out.split('\n').filter(Boolean);
}

/** True for a target this checker has an opinion about. */
function isRelative(target) {
  if (!target) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return false; // http:, mailto:, tel:, …
  if (target.startsWith('#')) return false; // same-page anchor
  if (target.startsWith('//')) return false; // protocol-relative
  return true;
}

function brokenLinksIn(relPath) {
  const abs = path.join(REPO_ROOT, relPath);
  const src = blankOutCode(fs.readFileSync(abs, 'utf8'));
  const dir = path.dirname(abs);
  const broken = [];

  const linkPattern = /\[[^\]\n]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let match;
  while ((match = linkPattern.exec(src))) {
    const target = match[1];
    if (!isRelative(target)) continue;

    const filePart = target.split('#')[0];
    if (!filePart) continue; // pure anchor written as (#a), already covered above

    if (fs.existsSync(path.resolve(dir, decodeURIComponent(filePart)))) continue;

    broken.push({ line: src.slice(0, match.index).split('\n').length, target });
  }
  return broken;
}

function exemptionFor(file) {
  return EXEMPT_PREFIXES.find((e) => file.startsWith(e.prefix));
}

function main() {
  const { report } = parseArgs(process.argv.slice(2));
  const files = trackedMarkdown();

  const breaches = [];
  const exempt = new Map();

  for (const file of files) {
    const broken = brokenLinksIn(file);
    if (broken.length === 0) continue;

    const exemption = exemptionFor(file);
    if (exemption) {
      exempt.set(exemption.prefix, (exempt.get(exemption.prefix) || 0) + broken.length);
      continue;
    }
    for (const b of broken) breaches.push({ file, ...b });
  }

  if (report) {
    for (const { prefix, why } of EXEMPT_PREFIXES) {
      const count = exempt.get(prefix) || 0;
      process.stdout.write(`${prefix.padEnd(26)}  ${String(count).padStart(4)} exempt  (${why})\n`);
    }
  }

  if (breaches.length === 0) {
    logger.info(`every relative link resolves — ${files.length} file(s) scanned.`);
    return 0;
  }

  for (const b of breaches) process.stderr.write(`${b.file}:${b.line}  ->  ${b.target}\n`);
  logger.error(
    `${breaches.length} relative link(s) do not resolve, across ${files.length} tracked file(s). ` +
      'Repoint the link, or — if the target is genuinely gone — say so in the prose rather than leaving a dead link.'
  );
  return 1;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { blankOutCode, brokenLinksIn, isRelative };

#!/usr/bin/env node
'use strict';

/**
 * work_tracking/scripts/import/companion-docs.js — migration importer for §2b, the
 * companion planning documents.
 *
 * 🔑 **Index them; do not flatten them.** One row per document, `detail_ref` pointing at the
 * file **where it already lives** — no move, no rewrite. `multi-mountain-refactor-plan` alone
 * is 787 lines: that is a document, not a row, and flattening it would be a large lossy
 * rewrite that buys nothing a pointer does not. So unlike every other importer here, this one
 * copies no prose into `records/`.
 *
 * ⚠️ **Take each document's own status, not the folder it sits in** — with one exception,
 * marked below, where the document's own header is provably stale.
 *
 * The table below is a decision table. A human read all twenty headers and set every `type`,
 * `status`, `outcome`, `plan` and `note`; the script only guarantees the pointer, the title
 * and the commit pin. It refuses to run if the directory holds a file the table does not
 * know about, so a new companion plan cannot slip in unclassified.
 *
 * Usage: companion-docs.js [--dry-run]
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const lib = require('../lib');

const logger = lib.createLogger('work_tracking/import/companion-docs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const DIRS = ['docs/planning/completed', 'docs/planning/pending'];

/**
 * Deliberately excluded (restructure §7): a different workstream. Not ours to sweep in.
 */
const EXCLUDED = [
  'code-graph-tooling-comparison-20260728.md',
  'code-graph-tooling-evaluation-20260728.md',
];

/**
 * One entry per document, keyed by filename.
 *
 * `plan` is set only where the document's own text names a tracker section. Several others
 * are obviously §10n, §10u and so on, but "link only where the source says so" — a wrong
 * backlink is harder to spot than a missing one.
 */
const DOCS = {
  // --- docs/planning/completed ---------------------------------------------------------
  '7a-bake-data-layer-tasks.md': {
    type: 'task',
    status: 'done',
    plan: '§7a',
    // No Status: line; read instead. All 24 of its own boxes are ticked.
  },
  'adoption-promotion-and-cat-adoption-info-plan.md': {
    type: 'task',
    status: 'in-progress',
    note: 'Its own status says implemented, with the rule deploy and a browser verification still pending — owner-owed, so not closed.',
  },
  'butler-media-separation-plan-20260727.md': { type: 'task', status: 'done' },
  'complexity-retirement-assessment-20260716.md': { type: 'task', status: 'done' },
  'dead-code-removal-assessment-20260711.md': { type: 'task', status: 'done' },
  'deployment-cleanup-plan.md': {
    type: 'task',
    status: 'done',
    plan: '§7',
    // No Status: line; PROJECT_PLAN §1 records deployment-target cleanup as done.
  },
  'feeding-station-points-admin-cms-plan.md': {
    type: 'task',
    status: 'in-progress',
    plan: '§4',
    note: 'Its own status says implemented and browser-verified, but flags the rule deploy as owner-owed — so not closed.',
  },
  'firebase-read-access-inventory.md': {
    type: 'task',
    status: 'done',
    // No Status: line. It is a completed read/rules-coverage audit, not a plan.
  },
  'firebase-sdk-usage-inventory.md': {
    type: 'task',
    status: 'done',
    // No Status: line. A completed stock-take — it says so itself: "not a decision".
    note: 'Its closing recommendation retired the blanket "Admin SDK for all writes" framing — a decision worth lifting separately in Phase 3.',
  },
  'member-media-upload-permissions-20260803.md': { type: 'task', status: 'done', plan: '§10p' },
  'member-post-authoring-20260802.md': { type: 'task', status: 'done' },
  'multi-mountain-refactor-plan-20260719.md': { type: 'task', status: 'done' },
  'multi-tenant-architecture-decision-20260718.md': {
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    note: 'The document IS the decision record. The individual decisions inside it still need lifting as their own rows (Phase 3).',
  },
  'phase3-cleanup-plan.md': { type: 'task', status: 'done' },
  'playwright-ci-plan.md': {
    type: 'task',
    status: 'done',
    plan: '§10',
    // ⚠️ THE ONE EXCEPTION to "use the document's own status". Its header still reads
    // "📋 PLAN — awaiting owner sign-off", but PROJECT_PLAN §10's own heading reads
    // "MAIN PLAN COMPLETE (merged to main 2026-07-16)" and the suite is CI-gated. The
    // header was never updated. Recording it as a plan awaiting sign-off would import a
    // stale claim, which is the failure the 2026-08-02 audit found seven of.
    note: 'Imported as done against its own header, which still reads "PLAN — awaiting owner sign-off". PROJECT_PLAN §10 reads "MAIN PLAN COMPLETE (merged to main 2026-07-16)" and the suite is CI-gated; the header is stale.',
  },
  'playwright-ci-prerequisite-plan.md': {
    type: 'task',
    status: 'done',
    // Carries two Status lines; the outer, newer one reads "✅ EXECUTED (2026-07-11)".
  },

  // --- docs/planning/pending -----------------------------------------------------------
  'color-token-centralization-plan-20260805.md': {
    type: 'task',
    status: 'in-progress',
    note: 'Phases 1–4 done and shipped in PR #9; only Phase 5 (the unscoped D5 audit) remains.',
  },
  'mountain-2-prerequisites.md': {
    type: 'task',
    status: 'open',
    note: 'Owner-gated: it waits on the decision to start a second mountain, not on a dependency.',
  },
  'tenancy-path-migration-plan-20260728.md': {
    type: 'task',
    status: 'open',
    note: 'Decided and unblocked 2026-08-07, still not started — nothing is in its way.',
  },
  'tenancy-url-model-decision-20260728.md': {
    type: 'decision',
    status: 'done',
    outcome: 'adopted',
    note: 'Path-based (option 2), owner 2026-07-28. Execution is tracked separately by the tenancy path-migration plan.',
  },
};

function pinCommit(relPath) {
  return execFileSync('git', ['log', '-1', '--format=%h %ad', '--date=short', '--', relPath], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
    .trim()
    .split(' ');
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

/** The document's own H1 is its title. */
function titleOf(absPath, relPath) {
  const heading = fs
    .readFileSync(absPath, 'utf8')
    .split('\n')
    .find((line) => line.startsWith('# '));
  if (!heading) throw new Error(`${relPath} has no H1 to take a title from`);
  return heading.slice(2).replace(/\s+/g, ' ').trim();
}

function collect() {
  const found = [];
  for (const dir of DIRS) {
    for (const name of fs.readdirSync(path.join(REPO_ROOT, dir)).sort()) {
      if (!name.endsWith('.md') || EXCLUDED.includes(name)) continue;
      found.push({ name, relPath: `${dir}/${name}` });
    }
  }
  return found;
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const found = collect();

  const known = Object.keys(DOCS);
  const missing = known.filter((n) => !found.some((f) => f.name === n));
  const unexpected = found.filter((f) => !known.includes(f.name)).map((f) => f.relPath);
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      'Document set does not match the decision table — nothing written.' +
        (missing.length ? `\n  In the table but not on disk: ${missing.join(', ')}` : '') +
        (unexpected.length
          ? `\n  On disk but unclassified: ${unexpected.join(', ')}\n` +
            '  Add it to DOCS (or to EXCLUDED if it belongs to another workstream).'
          : '')
    );
  }

  logger.info(`Indexing ${found.length} documents (${EXCLUDED.length} excluded by name).`);

  let idNumber = nextIdNumber();
  const records = found.map(({ name, relPath }) => {
    const decision = DOCS[name];
    const [commit, date] = pinCommit(relPath);
    const id = `R-${String(idNumber++).padStart(4, '0')}`;
    return {
      id,
      rev: 1,
      ts: date,
      type: decision.type,
      status: decision.status,
      outcome: decision.outcome ?? null,
      title: titleOf(path.join(REPO_ROOT, relPath), relPath),
      plan: decision.plan ?? null,
      // Points at the document where it already lives. Nothing is copied into records/.
      detail_ref: `../${relPath}`,
      note: decision.note ?? null,
      supersedes: null,
      split_from: null,
      files: null,
      source_ref: `${relPath}@${commit}`,
    };
  });

  for (const r of records) {
    logger.info(`  ${r.id} ${r.type}/${r.status} ${r.plan ?? '—'} ${r.title.slice(0, 62)}`);
  }

  if (dryRun) {
    logger.info('Dry run — nothing written.');
    return;
  }

  fs.writeFileSync(
    path.join(lib.WORK_TRACKING_DIR, 'work.json'),
    `${JSON.stringify(
      {
        checked_out: new Date().toISOString().slice(0, 10),
        selector: 'import §2b companion docs',
        records,
      },
      null,
      2
    )}\n`
  );
  logger.info(`Wrote ${records.length} records. Run checkin.js next.`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }
}

module.exports = { DOCS, EXCLUDED, collect };

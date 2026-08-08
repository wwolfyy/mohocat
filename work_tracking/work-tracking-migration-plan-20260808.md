# Work tracking — migration plan — 20260808

> **Status:** ▶️ **READY TO EXECUTE.** Design and storage decision are settled in
> **[`work-tracking-restructure-20260808.md`](./work-tracking-restructure-20260808.md)** — read
> §4 there first; this document is only the execution sequence.
>
> ⚠️ **Application work stays PAUSED until Phase 5 lands.** Tenancy T0 resumes after.
>
> 🔑 **The one rule that governs every phase: move an item and delete its origin in the SAME
> change.** A half-migrated backlog is strictly worse than either end state, and duplication is
> exactly how the 2026-08-02 plan audit ended up with seven rotted claims.

---

## 0. What is being migrated, verified on `dev` at `4484234`

| Source                          | Items                       | Markup                  | Mechanical? |
| ------------------------------- | --------------------------- | ----------------------- | ----------- |
| `log/DEBUG_LOG.md`              | 49                          | `## YYYY-MM-DD — title` | ✅ yes      |
| `log/FEATURE_MOD_LOG.md`        | 89                          | `## YYYY-MM-DD — title` | ✅ yes      |
| `docs/planning/PROJECT_PLAN.md` | **182** (see the ⚠️ below)  | four box states + prose | ⚠️ mostly   |
| `docs/planning/BACKLOG.md`      | 5 open + 1 done             | `## B<n> — title`, `Q1` | ✅ yes      |
| `docs/handoff/HANDOFF.md`       | ~8 open + prose carry-overs | see the note below      | 🔴 **no**   |
| `HANDOFF.md` decisions          | unknown                     | prose only, no markup   | 🔴 **no**   |

⚠️ **`HANDOFF.md` will silently import zero items if a script keys on `- [ ]`.** Its open items
are written as a **bold-wrapped, backtick-quoted** box — the literal bytes are
`- ` then `**` then a backtick, `[ ]`, a backtick, then the text — so the box never appears at
the start of a line and a standard checkbox pattern never matches. Grep the file for the
bold-plus-backtick form, and **verify the extractor's count against a hand count** before
trusting it.

---

## Phase 1 — Tooling (no data moves yet)

🔑 **Everything lives under a new root `work_tracking/` folder** (owner, 2026-08-08) — scripts
included, deliberately **not** under the root `scripts/`, which belongs to the application.

- [x] ✅ **Create `work_tracking/`** and relocate this plan + the restructure doc into it,
      updating every link in the same change. _(done 2026-08-08 — 7 external references
      repointed across `AGENTS.md`, `HANDOFF.md`, `PROJECT_PLAN.md`.)_
- [x] ✅ **`work_tracking/schema.sql`** — the normative `CREATE TABLE … STRICT` plus the
      `records_with_stale`, `current_records` and `children_progress` views. _(done 2026-08-08;
      verified against `node:sqlite` — **14 malformed shapes rejected**, valid rows accepted,
      duplicate `(id, rev)` caught, staleness and the `1/2 children done` roll-up both correct.)_
- [x] ✅ **`work_tracking/SCHEMA.md`** — the prose companion: what each field means and why. The
      DDL is normative; this explains it. _(done 2026-08-09 — also carries the workflow commands
      and the merge-conflict recovery procedure.)_
- [x] ✅ **`work_tracking/scripts/lib.js`** — load `registry.ndjson`, build the in-memory db
      (`node:sqlite`, built in on Node 25 — **no new dependency**), fold to current revs.
      _(done 2026-08-09. Rejects unknown field names in JS: the insert names its columns, so a
      typo'd field would otherwise be dropped without complaint — the silent-zero-rows failure
      §4.3 tested for. `WORK_TRACKING_STORE` relocates the store, for tests and for rehearsing
      the Phase 2 import against a scratch copy.)_
- [x] ✅ **`work_tracking/scripts/checkout.js`** — `--id R-0142` or
      `--query "status='open' AND plan='§10'"` → writes `work.json`. _(done 2026-08-09; also
      `--new` for adding records, and it refuses to overwrite an unfinished checkout.)_
- [x] ✅ **`work_tracking/scripts/checkin.js`** — dry-run insert → rollback → append `rev+1` rows for
      **changed items only**. Aborts on any constraint failure, writing nothing. _(done
      2026-08-09; `rev` is computed from the store, never read from `work.json`.)_
- [x] ✅ **Referential check in `checkin.js`, scoped to `work.json`** (owner, 2026-08-08) — a
      `split_from` or `supersedes` must point at an `id` present **in `work.json`**, not merely
      somewhere in `registry.ndjson`. Referencing an item you have not checked out is the signal
      that **it should have been checked out first** — you cannot correctly reference an item
      whose current state you never read, and both reference types require writing the target's
      next `rev` anyway (restructure §3.1). ⚠️ SQLite foreign keys cannot cover this at all: the
      primary key is `(id, rev)` and the reference is to `id` alone.
      📌 If a purely informational `related` link is ever added to the schema, it needs an
      exemption from this rule — pointing at a closed item for context should not force a
      checkout.
- [x] ✅ **Enforce `note` on unchanged revisions** — a row whose only differences are `ts` and `rev`
      must carry a `note`, or `checkin.js` will drop it as unmodified (restructure §3). _(done
      2026-08-09. Implemented as a check with teeth rather than a convention: a reference whose
      **target** would be dropped as unmodified is a hard error naming the target, so the
      partial-split case fails loudly instead of leaving the parent's timeline silent.)_
- [x] ✅ **`work_tracking/scripts/build.js`** — regenerate `registry.md`. Deterministic output: fixed
      column order, `ORDER BY id`, stable formatting. _(done 2026-08-09. No clock anywhere in the
      output — a generated-at stamp would fail `--check` on every commit.)_
- [x] ✅ **Add `work.json` to `.gitignore`.** ⚠️ Do this _before_ the first checkout ever runs.
      _(done 2026-08-09, before any script was run.)_
- [x] ✅ **Do NOT add a `merge=union` driver** for `registry.ndjson`. Conflicts are wanted.
      _(confirmed 2026-08-09 — `.gitattributes` has no such entry, and the recovery path is
      tested end to end instead.)_
- [x] ✅ **CI job** — `registry.md` must equal `build(registry.ndjson)`, and the whole store must
      load without a constraint error. _(done 2026-08-09 — the `work-tracking` job in
      `.github/workflows/ci.yml`. Pinned to Node 24, because the app's jobs run Node 20 and
      `node:sqlite` does not exist there. No `npm ci` and no `needs:` — the tooling has zero
      dependencies, so the gate reports even when the app build is red.)_

**Gate:** ✅ **met (2026-08-09).** `work_tracking/tests/` — 69 assertions, no test framework.
`lib.test.js` rejects **15** malformed record shapes (the seven from restructure §4.3 plus eight
more found while writing it) and accepts valid ones; `workflow.test.js` drives the four CLIs end
to end, including the §4.3 git-conflict recovery.

📌 **One design correction came out of writing those tests.** `checkin.js` first deleted
`work.json` on success, which quietly destroyed the §4.3 recovery procedure — that procedure
resolves a conflict by taking the incoming registry wholesale and re-running check-in, which only
works while `work.json` still holds the intent. It now stamps the file with `checked_in` instead,
and `checkout.js` uses that stamp to tell a finished checkout (safe to replace) from an unfinished
one, so `--force` does not become routine.

---

## Phase 2 — Mechanical import (**326 rows imported**, not the ~315 estimated)

- [x] ✅ `DEBUG_LOG.md` → 49 rows, `type: bug`, `status: done`, `rev: 1`. _(`R-0001`…`R-0049`, pinned `20b4c1a`.)_
- [x] ✅ `FEATURE_MOD_LOG.md` → 89 rows, `type: change`, `status: done`, `rev: 1`. _(`R-0050`…`R-0138`, pinned `df132d0`.)_
- [x] ✅ `BACKLOG.md` → `B1`, `B2`, `B4`, `B5` as `type: task, status: open`; **`Q1` as
      `type: question`** — `BACKLOG.md`'s own heading says open questions are "not tasks until
      answered", so importing it as a task is the §2.2 category error; **`B3` as `status: done`**
      (struck through and marked ✅ — do not import it as open). _(`R-0139`…`R-0144`, pinned
      `4484234`. All four open items re-verified against the code first; all four still hold.)_
- [x] ✅ `PROJECT_PLAN.md` → **182 rows**, each with its `§` as `plan`. _(done 2026-08-09 —
      `R-0145`…`R-0326`.)_ ⚠️ **The count in this plan was wrong, and the gate is what caught
      it.** It said 18 open + 153 done = 171. The file's own legend defines **four** box
      states and all four are in use: `[~]` in-progress **×5** and `[-]` deferred **×5** were
      never counted. There is also **one item written in prose** as a backtick-wrapped box
      instead of a list item (§10d, "A CMS-controlled toggle…", which says "Not started." in
      its own text) — the exact markup trap this plan flagged for `HANDOFF.md`, present here
      too. True total: **153 done · 19 open · 5 in-progress · 5 abandoned**.
      📌 Two things look like boxes and are not, and are excluded by name: the legend itself,
      and a completed item that quotes the notation while describing other entries. The §1
      snapshot table's 27 status cells are workstream roll-ups, not items — importing them
      would have double-counted every section.
      📌 `[-]` maps to **`abandoned`**: the legend reads "deferred/out of scope", the schema
      has no `deferred`, and all five are scope decisions inside §10's Playwright suite.
      Marking them `open` would put five things nobody intends to do into the open-work list.
- [x] ✅ Prose bodies → `work_tracking/records/R-XXXX.md`, with `detail_ref` pointing at them.
      **Do not inline prose into the row** (restructure §3). _(326 files; every body verified as a
      verbatim substring of its pinned origin.)_
- [x] ✅ **Set `source_ref` on every migrated row**, pinned to the commit the content was read from
      (e.g. `BACKLOG.md#B1@4484234`). The origin files are deleted in Phase 5, so an unpinned
      reference stops resolving; a pinned one stays readable via `git show`. This is the audit
      trail that proves nothing was lost in a 315-row bulk import.

### 2b. Index the companion planning documents (owner question, 2026-08-08)

**24 documents, ~5,400 lines**, across `docs/planning/completed/` (16) and `pending/` (8) —
of which **20 get indexed**. The four excluded: the two `code-graph-tooling-*` files (different
workstream) and this workstream's own two design docs, which relocate into `work_tracking/`
rather than being indexed as records.

📌 **Ignore the `pending/` vs `completed/` division** (owner, 2026-08-08) — the owner is moving
all current work-tracking artifacts to `docs/archive/` **by hand**, so the folder split does not
need preserving. Take each document's own `Status:` line as the source of its `status`, not the
folder it happens to sit in.

🔑 **Index them; do not flatten them.** One row per document, with `detail_ref` pointing at the
file **where it already lives** — no move, no rewrite. `multi-mountain-refactor-plan-20260719.md`
is 787 lines; that is a document, not a row, and flattening it would be a large lossy rewrite
that buys nothing a pointer does not. The schema already supports this: a companion plan is just
a bigger `records/` file.

- [x] ✅ One row per document. ~~**17 of the 24 already carry a `Status:` line** that maps
      directly onto `status`; read the remaining 7.~~ _(done 2026-08-09 — `R-0327`…`R-0346`:
      15 done · 3 in-progress · 2 open. ⚠️ **Status-line detection was unreliable and had to
      be settled by reading the headers**: one document carries its status inline on the
      `Created:` line, another carries **two** status lines with the newer wrapping the older.
      One deliberate exception to "use the document's own status" — `playwright-ci-plan.md`
      still says "awaiting owner sign-off" while §10 reads "MAIN PLAN COMPLETE"; imported as
      `done` with the discrepancy in its `note`.)_
- [ ] 🔑 **Separately lift the decisions _inside_ them** as `type: decision` rows —
      `multi-tenant-architecture-decision-20260718.md` and `tenancy-url-model-decision-20260728.md`
      are named for exactly the P2.3 content this restructure exists to capture.
- [x] ✅ 📌 Do **not** sweep in the two untracked `code-graph-tooling-*` files — different
      workstream (restructure §7). _(excluded by name; the importer throws on any other
      unclassified file.)_

📌 Once `status` lives in the registry, the "move the doc between folders and update every link
in the same change" rule in `CLAUDE.md` is obsolete and must be removed in Phase 5.

**Gate:** row count must equal the hand-verified source count, per file, before deleting
anything.

---

## Phase 3 — Judgment work (do not automate)

- [ ] **`HANDOFF.md` open items** — extract by hand or with a markup-specific matcher, then
      **verify the count against a manual read.**
- [ ] 🔑 **Lift the decisions.** These are the P2.3 entries and the reason the restructure is
      worth doing. Read the hand-off end to end once. Known examples: the Firestore-rename
      investigation, the rejected `?type=` fallback, M8's withdrawal, the decision that a
      mountain may not differ in colour, the `useDialog`-vs-red-button finding from colour
      Phase 5, F3's abandoned first fix, and the reversed "one video per post".
      → `type: decision`, with `outcome` and a rationale in `records/`.
- [ ] ⚠️ **Verify every open item against the code before importing it as `open`.** The
      2026-08-02 audit found seven boxes describing work that was already done. Importing those
      as open launders stale claims into a clean-looking store.
- [ ] **De-duplicate.** Several items exist in two files with different wording. One row wins;
      choosing the authoritative wording is a read, not a merge.
- [ ] **Set `split_from` where the history shows a break-out.** Several `PROJECT_PLAN` boxes are
      pieces of a larger workstream rather than independent tasks (§10's admin sub-items, the
      colour plan's phases, the mobile-admin cluster at lines 370–380). ⚠️ Do **not** guess:
      link only where the source text says so, and leave it `null` otherwise. A wrong parent is
      harder to spot than a missing one, because the hierarchy view will look plausible.

---

## Phase 4 — Adjacent fixes (restructure §6)

- [ ] 🔴 **Break up `PROJECT_PLAN.md`'s mega-cells.** It is **332 KB** — larger than `HANDOFF.md`
      — because single table cells run to thousands of words (the multi-tenant row at line 56
      holds the entire M1–M8 history). Unreadable for a human, unparseable for an agent.
- [ ] **Shrink `HANDOFF.md` from 3,295 lines to ~150** — current state, what is in flight, and
      pointers by `id`. This is the single biggest practical win of the restructure.
- [ ] **Apply a size policy.** `docs/handoff/archive/` already holds 33 files; the mechanism
      exists and simply stopped being applied to the living doc.

---

## Phase 5 — Cut over

- [ ] Delete the migrated content from all five origin files **in the same commit** that adds
      its rows. 📌 The owner moves the emptied artifacts to `docs/archive/` by hand afterwards —
      the migration does not relocate files, it only stops them being the live source.
- [ ] 📌 **Rewrite `CLAUDE.md`'s orientation bullets** — the `docs/` and `log/` sections name
      files whose roles are changing. Same change, or agents keep being pointed at files that
      no longer hold the answer.
- [ ] Update the pause notice in `CLAUDE.md`; restart application work (tenancy T0).
- [ ] Run the gates: `npx tsc --noEmit` + `npm run test:smoke`.

**Final gate — the one that actually matters.** ⚠️ Restructure §7: _"the store must not become
write-only."_ Ask a **cold session** a question the store should answer — _"has renaming the
Firestore database been considered?"_ — and confirm it finds the decision without reading
`HANDOFF.md`. If it cannot, the migration has not succeeded regardless of row counts.

---

## Sequencing note

Phases 1–2 are safe to run without owner input. **Phase 3 needs the owner**, because
de-duplication and "is this item actually still open" are judgment calls that depend on intent
the documents do not record. Phase 4 is independent and can slot anywhere after Phase 2.

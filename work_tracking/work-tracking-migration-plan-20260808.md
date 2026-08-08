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
| `docs/planning/PROJECT_PLAN.md` | 18 open (153 done)          | `- [ ]` / `- [x]`       | ✅ yes      |
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
- [ ] **`work_tracking/SCHEMA.md` + `work_tracking/schema.sql`** — field definitions in prose,
      plus the `CREATE TABLE … STRICT` that machine-enforces them. The DDL is normative; the
      prose explains it.
- [ ] **`work_tracking/scripts/lib.js`** — load `registry.ndjson`, build the in-memory db
      (`node:sqlite`, built in on Node 25 — **no new dependency**), fold to current revs.
- [ ] **`work_tracking/scripts/checkout.js`** — `--id R-0142` or
      `--query "status='open' AND plan='§10'"` → writes `work.json`.
- [ ] **`work_tracking/scripts/checkin.js`** — dry-run insert → rollback → append `rev+1` rows for
      **changed items only**. Aborts on any constraint failure, writing nothing.
- [ ] **Referential check in `checkin.js`, scoped to `work.json`** (owner, 2026-08-08) — a
      `split_from` or `supersedes` must point at an `id` present **in `work.json`**, not merely
      somewhere in `registry.ndjson`. Referencing an item you have not checked out is the signal
      that **it should have been checked out first** — you cannot correctly reference an item
      whose current state you never read, and both reference types require writing the target's
      next `rev` anyway (restructure §3.1). ⚠️ SQLite foreign keys cannot cover this at all: the
      primary key is `(id, rev)` and the reference is to `id` alone.
      📌 If a purely informational `related` link is ever added to the schema, it needs an
      exemption from this rule — pointing at a closed item for context should not force a
      checkout.
- [ ] **Enforce `note` on unchanged revisions** — a row whose only differences are `ts` and `rev`
      must carry a `note`, or `checkin.js` will drop it as unmodified (restructure §3).
- [ ] **`work_tracking/scripts/build.js`** — regenerate `registry.md`. Deterministic output: fixed
      column order, `ORDER BY id`, stable formatting.
- [ ] **Add `work.json` to `.gitignore`.** ⚠️ Do this _before_ the first checkout ever runs.
- [ ] **Do NOT add a `merge=union` driver** for `registry.ndjson`. Conflicts are wanted.
- [ ] **CI job** — `registry.md` must equal `build(registry.ndjson)`, and the whole store must
      load without a constraint error.

**Gate:** the seven malformed-record cases from restructure §4.3 must all be rejected, and a
valid record must pass, before any real data is imported.

---

## Phase 2 — Mechanical import (~315 rows: 161 open/history + 154 already-done boxes)

- [ ] `DEBUG_LOG.md` → 49 rows, `type: bug`, `status: done`, `rev: 1`.
- [ ] `FEATURE_MOD_LOG.md` → 89 rows, `type: change`, `status: done`, `rev: 1`.
- [ ] `BACKLOG.md` → `B1`, `B2`, `B4`, `B5`, `Q1` as `status: open`; **`B3` as `status: done`**
      (it is struck through and marked ✅ — do not import it as open).
- [ ] `PROJECT_PLAN.md` → 18 rows `status: open` with their `§` as `plan`; the 153 ticked boxes
      as `status: done`.
- [ ] Prose bodies → `work_tracking/records/R-XXXX.md`, with `detail_ref` pointing at them.
      **Do not inline prose into the row** (restructure §3).
- [ ] **Set `source_ref` on every migrated row**, pinned to the commit the content was read from
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

- [ ] One row per document. **17 of the 24 already carry a `Status:` line** that maps directly
      onto `status`; read the remaining 7.
- [ ] 🔑 **Separately lift the decisions _inside_ them** as `type: decision` rows —
      `multi-tenant-architecture-decision-20260718.md` and `tenancy-url-model-decision-20260728.md`
      are named for exactly the P2.3 content this restructure exists to capture.
- [ ] 📌 Do **not** sweep in the two untracked `code-graph-tooling-*` files — different workstream
      (restructure §7).

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

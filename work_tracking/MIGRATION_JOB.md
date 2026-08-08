# Work-tracking migration — job tracker

> **Live progress tracker for the work-tracking restructure.** Update it as work happens; it is
> the file to read first when resuming this job in a new session.
>
> - **Design + storage decision:** [`./work-tracking-restructure-20260808.md`](./work-tracking-restructure-20260808.md)
> - **Execution sequence:** [`./work-tracking-migration-plan-20260808.md`](./work-tracking-migration-plan-20260808.md)
>
> ✅ Both were relocated into `work_tracking/` on 2026-08-08 (Phase 1, task 1) and all
> references across `AGENTS.md`, `HANDOFF.md` and `PROJECT_PLAN.md` were repointed.
>
> 🙃 **This file is deliberately the last artifact written in the old style.** Once the registry
> is live it should be migrated in and deleted, which doubles as the dogfooding test: if the
> registry cannot track its own migration, it will not track anything else.

---

## Status

|                      |                                                                          |
| -------------------- | ------------------------------------------------------------------------ |
| **Overall**          | 🔄 **IN PROGRESS** — ✅ **Phase 1 complete (12/12).** The tooling works. |
| **Current phase**    | Phase 2 — mechanical import (start with `DEBUG_LOG.md`, 49 rows)         |
| **Blocked on**       | nothing                                                                  |
| **Application work** | ⏸️ PAUSED until Phase 5 lands (tenancy T0 resumes after)                 |
| **Last updated**     | 2026-08-09                                                               |

### Phase progress

| Phase | What                                         | Status         | Needs owner? |
| ----- | -------------------------------------------- | -------------- | ------------ |
| 1     | Tooling — schema, scripts, CI gate           | ✅ 12/12 done  | no           |
| 2     | Mechanical import (~315 rows)                | ⬜ not started | no           |
| 2b    | Index 20 companion documents                 | ⬜ not started | no           |
| 3     | Judgment work — HANDOFF, decisions, dedup    | ⬜ not started | 🔴 **yes**   |
| 4     | Adjacent fixes — PROJECT_PLAN, HANDOFF size  | ⬜ not started | no           |
| 5     | Cut over — delete origins, rewrite CLAUDE.md | ⬜ not started | no           |

Legend: ⬜ not started · 🔄 in progress · ✅ done · ⛔ blocked

---

## Source files — one at a time (owner, 2026-08-08)

🔑 **Work through these one file at a time and tick each column as it completes.** A file is only
`✅ cut over` when its migrated content has been **deleted from the origin in the same commit**
that added the rows. Counts are the verification gate: extracted must equal the hand-verified
source count before anything is deleted.

| #   | Source file                            | Items | Extracted | Count verified | Origin cut | Done |
| --- | -------------------------------------- | ----- | --------- | -------------- | ---------- | ---- |
| 1   | `log/DEBUG_LOG.md`                     | 49    | ⬜ 0/49   | ⬜             | ⬜         | ⬜   |
| 2   | `log/FEATURE_MOD_LOG.md`               | 89    | ⬜ 0/89   | ⬜             | ⬜         | ⬜   |
| 3   | `docs/planning/BACKLOG.md`             | 6     | ⬜ 0/6    | ⬜             | ⬜         | ⬜   |
| 4   | `docs/planning/PROJECT_PLAN.md`        | 171   | ⬜ 0/171  | ⬜             | ⬜         | ⬜   |
| 5   | `docs/handoff/HANDOFF.md` — open items | ~9    | ⬜        | ⬜             | ⬜         | ⬜   |
| 6   | `docs/handoff/HANDOFF.md` — decisions  | ?     | ⬜        | ⬜             | ⬜         | ⬜   |
| 7   | Companion documents (§2b)              | 20    | ⬜ 0/20   | ⬜             | n/a        | ⬜   |

⚠️ **Rows 5 and 6 are the hard ones.** `HANDOFF.md` has no standard `- [ ]` markup, so an
extractor keyed on it returns zero and reports success. Row 6 has no markup at all — those
entries only exist in prose.

### 2b — the 20 companion documents, individually

`docs/planning/completed/` (16):

- [ ] `7a-bake-data-layer-tasks.md`
- [ ] `adoption-promotion-and-cat-adoption-info-plan.md`
- [ ] `butler-media-separation-plan-20260727.md`
- [ ] `complexity-retirement-assessment-20260716.md`
- [ ] `dead-code-removal-assessment-20260711.md`
- [ ] `deployment-cleanup-plan.md`
- [ ] `feeding-station-points-admin-cms-plan.md`
- [ ] `firebase-read-access-inventory.md`
- [ ] `firebase-sdk-usage-inventory.md`
- [ ] `member-media-upload-permissions-20260803.md`
- [ ] `member-post-authoring-20260802.md`
- [ ] `multi-mountain-refactor-plan-20260719.md` (787 lines)
- [ ] `multi-tenant-architecture-decision-20260718.md` 🔑 **lift its decisions too**
- [ ] `phase3-cleanup-plan.md`
- [ ] `playwright-ci-plan.md`
- [ ] `playwright-ci-prerequisite-plan.md`

`docs/planning/pending/` (4):

- [ ] `color-token-centralization-plan-20260805.md`
- [ ] `mountain-2-prerequisites.md`
- [ ] `tenancy-path-migration-plan-20260728.md`
- [ ] `tenancy-url-model-decision-20260728.md` 🔑 **lift its decisions too**

**Excluded, deliberately:** `code-graph-tooling-comparison-20260728.md` and
`code-graph-tooling-evaluation-20260728.md` (different workstream); the two work-tracking design
docs (they now live in `work_tracking/`, they are not records).

### Phase 3 — decisions to lift by hand

Known from the design work. ⚠️ **This list is a starting point, not the full set** — the reason
these are hard is that they have no markup, so the hand-off must be read end to end once.

- [ ] The Firestore-rename investigation (considered, dropped)
- [ ] The rejected `?type=` fallback
- [ ] M8's withdrawal — **withdrawn, not deferred**
- [ ] A mountain may not differ in colour (theme is global)
- [ ] The `useDialog`-vs-red-button finding (colour Phase 5)
- [ ] F3's abandoned first fix
- [ ] "One video per post" — reversed before it was built (2026-07-30)
- [ ] _…others found while reading_

---

## Scale — why this is its own job

| Input                        | Volume                                                       |
| ---------------------------- | ------------------------------------------------------------ |
| Rows to import               | **~315** (49 bugs · 89 changes · 171 plan boxes · 6 backlog) |
| Companion documents to index | **20** of 24 (~5,400 lines)                                  |
| Source prose to read         | **~977 KB** across five files (~250k tokens)                 |
| Decisions to lift by hand    | unknown — no markup to key on                                |
| Scripts to write             | 4 (`lib` · `checkout` · `checkin` · `build`) + CI gate       |

🔑 **The judgment work, not the row count, is what makes this large.** Phases 1–2 are a day of
scripting. Phase 3 requires reading `HANDOFF.md` end to end — 3,295 lines that no session can
hold at once — and cannot be automated.

---

## Session log

Append newest-last. One entry per working session: what moved, what broke, where to resume.

### 2026-08-08 — design settled, nothing executed

- Storage decision closed after ten tests (restructure §4.3). Source of truth is a single
  append-only `registry.ndjson`; SQLite is in-memory only, never written to disk.
- Schema gained `split_from`, `note`, `source_ref` during review.
- Owner set the layout: everything work-tracking lives in root `work_tracking/`, scripts included.
- ✅ Phase 1 task 1 done: `work_tracking/` created, both design docs relocated into it, and the
  seven external references repointed. Two stale claims fixed on the way — `PROJECT_PLAN.md`
  still called the storage medium "open and blocking" and still referenced the abandoned
  `TASKS.md` idea.
- ✅ `work_tracking/schema.sql` committed — the normative DDL, verified against `node:sqlite`:
  14 malformed record shapes rejected, duplicate `(id, rev)` caught (this is the two-sessions-
  edit-the-same-item collision detector), and the derived-staleness + children roll-up views
  both correct. Phase 1 tasks 2-3 now start from working, tested code rather than prose.
- ✅ Owner set schema policy: **not frozen**. Measured which changes are safe — additive ones
  (nullable column, column with DEFAULT, new enum value, CHECK on a new column) leave history
  loadable; restrictive ones (NOT NULL without default, removing an enum value, tightening an
  existing CHECK) retroactively invalidate every old row, because the build re-validates the
  whole store each run. Policy + CHANGELOG now live in `schema.sql`'s header.
- ✅ First schema change already applied: `type` gains **`question`**. `BACKLOG.md`'s Q1 was
  slated to import as `type: task`, but that file's own heading says open questions are "not
  tasks until answered" — the §2.2 category error. Additive, so free.

### 2026-08-09 — Phase 1 complete, the tooling is live

- ✅ **`SCHEMA.md`** written — the prose companion, plus the workflow commands and the
  merge-conflict recovery procedure, which previously existed only inside the design doc.
- ✅ **All four scripts** are in `work_tracking/scripts/`: `lib.js`, `checkout.js`,
  `checkin.js`, `build.js`. Zero dependencies — `node:sqlite` is built in.
- ✅ **`work.json` gitignored** before any script was ever run, per the watch-out.
- ✅ **CI gate** added as the `work-tracking` job: the store must load clean, and `registry.md`
  must equal `build(registry.ndjson)`. Pinned to Node 24 — the app's jobs run Node 20, which has
  no `node:sqlite`. It takes no `needs:` and runs no `npm ci`, so it reports independently of
  the app build.
- ✅ **The store exists and is empty**: `registry.ndjson` (0 rows) with `registry.md` generated
  from it, so the CI gate is green from the start rather than after the first import.
- ✅ **Phase 1 gate met.** `work_tracking/tests/` holds 69 assertions and no test framework.
  `lib.test.js` rejects **15** malformed record shapes — the seven from restructure §4.3 plus
  eight found while writing it — and `workflow.test.js` drives the CLIs end to end.
- 🔑 **Two things the tests changed, both worth knowing:**
  - **`checkin.js` originally deleted `work.json` on success, which silently destroyed the
    §4.3 conflict-recovery procedure.** That procedure resolves a conflict by taking the
    incoming registry wholesale and re-running check-in — which only works while `work.json`
    still holds the intent. It now stamps the file `checked_in` instead, and `checkout.js`
    reads that stamp to tell a finished checkout from an unfinished one. The recovery path is
    now a test, not a paragraph.
  - **Unknown field names are rejected in JS, not left to SQLite.** The insert names its
    columns, so a typo'd field would have been dropped without complaint — the exact
    silent-zero-rows failure §4.3 measured jq for.
- **Next:** Phase 2, one source file at a time per the table above. Start with
  `log/DEBUG_LOG.md` (49 rows, the most regular markup of the five). 📌 Rehearse each import
  against a scratch store first — `WORK_TRACKING_STORE=/tmp/rehearsal` points every script
  somewhere harmless — then verify the count before writing to the real registry.

---

## Decisions made during execution

Record anything settled while doing the work, so it does not get re-litigated. Migrate these
into the registry as `type: decision` once it is live.

| Date       | Decision                                                                | Why                                                                                                                                                                                                             |
| ---------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-08 | Root `work_tracking/` folder, scripts separate from app `scripts/`      | Owner — work tracking is not application code                                                                                                                                                                   |
| 2026-08-08 | Index companion docs, do not flatten them                               | A 787-line plan is a document, not a row                                                                                                                                                                        |
| 2026-08-08 | Owner archives old artifacts to `docs/archive/` by hand                 | Migration stops files being the live source; it does not move them                                                                                                                                              |
| 2026-08-08 | `PROJECT_PLAN.md` + `HANDOFF.md` move into `work_tracking/`             | Owner — they are work-tracking artifacts                                                                                                                                                                        |
| 2026-08-08 | Work source files **one at a time**, ticking each off here              | Owner — a 315-row import will not finish in one session; phase-level ticks lose the resume point                                                                                                                |
| 2026-08-09 | The schema is **not frozen** — change it when that is the best fix      | Owner. Additive changes (new nullable column, new enum value) are free; restrictive ones break history and need a migration                                                                                     |
| 2026-08-09 | `type` gains `question` (additive)                                      | `BACKLOG.md`'s Q1 is an owner question, and its own heading says these are "not tasks until answered"                                                                                                           |
| 2026-08-09 | `checkin` **stamps** `work.json` with `checked_in`; it never deletes it | Deleting it destroys the §4.3 conflict recovery, which replays the intent still held in that file. The stamp also lets `checkout` distinguish a finished checkout from unfinished work, so `--force` stays rare |
| 2026-08-09 | Unknown field names are rejected in `lib.js`, not left to SQLite        | The insert names its columns, so a typo'd field would be dropped in silence — the same silent-zero-rows failure §4.3 measured for jq                                                                            |
| 2026-08-09 | The work-tracking CI job is independent of the app's jobs               | The tooling has no dependencies and needs Node 24 for `node:sqlite` (app jobs run Node 20); an independent job also reports when the app build is red                                                           |

---

## Open questions for the owner

_None currently open._

**Answered:**

| Date       | Question                                                          | Answer                        |
| ---------- | ----------------------------------------------------------------- | ----------------------------- |
| 2026-08-08 | Do `PROJECT_PLAN.md` and `HANDOFF.md` move into `work_tracking/`? | ✅ **Yes** — owner-confirmed. |

---

## Watch-outs carried from the design

- ⚠️ **`work.json` must be gitignored before the first checkout runs.** Found by testing: when
  committed, a branch merge filled it with conflict markers and destroyed the file the recovery
  procedure depends on.
- ⚠️ **No `merge=union` driver on `registry.ndjson`.** It silently accepts two rows claiming the
  same `rev`. The plain git conflict is the wanted behaviour.
- ⚠️ **`HANDOFF.md` has no standard `- [ ]` boxes.** A script keyed on them imports **zero** items
  and reports success.
- ⚠️ **Verify every open item against the code before importing it as `open`.** The 2026-08-02
  audit found seven boxes describing work already done.
- ⚠️ **Move an item and delete its origin in the same change.** A half-migrated backlog is worse
  than either end state.
- 📌 **Never `grep` the store.** Measured: a grep pre-filter found 643 of 1,274 matching rows.

---

## Definition of done

- [ ] All five origin files are no longer the live source of any open item.
- [ ] `registry.md` is generated, committed, and matches `build(registry.ndjson)` in CI.
- [ ] `CLAUDE.md`'s orientation bullets describe the new structure.
- [ ] Application work is un-paused.
- [ ] 🔑 **A cold session can answer _"has renaming the Firestore database been considered?"_ from
      the store alone, without reading `HANDOFF.md`.** Row counts can all be right while the
      store is still write-only; this is the gate that actually matters.

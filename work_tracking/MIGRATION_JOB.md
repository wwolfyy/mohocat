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

|                      |                                                                           |
| -------------------- | ------------------------------------------------------------------------- |
| **Overall**          | 🔄 **IN PROGRESS** — Phase 1 ✅ · Phase 2: **5 of 7** done (346 records). |
| **Current phase**    | Phase 2 — next is `docs/planning/BACKLOG.md` (6 rows, needs judgment)     |
| **Blocked on**       | nothing                                                                   |
| **Application work** | ⏸️ PAUSED until Phase 5 lands (tenancy T0 resumes after)                  |
| **Last updated**     | 2026-08-09                                                                |

### Phase progress

| Phase | What                                         | Status         | Needs owner? |
| ----- | -------------------------------------------- | -------------- | ------------ |
| 1     | Tooling — schema, scripts, CI gate           | ✅ 12/12 done  | no           |
| 2     | Mechanical import (**326** so far)           | ✅ files 1–4   | no           |
| 2b    | Index 20 companion documents                 | ✅ 20/20 done  | no           |
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

| #   | Source file                            | Items | Extracted  | Count verified | Origin cut | Done |
| --- | -------------------------------------- | ----- | ---------- | -------------- | ---------- | ---- |
| 1   | `log/DEBUG_LOG.md`                     | 49    | ✅ 49/49   | ✅             | ✅         | ✅   |
| 2   | `log/FEATURE_MOD_LOG.md`               | 89    | ✅ 89/89   | ✅             | ✅         | ✅   |
| 3   | `docs/planning/BACKLOG.md`             | 6     | ✅ 6/6     | ✅             | ✅         | ✅   |
| 4   | `docs/planning/PROJECT_PLAN.md`        | 182   | ✅ 182/182 | ✅             | ✅         | ✅   |
| 5   | `docs/handoff/HANDOFF.md` — open items | ~9    | ⬜         | ⬜             | ⬜         | ⬜   |
| 6   | `docs/handoff/HANDOFF.md` — decisions  | ?     | ⬜         | ⬜             | ⬜         | ⬜   |
| 7   | Companion documents (§2b)              | 20    | ⬜ 0/20    | ⬜             | n/a        | ⬜   |

⚠️ **Rows 5 and 6 are the hard ones.** `HANDOFF.md` has no standard `- [ ]` markup, so an
extractor keyed on it returns zero and reports success. Row 6 has no markup at all — those
entries only exist in prose.

### 2b — the 20 companion documents, individually

`docs/planning/completed/` (16):

- [x] `7a-bake-data-layer-tasks.md`\1 → **R-0327**
- [x] `adoption-promotion-and-cat-adoption-info-plan.md`\1 → **R-0328**
- [x] `butler-media-separation-plan-20260727.md`\1 → **R-0329**
- [x] `complexity-retirement-assessment-20260716.md`\1 → **R-0330**
- [x] `dead-code-removal-assessment-20260711.md`\1 → **R-0331**
- [x] `deployment-cleanup-plan.md`\1 → **R-0332**
- [x] `feeding-station-points-admin-cms-plan.md`\1 → **R-0333**
- [x] `firebase-read-access-inventory.md`\1 → **R-0334**
- [x] `firebase-sdk-usage-inventory.md`\1 → **R-0335**
- [x] `member-media-upload-permissions-20260803.md`\1 → **R-0336**
- [x] `member-post-authoring-20260802.md`\1 → **R-0337**
- [x] `multi-mountain-refactor-plan-20260719.md`\1 → **R-0338**
- [x] `multi-tenant-architecture-decision-20260718.md`\1 → **R-0339**
- [x] `phase3-cleanup-plan.md`\1 → **R-0340**
- [x] `playwright-ci-plan.md`\1 → **R-0341**
- [x] `playwright-ci-prerequisite-plan.md`\1 → **R-0342**

`docs/planning/pending/` (4):

- [x] `color-token-centralization-plan-20260805.md`\1 → **R-0343**
- [x] `mountain-2-prerequisites.md`\1 → **R-0344**
- [x] `tenancy-path-migration-plan-20260728.md`\1 → **R-0345**
- [x] `tenancy-url-model-decision-20260728.md`\1 → **R-0346**

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

| Input                        | Volume                                                         |
| ---------------------------- | -------------------------------------------------------------- |
| Rows to import               | **326 imported** (49 bugs · 89 changes · 182 plan · 6 backlog) |
| Companion documents to index | **20** of 24 (~5,400 lines)                                    |
| Source prose to read         | **~977 KB** across five files (~250k tokens)                   |
| Decisions to lift by hand    | unknown — no markup to key on                                  |
| Scripts to write             | 4 (`lib` · `checkout` · `checkin` · `build`) + CI gate         |

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

### 2026-08-09 — Phase 2 source file 1 of 7: `log/DEBUG_LOG.md` → `R-0001`…`R-0049`

- ✅ **49 rows imported and the origin cut in the same commit.** `log/DEBUG_LOG.md` is now a
  stub pointing at the registry; its prose lives in `work_tracking/records/R-0001.md` …
  `R-0049.md`, carried over **verbatim**.
- **`scripts/import/dated-log.js`** does the extraction. It covers **both** dated logs —
  `FEATURE_MOD_LOG.md` uses the same `## YYYY-MM-DD — title` markup — so file 2 needs no new
  code, just `--type change --expect 89`.
- 🔑 **`--expect <n>` is mandatory and the script exits non-zero on a mismatch.** The failure
  this migration fears is an extractor that finds nothing and reports success, so the count
  gate is not optional.
- ⚠️ **The `---` rules are NOT the entry separator.** There are 42 of them against 49
  entries, so an importer keyed on them would have silently dropped seven records. It splits
  on `##` headings only, and throws on any `## ` line that does not parse rather than
  skipping it.
- **Fidelity was verified, not assumed:** all 49 bodies are verbatim substrings of the
  source, all 49 titles are found in it, and 99.0% of the source's non-whitespace characters
  are captured. The missing 1,194 characters were accounted for exactly — 434 file-header,
  637 heading markers and dates (dates live in `ts`), 126 `---` rules. No prose was lost.
- 📌 **`work_tracking/records/` is in `.prettierignore`.** Reflowing migrated prose would
  mean the stored text no longer matches what `git show <pin>` returns, which is the audit
  trail. This came straight from Phase 1's lesson below.

### 2026-08-09 — Phase 2 source file 2 of 7: `log/FEATURE_MOD_LOG.md` → `R-0050`…`R-0138`

- ✅ **89 rows imported and the origin cut in the same commit**, with **no new code** — the
  same `dated-log.js` run as `--type change --expect 89`. Pinned to `df132d0`.
- **Fidelity verified the same way:** 89/89 bodies verbatim against the pinned origin, 89/89
  titles found, 98.9% of non-whitespace captured (the remainder being the file header,
  heading markers and `---` rules, as with file 1).
- **The store now holds 138 records**, `R-0001`…`R-0138`, ids unique and continuous: 49
  `bug` + 89 `change`, all `status: done`. Both dated logs are done.
- **Next:** file 3, `docs/planning/BACKLOG.md`. ⚠️ **This is where the mechanical run
  ends.** Only 6 items, but each needs a judgment call the importer cannot make: `B1`, `B2`,
  `B4`, `B5` are `type: task, status: open`; **`Q1` is `type: question`** (the §2.2 category
  error if filed as a task); **`B3` is `status: done`** — struck through and marked ✅, so
  importing it as open would launder a stale claim. Its markup is `## B<n> — title`, not a
  date, so `dated-log.js` does not apply.

### 2026-08-09 — Phase 2 source file 3 of 7: `docs/planning/BACKLOG.md` → `R-0139`…`R-0144`

- ✅ **6 rows imported and the origin cut in the same commit**, pinned to `4484234`. `B1`→
  `R-0139`, `B2`→`R-0140`, `B4`→`R-0141`, `B5`→`R-0142` as open tasks; **`B3`→`R-0143` as
  `done`**; **`Q1`→`R-0144` as `type: question`**.
- 🔑 **`scripts/import/backlog.js` carries a decision table, not an extraction.** The script
  guarantees verbatim prose; a human set every `type`, `status`, `ts` and `files` value, and
  the script throws if the file contains an item the table does not know about — so a new
  backlog entry cannot slip through unclassified.
- ⚠️ **The four open items were re-verified against the code before import**, per the
  watch-out, and all four still hold: `AboutContentEditor` has no upload control and the
  signed-url route still hard-codes `uploads/`; `view-analytics` is catalogued but granted in
  no role and its two readers still have no callers; `npx eslint <file>` still fails on ESLint
  8.57.1; both login pages exist and `/pages/login` still has no 집사등록. **Nothing stale was
  laundered in.**
- **`files` was set on `R-0139` only** — B1 is the one item whose source states its own file
  list, under "Touches:". The others were left null rather than guessed at.
- 📌 **The routing table BACKLOG.md carried is now obsolete**, and the stub says so: a gap, a
  task, a bug, a change and an owner question are one record each separated by `type`, so
  nothing moves between files when it gets scheduled and there is no second place to leave a
  stale copy — which is what the old rule existed to police.

### 2026-08-09 — Phase 2 source file 4 of 7: `docs/planning/PROJECT_PLAN.md` → `R-0145`…`R-0326`

- ✅ **182 rows imported and the boxes cut in the same commit**, pinned to `f66997c`. Each row
  carries its `§` as `plan`. The file went **2,653 → 1,493 lines**; its prose, all 42 headings
  and all 45 table rows survive untouched, with each section's box list replaced by a pointer
  carrying that section's roll-up (`6 items — 0/6 done — now in the work registry`).
- 🔴 **The plan's count of 171 was wrong, and the `--expect` gate is what caught it.** True
  total **182**: 153 done · **19** open · **5** in-progress · **5** abandoned. Three separate
  reasons, all of them the failure mode this migration exists to prevent:
  1. **The file's own legend defines four box states**, and all four are used. `[~]` ×5 and
     `[-]` ×5 were simply never counted — the plan counted `[ ]` and `[x]` only.
  2. **One item is written in prose**, as a backtick-wrapped box inside a numbered paragraph
     (§10d, "A CMS-controlled toggle…", which says "Not started." in its own text). ⚠️ This is
     **the same markup trap the plan flagged for `HANDOFF.md`** — it is here too, and a
     line-anchored extractor misses it silently.
  3. Two things look like boxes and are not, so they are excluded **by name and by content**
     (the script throws if the line moves): the legend itself, and a completed item that
     quotes the notation while describing other entries.
- 📌 **The §1 snapshot table's 27 status cells are roll-ups, not items.** Importing them would
  have double-counted every workstream — 27 phantom records that each duplicate a section.
- ✅ **SUPERSEDED 2026-08-09 — `[-]` now maps to `deferred`.** The owner added the status (see
  the entry below). The source's own heading for these five reads "**Deferred — e2e Phase 8
  (revisit later…)**", so `deferred` is what the file said all along. Original reasoning kept:
- 📌 ~~**Judgment recorded: `[-]` maps to `abandoned`.**~~ The legend reads "deferred/out of
  scope" and the schema has no `deferred`. All five are scope decisions inside §10's Playwright
  suite (WebKit, visual regression, Lighthouse CI…), so `abandoned` reports them more honestly
  than `open`, which would put five things nobody intends to do into the open-work list. Their
  prose still says "deferred" in full. **Flagging it because it is a call, not a fact** — say
  the word if `open` is wanted instead, and it is a one-line change plus a re-import.
- 📌 **`split_from` was left null**, including for the 3 nested boxes. The plan puts it in
  Phase 3 with "link only where the source text says so", and indentation alone is not the
  source saying so. Each nested record's prose records that it was nested, so Phase 3 has what
  it needs.
- **Extraction and the cut share one span computation**, so they cannot disagree about where
  an item begins and ends, and `--cut` refuses to run unless the store already holds exactly
  as many records as the source still yields.

### 2026-08-09 — schema change: `status: deferred`, and it must say why (owner)

- 🔑 **Owner call: `open` and `abandoned` were both being used for parked work**, so
  `status = 'open'` — the question the store exists to answer — returned items nobody could
  start. `deferred` now sits between them, and **a deferred row must carry a non-empty
  `note`**, enforced by `schema.sql`.
- **The boundary:** can you name the condition that would restart it? If yes it is `deferred`
  and the condition is the note; if no, it was decided against and is `abandoned`.
- **Re-classified to `deferred` (7 records, each with its reason), through the normal
  checkout/check-in workflow** — so they are `rev: 2` and the original classification stays in
  the log:
  - `R-0139` (B1, about-photo upload) and `R-0141` (B4, per-file eslint). ⚠️ **I had imported
    these as `open` without flagging it**, while flagging the `[-]` call — and by
    `BACKLOG.md`'s own definition ("known gaps… deliberately not fixed at the time, no date")
    the `open` reading was the worse distortion of the two.
  - `R-0234`…`R-0238` — the five `[-]` items, whose source heading literally reads "Deferred —
    e2e Phase 8 (revisit later, not required for done)".
- 📌 **`R-0140` (B2) and `R-0142` (B5) stay `open`** (owner). Both wait on an owner decision
  rather than on a dependency, so they are actionable by the person who reads the open list —
  which is the point of being on it.
- 🔴 **The change exposed a real bug in `build.js`, of exactly the kind this migration is
  about.** Its `STATUSES` list was hard-coded to four, so the summary silently dropped the 7
  deferred records: per-type totals still read 187 while the columns summed to 180. Fixed, and
  `render()` now **throws** on any `type` or `status` it does not know rather than printing a
  table that does not add up. The next enum addition fails loudly.
- 📌 **A doc correction fell out of it.** The schema-policy table in `schema.sql`, `SCHEMA.md`
  and the restructure doc said "add a `CHECK` to an existing column → breaks history", which
  would have pushed this rule into `checkin.js` — the one place a hand-edited
  `registry.ndjson` bypasses. The real rule is that a change breaks history **iff some stored
  row violates it**, and a `CHECK` conditioned on a **new enum value** never can. Verified
  against all 326 rows before the constraint was added. All three documents now carry the
  exception.
- **Tests: 77 assertions** (was 69) — the constraint rejects a missing and a blank note,
  leaves the other four statuses note-free, round-trips a deferred record through the CLIs,
  and proves `build.js` refuses to drop an unknown value.

### 2026-08-09 — Phase 2b: the 20 companion documents → `R-0327`…`R-0346`

- ✅ **20 rows, one per document, indexed where they already live.** Nothing was moved,
  rewritten or copied into `records/` — `detail_ref` points straight at the file, so
  `multi-mountain-refactor-plan` stays a 787-line document rather than becoming a lossy row.
  **This is the only importer that copies no prose.** All 20 pointers were verified to
  resolve.
- **Set: 16 in `completed/` + 4 in `pending/`.** The two `code-graph-tooling-*` files are
  excluded by name (different workstream), and the two work-tracking design docs already live
  in `work_tracking/`. The script **throws if the directories hold a file the decision table
  does not know**, so a new companion plan cannot slip in unclassified.
- **Statuses came from each document's own header, not its folder** — which mattered:
  `playwright-ci-plan.md` and `playwright-ci-prerequisite-plan.md` both sit in `completed/`
  while `tenancy-path-migration-plan` sits in `pending/` and is genuinely not started.
  Result: 15 done · 3 in-progress · 2 open, and the first **2 `decision` rows** in the store.
- ⚠️ **One deliberate exception to "use the document's own status": `playwright-ci-plan.md`**
  (`R-0341`). Its header still reads "📋 PLAN — awaiting owner sign-off", but `PROJECT_PLAN`
  §10's heading reads "**MAIN PLAN COMPLETE** (merged to `main` 2026-07-16)" and the suite is
  CI-gated. Importing it as a plan awaiting sign-off would have laundered a stale claim — the
  same failure the 2026-08-02 audit found seven of, in the opposite direction. Imported as
  `done`, with the discrepancy in its `note`.
- 📌 **Three documents carry owner-owed remainders and went in as `in-progress`, not `done`**
  (`R-0328`, `R-0333`, `R-0343`) — two say "implemented" but flag an undeployed Firestore
  rule, one has Phase 5 outstanding. Their folder said completed; their own text did not.
- 📌 **Status-line detection was unreliable three times running** and had to be settled by
  reading the headers. `member-media-upload-permissions` carries its status **inline on the
  `Created:` line**, and `playwright-ci-prerequisite-plan` carries **two** status lines, the
  newer one wrapping the older. Same markup family as every other miss in this migration: the
  content is there, the pattern is not where you expect.
- 🔴 **Watch-out for the archive move.** These 20 `detail_ref`s point outside
  `work_tracking/` at `docs/planning/**`. When the owner archives those folders to
  `docs/archive/` by hand, **all 20 links go stale** and must be repointed in the same change.
  The `source_ref` pins mean the content stays recoverable either way, but the links will not
  fix themselves.
- **Still open in §2b:** the second bullet — **lifting the decisions _inside_ the two decision
  documents** as their own `type: decision` rows. That is a read-and-judge pass, so it belongs
  with Phase 3. A third candidate turned up while reading: `firebase-sdk-usage-inventory.md`
  closes by retiring the blanket "Admin SDK is the eventual target for all writes" framing,
  which is a decision the plan had not listed. Noted on `R-0335`.

### 🔴 Found during Phase 2 — for the Phase 3 pass: 15 records cross-reference a stubbed file

**18 references across 15 of the 144 records** point at files that are now stubs, from inside
migrated prose: `DEBUG_LOG.md` ×10, `PROJECT_PLAN.md` ×3, `FEATURE_MOD_LOG.md` ×3,
`HANDOFF.md` ×2. They still resolve — the stub names the record range and links to
`registry.md` — but they are one hop longer than they should be.

⚠️ **Deliberately not patched.** Rewriting them means editing prose that `source_ref` pins to
a commit, which is exactly the audit trail the bulk import rests on. Repointing them at record
ids is a judgment pass over the text, so it belongs with Phase 3's de-duplication rather than
with a mechanical import. 📌 Several of these are the same cross-file duplication Phase 3 has
to resolve anyway — the reference and the duplicate tend to be the same sentence.

📌 **Rehearse every import against a scratch store first** — `WORK_TRACKING_STORE=/tmp/x`
points every script, including the importer's `records/` output, somewhere harmless — then
verify the count before writing to the real registry.

### 2026-08-09 — the pre-commit hook broke the CI gate on its first run

- ⚠️ **Prettier reformatted the generated `registry.md`** during the pre-commit hook, so it
  no longer equalled `build(registry.ndjson)` and `--check` failed immediately after the
  commit that added it. Fixed by adding it to `.prettierignore`: formatting a generated file
  is `build.js`'s job. Worth remembering for any future generated artifact here — the gate
  and the formatter will fight over it, and the gate has to win.

---

## Decisions made during execution

Record anything settled while doing the work, so it does not get re-litigated. Migrate these
into the registry as `type: decision` once it is live.

| Date       | Decision                                                                  | Why                                                                                                                                                                                                             |
| ---------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-08 | Root `work_tracking/` folder, scripts separate from app `scripts/`        | Owner — work tracking is not application code                                                                                                                                                                   |
| 2026-08-08 | Index companion docs, do not flatten them                                 | A 787-line plan is a document, not a row                                                                                                                                                                        |
| 2026-08-08 | Owner archives old artifacts to `docs/archive/` by hand                   | Migration stops files being the live source; it does not move them                                                                                                                                              |
| 2026-08-08 | `PROJECT_PLAN.md` + `HANDOFF.md` move into `work_tracking/`               | Owner — they are work-tracking artifacts                                                                                                                                                                        |
| 2026-08-08 | Work source files **one at a time**, ticking each off here                | Owner — a 315-row import will not finish in one session; phase-level ticks lose the resume point                                                                                                                |
| 2026-08-09 | The schema is **not frozen** — change it when that is the best fix        | Owner. Additive changes (new nullable column, new enum value) are free; restrictive ones break history and need a migration                                                                                     |
| 2026-08-09 | `status` gains **`deferred`**, and a deferred row **must** carry a `note` | Owner. `open` and `abandoned` were both holding parked work, so "what is open?" returned items nobody could start. The note separates parked-with-a-condition from quietly forgotten                            |
| 2026-08-09 | `R-0140` (B2) and `R-0142` (B5) stay `open`, not `deferred`               | Owner. Both wait on an owner decision rather than a dependency, so they are actionable by whoever reads the open list                                                                                           |
| 2026-08-09 | `type` gains `question` (additive)                                        | `BACKLOG.md`'s Q1 is an owner question, and its own heading says these are "not tasks until answered"                                                                                                           |
| 2026-08-09 | `checkin` **stamps** `work.json` with `checked_in`; it never deletes it   | Deleting it destroys the §4.3 conflict recovery, which replays the intent still held in that file. The stamp also lets `checkout` distinguish a finished checkout from unfinished work, so `--force` stays rare |
| 2026-08-09 | Unknown field names are rejected in `lib.js`, not left to SQLite          | The insert names its columns, so a typo'd field would be dropped in silence — the same silent-zero-rows failure §4.3 measured for jq                                                                            |
| 2026-08-09 | The work-tracking CI job is independent of the app's jobs                 | The tooling has no dependencies and needs Node 24 for `node:sqlite` (app jobs run Node 20); an independent job also reports when the app build is red                                                           |

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

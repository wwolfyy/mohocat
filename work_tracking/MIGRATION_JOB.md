# Work-tracking migration — job tracker

> ## ➡️ Migrated. This file is no longer the live tracker.
>
> Its live state — the decisions it had settled and the work it had left — moved into the work
> registry on **2026-08-09** as **`R-0405` … `R-0428`**, and was deleted from here in the same
> commit. **The registry is the tracker now.** What is left below is the session log, kept as
> narrative because a narrative is not state.
>
> 🙃 **This was the dogfooding test the design named on 2026-08-08** — _if the registry cannot
> track its own migration, it will not track anything else_ — and it was sequenced **first**
> rather than last (owner, 2026-08-09), because a test run at the end discovers nothing. See
> **`R-0419`**.
>
> ### Where to resume
>
> ```bash
> node work_tracking/scripts/checkout.js --query "status = 'open'"
> ```
>
> **The open records are the resume point, in id order.** They cannot drift from the work the
> way the hand-written list here did:
>
> | Do this | What                                                                     |
> | ------- | ------------------------------------------------------------------------ |
> | 1st     | **`R-0420`** — Phase 3: lift the decisions inside the two decision docs  |
> | 2nd     | **`R-0421`** — Phase 3: `split_from` on the `PROJECT_PLAN` break-outs    |
> | 3rd     | **`R-0422`** — Phase 3: repoint the 18 refs into stubbed files           |
> | 4th     | **`R-0423`** — Phase 4: `PROJECT_PLAN.md`'s mega-cells                   |
> | 5th     | **`R-0424`** — Phase 4: a size policy, so a living doc cannot grow back  |
> | last    | **`R-0425`**, then **`R-0426`** — Phase 5: rewrite `CLAUDE.md`, un-pause |
>
> Two more sit outside the phase sequence: **`R-0427`** (deferred — repoint 20 `detail_ref`s
> when the archive move happens) and 🔴 **`R-0428`** (open — moving `PROJECT_PLAN.md` and
> `HANDOFF.md` into `work_tracking/`, which `R-0408` settled on 2026-08-08 and **no phase ever
> scheduled**).
>
> ⚠️ **Phase 5 is last and should not start early.** It rewrites `CLAUDE.md` / `AGENTS.md` and
> un-pauses application work; doing that while Phase 3 is open points agents at a structure that
> is still moving.
>
> ### What moved
>
> | Was here                                                  | Is now                                         |
> | --------------------------------------------------------- | ---------------------------------------------- |
> | 14 rows of **Decisions made during execution**            | `R-0405` … `R-0418` — `decision` · done        |
> | **▶️ Resume here** + the phase table                      | `R-0419` … `R-0426` — `task`                   |
> | Phase 2b's archive watch-out                              | `R-0427` — `task` · deferred                   |
> | The one **answered owner question**                       | folded into `R-0408`, not duplicated           |
> | **Definition of done**, the two open boxes                | `R-0425` and `R-0426`                          |
> | **Status** / **Phase progress** / **Source files** tables | gone — they were projections of registry state |
> | **Scale** table, **Watch-outs**                           | the two design docs below                      |
>
> 📌 **The answered owner question is one record, not two.** `SCHEMA.md` §4 says a `question`
> "becomes something else once it is [answered]", and the de-duplication rule this same pass
> imported (`R-0416`) forbids a second copy of a settled fact. It is `R-0408`, a decision, and
> its prose says it began as the question.
>
> 📌 **The 20 companion-document mappings are not restated here** — that is what the store is
> for. `SELECT id, detail_ref FROM current_records WHERE detail_ref LIKE 'docs/planning/%'`, or
> read [`registry.md`](./registry.md).
>
> ### Still the source of truth for the design
>
> - **[`work-tracking-restructure-20260808.md`](./work-tracking-restructure-20260808.md)** — the
>   design, the settled storage decision (§4) and the alternatives that were rejected. The
>   watch-outs this file used to repeat live there.
> - **[`work-tracking-migration-plan-20260808.md`](./work-tracking-migration-plan-20260808.md)**
>   — the five-phase execution sequence.
> - **[`SCHEMA.md`](./SCHEMA.md)** — the field reference and the workflow guide.
> - **The original:** `git show 44e08fe:work_tracking/MIGRATION_JOB.md`.

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

### 2026-08-09 — Phase 2, files 5 and 6 of 7: `docs/handoff/HANDOFF.md` → `R-0347`…`R-0403`

- ✅ **57 records imported and the origin cut in the same commit**, pinned to `2e07e3e`:
  **21 open items** (1 bug · 14 tasks · 6 questions) and **36 decisions**. `HANDOFF.md` went
  **3,396 → ~150 lines**; its body is frozen in `docs/handoff/archive/`.
- 🔑 **The importer keys on nothing structural, because there is nothing to key on.** Every
  record names a `from` anchor that must match **exactly one** line in the file and a `to` anchor
  that ends the span. Ambiguity is a hard error, not "take the first" — this file describes the
  same event in the fresh-session box, the TL;DR **and** the changelog, so a loose anchor would
  quietly capture the wrong paragraph. The script also refuses to run if two spans overlap.
  All 57 bodies were verified as **verbatim substrings** of the pinned source. 🔴 **Corrected
  2026-08-09 — that verification ran against the extracted spans, never against the files on
  disk, and all 57 were written empty. See `R-0429`.**
- 🔴 **Three open items were stale and two more were partly stale — out of 22.** Verifying
  against the code before importing, per the watch-out, is what caught them:
  - **§10d D2, "a CMS-controlled toggle… not started"** — `config/media_control.json` and
    `src/utils/mediaControl.ts` both exist. It shipped as **static config on 2026-08-02**, and
    the same file says so 1,100 lines further up. Not imported as open; `R-0070` already holds it.
  - **"Tap the 이 냥이 링크 chip on a real phone"** (`R-0352`) — verified against production on
    2026-08-08 and recorded as such elsewhere in the same file; the box was never ticked.
  - **"`.env` still sets the pre-migration bucket"** (`R-0358`) — `.env` now names
    `mountaincats-61543`. ⚠️ Its **second** half survives and is what the record now carries:
    anything uploaded from localhost before the change is stranded in a bucket nothing reads.
  - **"Live-verify the auth changes on Preview"** (`R-0349`) — the Kakao halves were done
    2026-08-08; only the orphan-delete half survives, as `R-0348`.
  - **"Post-cutover cleanup"** (`R-0363`) — `about_content/about` was already deleted, and the
    dump half is **worse** than written: seven dumps under `backups/firestore/`, not one, each
    holding an OAuth refresh token and PII.
- 🔑 **De-duplication was measured, not felt (owner's rule: import a decision only when its
  reasoning is recorded nowhere else).** 56 decision-shaped passages survived the read; each was
  probed against all 346 existing records, and **20 were already covered** — mostly because the
  same person wrote `DEBUG_LOG.md` and this hand-off about the same event on the same day, and
  the log entry is the fuller of the two. The 20 stay in the importer's table under
  `COVERED_BY_EXISTING`, naming which record won, so the call is auditable rather than invisible.
- 📌 **The highest-value entries are the ones nothing else held**: the Firestore-database rename
  (`R-0368`), Supabase (`R-0399`), the `?type=` fallback (`R-0369`), the sign-out defect becoming
  structurally impossible (`R-0384`), and the path-based tenancy decision with its authorization
  inversion (`R-0395`). ✅ **The migration's final gate is now passable**: a cold session can
  answer _"has renaming the Firestore database been considered?"_ from `registry.md` alone.
  🔴 **Corrected 2026-08-09: it was not.** `records/R-0368.md` held no reasoning — the gate was
  declared met by reading the row rather than the record. True since the repair (`R-0429`).
- 📌 **Two items were deliberately not imported**, and the importer's header says why: the
  deferred e2e Phase 8 list (already `R-0234`…`R-0238` from `PROJECT_PLAN`), and the
  `mountain-2-prerequisites` line items — re-listing those as rows would reverse the owner's
  2026-07-28 decision that they live in one document. ⚠️ Its **§1.4, the members roster leaking
  every mountain's users, was re-verified live** and is recorded on `R-0384` rather than dropped.
- ⚠️ **The archived body's relative links were repointed one level for the move**, and all 53
  now resolve; its header says so and names `git show 2e07e3e:docs/handoff/HANDOFF.md` as the
  byte-exact original. 📌 The older files in `docs/handoff/archive/` have the same
  moved-file link breakage and were left alone — not this change's business.

### 🔴 Found during Phase 2 — for the Phase 3 pass: 15 records cross-reference a stubbed file

> 📌 **This is now `R-0422`, open.** The finding stays here as narrative; the work is a record.

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

### 2026-08-09 — a browsable `registry.db`, reversing restructure §4's in-memory-only rule

- 🔑 **Owner call: `build.js` now also writes `work_tracking/registry.db`**, and `db.js`
  regenerates only that file on demand. The clause it reverses read _"No `.db` file is ever
  written to disk or committed."_ Reason: the store had no comfortable browser — `registry.md`
  answers "what is open?" but not an arbitrary question, `checkout.js --query` writes its answer
  to `work.json` rather than showing it, and the NDJSON viewer extension the owner tried in
  VS Code did not work. Recorded as **`R-0404`**, with §4 of the restructure doc carrying the
  amendment inline so the original clause is not read as still standing.
- 🔑 **It costs nothing the original decision was protecting, and the reason is worth keeping:
  the three grounds §4.3 settled on — line diffs, a reviewable PR, a real git conflict on a real
  collision — are properties of what is _committed_.** `registry.db` is derived, rebuilt from
  `registry.ndjson`, and **gitignored**, so it has exactly the standing `registry.md` already
  had. A binary committed beside the log would have surrendered all three at once.
- ⚠️ **The surviving rule is narrower and sharper: nothing may ever read the `.db` as input, and
  loading the store must never write one.** The second half is a test — `lib.test.js`'s blanket
  "no .db file is written to disk" became "opening the store writes no database file", plus a
  check that no stray `.db` appears beside it. The first half is a **convention**, and it is the
  one to watch: if a script ever opens `registry.db` to answer a question, the store has quietly
  acquired a second source of truth and the reversal will have cost what it was meant to keep.
- **`VACUUM INTO` does the dump**, against the in-memory database the caller already loaded — so
  the file carries the **views**, which is what makes it worth opening (`current_records` folds
  the log to one row per record). ⚠️ It refuses to overwrite, so the old file is removed first;
  the useful consequence is that a failed run leaves **no** file rather than a stale one.
- 📌 **`--check` writes nothing.** That flag is the CI gate, and a gate that writes a file is no
  longer only checking. `workflow.test.js` pins that, and that `db.js` leaves `registry.md`
  untouched — the whole reason it exists as a second script.
- 🔑 **A count in a document rots within the hour.** This entry's own session added `R-0404`,
  which made "403 records" wrong in **two** files written earlier the same day. Both now point at
  `registry.md` instead of quoting a number. Same lesson as the boxes this migration imported —
  do not restate what the store already answers.

### 2026-08-09 — Phase 3a: this tracker migrated into the registry → `R-0405`…`R-0428`

- ✅ **24 records written and this file stubbed in the same commit**, pinned to `44e08fe`: the
  **14** decisions from the execution table as `decision · done · adopted`, and **10** open
  tasks carrying the remaining phase work. The store went 404 → 428 records.
- 🔑 **The test was whether the store can carry _live_ work, not whether it can hold rows.**
  Every record imported before this one was historical or settled. `R-0419` was checked in
  `in-progress`, the stub was written, then it was checked out again and revised to `done` — so
  the first genuinely iterative record in the store is `rev: 2`, and its earlier revision is
  still in the log. That path had never been exercised outside the tests.
- 🔴 **The migration went in with a gap it had never noticed: `R-0428`.** The owner confirmed on
  2026-08-08 that `PROJECT_PLAN.md` and `HANDOFF.md` move into `work_tracking/`; the move has not
  happened, and **no phase of the plan schedules it**. It survived because it was recorded as a
  decision in a table and as an answered question in another, and neither shape is a piece of
  work anybody reads back. It is an open record now.
- 📌 **A third Phase 4 item was only in the plan document**, not in this tracker's phase table —
  the size policy for `docs/handoff/`. Imported as `R-0424`, because an open list that is
  complete only if you also read a second document is not an open list.
- 📌 **The answered owner question is `R-0408`, one record.** Filing it as both a `question` row
  and a decision row would have broken `R-0416`, the de-duplication rule imported in the same
  pass.
- ⚠️ **What stayed, deliberately:** this session log. It is narrative — what happened, in order —
  and the registry holds state. The tables that were **projections of state** (Status, Phase
  progress, Source files, Scale) are gone; they are what produced the "403 records" rot on
  2026-08-09, inside this very file.
- **Gates:** `node work_tracking/tests/run.js` (85 assertions, 2 files) and
  `node work_tracking/scripts/build.js --check` both green before and after.

### 2026-08-09 — the 57 imported records had no prose in them at all → `R-0429`

- 🔴 **Every record file the `HANDOFF.md` import wrote was header-only**, all 36 decisions
  included. **37,489 characters** of prose were dropped. `renderRecordFile()` read `entry.body`
  when `locate()` returns the body on the **span** — and `Array.join()` renders `undefined` as an
  empty string, so the files came out well-formed and nothing threw.
- ⚠️ **Nothing caught it, and each gate had a defensible reason.** `--expect` counts rows.
  The fidelity check ran against the extracted spans, never re-read off disk. `build.js --check`
  compares `registry.md` to the store, and the rows were perfect. The two test files run against
  a throwaway store, so they never see committed prose.
- 🔑 **It was found by trying to use the store**, not by testing it: `R-0420` requires probing
  new candidates against reasoning already recorded, so `R-0395` and `R-0400` were opened to
  read — and were empty. **That is the argument for doing the judgment passes rather than
  declaring the import done.**
- ✅ **Repaired and pinned.** `handoff.js` fixed; `handoff-rerender.js` re-rendered all 57 from
  the archived body, matching each record to its source entry **by title** with the `source_ref`
  key cross-checked, and touching neither the store nor `registry.md`. New **`tests/store.test.js`**
  is the first suite to check the **real** store — detail_refs resolve, no header-only file, every
  H1 names its own record, no orphaned file — and its assertions were **mutation-tested**, not
  trusted on a first green run.
- 📌 **The previous session's "final gate met" claim was false when written** and is now marked as
  such above. `R-0368.md` was 254 bytes; the gate had been checked by reading the row.

### 2026-08-09 — Phase 3: the decisions inside the three decision documents → `R-0430`…`R-0434`

- ✅ **`R-0420` closed. Fourteen candidates read, five imported, nine dropped as already covered**,
  pinned to `b77e5af`. All three pointer rows (`R-0335`, `R-0339`, `R-0346`) are at `rev: 2` with
  a note saying what was lifted and what was left, so nobody repeats the probe.
- **What went in, and why each survived the de-duplication rule:** the conclusion was often
  already a row, but the **reasoning** was in none. `R-0430` (management-only, not custody — the
  PIPA/billing/continuity trade-off behind `R-0400`'s one-line answer) · `R-0431` (B1 makes
  isolation a correctness property; `hasPermission` had no mountain dimension, so `contacts` PII
  was readable by any `manage-users` holder) · `R-0432` (GA4 property-level permissions;
  dual-tagging deferred) · `R-0433` (the login-friction fix rejected — it means owning a bearer
  credential Firebase does not validate) · `R-0434` (not a one-way door).
- 🔑 **The candidate flagged on `R-0335` was already covered, and the way it is covered is the
  finding.** `R-0192` holds the Admin-SDK framing retirement in full — but `R-0192` is a **`task`
  row** titled "Admin CMS writes un-blocked", so `type = 'decision'` does not return it. The rule
  is satisfied and the store still cannot answer _"what is our stance on Admin SDK versus Client
  SDK writes?"_ **Decisions settled inside task rows are invisible to the query that should find
  them** — worth an owner call, and not specific to this document.
- 📌 **One item deliberately left out:** the framework's §8 "persist storage _paths_, not absolute
  URLs". Still true, and it already forced one full-collection rewrite — but §8 is headed
  _"Historical — do not work from this section"_, so importing it would cut against `R-0378`.
  Flagged rather than filed.
- ⚠️ **`store.test.js` earned its keep the day it was written.** Two of the five new rows had lost
  their code fences (`` `mountain_id` ``, `` `domains` ``) between the record file and the row,
  and the H1 assertion failed the build. Corrected at `rev: 2` rather than by editing the file to
  match the weaker title.

### 2026-08-09 — Phase 3: `split_from` on the `PROJECT_PLAN` break-outs (`R-0421`)

- ✅ **Four links across three parents**, each one a case where the **source text** names the
  parent rather than the layout implying it: `R-0155`→`R-0154` (the dependency is dead because
  the parent replaced it), `R-0170`+`R-0171`→`R-0169` (a heading whose record body is literally
  its own box line — the children are the whole of it), and `R-0322`+`R-0323`→`R-0343` (their
  titles read "U6 (plan Phase 4)" and "U7 (plan Phase 5)").
- **Parent revisions written per `SCHEMA.md` §5:** `R-0169` is the entirely-covered case and gets
  `outcome: superseded`; `R-0154` and `R-0343` are partial, keep their status, and their new
  revision exists only to record that a break-out happened.
- 🔑 **`children_progress` has data for the first time.** `registry.md` now renders
  `R-0343 [in-progress] … (1/2 children done)` — the generated roll-up the schema was designed
  around, which until today had no rows to compute from.
- ⚠️ **The colour plan's Phases 1–3 were left null, and the temptation was real.** U1↔Phase 1,
  U2↔Phase 2, U3↔Phase 3 match by subject matter, but only U6 and U7 spell out "plan Phase N" —
  and the plan itself warns that it numbers §4/§5 (analysis) _and_ Phase 4/Phase 5 (work), so
  matching by number rather than by stated text is a documented trap.
- 📌 **Two of the three expected clusters had no parent to link to.** The mobile-admin items sit
  under a bold line, not a checkbox, so no parent record exists. And "§10's admin sub-items" did
  not survive contact with the source: the whole file has **three** nested boxes and none are in
  §10 — what §10 has is lettered clusters whose grouping the `plan` field already carries.

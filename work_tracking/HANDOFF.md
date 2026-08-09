# 산냥이집냥이 — Engineering Hand-off

> **Read this first, then read the registry.** This file is deliberately short. Everything that
> used to make it long — open items, decisions, the session-by-session narrative — now lives in
> **[`work_tracking/`](./)**, one record per item.
>
> 📁 **The 3,396-line version this replaced is frozen at
> [`archive/2026-08-09-handoff-living-doc.md`](../docs/handoff/archive/2026-08-09-handoff-living-doc.md).**
> Nothing was thrown away: every item and decision it carried was migrated on 2026-08-09, and
> each record's `source_ref` pins the exact commit it was read from.

---

## ▶️ In flight: the work-tracking migration. Application work is PAUSED.

**Owner decision, 2026-08-08.** The current workstream is the restructure of how work is
tracked — not tenancy T0, and not any feature or bug work. **Application work restarts once
Phase 5 lands.**

📄 **The registry is the tracker.** `MIGRATION_JOB.md` was migrated into it and stubbed on
2026-08-09 (Phase 3a — the dogfooding test), so **the open records _are_ the resume point**:

```bash
node work_tracking/scripts/checkout.js --query "status = 'open'"
```

The design and the settled storage decision are in
[`work-tracking-restructure-20260808.md`](./work-tracking-restructure-20260808.md);
the phase sequence is in
[`work-tracking-migration-plan-20260808.md`](./work-tracking-migration-plan-20260808.md).

| Phase | What                                                 | State                        |
| ----- | ---------------------------------------------------- | ---------------------------- |
| 1     | Tooling — schema, scripts, CI gate                   | ✅ done                      |
| 2     | Import all seven source files                        | ✅ done — all 7              |
| 3a    | Migrate the job tracker itself — the dogfooding test | ✅ done — `R-0419`           |
| 3     | Judgment work — dedup, `split_from`, cross-refs      | ✅ done — `R-0420`…`R-0422`  |
| 4     | Adjacent fixes — mega-cells, size policy             | ✅ done — `R-0423`, `R-0424` |
| 5     | Cut over — rewrite `CLAUDE.md`, un-pause             | 🔄 `R-0425` + `R-0428` done  |

### 🔴 Start here, so you do not have to derive it

🎯 **One record left: `R-0426` — un-pause application work.** Everything the migration set out
to do is done. `R-0426` is deliberately its own step and deliberately small: delete the ⏸️ notice
at the top of `AGENTS.md`, delete this file's "application work is PAUSED" heading, and say what
resumes. 🔑 **It is an owner decision, not a cleanup** — un-pausing is a statement about what
happens next, so it does not ride along inside another change.

📌 **Tenancy T0 is the work that resumes**, unless the owner picks something else. See the ⚠️
note further down: no T0 work exists yet, so it starts clean from the plan's §3.

✅ **Phases 1–4 and most of 5 are closed.** `R-0423` made `PROJECT_PLAN.md`'s snapshot table an
index again (**228 KB → 106 KB**, longest line **4,528 → 399**) — half that file was whitespace,
because prettier pads every table cell to the widest one, so one 4,350-character cell was replayed
as padding across all 29 other rows. `R-0424` made the size budgets a **CI gate** rather than a
rule (📏 below). `R-0425` + `R-0428` rewrote `AGENTS.md` around the registry and moved this file
and `PROJECT_PLAN.md` into `work_tracking/`. Along the way `R-0423` found `R-0435`, also done: ten
records the Phase 2 import had truncated mid-sentence are whole again.

⚠️ **`R-0427` stays deferred** — it waits on the owner archiving `docs/planning/**`, which breaks
20 `detail_ref`s in one move. It is the one piece of the migration outside this sequence.

**Before touching anything**, run the three gates — they take seconds and they prove the store is
sane: `node work_tracking/tests/run.js` (**4 files**, 104 assertions),
`node work_tracking/scripts/build.js --check`, and
`node work_tracking/scripts/size-check.js --report`.

⚠️ **Read a record, not just its row. It caught the same import twice, on the same day.** First,
the hand-off import had written **all 57 of its record files with an empty body** — 37,489
characters dropped, because `Array.join()` renders `undefined` as an empty string (**`R-0429`**).
Then `R-0423` found that the same import had **truncated ten records mid-sentence** — `R-0186`
stopped at ``(`uploadDate: new`` — and left four of the dropped tails behind in `PROJECT_PLAN.md`
as orphaned paragraphs (**`R-0435`**). Both are repaired; 4,562 characters were read back out of
the pinned commits. 🔑 Both escaped every gate for the same reason: **a truncated record is still
a valid record**, so counts, determinism and `--check` all stay green. `store.test.js` now asserts
prose is **complete**, not merely present — but the habit is still the real defence.

⚠️ **Tenancy T0 is deferred, not cancelled.** It was asked for and then stood down in favour of
this. **No T0 work exists** — no spec written, no fixture touched. Start clean from
[the plan](../docs/planning/pending/tenancy-path-migration-plan-20260728.md) §3 when it resumes;
its context is `R-0345`, `R-0346` and `R-0395`.

---

## 🔑 How work is recorded now

⚠️ **Do not add entries to `log/DEBUG_LOG.md`, `log/FEATURE_MOD_LOG.md` or
`docs/planning/BACKLOG.md`.** All three are stubs — their content is in the registry, and each
stub says where. `PROJECT_PLAN.md` keeps its prose but its checkboxes are gone; each section
carries a pointer with its own roll-up.

✅ **`AGENTS.md` now describes this structure** (`R-0425`) — its orientation section is the short
version of what follows, so the two must be changed together or they will drift. 📌 `CLAUDE.md` is
a **symlink** to `AGENTS.md`; there is one file, not two.

A bug fixed, a change made, a decision reached, a new task, an owner question — each is one
record:

```bash
node work_tracking/scripts/checkout.js --new     # or --id R-0142 / --query "status='open'"
#   edit work.json — type: bug | change | task | decision | question
#   long prose goes in work_tracking/records/R-XXXX.md, not in the row
node work_tracking/scripts/checkin.js
node work_tracking/scripts/build.js              # regenerates registry.md (+ registry.db)
```

📌 **To just look something up**, either query the store —
`checkout.js --query "type = 'decision' AND outcome = 'rejected'"` — or open
**`work_tracking/registry.db`** in a SQLite browser and read the `current_records` view.
`node work_tracking/scripts/db.js` refreshes that file on its own, leaving `registry.md` alone.
It is generated and gitignored, so deleting it is always safe.

📄 **[`SCHEMA.md`](./SCHEMA.md)** is the field reference and the workflow
guide. **[`registry.md`](./registry.md)** is the human view — open work,
parked work with its reason, and every record.

⚠️ **`registry.md` is generated. Never hand-edit it**; CI fails if it does not equal
`build(registry.ndjson)`. `work.json` is gitignored and is the merge-conflict recovery file — do
not commit it, and do not delete it after a check-in.

📏 **This file has a size budget, and so do seven others.**
[`work_tracking/size-policy.json`](./size-policy.json) holds one per document
and CI fails when a document exceeds it — `node work_tracking/scripts/size-check.js --report`
shows how much room is left. Each budget sits just above the file's real size, so growth needs
someone to **raise the number in a diff**. That is allowed; doing it by accident is not. 🔑 It is
a gate rather than a paragraph because a paragraph is what failed: the archive mechanism was
never missing, it stopped being applied (`R-0424`).

---

## What needs a person, by record

Query the registry rather than trusting a list here — `--query "status = 'open'"` is the
authoritative answer, and this section is the thing most likely to rot. These are the ones worth
naming:

- 🔴 **`R-0348` — the orphan-delete path has never been verified in production.** The last live
  gap, open since 2026-08-01. It is a **PIPA** path: phone and Kakao sign-in mint an Auth account
  before the app decides whether to admit the person. ⚠️ It needs an identity that has **never**
  registered, and **the visible half of the flow proves nothing** — the verification is the
  Firebase Console's Authentication user list. No suite will ever cover it.
- **`R-0347`** — signing out issues an unauthenticated Firestore read whose catch swallows the
  error. Cosmetic today, against the repo's error convention, and ⚠️ **do not "fix" it by
  allow-listing it**.
- **Six owner questions** are waiting, none blocking: `R-0350` (`설명 없음` filler), `R-0353`
  (GA4 `page_view` per cat-modal open), `R-0355` (thumbnails in the CMS's missing-video panel),
  `R-0356`/`R-0357` (the duplicated video 제목; popup precedence), `R-0366` (branch workflow —
  keep `dev`-promotion or move to GitHub Flow).

📌 **Three items in the old hand-off were stale and are imported at their true status** —
the share chip on a phone (`R-0352`), the §10d D2 CMS toggle (covered by `R-0070`), and the
`.env` storage bucket (`R-0358`). Their boxes had never been ticked. That is the rot this
restructure exists to stop.

---

## Where things stand

**Branch:** `dev`. 📌 **Do not trust any commit count written in a document** — a line cannot
count the commit that writes it. **Run `git status -sb` and
`git rev-list --count origin/main..dev`.** ⚠️ **Measure against `origin/main`, never the local
`main` ref**, which is stranded at `26b1879` (2026-03-16).

🎉 **PR #9 merged 2026-08-07** (`f570bcc`, by the owner) — 104 commits, 295 files, live in
production. It was the first promotion since 2026-07-23.

📌 **The 2026-08-09 work-tracking session is committed on `dev` and _not pushed_** (owner will
push). In order: Phase 3a (`7ac3e1d`), the empty-records repair (`e302471`), Phase 3's three
passes (`71e89d4`, `c08b0d5`, `89df1eb`), `R-0423` (`efed947`), the `R-0435` repair (`5ebf4d0`),
`R-0424` (`31eb638`), then `R-0425` + `R-0428`. 📌 **Count them with
`git rev-list --count origin/dev..dev`** rather than trusting this list — a line cannot count the
commit that writes it. The two untracked `code-graph-tooling-*` documents belong to a different
workstream and are not part of any of them.

**Gates**, as of the last application-code session (2026-08-08): `tsc` 0 · smoke 39 · unit 196 ·
**e2e 233 / 13 skipped / 0 failed** · rules 86 · scripts 23. The work-tracking store has its own
CI job, independent of the app build.

⚠️ **`npm run test:e2e` is a gate, not an optional extra** — a UI change shipped on green
tsc/smoke/unit once and broke a spec unnoticed. Run
`export PATH=/usr/local/opt/openjdk/bin:$PATH` first; bare `java` is a runtime-less macOS shim.

---

## Where the deep detail lives

- **[`work_tracking/registry.md`](./registry.md)** — every open item, every
  decision, every bug and change. **This is the source now.**
- **[`docs/planning/PROJECT_PLAN.md`](./PROJECT_PLAN.md)** — cross-workstream prose;
  its per-section pointers carry the roll-ups.
- **[`docs/codebase/`](../docs/codebase)** — per-domain deep dives with watch-outs. Start at
  `CODEBASE_OVERVIEW.md`. _(Snapshots — verify against code before trusting specifics.)_
- **[`docs/manuals/`](../docs/manuals)** — operator how-to for `/admin` and for deployments.
- **[`archive/`](../docs/handoff/archive)** — every frozen hand-off, this file's own history included.
- **[`testing/2026-07-12-e2e-harness-handoff.md`](../docs/handoff/testing/2026-07-12-e2e-harness-handoff.md)**
  — the testing workstream's closed narrative.

---

## How this file works now

**Keep it short.** It says what is in flight, what needs a person, and where things stand —
nothing else. When a chunk of work finishes, **the record changes, not this file**. This file
changes only when the answer to "what is in flight?" changes.

📌 **The previous version grew to 3,396 lines and ~268 KB because every session appended to it.**
It stopped being readable in one sitting, which is the failure the restructure was opened to fix.
If this file starts growing a narrative again, that narrative belongs in a record.

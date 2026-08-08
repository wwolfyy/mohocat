# 산냥이집냥이 — Engineering Hand-off

> **Read this first, then read the registry.** This file is deliberately short. Everything that
> used to make it long — open items, decisions, the session-by-session narrative — now lives in
> **[`work_tracking/`](../../work_tracking/)**, one record per item.
>
> 📁 **The 3,396-line version this replaced is frozen at
> [`archive/2026-08-09-handoff-living-doc.md`](./archive/2026-08-09-handoff-living-doc.md).**
> Nothing was thrown away: every item and decision it carried was migrated on 2026-08-09, and
> each record's `source_ref` pins the exact commit it was read from.

---

## ▶️ In flight: the work-tracking migration. Application work is PAUSED.

**Owner decision, 2026-08-08.** The current workstream is the restructure of how work is
tracked — not tenancy T0, and not any feature or bug work. **Application work restarts once
Phase 5 lands.**

📄 **Start at [`work_tracking/MIGRATION_JOB.md`](../../work_tracking/MIGRATION_JOB.md)** — the
live tracker, with a session log that carries the resume point. The design and the settled
storage decision are in
[`work-tracking-restructure-20260808.md`](../../work_tracking/work-tracking-restructure-20260808.md);
the phase sequence is in
[`work-tracking-migration-plan-20260808.md`](../../work_tracking/work-tracking-migration-plan-20260808.md).

| Phase | What                                          | State                       |
| ----- | --------------------------------------------- | --------------------------- |
| 1     | Tooling — schema, scripts, CI gate            | ✅ done                     |
| 2     | Import all seven source files                 | ✅ done — all 7             |
| 3     | Judgment work — dedup, `split_from`           | 🔄 dedup done; splits to go |
| 4     | Adjacent fixes — `PROJECT_PLAN.md` mega-cells | ⬜ not started              |
| 5     | Cut over — rewrite `CLAUDE.md`, un-pause      | ⬜ not started              |

⚠️ **Tenancy T0 is deferred, not cancelled.** It was asked for and then stood down in favour of
this. **No T0 work exists** — no spec written, no fixture touched. Start clean from
[the plan](../planning/pending/tenancy-path-migration-plan-20260728.md) §3 when it resumes;
its context is `R-0345`, `R-0346` and `R-0395`.

---

## 🔑 How work is recorded now

⚠️ **Do not add entries to `log/DEBUG_LOG.md`, `log/FEATURE_MOD_LOG.md` or
`docs/planning/BACKLOG.md`.** All three are stubs — their content is in the registry, and each
stub says where. `PROJECT_PLAN.md` keeps its prose but its checkboxes are gone; each section
carries a pointer with its own roll-up.

⚠️ **`CLAUDE.md` / `AGENTS.md` still describe the OLD structure.** Rewriting them is Phase 5, so
until then the stubs are what redirect you. **Trust the stub, not the bullet.**

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

📄 **[`SCHEMA.md`](../../work_tracking/SCHEMA.md)** is the field reference and the workflow
guide. **[`registry.md`](../../work_tracking/registry.md)** is the human view — open work,
parked work with its reason, and every record.

⚠️ **`registry.md` is generated. Never hand-edit it**; CI fails if it does not equal
`build(registry.ndjson)`. `work.json` is gitignored and is the merge-conflict recovery file — do
not commit it, and do not delete it after a check-in.

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

**Gates**, as of the last application-code session (2026-08-08): `tsc` 0 · smoke 39 · unit 196 ·
**e2e 233 / 13 skipped / 0 failed** · rules 86 · scripts 23. The work-tracking store has its own
CI job, independent of the app build.

⚠️ **`npm run test:e2e` is a gate, not an optional extra** — a UI change shipped on green
tsc/smoke/unit once and broke a spec unnoticed. Run
`export PATH=/usr/local/opt/openjdk/bin:$PATH` first; bare `java` is a runtime-less macOS shim.

---

## Where the deep detail lives

- **[`work_tracking/registry.md`](../../work_tracking/registry.md)** — every open item, every
  decision, every bug and change. **This is the source now.**
- **[`docs/planning/PROJECT_PLAN.md`](../planning/PROJECT_PLAN.md)** — cross-workstream prose;
  its per-section pointers carry the roll-ups.
- **[`docs/codebase/`](../codebase/)** — per-domain deep dives with watch-outs. Start at
  `CODEBASE_OVERVIEW.md`. _(Snapshots — verify against code before trusting specifics.)_
- **[`docs/manuals/`](../manuals/)** — operator how-to for `/admin` and for deployments.
- **[`archive/`](./archive/)** — every frozen hand-off, this file's own history included.
- **[`testing/2026-07-12-e2e-harness-handoff.md`](./testing/2026-07-12-e2e-harness-handoff.md)**
  — the testing workstream's closed narrative.

---

## How this file works now

**Keep it short.** It says what is in flight, what needs a person, and where things stand —
nothing else. When a chunk of work finishes, **the record changes, not this file**. This file
changes only when the answer to "what is in flight?" changes.

📌 **The previous version grew to 3,396 lines and ~268 KB because every session appended to it.**
It stopped being readable in one sitting, which is the failure the restructure was opened to fix.
If this file starts growing a narrative again, that narrative belongs in a record.

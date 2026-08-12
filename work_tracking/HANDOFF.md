# 산냥이집냥이 — Engineering Hand-off

> **Read this first, then read the registry.** This file is deliberately short. Everything that
> used to make it long — open items, decisions, the session-by-session narrative — now lives in
> **[`work_tracking/`](./)**, one record per item.
>
> The 3,396-line version this replaced is frozen at
> [`archive/2026-08-09-handoff-living-doc.md`](../docs/handoff/archive/2026-08-09-handoff-living-doc.md).
> Nothing was thrown away: every item and decision it carried was migrated on 2026-08-09, and
> each record's `source_ref` pins the exact commit it was read from.

---

## In flight: work-tracking quality. Application work is still PAUSED.

**Owner decision, 2026-08-08, still in force.** The workstream is how work is tracked — not
tenancy T0, and not any feature or bug work. The migration itself finished; what has continued
since is quality work on the result, and that is what the open records below are.

Application work restarts only when `R-0426` lands, and `R-0426` needs the owner — see the next
section. An agent picking this file up should start at "Start here", not at `R-0426`.

**The registry is the tracker, so the open records _are_ the resume point:**

```bash
node work_tracking/scripts/checkout.js --query "status = 'open'" --out /tmp/open.json
```

The design and the settled storage decision are in
[`work-tracking-restructure-20260808.md`](./work-tracking-restructure-20260808.md);
the phase sequence is in
[`work-tracking-migration-plan-20260808.md`](./work-tracking-migration-plan-20260808.md).

### Waiting on the owner — do NOT start these

**`R-0426` — un-pause application work.** ⚠️ **Not a starting point, and not an agent's to take.**
Un-pausing states what happens next, so it cannot ride along inside another change.

The owner half-answered it on 2026-08-09, and `R-0426` rev 2 records the exchange: yes to
un-pausing, and no to tenancy T0, which this record's original title had assumed. The successor
workstream was never named, and naming it is the only thing left. Anything elsewhere in the
repository still calling T0 "the presumed answer" predates that exchange and is superseded.

Every migration phase is closed except `R-0426`. Phases 1–5 and both owner decisions (`R-0436`,
`R-0437`) are done and each has its record; query them rather than reading a summary here.
`R-0427` stays deferred — it waits on the owner archiving `docs/planning/**`, which breaks 20
`detail_ref`s in one move.

### 🔴 Start here: `R-0449`, then `R-0450`–`R-0452`

**`R-0449` — audit the agent's project-status memories against the registry.** Owner-raised
2026-08-13. Nine `type: project` memories hold 38 KB at
`~/.claude/projects/-Users-jp-github-mohocat/memory/`, and most predate the registry, which now
holds the same state authoritatively. One file is half of that total and its front matter
contradicts its own index line. The seven `feedback` memories stay — that guidance is not registry
material. Per file the choice is delete, move to `docs/codebase/`, or keep; the record says why it
is three options rather than two.

**Then the 2026-08-13 tooling review, which has its own order.** `R-0450` makes the pre-commit hook
verify rather than repair — `lint-staged` currently rewrites staged content _after_ the gates have
run, so verified bytes need not be committed bytes. `R-0451` replaces the deprecated `next lint`
with ESLint directly and resolves two configs that disagree. `R-0452` decides whether warnings
should fail. ⚠️ **Do `R-0451` before `R-0452`** — it may change which rules run, so making warnings
fatal first means answering a list that is about to change.

**Before touching anything**, run the four gates — they take seconds and they prove the store is
sane: `node work_tracking/tests/run.js` (5 files, 125 assertions — `link.test.js` was added
2026-08-09),
`node work_tracking/scripts/build.js --check`,
`node work_tracking/scripts/size-check.js --report`, and
`node work_tracking/scripts/link-check.js --report`.

⚠️ **Read a record, not just its row. It caught the same import twice, on the same day.** First,
the hand-off import had written **all 57 of its record files with an empty body** — 37,489
characters dropped, because `Array.join()` renders `undefined` as an empty string (`R-0429`).
Then `R-0423` found that the same import had **truncated ten records mid-sentence** — `R-0186`
stopped at ``(`uploadDate: new`` — and left four of the dropped tails behind in `PROJECT_PLAN.md`
as orphaned paragraphs (`R-0435`). Both are repaired; 4,562 characters were read back out of the
pinned commits. Both escaped every gate for the same reason: a truncated record is still a valid
record, so counts, determinism and `--check` all stay green. `store.test.js` now asserts prose is
**complete**, not merely present — but the habit is still the real defence.

⚠️ **Tenancy T0 is deferred, not cancelled.** It was asked for and then stood down in favour of
this. No T0 work exists — no spec written, no fixture touched. Start clean from
[the plan](../docs/planning/pending/tenancy-path-migration-plan-20260728.md) §3 when it resumes;
its context is `R-0345`, `R-0346` and `R-0395`.

---

## How work is recorded — see `AGENTS.md` §A

**The canonical description is [`AGENTS.md`](../AGENTS.md) §A — Tracking work**, which every
session loads automatically. It has the check-out → check-in → build loop, the record types, the
size policy, and the rules about `work.json`. Deliberately not repeated here: two descriptions of
one workflow is the drift this restructure exists to stop, and this file is supposed to hold only
what changes between sessions.

Three things worth having in front of you while reading the rest of this file:

- **`log/DEBUG_LOG.md`, `log/FEATURE_MOD_LOG.md` and `docs/planning/BACKLOG.md` are stubs.**
  Do not add entries to them. A bug fix is a record with `type: bug`; an intentional change is
  `type: change`.
- 📌 **To just look something up**, pass `--out /tmp/x.json` so the query does not overwrite a
  checkout you have open — or open `registry.db` in a SQLite browser and read `current_records`
  (`node work_tracking/scripts/db.js` refreshes it alone, and it is gitignored).
- ⚠️ **`registry.md` is generated. Never hand-edit it**; CI fails if it does not equal
  `build(registry.ndjson)`.

**This file has a size budget of 250 lines and CI enforces it** —
`node work_tracking/scripts/size-check.js --report` shows the room left. If you are near the limit,
the fix is to delete what has become history, not to raise the number. Two sections were cut on
2026-08-09 for exactly that reason: a note about three stale imports, and a copy of the record
workflow that `AGENTS.md` §A already carried. Both were true; neither was still load-bearing for a
fresh session.

**Marker density is a guideline here, not a gate** (owner, 2026-08-13, `R-0448`). Be judicious
without being stingy: a marker signals only while it is scarce, so reserve ⚠️ for something that
will bite the reader and 📌 for a genuine aside. Roughly one per fifteen lines is the shape, and it
is a judgement call rather than a number to hit.

---

## What needs a person, by record

Query the registry rather than trusting a list here — `--query "status = 'open'"` is the
authoritative answer, and this section is the thing most likely to rot. These are the ones worth
naming:

- 🔴 **`R-0348` — the orphan-delete path has never been verified in production.** The last live
  gap, open since 2026-08-01. It is a **PIPA** path: phone and Kakao sign-in mint an Auth account
  before the app decides whether to admit the person. It needs an identity that has **never**
  registered, and ⚠️ **the visible half of the flow proves nothing** — the verification is the
  Firebase Console's Authentication user list. No suite will ever cover it.
- **`R-0347`** — signing out issues an unauthenticated Firestore read whose catch swallows the
  error. Cosmetic today, against the repo's error convention, and ⚠️ **do not "fix" it by
  allow-listing it**.
- **Seven owner questions** are waiting, none blocking: `R-0144` (should the about page render
  `sections`?), `R-0350` (`설명 없음` filler), `R-0353` (GA4 `page_view` per cat-modal open),
  `R-0355` (thumbnails in the CMS's missing-video panel), `R-0356`/`R-0357` (the duplicated video
  제목; popup precedence), `R-0366` (branch workflow — keep `dev`-promotion or move to GitHub
  Flow). One more sits above, in **Start here**: `R-0426` (un-pause).

**Open work on 2026-08-13: 46 items — 38 tasks · 7 questions · 1 bug.** The bug is `R-0347`, named
above. ⚠️ **That count is a snapshot and will rot** — regenerate it with
`checkout.js --query "status IN ('open','in-progress')" --out /tmp/o.json`.

---

## Where things stand

**Branch:** `dev`. Do not trust any commit count written in a document — a line cannot count the
commit that writes it. **Run `git status -sb` and `git rev-list --count origin/main..dev`.**
⚠️ **Measure against `origin/main`, never the local `main` ref**, which is stranded at `26b1879`
(2026-03-16).

**PR #9 merged 2026-08-07** (`f570bcc`, by the owner) — 104 commits, 295 files, live in production.
It was the first promotion since 2026-07-23.

**Everything since is committed on `dev` and _not pushed_** — the owner pushes. That covers the
whole 2026-08-09 work-tracking session, the 2026-08-12/13 work that landed as `704020d` (192 files,
the `/handoff` skill, `WORKFLOW.md` split out of `SCHEMA.md`, the R1–R4 rules in `AGENTS.md` §A,
`link-check.js` with its CI step and tests, 139 rewritten titles, 52 repaired links), and the
tooling-review records that landed as `a779cc8`. Count them with
`git rev-list --count origin/dev..dev` rather than trusting this paragraph.

⚠️ **The two untracked `code-graph-tooling-*` files in `docs/planning/pending/` belong to a
different workstream. Do not sweep them into a commit** — `git add -A` did exactly that once and
had to be undone.

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
- **[`PROJECT_PLAN.md`](./PROJECT_PLAN.md)** — cross-workstream prose, now a sibling of this
  file; its per-section pointers carry the roll-ups.
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

The previous version grew to 3,396 lines and ~268 KB because every session appended to it. It
stopped being readable in one sitting, which is the failure the restructure was opened to fix. If
this file starts growing a narrative again, that narrative belongs in a record.

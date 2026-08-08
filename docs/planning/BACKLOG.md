# 산냥이집냥이 — Backlog

> ## ➡️ Migrated. This file is no longer the live source.
>
> All **6** items moved into the work registry on 2026-08-09 — **`R-0139` … `R-0144`** — and
> were deleted from here in the same commit.
>
> | Was  | Is now   | As                                                      |
> | ---- | -------- | ------------------------------------------------------- |
> | `B1` | `R-0139` | `task` · open                                           |
> | `B2` | `R-0140` | `task` · open                                           |
> | `B4` | `R-0141` | `task` · open                                           |
> | `B5` | `R-0142` | `task` · open                                           |
> | `B3` | `R-0143` | `task` · **done** — it was struck through here          |
> | `Q1` | `R-0144` | **`question`** · open — not a task until it is answered |
>
> - **Read them:** [`work_tracking/registry.md`](../../work_tracking/registry.md), which links
>   each record to its full prose in `work_tracking/records/R-XXXX.md`, carried over verbatim.
> - **The originals:** `git show 4484234:docs/planning/BACKLOG.md`.
>
> ⚠️ **The four open items were re-verified against the code on 2026-08-09 before being
> imported as open**, rather than taken on trust — this file's own warning about the
> 2026-08-02 audit, which found seven claims that had rotted, applies hardest to a bulk
> import. All four still hold.
>
> ### Where a thing belongs now
>
> The routing table this file used to carry is **obsolete**: a known gap, an active task, a
> bug, an intentional change and an owner question are now one record each, separated by
> `type` rather than by which file they sit in. Nothing has to be moved between files when it
> gets scheduled, and there is no second place to leave a stale copy — which was the failure
> mode the old rule existed to police.
>
> ```bash
> node work_tracking/scripts/checkout.js --query "status = 'open'"
> node work_tracking/scripts/checkin.js
> node work_tracking/scripts/build.js
> ```
>
> See [`work_tracking/SCHEMA.md`](../../work_tracking/SCHEMA.md) §4 for what each `type` means.
>
> 📌 This stub exists because `CLAUDE.md` still points here; it is removed in Phase 5 of the
> [migration plan](../../work_tracking/work-tracking-migration-plan-20260808.md), which
> rewrites those orientation bullets.

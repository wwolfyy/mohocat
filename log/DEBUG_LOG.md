# 산냥이집냥이 — Debugging Log

> ## ➡️ Migrated. This file is no longer the live source.
>
> All **49** entries moved into the work registry on 2026-08-09 as `type: bug` records —
> **`R-0001` … `R-0049`** — and were deleted from here in the same commit, because a
> half-migrated log is worse than either end state.
>
> - **Read them:** [`work_tracking/registry.md`](../work_tracking/registry.md) lists every
>   record; each links to its full prose in `work_tracking/records/R-XXXX.md`, carried over
>   verbatim.
> - **The originals** are still readable at the commit each record pins in its `source_ref`:
>   `git show 20b4c1a:log/DEBUG_LOG.md`.
>
> ### Logging a new bug
>
> Do not add entries here. From `work_tracking/`:
>
> ```bash
> node work_tracking/scripts/checkout.js --new
> # add a record to work.json: type "bug", status "done",
> # with the prose in work_tracking/records/R-XXXX.md
> node work_tracking/scripts/checkin.js
> node work_tracking/scripts/build.js
> ```
>
> See [`work_tracking/SCHEMA.md`](../work_tracking/SCHEMA.md) for the fields and the
> workflow. What made an entry worth writing has not changed: log a bug when the root cause
> was non-obvious or the fix is worth remembering, and keep it short and concrete —
> symptom, root cause, fix, and how it was verified.
>
> 📌 This stub exists because `CLAUDE.md` still points here; it is removed in Phase 5 of the
> [migration plan](../work_tracking/work-tracking-migration-plan-20260808.md), which
> rewrites those orientation bullets.

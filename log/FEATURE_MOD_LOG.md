# 산냥이집냥이 — Feature Modification Log

> ## ➡️ Migrated. This file is no longer the live source.
>
> All **89** entries moved into the work registry on 2026-08-09 as `type: change` records —
> **`R-0050` … `R-0138`** — and were deleted from here in the same commit, because a
> half-migrated log is worse than either end state.
>
> - **Read them:** [`work_tracking/registry.md`](../work_tracking/registry.md) lists every
>   record; each links to its full prose in `work_tracking/records/R-XXXX.md`, carried over
>   verbatim.
> - **The originals** are still readable at the commit each record pins in its `source_ref`:
>   `git show df132d0:log/FEATURE_MOD_LOG.md`.
>
> ### Recording a new change
>
> Do not add entries here. From `work_tracking/`:
>
> ```bash
> node work_tracking/scripts/checkout.js --new
> # add a record to work.json: type "change", status "done",
> # with the prose in work_tracking/records/R-XXXX.md
> node work_tracking/scripts/checkin.js
> node work_tracking/scripts/build.js
> ```
>
> See [`work_tracking/SCHEMA.md`](../work_tracking/SCHEMA.md) for the fields and the
> workflow.
>
> **The bug-versus-change distinction survives the move — it is now the `type` field.**
> "We decided to add, change or remove X" is `type: change`; "X was broken and here is why"
> is `type: bug`. Each entry still wants what changed, the rationale, and how it was
> verified.
>
> 📌 This stub exists because `CLAUDE.md` still points here; it is removed in Phase 5 of the
> [migration plan](../work_tracking/work-tracking-migration-plan-20260808.md), which
> rewrites those orientation bullets.

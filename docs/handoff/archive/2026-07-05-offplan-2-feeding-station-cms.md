# 산냥이집냥이 — Engineering Hand-off (OFF-PLAN #2, 2026-07-05): 급식소 CMS + per-pin labelSide + pin-declutter docs

> **Continuation of the off-plan track**, picking up directly from
> [`2026-07-05-offplan-bugfixes-and-map-config.md`](./2026-07-05-offplan-bugfixes-and-map-config.md)
> (its §6 NEXT list). **Still deliberately off the numbered plan** — we are doing more
> owner-driven fixes/features before returning to the tracked workstream
> ([`PROJECT_PLAN.md §4 Mobile UX`](../planning/PROJECT_PLAN.md)). The numbered series still
> continues from [`handoff-25`](./2026-07-05-handoff-25.md). **More off-plan work is expected
> next**, so the following hand-off will likely be OFF-PLAN #3.

**Date:** 2026-07-05 · **Branch:** `dev` · **Tree:** clean · **HEAD:** `d56b2c3`
**Push state:** `origin/dev` = **`f3f86e3`** (the cleanup + feature commits are **pushed**);
**3 local commits ahead, not pushed** — `df61e85`, `ee17ea8`, `d56b2c3` (see §0).

**Companions:** [off-plan #1](./2026-07-05-offplan-bugfixes-and-map-config.md) (what this continues) ·
[`docs/planning/feeding-station-points-admin-cms-plan.md`](../planning/feeding-station-points-admin-cms-plan.md)
(the CMS plan + task tracker, **implemented**) ·
[`log/FEATURE_MOD_LOG.md`](../../log/FEATURE_MOD_LOG.md) (**2 new**) ·
[`log/DEBUG_LOG.md`](../../log/DEBUG_LOG.md) (**1 new**) ·
[`PROJECT_PLAN.md §4`](../planning/PROJECT_PLAN.md) (labelSide + CMS marked `[x]`).

---

## 0. Commits this session (5) — started from `8a7da28`

```
d56b2c3 docs: describe the three pin-declutter levers across the manuals     [UNPUSHED]
ee17ea8 misc: update rolling cat GIF   (owner-made, outside this work)        [UNPUSHED]
df61e85 fix(admin): let 급식소 coordinate fields be edited mid-value          [UNPUSHED]
f3f86e3 feat(admin): 급식소 CMS + per-pin labelSide override                  [pushed]
b5e7b2a chore: drop dead markercluster dep + fix stale data-flow docs         [pushed]
```

Gates green after each (`tsc --noEmit` + `npm run test:smoke` 25/25; `npm test` 39/39 with the
label unit tests). **Owner pushed `f3f86e3`** to get the Vercel preview + deploy the rule (see §5).

---

## 1. `b5e7b2a` — closed the off-plan #1 NEXT cleanups

Two items straight off off-plan #1 §6:

- **Uninstalled `leaflet.markercluster`** (+ `@types`) — dead since the static clusterer (#1 §2);
  only explanatory comments remain in source.
- **Fixed the stale "points baked at build" claim** in `AGENTS.md` (the real target of the
  `CLAUDE.md` symlink). Home page is **ISR** (`revalidate = 3600`) reading **points + cats
  server-side**; §7a "bake the data layer" is done for the landing map; added a note separating
  ISR-fresh Firestore data from the still-baked `mountains.json` config. PROJECT_PLAN §4 checkbox
  ticked.

## 2. `f3f86e3` — the headline: pin-label rework **+** the 급식소 CMS that authors it

This resolves the **abandoned pin-label feature** from off-plan #1 §4 and builds the CMS that was
its missing prerequisite. One commit because they're interdependent (the CMS is what writes the
new field). Full plan + task tracker:
[`feeding-station-points-admin-cms-plan.md`](../planning/feeding-station-points-admin-cms-plan.md).

**Owner-settled decisions (the design forks off-plan #1 left open):**

- **Mechanism = per-Point Firestore field** (not config-file, not auto-de-collision, not an in-map
  editor). Field: `Point.labelSide?: { mobile?, desktop?: 'above'|'below' }` — **per-device**
  (mobile map is rotated 90°, so collisions differ from desktop). Explicit value overrides the
  automatic edge-flip for that layout; unset = today's auto behaviour.
- **CMS scope = `points` only** (겨울집 stays a disabled placeholder); **permission =
  `manage-canteen`**; **coordinate editing = visual map picker**; **delete = blocked while any cat
  references the point** (`dwelling`/`prev_dwelling`).

**What landed:**

- **Pin-label render:** `Point.labelSide` + `LabelSide` type; pure `resolveLabelAbove` helper
  (`src/utils/mapLabels.ts`) wired into `LeafletMountainMap.tsx`; **6 unit tests**
  (`tests/unit/mapLabels.test.ts`).
- **급식소 CMS** (`/admin/points`, new `src/app/admin/points/page.tsx`): list + add/edit/delete,
  save via the existing (previously-unused) `PointService` client CRUD, `triggerCatRevalidate`
  (reused — it revalidates `/`). Delete-guard blocks removal while cats live at the point and lists
  them.
- **Visual picker** (`src/components/admin/PointMapPicker.tsx`, new): **Leaflet-free** — landscape
  map image with existing pins as context dots; click/drag to place; derives `x`/`y` as % of the
  image.
- **Rule:** `points` write opened from `if false` → `manage-canteen` in `firestore.rules`.
- **Nav** enabled (`admin/layout.tsx`); Korean strings (`adminStrings.points`); admin-manual §4 +
  PROJECT_PLAN §4.

## 3. `df61e85` — coordinate fields: numeric editing + a caret-jump bug fix

- **Numeric coordinate editing** (added in `f3f86e3`, then fixed here): the picker's read-only x/y
  readout became editable **가로/세로 % inputs**, two-way-synced with the marker, rounded to 0.1%.
- **Bug (DEBUG_LOG):** you could only change the **last** digit by typing — a controlled
  number-input bound straight to the parent's number reformatted on every keystroke and **snapped
  the caret to the end**; the arrows worked (whole-value replace) but step 0.1 made it tedious.
  **Fix:** `CoordInput` holds a local **draft string** (`value={text}`), still updates the marker
  live, but re-syncs from the prop only on an external change (map click/drag / edit-load), and
  normalizes on blur. Browser-verified (type `3` at the start of `5` → `35`, not `53`).

## 4. `d56b2c3` — documented the **three ways to declutter pins** across the manuals

Cluttered/overlapping pins now have three documented remedies, described **together** so an
operator sees the whole toolkit and how they differ:

| Lever                                                            | Where                   | Scope & freshness                     |
| ---------------------------------------------------------------- | ----------------------- | ------------------------------------- |
| **1. Label position** (`labelSide`)                              | 급식소 관리 CMS         | per-pin · Firestore · **no redeploy** |
| **2. Coordinates** (x/y)                                         | 급식소 관리 CMS         | per-pin · Firestore · **no redeploy** |
| **3. Mobile clustering** (`map.clustering` / `maxClusterRadius`) | `mountains.json` config | whole-mountain · **redeploy**         |

admin-manual §4 gains an overview table + §9 cross-link; deployment/README.md "Map clustering" gets
a "one of three levers" callout; new-mountain-setup.md `map` bullet expanded (+ a **stale anchor
fixed**). CMS plan doc's "Follow-ups" block records §3 + §4.

---

## 5. What the owner did (end-to-end confirmed)

- **Deployed the Firestore rule** (`firebase deploy --only firestore:rules`) so `points` writes are
  allowed for `manage-canteen`.
- **Authored a real `labelSide` via the CMS** — `하느재 등산로 입구 부근` → 모바일: 위 — which the
  list reads back. So the full loop (CMS write → Firestore → read) is **proven live**, closing the
  one thing this agent couldn't test itself (writes need the deployed rule).

## 6. Notes / gotchas

- **Edge-pin still unsolvable by above/below alone** (carried from off-plan #1 §4): the topmost
  **정상** pin can't be de-collided by label side alone — `below` overlaps 헬기장's thumbnail,
  `above` tucks under the sticky header. `labelSide` fixes interior pins; for 정상 use lever 2
  (nudge coordinates) or 3 (clustering).
- **`labelSide` collisions are width/DPI-dependent** — author against a **real phone** on the live
  site, not the desktop picker.
- **map config vs Firestore data (two mental models):** `labelSide` + coordinates are ISR-fresh
  Firestore data (no redeploy); `map.clustering`/`maxClusterRadius` are baked `mountains.json`
  config (**redeploy**). Now documented in §4-of-manual.
- **`triggerCatRevalidate` reuse:** the points CMS reuses this cat-named helper; it revalidates `/`
  (the map page), which is correct — noted in a code comment. A rename is optional cleanup.

## 7. ⏭️ NEXT (staying off-plan for now)

- **Push the 3 local commits** (`df61e85`, `ee17ea8`, `d56b2c3`) to `origin/dev` when ready →
  Vercel preview. (`f3f86e3`/`b5e7b2a` already pushed.)
- **Still device-owed from off-plan #1 §2:** confirm the durable mobile-pin fix on a **real S22**
  (pinch in/out + pan — pins stay, nothing outside the image, pan not stuck). Unchanged; the one
  open item on that fix.
- **More off-plan fixes/features** (owner-driven) before resuming the tracked workstream.
- **Then resume PROJECT_PLAN §4 Mobile UX** — the on-plan work both off-plan sessions detoured
  around (map re-fit/touch-targets device-owed, mobile perf + sign-in-gated surfaces not started).

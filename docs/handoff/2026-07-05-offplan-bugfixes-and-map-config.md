# 산냥이집냥이 — Engineering Hand-off (OFF-PLAN, 2026-07-05): map pin-loss durable fix + map config knobs

> **Not in the numbered handoff series on purpose.** This session was **off the tracked plan** —
> it did ad-hoc, owner-driven **bug fixes** and **per-mountain map config** work, not the next
> item in [`PROJECT_PLAN.md §4 Mobile UX`](../planning/PROJECT_PLAN.md). Filed separately so it
> doesn't masquerade as planned progress. The numbered series continues from
> [`handoff-25`](./2026-07-05-handoff-25.md).

**Date:** 2026-07-05 · **Branch:** `dev` · **Push:** ✅ `origin/dev` = local `dev` = **`8a7da28`**
(0 ahead / 0 behind after the abandon below) · **Tree:** clean.

**Companions:** [`handoff-25`](./2026-07-05-handoff-25.md) (last numbered) ·
[`log/DEBUG_LOG.md`](../../log/DEBUG_LOG.md) (**2 new**) ·
[`log/FEATURE_MOD_LOG.md`](../../log/FEATURE_MOD_LOG.md) (**1 new**) ·
[`PROJECT_PLAN.md §4`](../planning/PROJECT_PLAN.md) (**1 new** `[x]` + a `[ ]` cleanup todo).

---

## 0. Commits this session (4, all pushed) — started from `9c33428`

```
8a7da28 chore(map): disable mobile clustering for geyang + document the toggle
0572fe1 feat(map): per-mountain mobile clustering toggle (map.clustering)
59123fc fix(map): replace markercluster with zoom-independent static clustering
1b1a678 fix(nav): stop mountain-selector dropdown clipping off the left (w-72 → w-60)
```

Gates green after each (`tsc --noEmit` + `npm run test:smoke` 25/25; `npm test` 33/33 once the
clustering unit tests landed). A 5th piece of work (pin-label position config) was **abandoned** —
see §4.

---

## 1. `1b1a678` — 계양산 dropdown clipped on the left (the first fix)

- **Symptom:** the header mountain dropdown rendered "계양산" as "양산" — its left edge ran off the
  viewport on a phone (and a latent ~15px clip on desktop too).
- **Cause:** the panel is `absolute right-0 w-72` (288px), opening **leftward** from a button in the
  header's **left** group; the button's right edge is content-driven (~257–273px, viewport-
  independent), so the 288px panel's left edge went negative (measured −31px phone / −15px desktop).
- **Fix:** `w-72` → `w-60` (`MountainSelector.tsx`). Harness-verified: panel left −31 → +123 (phone),
  −15 → +139 (desktop). DEBUG_LOG entry added.

## 2. `59123fc` — DURABLE fix for the recurring mobile pin loss (replaced markercluster)

**The headline work.** The recurring S22-only bug (individual thumbnail pins vanish / pins drawn
outside the map / stuck pan after zoom manipulation) was **structural**, not a one-off:
`leaflet.markercluster` builds an **integer-zoom** cluster grid and re-reads `map.getMinZoom()`
**live** (11 call sites; `this._minZoom` cached 0 times), which fought our fractional `CRS.Simple`
zoom + runtime-mutated fill-zoom clamp. Whether a device tripped it depended on where the
viewport-derived `fillZoom` fell vs the integer grid — hence **S22 breaks, Note 9 doesn't**, and
every prior shim (floor-vs-exact clamp, temp-lower-minZoom-by-4, `bounceAtZoomLimits`) only patched
one face of the same coupling → it kept resurfacing.

**Fix — remove the coupling:** replaced markercluster on mobile with our own **static, zoom-
independent** clustering (`src/utils/mapClustering.ts` — pure `greedyClusterByRadius` + `spiderfyRadius`,
8 unit tests). Points are grouped **once** by pixel proximity in the fill view and **never re-clustered
on zoom** → no grid → no device-dependent boundary. Multi-point clusters show a count badge; tapping
fans members on a ring (spiderfy) with legs, collapsing on background tap / any zoom change. Removed
the markercluster import + CSS and the temp-lower-minZoom trick; kept the exact-fill min-zoom clamp
and `bounceAtZoomLimits={false}` (now only image framing). Harness-verified (render, spiderfy,
collapse-on-tap/zoom, member→gallery). DEBUG_LOG entry (supersedes the 4 min-zoom shims below it).

- **`leaflet.markercluster` is now a dead dependency** — `npm uninstall` tracked as a `[ ]` in
  PROJECT_PLAN §4.
- **⚠️ DEVICE-OWED:** the real S22 two-finger pinch in/out that used to trigger the desync — the
  iframe harness can't emulate touch/pinch/DPR. **This is the main thing still owed for closure.**

## 3. `0572fe1` + `8a7da28` — per-mountain clustering toggle, and geyang turned OFF

- Added **`map.clustering`** (`true`/`false`, default `true`) to the `map` block of
  `config/mountains/mountains.json`, alongside `maxClusterRadius`. `false` → every point renders as
  its own pin on mobile (desktop is always un-clustered). Threaded `getMapConfig()` → `MountainViewer`
  → `LeafletMountainMap` → `PointMarkersLayer` (the un-clustered branch now fires on
  `!isMobile || !clustering`). FEATURE_MOD_LOG entry.
- **geyang set to `clustering: false`** (few, well-separated points → individual pins read better).
  Documented the knob in **both** manuals (`admin-manual/README.md` §8, `deployment/README.md`).
  Harness-verified: `false` → 8 pins / 0 clusters; `true` → 4 pins / 2 clusters.
- **Reminder (owner asked):** these config values are a **static JSON import baked at build**, so a
  change needs a `git push` → Vercel rebuild (no runtime dial). Distinct from ISR data freshness —
  see §5.

---

## 4. ⛔ ABANDONED — pin-label position config (per-pin above/below) — TO BE REWORKED

Attempted 5th piece: make the pin **title-label side** (above/below the thumbnail) configurable to
fix mobile label crowding. It went through two shapes and the owner **rejected the approach** and
asked to **discard and rework it**. The staged changes were **discarded** (never committed) —
`git reset` back to `8a7da28`. Recorded here so the rework starts informed, not from zero.

### What was tried (and dropped)

1. First shape: a single per-device default (`map.labelPosition` / `mobileLabelPosition`, `"above"`/
   `"below"`). **Rejected by owner:** moving all labels to one side just relocates the pile-up to the
   other side — same clutter, mirrored.
2. Second shape: per-pin overrides keyed by **pin title** (`map.pinLabels: { "정상": { "mobile":
"above" } }`), per device, layered over the device default; an explicit override was honored
   as-is (bypassing the edge auto-flip). **Also being reworked** (owner wants a different approach).

### Findings worth keeping for the rework

- **The requirement:** control label side **individually per pin**, so a label that overlaps an
  **adjacent pin's thumbnail or label** can be flipped — not a global side.
- **Points aren't `/admin`-editable** (`points` collection is `write:if false`; the 급식소 pages are
  disabled placeholders), so per-pin data can't live in the CMS today. Config-in-`mountains.json` was
  chosen for that reason. If the rework wants per-pin data on the Point itself, note it would be a
  Firestore-console / migration edit (and would reflect via ISR, not a redeploy — see §5).
- **Label geometry:** below-label needs ~52px clearance below the pin; above-label ~68px above. The
  existing **edge auto-flip** (in `PointMarkersLayer`) flips a label off the container edge to avoid
  `overflow:hidden` clipping.
- **Edge-pin no-win (important):** the very top pin **정상** sits so close to the top that `below`
  overlaps **헬기장**'s thumbnail (the two topmost pins stack) while `above` tucks its label **under
  the sticky header** (measured label-top 30 vs container-top 57). At the harness width (386px),
  **정상 ∩ 헬기장 is the _only_ collision** at all-below; a non-edge override (e.g. 중턱 쉼터 → above)
  flipped cleanly with no clip and no new collision. So the mechanism worked for interior pins; the
  edge case is genuinely unsolvable by above/below alone.
- **Harness ≠ device:** collision layout depends on width/DPI, so authoring per-pin overrides should
  be done against a **real device**, not the 386px iframe.

### Open question for the rework (owner to steer)

The owner didn't like the config-file-per-pin approach. Candidate directions to weigh next session:
a smarter **automatic** de-collision (measure label/pin boxes at render and flip the offender —
removes hand authoring); an in-map **admin/editor affordance** to set a pin's side visually; or a
per-Point Firestore field (ISR-fresh, but no CMS UI yet). **Decide the mechanism before coding.**

---

## 5. Notes / gotchas surfaced this session

- **markercluster is gone on the render path but still in `package.json`** — dead dep, uninstall
  pending (PROJECT_PLAN §4 `[ ]`). Don't reintroduce it; the static clusterer is the path now.
- **`CLAUDE.md` is stale on data freshness:** it says home-page **point positions are "baked at
  build (no revalidate)."** Not true anymore — `src/app/page.tsx` has
  `export const revalidate = REVALIDATE_SECONDS` (3600s) and reads **points + cats together**
  server-side. So a **Firestore pin-coordinate edit reflects without a redeploy**, within ≤1h (ISR
  backstop); on-demand `revalidatePath('/')` only fires on admin **cat** edits, not point edits.
  **Worth a `CLAUDE.md` / `docs/codebase` fix** (not done this session).
- **map config = baked JSON**, ISR ≠ that: config knobs (`clustering`, `maxClusterRadius`, and
  whatever the label rework lands on) live in `mountains.json`, imported statically → **redeploy to
  change**. Firestore data (points/cats) is ISR-fresh. Keep the two mental models separate.
- **Verification harness limits (unchanged):** `resize_window` lies; the iframe-at-phone-width
  harness reflows correctly but can't emulate touch/pinch/DPR/orientation, and stalls on the map at
  ≥768px. Real S22 still owes the pinch confirmation for §2.

---

## 6. ⏭️ NEXT

- **Close §2 on a real S22:** pinch in/out repeatedly + pan — confirm pins stay, nothing renders
  outside the image, pan isn't stuck. This is the one open item on the durable pin fix.
- **Rework the pin-label feature** — pick the mechanism first (see §4 open question), then build.
- **Cleanup:** `npm uninstall leaflet.markercluster` (PROJECT_PLAN §4).
- **Doc fix:** correct `CLAUDE.md`'s "points baked at build" claim (§5).
- Resume the actual tracked workstream — **PROJECT_PLAN §4 Mobile UX** — which this session detoured
  around.

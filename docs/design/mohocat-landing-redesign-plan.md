# 산냥이집냥이 — Landing Page Redesign Plan

- **App:** Mountain Cats (https://mohocat.vercel.app) — Next.js, React bundle, deployed on Vercel.
- **Scope:** Enhance the _user-facing_ landing page design (functionality preserved). Admin pages out of scope.
- **Goal:** Improve engagement through a refined, playful (cat-focused) design and more intuitive navigation.
- **Approach:** Restyle existing components; keep map logic, data hooks, auth, and modals intact. Design and functionality stay separable.

---

## Guiding principles

- **Amplify, don't replace.** The satellite-map-with-cat-pins concept is the app's strongest asset. The redesign elevates it rather than reinventing it.
- **Playful, but refined.** Cat-focused warmth expressed through marker styling, micro-interactions, and copy — not clutter.
- **Browse freely, gate actions.** Let visitors explore cats and feeding points without logging in; require an account only for the participatory features.
- **Phase the work.** Desktop landing ships first (Phase 1). Mobile + map-engine migration follows (Phase 2), with all decisions already settled below.

---

## Phase 1 — Desktop Landing Page (immediate deliverable)

### 1. Intro card (engagement onboarding)

- A small, **dismissible** card floating over the **bottom-left** of the map.
- Single line of copy: **"지도의 고양이 사진을 클릭해보세요"**
- Playful touch: a small cat-ear / paw accent icon and a subtle bounce-in on load.
- Stays minimal — no multi-line description, no stats. One clear nudge.

### 2. Feeding-point pins (markers)

Each pin represents a **feeding point / habitat** (not an individual cat). Clicking a pin opens a modal with a thumbnail list of the cats living at that point, each linking to a cat detail view. **This modal/click behavior is unchanged** — only the marker visuals and hover state are restyled.

- **At rest:** circular cat-avatar + **white ring** (separation from satellite background) + a **downward pointer/tail** above the avatar (classic map-marker shape) to signal "this is a clickable marker." The pointer is brand-yellow with a soft shadow, so avatar + ring + pointer read as one cohesive cat-marker. The label moves from above to below the avatar.
- **Hover:** **enlarge the pin** (scale ~1.25×). **Leave the old 3×-size yellow ring**.
- Accepted tradeoff: the enlarged pin may briefly overlap nearby labels on desktop. This is fine at current pin density.
- Desktop pins are small and well-separated enough that **no clustering is needed on desktop.**

### 3. Top navigation (grouped)

Reduce the flat 9-item row into grouped top-level items with dropdowns.

| Top-level    | Dropdown contents                                    |
| ------------ | ---------------------------------------------------- |
| **냥이들**   | (map / home — default view)                          |
| **동참** ▾   | 소개, 동참, **입양홍보**                             |
| **갤러리** ▾ | 사진첩, 동영상                                       |
| **소식** ▾   | 공지, FAQ, **입양홍보** _(intentionally duplicated)_ |

- **Right side of header:** **집사메뉴** (급식현황, 집사톡) · **로그인**
- **입양홍보** is the priority CTA: in addition to living inside the dropdowns, surface it as a **standalone emphasized button** (filled, brand-yellow) in/near the header.
- **Login-gated items:** 집사메뉴 (급식현황, 집사톡) render **enabled/clickable only when logged in**. When logged out, show them disabled/greyed with a tooltip such as **"먼저 로그인 하세요"**.

### 4. Header treatment

- Add a **frosted-glass (backdrop-blur) bar** so the nav stays legible over any part of the map as it pans/zooms (Phase 2).
- Give the logo lockup slightly more presence — the cat avatar is a strength; let it sit a touch larger alongside the wordmark.
- Reduce the hight of the header bar to give just enough space between the components in the header and the top border.

### 5. Out of scope for Phase 1

- Map zoom/pan controls and clustering (these arrive with the Phase 2 engine migration).
- Any change to the map's underlying data model on desktop.

---

## Phase 2 — Mobile + Map Engine Migration

### Why migrate the map

The current map is a **static satellite image** with pins positioned as **percentages relative to the image** (not GIS coordinates). On mobile this produces two distinct problems:

1. **Overlap** — pins and labels collide in dense areas near the viewport.
2. **Edge clipping** — pins near the image border render partly outside the viewport; some are cut off entirely.

A real map engine fixes **both**: clustering solves overlap, and viewport padding / pan-into-view / fit-to-bounds solves edge clipping. Hand-rolling pan/zoom **and** clustering **and** edge padding on a static image would reproduce a worse version of what the engine already does.

### Engine choice: Leaflet (`CRS.Simple` + image overlay)

- Keep the **exact hand-framed satellite image** as the "world" via `L.imageOverlay` + `L.CRS.Simple`. **No external tiles, no API keys, no usage cost** — same zero-cost profile as today.
- **React integration:** use `react-leaflet` (+ a markercluster wrapper). Leaflet touches `window`, so the map component **must be client-side only** — dynamic-import with `ssr: false` in Next.js to avoid hydration errors.
- **Marker styling carries over exactly:** use `L.divIcon` with custom HTML/CSS, so the circular cat-avatar + white ring + pointer-tail + hover-scale from Phase 1 are preserved.
- **Modal unchanged:** attach the existing "open cat-list modal" click handler to the Leaflet marker instead of the current overlay element.

### Coordinate migration

- Convert pin positions from **percentages** to **image-pixel coordinates** (a one-time, mechanical, lossless conversion: `x% / y%` × image dimensions, with the `y` axis mapped to the image's pixel space via the Simple CRS bounds).

### Clustering — mobile only

- **Width-based switch:** enable the markercluster layer **below a fixed viewport-width breakpoint**; render plain markers on desktop. Width-based chosen over touch-detection for predictability.
- **Plugin:** `Leaflet.markercluster`.
- **Cluster marker styling:** on-brand and playful — e.g. a stack/fan of mini cat-avatars or a circle with cat ears, **always showing a count badge** (e.g. "3") so users read it as "multiple feeding points here."
- **Cluster hover:** gentle scale-up (consistent with single-pin hover) + tooltip like **"고양이 급식소 3곳 — 펼치기"**.

### Opening clusters — Spiderfy-first

- Tapping a cluster **fans its members out** (spiderfy) into individually tappable markers. Ideal at this scale (≤ ~15 feeding points total; spiderfy is comfortable for ~2–6 members per cluster).
- **`disableClusteringAtZoom`: NOT set.** This keeps behavior predictable — clusters persist until genuinely separated by zoom, and spiderfy always remains available as the escape hatch. (Setting it would force-dissolve clusters at a zoom level and could prevent spiderfy from firing on truly-overlapping pairs — explicitly avoided.)

### Behavior guarantees (verified during discussion)

- **Spiderfy is a property of a cluster, not the map.** It only fires when a cluster marker is tapped. Once pins are individual (cluster dissolved), tapping a pin runs the normal modal handler — spiderfy does not kick in.
- **"Clustered vs. individual" is governed solely by `maxClusterRadius` + zoom**, not by spiderfy.
- **Edge case to accept:** if two feeding points are so close that they stay within `maxClusterRadius` even at `maxZoom`, that one cluster is spiderfy-only (never dissolves by zoom). This is intended fallback behavior, acceptable at current data density.

### Zoom tuning (reduced, not eliminated)

Spiderfy-first removes the fussy "tune zoom thresholds so clusters break apart cleanly" work. What remains:

- **`minZoom` / `maxZoom`:** unavoidable — `minZoom` fits the whole image to a narrow mobile viewport; `maxZoom` caps pinch-in before the satellite image degrades. Independent of clustering.
- **`maxClusterRadius`:** the **main tuning knob** — set so the right (overlapping/edge) pins cluster on mobile without lumping distant feeding points together.
- **`maxBounds` + `maxBoundsViscosity`** and **fitBounds padding:** set so no pin ever sits flush against the viewport edge (fixes edge-clipping).

---

## Open items / next steps

1. **Brand tokens:** lock the brand-yellow value, typography, and the cat-marker component spec so Phase 1 and Phase 2 stay visually consistent. Tokens are now defined in `tailwind.config.js` (single source of truth) and documented in `docs/design/design.md`; the remaining step is final sign-off on the proposed brand-yellow value.
2. **Phase 2 prerequisites:** confirm image dimensions for the pixel-coordinate conversion; identify the tightest pin pair to validate `maxClusterRadius` behavior.

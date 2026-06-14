# 산냥이집냥이 — Landing Redesign Task List

Companion to [`mohocat-landing-redesign-plan.md`](./mohocat-landing-redesign-plan.md).
Section references (§) point back to that plan. Design decisions live in
[`design.md`](./design.md); token values live in
[`tailwind.config.js`](../../tailwind.config.js).

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` deferred/out of scope

---

## Phase 0 — Foundation (design tokens)

- [x] Define `brand` / `accent` / `ink` tokens in `tailwind.config.js` (single source of truth)
- [x] Write `design.md` design reference (intent + usage, no duplicated values)
- [x] **Final sign-off on the brand-yellow value** (`brand.DEFAULT = #FACC15`, the deployed value — zero visual regression)
- [x] Migrate existing CTA gradients `from-yellow-400 to-orange-300` → `from-brand to-accent` across 12 user-facing components (value-identical rename; admin screens left untouched, out of scope)
- [x] Adopt `text-ink` for text on the brand-gradient buttons (17 buttons; `text-black` → `text-ink`)

> Phase 0 complete. Verified: old tokens gone from user-facing code, Tailwind emits `from-brand`/`to-accent` at the same hex as before, admin screens unchanged. Note: `MountainViewer` marker still uses solid `bg-yellow-400`/`text-black` — intentionally deferred to the Phase 1 marker restyle (§2) rather than double-touched here.

---

## Phase 1 — Desktop Landing Page

### 1. Intro card (§1) — `src/components/IntroCard.tsx`

- [x] Dismissible card floating over **bottom-left** of the map _(browser-verified; fixed: was `fixed` to viewport → landed below the letterboxed map, now `absolute` inside the map container)_
- [x] Single-line copy: **"지도의 고양이 사진을 클릭해보세요"**
- [x] Cat-ear / paw accent icon (`FaPaw` in a brand-gradient chip)
- [x] Subtle bounce-in on load (`animate-dropdown-enter` card + `animate-bounce-gentle` paw)
- [x] Persist dismissed state via `localStorage` (so it doesn't re-nag on every visit)

### 2. Feeding-point pins / markers (§2) — visuals only, click→modal behavior unchanged

- [x] At rest: circular cat-avatar + **white ring** (existing `border-2 border-white`)
- [x] Downward **pointer/tail** above the avatar (brand-yellow triangle, `drop-shadow-md`); gap above the pin tuned via `bottom-[calc(50%_+_1.6rem)]` in `MountainViewer.tsx` so it clears the 40px avatar instead of penetrating it
- [x] Move label from above → **below** the avatar (removed per-point special-casing)
- [x] Avatar + ring + pointer read as one cohesive marker (both hover-scale together)
- [x] Hover: enlarge pin (`scale-125`) with the large brand ring (recolored to `border-brand`) _(BUG FOUND & FIXED: `animate-bubble-pop` had `fill-mode: both`, which pinned the avatar's transform and suppressed `group-hover:scale-125` — the avatar never grew. Changed to `fill-mode: backwards`. Browser-verified: hovered avatar + pointer both report computed `scaleX 1.25`.)_
- [x] Existing modal/click handler untouched — browser-verified: clicking a pin opens the cat-gallery modal (`현재 거주 중` / `예전에 거주`)
- [x] Closes Phase 0 deferral: marker `bg-yellow-400`/`text-black` → `bg-brand`/`text-ink`

### 3. Top navigation — grouped (§3) — `Navigation.tsx` + new `NavDropdown.tsx`

- [x] Collapse the flat 9-item row into grouped top-level items
- [x] ~~**냥이들** top-level item~~ — **removed per request** (logo wordmark + the 계양산 냥이들 selector already lead home)
- [x] **동참 ▾** → 소개, 동참, 입양홍보
- [x] **갤러리 ▾** → 사진첩, 동영상
- [x] **소식 ▾** → 공지, FAQ, 입양홍보 _(intentional duplicate)_
- [x] Right side: 집사메뉴 (급식현황, 집사톡) · 로그인
- [x] Dropdown enter animation (`animate-dropdown-enter`); hover + click, Escape/outside-click close
- [x] Per-item `useResourceAccess` gating preserved (no access regression)

### 4. 입양홍보 priority CTA (§3)

- [x] Standalone emphasized button (brand-gradient, `text-ink`) in the header (desktop + mobile)

### 5. Login-gated items (§3)

- [x] 집사메뉴 (급식현황, 집사톡) clickable **only when logged in** (`useAuth().isAuthenticated`) — enabled state browser-verified (logged in: dropdown opens)
- [x] Logged-out: disabled/greyed + tooltip **"먼저 로그인 하세요"** — browser-verified logged out: `<span aria-disabled="true">`, `title="먼저 로그인 하세요"`, gray-300, `cursor: not-allowed`

### 6. Header treatment (§4) — `src/app/layout.tsx`

- [x] Frosted-glass bar (`bg-white/80 backdrop-blur-md`), sticky (ready for Phase 2 overlay)
- [x] Logo lockup more presence (avatar 28→36px, wordmark `text-xl font-bold`, brand glow)
- [x] Reduce header bar height (`pt-4 pb-1` → `py-2`)

### 7. Footer (added during review) — `src/components/Footer.tsx`

- [x] Footer added to ground the page (addresses the "unfinished" feel below the map)
- [x] Real content now: site name, "비영리 고양이 커뮤니티" note, © {dynamic year}
- [x] **Placeholders** for `개인정보처리방침` / `이용약관` (greyed, "준비 중") — kept inert on purpose
- [ ] Make the legal links live once the policy pages exist — tracked separately in [`docs/compliance/compliance-plan.md`](../compliance/compliance-plan.md) (compliance, not design)

> **Phase 1 browser-verified** against `localhost:3000` via the Claude-in-Chrome extension (`tsc --noEmit` also clean). Confirmed live: frosted grouped header, `동참` dropdown opens, `입양홍보` CTA, marker pointer/label/white-ring, **avatar hover-scale (after bug fix)**, pin→modal, and the intro card over the map bottom-left + dismiss/persist.
> **Two fixes made during verification:** (1) marker avatar hover-scale was broken by `animate-bubble-pop`'s `fill-mode: both` → changed to `backwards`; (2) intro card was anchored to the viewport (landed below the letterboxed map) → moved into the map container with `absolute`.
> **All Phase 1 items now browser-verified, logged in AND logged out** (the 집사메뉴 disabled/tooltip state was confirmed in a logged-out session).
> **Post-verification tweaks (per review):** removed the `냥이들` top-level nav item (logo + selector already lead home); lifted the marker pointer (`1rem` → `1.6rem`) so it clears the avatar; added a footer (§7) with placeholder legal links pending the compliance workstream.

### Deferred (carried into redesign work)

- [-] Reconcile legacy `.btn-primary` in `globals.css` (currently blue) with the brand-yellow CTA direction

---

## Phase 2 — Mobile + Map Engine Migration (Leaflet)

> **Revised after Phase 1.** Phase 1 built the markers and intro card as **React +
> async data** (not static HTML), added a sticky frosted header + footer, and
> locked brand tokens. The ⚠️ items below reconcile Phase 2 with that reality —
> the original plan understated them.
>
> **Resolved decisions (gating Phase 2):**
>
> - **Architecture:** ONE Leaflet map for desktop + mobile. Desktop **zoom enabled (free)**; clustering **mobile-only**. (Not a separate desktop renderer — single marker codebase, per design.md.)
> - **Marker rendering:** **pre-resolved `divIcon`** on both viewports — resolve each point's thumbnail once at map level, bake plain HTML into the icon; hover/pulse via Leaflet events. (The React marker is rewritten once in source; at runtime it's cheap string templating, not a per-serve conversion. Plain desktop pins are built once per load and just repositioned on pan/zoom; only mobile cluster/spiderfy transitions rebuild pin DOM.)
> - **Map height:** **full-height map** (fills viewport below header), footer below the fold — resolves the desktop dead-space.
> - **Pop animation:** **kept on desktop, dropped on mobile.** Desktop pins are un-clustered → DOM created once, repositioned (not rebuilt) on pan/zoom, so the pop fires once on load. Mobile cluster/spiderfy transitions rebuild pin DOM, so it's dropped there. Marker-HTML builder takes an `animate` flag (true desktop / false mobile); keep the `fill-mode: backwards` fix and the thumbnail preloader.

**▶ Status (2026-06-14 handoff):** P2-1 ✅ (tightest pair found) · P2-2 ✅ (Leaflet deps installed, tsc clean). **Resume at P2-3** — scaffold the client-only Leaflet map (and do the CSS import there). Then P2-4 → P2-9 in order. Nothing else in Phase 2 has been started; no Leaflet code written yet.

### Prerequisites (§ Open items)

- [x] Confirm satellite **image dimensions** — `public/images/screenshot_mt_geyang_50.png` is **1616 × 808 px** (≈2:1, NOT 16:9). CRS.Simple bounds = `[[0,0],[808,1616]]`. The current `aspect-[16/9]` box and the `new Image()` 1600×900 fallback are both wrong and get removed.
- [x] Identify the **tightest pin pair** — **정상 (5%, 25%) ↔ 헬기장 (11%, 24.5%)**, ≈ **97 px (6% of the 1616×808 image)**. 8 points total. `maxClusterRadius` must cluster this pair on a narrow viewport without lumping distant points.
- [x] ✅ **Marker rendering strategy — RESOLVED: pre-resolved `divIcon` (both viewports).** Why: `Leaflet.markercluster` only clusters real Leaflet marker layers, so mobile clustering **forces real `L.divIcon` markers** (React overlays wouldn't cluster). Implementation: resolve each point's chosen cat thumbnail once at map level (fetch cats per point, pick thumbnail) and bake a plain `<img>` + marker markup into the `divIcon` HTML string — no live React inside the marker. Hover/pulse via Leaflet `mouseover`/`mouseout` + CSS.

### Engine setup (§ Engine choice)

- [x] Add deps: `leaflet@^1.9.4`, `react-leaflet@^4.2.1`, `leaflet.markercluster@^1.5.3` (+ `@types/leaflet`, `@types/leaflet.markercluster`) — installed, `tsc` clean
- [ ] ⚠️ Import stylesheets: `leaflet/dist/leaflet.css` + markercluster CSS (else map/markers render broken)
- [ ] Client-only map component — dynamic import with `ssr: false` (Leaflet touches `window`)
- [ ] `L.imageOverlay` + `L.CRS.Simple` with bounds `[[0,0],[808,1616]]` (no tiles/keys)
- [ ] ⚠️ **Remove obsolete static-image scaffolding** in `MountainViewer.tsx`: the `rotate-90`/counter-rotation, `--mobile-scale-factor` / `--mobile-point-counter-scale-factor`, the manual aspect-ratio math, and the `new Image()` dimension loader (+ 1600×900 fallback) — all superseded by CRS.Simple.
- [ ] ⚠️ Re-add the **compass / north arrow** (`arrow_north.svg`) as a Leaflet control/overlay (today it's an abs-positioned img inside the rotated container).
- [ ] ⚠️ **z-index reconciliation** — sticky header is `z-30`; Leaflet panes/controls run ~200–1000. Keep the header (and footer + intro-card overlay) above Leaflet panes.

### Map container sizing (folds in the deferred "Option A")

- [ ] Size the Leaflet container to **fill the viewport below the sticky header** (`100dvh − header`, footer below the fold — RESOLVED) — resolves the Phase 1 desktop dead-space. Use `100dvh` so mobile browser bars don't clip/jump.
- [ ] ⚠️ **Preserve the IntroCard overlay** — it now lives _inside_ `MountainViewer`'s relative wrapper (`absolute` bottom-left). Keep it as an overlay over the new Leaflet container.

### Coordinate migration (§ Coordinate migration)

- [ ] Convert pin positions **percentages → image-pixel coords** (`x% × 1616`, `y% × 808`, mapped into the CRS.Simple bounds). `Point` is `{ id, x, y, title }` with x/y as %.

### Markers — carry Phase 1 visuals into Leaflet (§ Marker styling carries over)

- [ ] Reimplement the marker (avatar + white ring + brand-yellow pointer above + label below) per the chosen strategy; keep brand-token classes **literal** (`bg-brand` / `text-ink` / `border-t-brand` / `border-brand`) so Tailwind JIT generates them.
- [ ] ⚠️ Re-create **hover-scale** (`scale-125` on avatar+pointer) and the **large pulse ring** via Leaflet `mouseover`/`mouseout` (or CSS `:hover` on the marker root) — Tailwind `group-hover` + React `activePoint` state won't survive the port as-is.
- [x] ✅ **Entrance pop (`animate-bubble-pop`) — RESOLVED: kept on desktop, dropped on mobile.** Desktop pins are un-clustered → DOM persists, so the pop fires once on load (not on pan/zoom). Mobile cluster/spiderfy rebuilds would re-fire it, so it's omitted there. Implement via an `animate` flag on the marker-HTML builder; render desktop markers in a plain (non-cluster) layer; keep the `fill-mode: backwards` fix + thumbnail preloader.
- [ ] Attach the existing modal handler to the marker (`handlePointClick` → `CatGallery`, unchanged).

### Clustering — mobile only (§ Clustering)

- [ ] Width-based switch: markercluster below a fixed viewport-width breakpoint; plain markers on desktop
- [ ] Cluster marker styling: on-brand/playful (stack/fan of mini avatars or circle with ears) + **count badge**
- [ ] Cluster hover: gentle scale-up + tooltip (e.g. "고양이 급식소 3곳 — 펼치기")

### Opening clusters — spiderfy-first (§ Opening clusters)

- [ ] Tap cluster → spiderfy members into tappable markers
- [ ] Confirm `disableClusteringAtZoom` is **NOT** set
- [ ] Verify: spiderfy fires only on cluster tap; individual pins run the normal modal handler

### Zoom / bounds tuning (§ Zoom tuning)

- [ ] `minZoom` (fit whole image to narrow mobile viewport) / `maxZoom` (cap before image degrades)
- [ ] Tune `maxClusterRadius` (main knob) so overlapping/edge pins cluster without lumping distant points
- [ ] `maxBounds` + `maxBoundsViscosity` + `fitBounds` padding so no pin sits flush against the viewport edge

---

## Scope notes

- Desktop **moves to the Leaflet engine too** (so it gains pan/zoom), but stays **un-clustered** — clustering is mobile-only.
- [-] No change to the map's underlying **data model** (still `Point {id, x, y, title}`; only the % → pixel coordinate read changes).
- [-] **Admin (`react-admin`) screens** — out of scope entirely.

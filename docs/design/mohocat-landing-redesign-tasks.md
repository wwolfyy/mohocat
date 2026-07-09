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

**▶ Status (2026-06-14 handoff):** P2-1 ✅ (tightest pair) · P2-2 ✅ (deps, tsc clean) · P2-3 ✅ (client-only Leaflet map scaffolded + CSS imported + old static-image scaffolding removed; **browser-verified** — image renders on `CRS.Simple`, full-height below header, pan/zoom works, console clean). New files: `src/components/LeafletMountainMap.tsx` (the map) + `MountainViewer.tsx` rewritten as its host. · P2-4 ✅ (%→pixel coords + thumbnail pre-resolution) · P2-5 ✅ (divIcon markers + modal + hover/pulse/pop, avatar hover 1.5) · P2-6 ✅ (compass = `react-icons` `LuCompass` overlay, top-right; browser-verified) · z-index reconciliation ✅ · P2-7 ✅ **mobile clustering** (`useIsMobile` width switch at 768px; markerClusterGroup w/ eared count-badge cluster icon; tap→spiderfy; `maxZoom={4}` bugfix; browser-verified both viewports). · P2-8 ✅ (desktop/viewport-independent part): `maxZoom={2}` (4× native cap, verified), `maxBounds`/no-flush verified, restore/fit good. Deferred to post-rotation (mobile-geometry-dependent): `maxClusterRadius` + final mobile `minZoom`. (Container is `width:100vw` now, so the old header-height-in-calc item is moot.) · **Mobile 90°-CW rotation ✅** (pre-rotated portrait image + `pointToLatLng` transform + `useIsMobile` hook + keyed remount; compass→right; resolves short-portrait map; browser-verified). · Deferred mobile tuning ✅ (`maxClusterRadius=50` + mobile `minZoom=−3` confirmed well-calibrated, no change) · **P2-9 ✅** — deleted orphaned `src/components/RandomCatThumbnail.tsx` (logic lives in `usePointMarkers`; no remaining imports, tsc clean); final desktop verification pass: full-width map, 8 pins, hover (1.5× + pulse ring), click→`CatGallery` modal loads, north-up compass, footer flush, console clean. Mobile verified earlier this session (rotation/clustering/spiderfy/compass-right/no-gaps/single-control) — shared marker path, unaffected by the deletion. **🎉 Phase 2 (Leaflet migration) complete.**

### Prerequisites (§ Open items)

- [x] Confirm satellite **image dimensions** — `public/images/screenshot_mt_geyang_50.png` is **1616 × 808 px** (≈2:1, NOT 16:9). CRS.Simple bounds = `[[0,0],[808,1616]]`. The current `aspect-[16/9]` box and the `new Image()` 1600×900 fallback are both wrong and get removed.
- [x] Identify the **tightest pin pair** — **정상 (5%, 25%) ↔ 헬기장 (11%, 24.5%)**, ≈ **97 px (6% of the 1616×808 image)**. 8 points total. `maxClusterRadius` must cluster this pair on a narrow viewport without lumping distant points.
- [x] ✅ **Marker rendering strategy — RESOLVED: pre-resolved `divIcon` (both viewports).** Why: `Leaflet.markercluster` only clusters real Leaflet marker layers, so mobile clustering **forces real `L.divIcon` markers** (React overlays wouldn't cluster). Implementation: resolve each point's chosen cat thumbnail once at map level (fetch cats per point, pick thumbnail) and bake a plain `<img>` + marker markup into the `divIcon` HTML string — no live React inside the marker. Hover/pulse via Leaflet `mouseover`/`mouseout` + CSS.

### Engine setup (§ Engine choice)

- [x] Add deps: `leaflet@^1.9.4`, `react-leaflet@^4.2.1`, `leaflet.markercluster@^1.5.3` (+ `@types/leaflet`, `@types/leaflet.markercluster`) — installed, `tsc` clean
- [x] ⚠️ Import stylesheets: `leaflet/dist/leaflet.css` + markercluster CSS (else map/markers render broken) _(in `LeafletMountainMap.tsx`; browser-verified: zoom controls render styled)_
- [x] Client-only map component — dynamic import with `ssr: false` (Leaflet touches `window`) _(`MountainViewer` now `dynamic(() => import('./LeafletMountainMap'), { ssr: false })`; no SSR `window` crash)_
- [x] `L.imageOverlay` + `L.CRS.Simple` with bounds `[[0,0],[808,1616]]` (no tiles/keys) _(browser-verified: satellite image renders, pan/zoom interactive, console clean)_
- [x] ⚠️ **Remove obsolete static-image scaffolding** in `MountainViewer.tsx`: the `rotate-90`/counter-rotation, `--mobile-scale-factor` / `--mobile-point-counter-scale-factor`, the manual aspect-ratio math, and the `new Image()` dimension loader (+ 1600×900 fallback) — all superseded by CRS.Simple. _(Done: `MountainViewer` rewritten as the map host — preload + IntroCard + dynamic map; old scaffolding gone.)_
- [x] ⚠️ Re-add the **compass / north arrow** — replaced the hand-drawn `arrow_north.svg` (user disliked it) with a minimal **compass needle** in `Compass.tsx`: a small "N" over a custom inline-SVG two-tone diamond needle (red north / light south — the universal convention), white + drop-shadow, **no chip**. HTML overlay pinned top-right of the map (map never rotates → static cue, not a Leaflet control; `pointer-events-none`). Iterated: `LuCompass`-in-chip (too heavy) → `LuArrowUp` (ambiguous) → needle SVG. `arrow_north.svg` kept (still a fallback img in an admin page). _(Browser-verified; needed the z-index fix below.)_
- [x] ⚠️ **z-index reconciliation** — root cause found: `.leaflet-container` has `z-index:auto` and no transform/isolation, so it forms **no stacking context** → its panes (200–700) and controls (1000) bubble into the parent context and paint over `z-30` overlays. Fixed by raising the in-map overlays to **`z-[1100]`** (`Compass` + `IntroCard`; IntroCard had the same latent bug, only hidden because it's persisted-dismissed). The sticky header (layout, `z-30`) stays above the whole map because the map container's `-translate-x-1/2` transform makes it a self-contained stacking context that sits at `z-auto` in the body flow, below the header. _(Footer is below the fold; no overlap. Browser-verified: compass visible top-right.)_

### Map container sizing (folds in the deferred "Option A")

- [x] Size the Leaflet container to **the image's exact 2:1 aspect ratio** so the map fills the frame at default zoom with **no letterbox** (per user — the earlier full-height `100dvh−header` container letterboxed the 2:1 image). **`width: 100vw`** + `aspectRatio: 1616/808`, centered via `left-1/2 -translate-x-1/2` breakout. _(Iterated: a `min(100vw, (100dvh−3.5rem)*2)` height-cap version was tried but on wide+short windows it left side gray-bars and inset the zoom/compass controls; user chose **always fill width** instead — the map is now edge-to-edge and the controls reach the viewport edges, at the cost of the 50vw-tall map dipping slightly below the fold on short windows. Browser-verified at 1440×769: leaflet container = full 1440 width, all 8 pins, controls/compass at edges, console clean.)_
- [x] ⚠️ **Preserve the IntroCard overlay** — it now lives _inside_ `MountainViewer`'s relative wrapper (`absolute` bottom-left). Keep it as an overlay over the new Leaflet container. _(IntroCard kept in the map host's relative wrapper, layered over the map; renders when not persisted-dismissed.)_

### Coordinate migration (§ Coordinate migration)

- [x] Convert pin positions **percentages → image-pixel coords** (`x% × 1616`, `y% × 808`, mapped into the CRS.Simple bounds). `Point` is `{ id, x, y, title }` with x/y as %. _(In `PointMarkersLayer`: `lng = x%×1616`, `lat = 808 − y%×808` — **y flipped** because `imageOverlay`'s `[0,0]` is the bottom-left. Browser-verified: 정상↔헬기장 tight pair lands top-left as expected. Fetch architecture unchanged — Firestore `points` → `getPointService` → props.)_

### Markers — carry Phase 1 visuals into Leaflet (§ Marker styling carries over)

- [x] Reimplement the marker (avatar + white ring + brand-yellow pointer above + label below) per the chosen strategy; keep brand-token classes **literal** (`bg-brand` / `text-ink` / `border-t-brand` / `border-brand`) so Tailwind JIT generates them. _(`buildMarkerHtml()` bakes plain HTML into an `L.divIcon` (className `mohocat-pin`, `iconAnchor [20,20]`); thumbnail resolved once at map level by `usePointMarkers` (lifts the random-pick out of the now-orphaned `RandomCatThumbnail.tsx` — flagged for P2-9 deletion). Browser-verified: all 8 pins render with avatar/ring/pointer/label.)_ The pointer triangle carries a **dark outline** (`filter: drop-shadow(0 0 1px rgba(0,0,0,.85)) drop-shadow(0 1px 1.5px rgba(0,0,0,.5))`) so it stays distinguishable when it overlaps the yellow label of the pin above (both are brand-yellow). **Edge-aware label (2026-06-15):** bottom-edge pins flip their label _above_ the avatar (`buildMarkerHtml`'s `labelAbove`) so it isn't clipped by the container's `overflow:hidden` — decided deterministically (no runtime measurement) from the pin's displayed vertical position vs a `1 − 52/containerHeight` band (so it's correct for both the short desktop map and the tall portrait mobile map). Affects mobile 팔각정 부근 (lowest individual pin); desktop pins don't reach the band.
- [x] ⚠️ Re-create **hover-scale** (`scale-125` on avatar+pointer) and the **large pulse ring** — done via **CSS `group`/`group-hover`** on the baked divIcon HTML (no Leaflet events, no React state): the `.mohocat-pin` root carries `group`; avatar uses `group-hover:scale-150`, pointer `group-hover:scale-125`, label `group-hover:scale-110`, and the `w-48 h-48 border-brand animate-pulse` ring is `hidden group-hover:block`. _(Browser-verified by measuring computed transforms: hovered avatar = scale 1.5, pointer = 1.25, ring `display:block`; hover-out → scale 1, ring `display:none`. The label/pointer overflow the 40×40 icon box but are DOM descendants, so they still trigger the group hover.)_
- [x] ✅ **Entrance pop (`animate-bubble-pop`) — kept on desktop, dropped on mobile.** Implemented via the `animate` flag on `buildMarkerHtml(marker, animate)` — `PointMarkersLayer` passes `true` (desktop, un-clustered plain layer → pop fires once on load); the future mobile cluster path will pass `false`. Avatar is absolutely centered with `-translate-…-1/2` to match `bubble-pop-dramatic`'s keyframe transform; `fill-mode: backwards` (globals.css) keeps the pop from pinning `group-hover:scale-125`. _(Browser-verified: avatar `animationName = bubble-pop-dramatic`, and after the pop the resting scale is exactly 1 with hover-scale still reaching 1.25 — the Phase 1 sticky-transform bug is absent.)_
- [x] Attach the existing modal handler to the marker (`handlePointClick` → `CatGallery`, unchanged). _(Marker `click` → `onPointClick(pointId)` → `MountainViewer`'s `selectedPointId` → `CatGallery`. CatGallery rendered **outside** the `-translate-x-1/2` map container so its `position: fixed` isn't captured by the transform. Browser-verified: click opens centered modal, close works.)_

### Clustering — mobile only (§ Clustering)

- [x] Width-based switch: `useIsMobile()` (matchMedia `max-width: 767px`, re-evaluates on resize) → mobile uses `L.markerClusterGroup`, desktop the plain `L.layerGroup`. _(Browser-verified: 390px clusters the close pair into a "2"; 1440px shows all 8 individual.)_
- [x] Cluster marker styling: on-brand circle (brand→accent gradient, white ring) with **cat ears** + **count badge**, via `iconCreateFunction`→`buildClusterHtml`. _(Verified: the "2" cluster shows ears + count.)_
- [x] Cluster hover: gentle scale-up (`hover:scale-110`) + tooltip (native `title="고양이 급식소 N곳 — 펼치기"`).

### Opening clusters — spiderfy-first (§ Opening clusters)

- [x] Tap cluster → spiderfy members into tappable markers — `zoomToBoundsOnClick:false` + manual `clusterclick`→`cluster.spiderfy()` so it spiderfies at any zoom. _(Browser-verified: tapping "2" fans out the two cat markers.)_
- [x] Confirm `disableClusteringAtZoom` is **NOT** set _(not set; `spiderfyOnMaxZoom:false` since we spiderfy manually)_
- [x] Verify: spiderfy fires only on cluster tap; individual pins run the normal modal handler _(individual markers keep their `click`→`onSelect`→CatGallery)_
- [x] **Bugfix:** `leaflet.markercluster` requires a finite `maxZoom`; the map had none (only `minZoom`), so `markerClusterGroup` threw "Map has no maxZoom specified" → error-boundary retry loop ("Maximum update depth"). Fixed by adding `maxZoom={4}` (and `minZoom={-3}` so the whole image still fits a narrow mobile viewport). Final zoom caps in P2-8.

### Mobile orientation — rotate map 90° CW (user preference) — dedicated step, ~after P2-8

> The source image is **landscape** (1616×808); on a portrait phone the full-width 2:1 map is very short. The old impl rotated the mobile map **90° clockwise** (north → right) so the long axis fills the tall screen. **User wants this back** — and it's the real fix for the "mobile map too short" item below.

- [x] Implemented mobile 90°-CW rotation the **native** way (Option A — pre-rotated image + coord transform; no CSS-container hack).
  - Rotated PNG generated with `sips --rotate 90` → `public/images/screenshot_mt_geyang_50_rot90cw.png` (808×1616, verified CW: green patch → top-right).
  - `LeafletMountainMap`: `getLayout(isMobile)` picks landscape vs portrait image + bounds; `pointToLatLng(point, isMobile)` rotates each pin (mobile: `lat=(1−x)·1616`, `lng=(1−y)·808`). `MapContainer` is **keyed on `isMobile`** so it remounts on the breakpoint switch (crs-plane bounds + image can't swap live). `isMobile` now comes from a shared `src/hooks/useIsMobile.ts` (also used by `MountainViewer`).
  - `MountainViewer`: container `aspectRatio` flips to `808 / 1616` (portrait) on mobile so the rotated map fills the tall screen — **this resolves the "mobile map too short" item.**
- [x] Flip the **compass** to point right on mobile — whole compass `rotate-90`, with the "N" counter-rotated (`-rotate-90`) to stay upright; label → "북쪽은 오른쪽".
- [x] Keep Firebase + `Point` model untouched (rotation is render-time only). _(Browser-verified: portrait map fills screen, compass→right, pins rotated correctly, 정상↔헬기장 cluster "2", spiderfy→정상/헬기장, pin→gallery; desktop unchanged; console+tsc clean.)_
- [x] **Remove gaps around the map + footer flush** (user): the map page wrapped in padded `<main>`s left gaps above/below. Fixed — `page.tsx` `<main>`: removed `min-h-screen` (forced ≥viewport height → empty space below the shorter map, esp. mobile), `pt-[3.5rem]` (56px mobile top gap, redundant with the sticky header), and `pb-4`/`md:pb-8`; `layout.tsx` `<main>`: dropped `pb-8` (the footer's own `border-t`+`py-6` separates). _(Browser-verified: header→map = 0, map→footer = 0 on both desktop and mobile, footer now directly below the map.)_
- [x] **Mobile: drop the +/− zoom buttons** (user — pinch / double-tap still zoom), keep only the fill/restore control: `zoomControl={!isMobile}` on `MapContainer`. _(Browser-verified: mobile has only the fill button; desktop keeps +/−.)_

### Zoom / bounds tuning (§ Zoom tuning)

- [x] **Modifier-gated wheel zoom** (UX fix — full-height map was trapping page scroll). Leaflet `scrollWheelZoom` disabled; a custom `wheel` listener zooms toward the cursor only on `⌘/Ctrl` (also covers Mac trackpad pinch, which emits `⌘`+wheel), plain wheel falls through to page scroll. `zoomSnap={0}` for smooth zoom + exact fit; `zoomDelta={0.25}` so the +/− buttons step a quarter level (1.19× per click; default 2× and 0.5→1.41× both felt too steep). _(Browser-verified: plain scroll over map reaches the footer & doesn't zoom; synthetic ⌘+wheel grew the image layer 1790→3117px with `defaultPrevented`; one +-click measured at 1.19× scale.)_
- [x] **Default/restore view shows the ENTIRE image** (fit/contain) + **restore-view control** — `applyFit()` = `map.fitBounds(bounds)` (no padding: the container is sized to the image's 2:1 ratio so the image fills it exactly; closest pin x≈5% clears the edge); a `MapViewController` applies it on mount and registers a Leaflet "전체 보기" maximize-icon control (stacked under the zoom buttons) that snaps back to it. _(Reverted an earlier `getCoverView` "fill the viewport" approach — cover cropped the edges where pins live, per user. Browser-verified: full image visible incl. the previously-cropped top-left field & bottom-right buildings; restore works; console clean on clean load.)_
- [x] **`maxZoom={2}`** (cap before image degrades) — = 4× native (1616→6464px); browser-verified the cap holds (`+` disables at max) and 4× is still legible. _(Was 4 = 16× = too blurry.)_
- [x] **`minZoom={-3}`** — finalized post-rotation. The rotated portrait image (1:2) fills the 1:2 mobile container **exactly** (fit ≈ −1.05), and `-3` is comfortably below that so the whole map shows un-clamped. Kept at −3 (safe for all viewport widths; the restore control recovers any over-zoom-out). No change needed.
- [x] Tune `maxClusterRadius` — evaluated on the rotated geometry: **50 is well-calibrated.** It clusters the two genuinely-close pairs (정상↔헬기장, 하느재입구↔공원관리소) into "2" badges while leaving the four spread pins individual; nothing overlaps un-clustered, nothing distant gets lumped. Kept at 50 (no change). _(How aggressively to cluster is a taste knob — adjustable if the user wants only the tightest pair to collapse.)_
- [x] `maxBounds` + `maxBoundsViscosity` — no fit padding (would reintroduce letterbox); **no pin sits flush** anyway since the closest is x≈5% in. Browser-verified at desktop full-width: all 8 pins + labels visible, none clipped at edges; restore returns to full fit.

---

## Scope notes

- Desktop **moves to the Leaflet engine too** (so it gains pan/zoom), but stays **un-clustered** — clustering is mobile-only.
- [-] No change to the map's underlying **data model** (still `Point {id, x, y, title}`; only the % → pixel coordinate read changes).
- [-] **Admin (`react-admin`) screens** — out of scope entirely.

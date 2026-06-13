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

### Prerequisites (§ Open items)

- [ ] Confirm satellite **image dimensions** for the pixel-coordinate conversion
- [ ] Identify the **tightest pin pair** to validate `maxClusterRadius`

### Engine setup (§ Engine choice)

- [ ] Add deps: `leaflet`, `react-leaflet`, `Leaflet.markercluster` (+ wrapper)
- [ ] Client-only map component — dynamic import with `ssr: false`
- [ ] `L.imageOverlay` + `L.CRS.Simple` using the hand-framed satellite image (no tiles/keys)

### Coordinate migration (§ Coordinate migration)

- [ ] Convert pin positions from **percentages → image-pixel coordinates** (mechanical, lossless)

### Markers (§ Marker styling carries over)

- [ ] Reimplement markers as `L.divIcon` with the Phase 1 HTML/CSS (avatar + ring + pointer + hover-scale), pixel-identical
- [ ] Attach existing "open cat-list modal" handler to the Leaflet marker

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

## Out of scope (per plan §5)

- [-] Desktop map zoom/pan controls and clustering (desktop pins stay un-clustered)
- [-] Any change to the map's underlying data model on desktop
- [-] Admin (`react-admin`) screens

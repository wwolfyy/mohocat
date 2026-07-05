# 산냥이집냥이 — Debugging Log

> A running log of bugs found and fixed, newest first. Each entry captures the
> **symptom**, the **root cause**, the **fix**, and how it was **verified** — so a
> future reader (human or agent) can understand _why_ a change was made without
> re-deriving it from the diff.
>
> This complements — it does not replace — the `docs/handoff/` narrative and
> `docs/planning/` trackers. Log a bug here when the root cause is non-obvious or
> the fix is worth remembering. Keep entries short and concrete.

---

## 2026-07-05 — Mobile map pins vanishing / drawn outside the map / stuck pan — the durable fix (replaced markercluster)

**Area:** `LeafletMountainMap.tsx` (`PointMarkersLayer`), new `utils/mapClustering.ts` ·
**Branch:** `dev` · **Severity:** medium (mobile UX, recurring) · **Status:** ✅ fixed in code —
**S22 device verification owed**. **Supersedes** the four min-zoom / `bounceAtZoomLimits` entries
below (all were shims for the same coupling this removes).

### Symptom

On mobile, after some zoom in/out manipulation the individual (non-consolidated) cat-thumbnail
pins **randomly disappear**; sometimes the pan also **gets stuck** showing only part of the map,
with number-cluster badges or broken-out pins **rendered outside the image**. Reproduces on a
Galaxy **S22** but **not** a Note 9 — the same device split seen across all the prior map fixes.

### Root cause (structural — why it kept coming back)

`leaflet.markercluster` is built for **tile maps with integer zoom** and `zoomSnap=1`. We ran it on
a `CRS.Simple` plane with **negative, fractional** zoom (`zoomSnap=0`) and a **hard min-zoom clamp
we mutate at runtime** (`map.setMinZoom(fillZoom)`) — outside its design envelope. Confirmed in the
library source (`leaflet.markercluster@1.5.3`): `_generateInitialClusters` caches `this._maxZoom`
**once** but the min-zoom floor is re-read **live** from `map.getMinZoom()` in **11** runtime
add/remove/zoom-animation paths (`this._minZoom =` appears **0** times). So the cluster grid — built
against our temporary `floor(fill − 4)` — and the live runtime floor `floor(fill)` **permanently
disagree**, and every reachable rounded zoom has to thread that mismatch.

Whether a device trips it depends on **where the fractional `fillZoom` lands relative to the integer
grid**, and `fillZoom = getBoundsZoom(bounds)` is a function of the **viewport's pixel size** — so
the Note 9 sits in a safe spot while the S22 straddles a boundary. A transient/interrupted pinch
nudges `Math.round(zoom)` across a level whose grid state is inconsistent → markers removed and not
re-added (**vanish**) or re-added against a stale pixel origin (**drawn outside**); the interrupted
zoom animation also desyncs Leaflet's pixel origin so `maxBounds` + `maxBoundsViscosity:1` clamps
panning wrong (**stuck / partial**). All three symptoms are the _same_ desync. Every earlier fix
(floor-vs-exact clamp, temp-lower-minZoom-by-4, `bounceAtZoomLimits=false`) patched one manifestation
of this coupling, so a new device/gesture kept reopening it.

### Fix (durable — remove the coupling, not patch it)

Replaced `leaflet.markercluster` on mobile with **static, zoom-independent clustering**
(`utils/mapClustering.ts`, pure + unit-tested). Points are projected to a fixed pixel space (the
fill/default view) and grouped **once** by pixel radius (`greedyClusterByRadius`, honoring the
per-mountain `maxClusterRadius`); the grouping **never re-runs on zoom**, so there is no cluster grid
and thus **no fractional-vs-integer boundary for a device to land on** — device-independent by
construction. Multi-point clusters show a count badge; tapping fans the members out on a ring
(`spiderfyRadius`) with leg lines, collapsing on a background tap or any zoom change (the ring is
placed in screen space at the open zoom). Stand-alone points and desktop are unchanged (plain pins).
Removed: the markercluster import + CSS, the temp-lower-minZoom-by-4 trick, and the `L.MarkerCluster`
type coupling. The exact-`fillZoom` min-zoom clamp and `bounceAtZoomLimits={false}` stay — they now
only frame the image (grey-margin hard stop), no longer propping up a zoom-coupled cluster engine.

### Verified

`tsc --noEmit` clean; `npm test` 33/33 (25 smoke + 8 new `mapClustering` unit tests). Phone-width
iframe harness (390px): renders **4 pins + 2 clusters** (unchanged baseline); tapping a cluster fans
2 members + 2 legs and hides the badge (opacity 1→0); background tap, a zoom change, and re-tapping
the badge each collapse it (pins 6→4, legs→0, badge→1); a fanned member opens the cat gallery.
**Device-owed:** the real S22 two-finger pinch in/out that used to trigger the desync (the harness
can't emulate touch/pinch/DPR). Desktop map is code-equivalent (plain pins) but not harness-rendered
(dynamic import stalls ≥768px — pre-existing).

### Follow-up

`leaflet.markercluster` is now unused (dead dependency) — safe to `npm uninstall` it in a cleanup
pass; left in `package.json` for now to keep this change focused.

---

## 2026-07-05 — Mountain-selector dropdown clipped on the left (계양산 → 양산)

**Area:** `MountainSelector.tsx` (dropdown panel) · **Branch:** `dev` · **Severity:** low
(cosmetic) · **Status:** ✅ fixed + harness-verified.

### Symptom

Opening the "계양산" dropdown in the header, the panel's **left edge was cut off** — the mountain
name rendered as "양산" (계 clipped), the description as "…양산에서 살고 있는…", and the placeholder
as "…른 산들을 위한 자리." Most visible on a phone; a smaller latent clip existed on desktop too.

### Root cause

The panel is `absolute right-0 w-72` (288px) — it opens **leftward** from a button anchored in the
header's **left** group (logo + title + selector). That button's right edge is **content-driven**
(~257px on a phone, ~273px on desktop) and essentially **independent of viewport width**, so a
288px panel pinned to it by `right-0` pushed its left edge off-screen: measured **left ≈ −31px**
on a 390px phone and **−15px** even at 1280px desktop.

### Fix

One line — `w-72` → `w-60` (240px). With `right-0` the right edge stays pinned to the button, so a
narrower panel pulls the **left edge back on-screen** (the overflow is `width − buttonRight`). 240px
still holds the mountain name + description (wraps fine). Uniform width fixes both the phone and the
latent desktop clip; no responsive rule needed since the button's right edge is ~constant.

### Verified

Phone-width iframe harness (`resize_window` is broken — see memory): panel left went
**−31 → +123px** (390px phone) and **−15 → +139px** (1280px desktop); screenshot confirms "계양산",
the full description, and the placeholder all render un-clipped. `tsc --noEmit` clean +
`npm run test:smoke` 25/25.

---

## 2026-07-04 — Mobile map: cat-thumbnail pins vanished on S22 after a pinch-out bounce-back

**Area:** `LeafletMountainMap.tsx` (`MapContainer` options) · **Branch:** `dev` · **Severity:**
medium (mobile UX) · **Status:** ✅ fixed in code — **device verification (S22) owed**.
**Follow-on to** the three min-zoom entries below (the clamp fixed the resting zoom; this fixes
the transient pinch gesture).

### Symptom

On a Galaxy **S22** (not a Note 9), after a pinch-out the map "snaps back to fit the screen,"
and when it does the **individual cat-thumbnail pins randomly disappear** — while the
consolidated **number clusters stay**. Zoom-out no longer over-shoots the resting position (the
earlier `minZoom = fillZoom` clamp fixed that); this is the marker loss on the bounce-back.

### Root cause

Leaflet's `TouchZoom._onTouchMove` only hard-clamps a pinch to the zoom limits when
`bounceAtZoomLimits` is `false`; it **defaults to `true`**, which we never overrode. So a
pinch-out let the live gesture zoom travel **below `minZoom` (= the fill zoom)** mid-pinch.
`leaflet.markercluster` reacts to that transient sub-fill zoom by **merging the standalone pins
into clusters** (coarser `Math.round(zoom)` grid level, `_mergeSplitClusters`); on touch-end the
map **bounces back to fit** and markercluster is supposed to **split** them back out. That
split-back succeeds on the Note 9 but **intermittently fails on the S22** (device-dependent
timing / fractional-zoom rounding in the merge/split state machine) — so the individual pins
stay merged-away while the number clusters (already clusters) persist.

### Fix

`bounceAtZoomLimits={false}` on the `MapContainer`. A pinch now **hard-stops at fill** instead
of overshooting and bouncing, so the sub-fill excursion never happens → no spurious merge → no
fail-split → the thumbnail pins stay put. Device-independent; complements the `minZoom → exact
fillZoom` clamp (which governs the _committed_ zoom) by governing the _transient_ gesture.
Doesn't touch desktop (no touch-zoom) or the cluster split-animation feel.

### Verified

`tsc --noEmit` clean + `npm run test:smoke` 25/25. **Device verification owed:** the trigger is a
real two-finger pinch + the S22-specific bounce/rounding, which the iframe harness can't emulate
(touch/pinch/DPR are device-owed). Owner to confirm on the S22: pinch-out hard-stops at fit and
the thumbnail pins remain after release.

---

## 2026-07-04 — Mobile map: zoom-out grey persisted on S22 (device-dependent floor clamp) + pins

**Area:** `LeafletMountainMap.tsx` (`MapViewController` + `PointMarkersLayer`) · **Branch:**
`dev` · **Severity:** medium (mobile UX) · **Status:** ✅ fixed · **Supersedes** the
`Math.floor` clamp in the entry below.

### Symptom

The zoom-out restriction worked on a Galaxy Note 9 (map hard-stops at fit) but **not on an
S22**: on the S22 a pinch-out left the map resting zoomed-out with grey margins.

### Root cause

The previous fix clamped `minZoom = Math.floor(fillZoom)`. The floor's distance below the
exact (fractional) fill zoom depends on where `fillZoom` falls between integers, which depends
on the device's viewport size. On the Note 9 `floor(fillZoom) ≈ fillZoom` (hard stop at fit);
on the S22 the floor sat ~1 zoom level below fill, so the map could rest there showing grey.
`Math.floor` was used because clamping to the _exact_ fractional fill made `leaflet.markercluster`
collapse every marker into the top cluster (no individual cat pins) — a real tension: exact
clamp = no pins, floor = device-dependent grey.

### Fix

Break the tension by decoupling the two needs:

- **Zoom limit:** clamp `minZoom` to the **exact** `fillZoom` → a true hard stop at fit on
  every device (no grey, no floor, no snap-back — a `zoomend` snap-back was tried and abandoned:
  Leaflet swallows a `setZoom` issued from within a `zoomend` handler).
- **Pins:** in `PointMarkersLayer`, **temporarily lower `minZoom` (−4) while the cluster grid
  is built** (`layer.addTo(map)` → markercluster reads `map.getMinZoom()` for its grid range),
  then restore the exact clamp. The grid then spans below fill and keeps a level at the display
  zoom, so the 4 individual pins + 2 clusters render — while the map still can't zoom out past
  fill.

### Verified

`tsc --noEmit` clean + `npm run test:smoke` 25/25. Real tab (410×776 portrait), via an exposed
map handle: `setZoom(-2)` holds at fill (−0.979), image fills (no grey); default shows 4 pins +
2 clusters; drag disabled at fill (`touch-action: pan-x pan-y`, page scrolls) and enabled when
zoomed in (`touch-action: none`, map pans). Device-independent — no Note 9 vs S22 divergence.

---

## 2026-07-04 — Mobile map: cat-thumbnail pins vanished at default zoom (min-zoom clamp regression)

**Area:** `LeafletMountainMap.tsx` (`MapViewController`) · **Branch:** `dev` · **Severity:**
medium (markers missing) · **Status:** ✅ fixed · **Follow-up to** the min-zoom clamp in the
entry below (commit `6eb1937`).

### Symptom

After the map fixes, the default portrait view showed **only clusters** — the individual
cat-thumbnail pins were gone (verified: 0 `.mohocat-pin` vs the original 4 pins + 2 clusters).

### Root cause

The Symptom-1 fix set `map.setMinZoom(getBoundsZoom(bounds))` — the **fractional** fill zoom
(e.g. −0.98). `leaflet.markercluster` builds its cluster grids at **integer** zoom levels from
`map.getMaxZoom()` down to `map.getMinZoom()`. With a fractional minZoom of −0.98 the loop stops
at level 0 (−1 < −0.98), so there is **no grid level at the display zoom** (≈−1); markercluster
falls back to the fully-merged top clusters → every marker collapses, no individual pins.
(Bisected by disabling `setMinZoom` → pins returned; the displayed zoom was identical either
way, proving it was the minZoom value, not the view.)

### Fix

Clamp minZoom to `Math.floor(fillZoom)` (an integer at/below the display zoom) so markercluster
has a grid level there → the original 4 pins + 2 clusters render again. Cost: a pinch can now
reach ~1 level below exact fill (a hair of grey) vs. exactly fill — still far better than the
pre-fix −3. The Symptom-3 drag-gate was also re-pointed from `getMinZoom()` to the exact
`fillZoom` (a closure var updated by `applyFit`), since minZoom is now floored _below_ fill and
would otherwise enable drag at the default view (re-trapping page scroll).

### Verified

`tsc --noEmit` clean + `npm run test:smoke` 25/25. Real-tab (410×776 portrait): 4 pins + 2
clusters render with cat thumbnails, drag disabled at fill (`touch-action: pan-x pan-y`, no
`leaflet-grab`), map fills with no grey at default.

---

## 2026-07-04 — Mobile map: zoom-out grey margins, landscape wastes space, can't scroll the page

**Area:** `LeafletMountainMap.tsx`, `MountainViewer.tsx`, `Compass.tsx`, new
`hooks/useIsPortrait.ts` · **Branch:** `dev` · **Severity:** medium (mobile UX) ·
**Status:** ✅ fixed (device verification of touch/pinch still owed)

Three reported symptoms on mobile (Samsung Galaxy S22), diagnosed together as they all live
in the map engine.

### Symptom 1 — grey margins when zooming out

**Symptom:** pinching to zoom out shrank the map below the screen, exposing grey borders.
**Root cause:** `MapContainer minZoom={-3}` allowed zooming ~3 levels below the fit-to-fill
zoom; the image shrank inside the container and its `bg-gray-100` showed through. `maxBounds`
constrains _panning_ but not _zoom_.
**Fix:** `MapViewController` now clamps `minZoom` to the fill zoom (`map.getBoundsZoom(bounds)`),
recomputed on resize, so fill is ~the furthest-out zoom. **(Amended — see the newer entry
above:** the clamp uses `Math.floor(fillZoom)`, not the raw fractional value, so
`leaflet.markercluster` keeps a grid level at the display zoom and individual pins still show.)

### Symptom 2 — landscape rotation crams the portrait map sideways

**Symptom:** rotating the phone to landscape left the tall portrait map jammed into the short
screen (its short side spanning the screen's long side), defeating the portrait default.
**Root cause:** the portrait-vs-landscape image was chosen by **`useIsMobile()` = viewport
width < 768px**, not orientation. A landscape phone under 768px wide kept `isMobile` true →
the 90°-rotated portrait image on a landscape screen (verified: 667×375 → map 667×1334).
**Fix:** added `useIsPortrait()` (`matchMedia('(orientation: portrait)')`). The image, coord
rotation, container aspect ratio, compass, and remount `key` now follow **orientation**;
`isMobile` (width) still gates clustering / +−-buttons / drag. Verified: every landscape
viewport (sub- and super-768) now serves the LANDSCAPE image; portrait serves the portrait.

### Symptom 3 — can't scroll the page over the map

**Symptom:** one-finger swipe couldn't scroll past the full-height map to the content below.
**Root cause:** Leaflet's one-finger touch `dragging` (default on) captured vertical swipes
and set `touch-action: none`, trapping the page; the only scroll pass-through was mouse-wheel

- ⌘/Ctrl (desktop), with no touch equivalent. At fill the map is `maxBounds`-locked, so the
  drag did nothing anyway.
  **Fix (owner-chosen model):** on mobile, keep `dragging` **disabled at fill** (restores
  `touch-action: pan-x pan-y` → the page scrolls) and enable it only on `zoomend` once zoom
  > min (fill), where there's room to pan. Pinch-zoom + 전체보기 restore still work. Verified in
  > harness: at fill the container lacks `leaflet-grab` and reports `touch-action: pan-x pan-y`.

### Verified

`tsc --noEmit` clean + `npm run test:smoke` 25/25. Browser-verified in the true-reflow iframe
harness: orientation→image mapping across 360×780 / 667×375 / 780×360, drag disabled + page
touch-action restored on mobile, map fills with no grey at default. **Still device-owed** (the
iframe can't emulate touch/pinch/true rotation): the pinch-out min-zoom clamp feel, one-finger
page scroll, and zoom-in-then-drag on a real S22. Desktop landscape couldn't be rendered in
the harness (dynamic-import stalls at wide iframe widths — pre-existing, not this change) but
its code path is unchanged for `portrait=false` / non-mobile.

---

## 2026-07-03 — 냥이들 desktop-table thumbnails rendered as vertical ellipses (preflight max-width clamp)

**Area:** `/pages/cats` (`CatsBrowser.tsx` `CatThumb`) · **Branch:** `dev` ·
**Severity:** low (cosmetic) · **Status:** ✅ fixed

### Symptom

On `/pages/cats` the desktop data-table thumbnails looked distorted — narrower
horizontally than vertically (squished vertical ellipses for photo cats; photo-less
placeholder cats looked fine).

### Root cause

Tailwind's preflight sets `img { max-width: 100% }`. The 사진 column was `w-16` (64px) with
`px-4` (32px) padding → only **32px** of content width, so the 44px `<Image>` was clamped to
32px wide while its inline `height: 44` stayed → a 32×44 render. Photo-less cats use a
`<div>` placeholder (not `img`), which preflight doesn't touch — hence only real photos
distorted, which pointed straight at the `img` rule.

### Fix

`max-w-none` on the `<Image>` (so the inline `width` is honored) + widened the photo column
`w-16` → `w-20` for breathing room. (Same change also reverted the thumbnail from circular
back to square — see the sibling `FEATURE_MOD_LOG` entry.)

### Verified

Browser-zoomed `/pages/cats`: thumbnails render as even 44×44 squares. `tsc --noEmit` clean,
`npm run test:smoke` 25/25.

---

## 2026-07-02 — `[catmodal:name]` links in posts rendered as broken `<a>` (link-converter ordering)

**Area:** text processing (`utils/text-processing.ts` / `CatLinkedText`) · **Branch:**
`dev` · **Severity:** medium (dead link instead of cat modal) · **Status:** ✅ fixed

### Symptom

A `[catmodal:깡패]` reference written in a post did not open the cat modal. When the
author wrote the paren form `[catmodal:깡패](url)`, it rendered as a normal `<a>` that
opened a new tab to a 404.

### Root cause

`processTextWithLinks` ran `convertMarkdownLinks` **before** `convertCatModalLinks`. The
generic markdown regex `\[([^\]]+)\]\(([^)]+)\)` matches `[catmodal:name](url)` first,
capturing it as a `[label](url)` link — so the specific `[catmodal:name]` converter never
saw it, and the token became a broken anchor instead of a cat-modal span.

### Fix

Reordered `processTextWithLinks` to convert cat-modal links **first**, then markdown
links, then auto-detected URLs (with a comment noting the ordering is load-bearing). The
specific pattern now wins over the generic one. `utils/text-processing.ts`. A reusable
`components/CatLinkedText.tsx` renders the processed text and opens the cat modal on
cat-link click.

### Watch-out

`[catmodal:이름]` takes **no** parentheses (per the admin help string). Any `(…)` written
right after the token still renders as literal text — the correct syntax is the bare
`[catmodal:이름]`.

---

## 2026-07-02 — 입양홍보 admin tab showed 급식현황 posts (stale state on failed fetch)

**Area:** admin posts (`AdminPostList`) · **Branch:** `dev` · **Severity:** medium
(wrong data shown) · **Status:** ✅ fixed

### Symptom

In `/admin/posts`, opening the 입양홍보 tab showed the 급식현황 (butler_stream /
`posts_feeding`) posts — data that belongs to a different tab.

### Root cause

Not a service mixup — `serviceFor('adoption_promotion')` correctly returns the
adoption service. It's **stale React state**: `AdminPostList` keeps one `posts`
state across tabs. Viewing 급식현황 first loads feeding posts into `posts`. Switching
to 입양홍보 refetches, but the adoption read **throws** (the new `posts_adoption`
Firestore rule isn't deployed yet → permission denied), and `fetchPosts`'s `catch`
only logs — it never clears `posts`. So the previous tab's feeding posts stayed on
screen. The tab-switch effect reset `currentPage` but not `posts`/`totalPages`.

### Fix

Clear the list on tab switch: the `[postType]` effect now also does
`setPosts([])` + `setTotalPages(1)`. A failed or empty fetch for the new tab can no
longer leave another tab's posts visible (adoption now correctly shows the empty
state until its rule is deployed and a post exists). `AdminPostList.tsx`.

### Note

The underlying adoption read fails only because the `posts_adoption` rule is not
yet deployed (`firebase deploy --only firestore:rules`). Once deployed, the tab
reads real adoption posts; the stale-state fix is correct regardless.

### Watch-out

`AdminPostList.fetchPosts` swallows errors without clearing `posts` — any tab whose
fetch fails would otherwise keep showing the prior tab's data. The tab-switch clear
covers the switch case; a mid-tab refetch failure still leaves stale data (minor).

---

## 2026-07-02 — Admin force-logout on localhost (cross-tab sign-out from idle background tabs)

**Area:** admin auth (`useIdleTimeout` / `AdminAuth`) · **Branch:** `dev` ·
**Severity:** medium (session dropped mid-use) · **Status:** ✅ fixed

### Symptom

On `localhost`, the admin CMS repeatedly force-logged-out right after sign-in;
never on Vercel, never in incognito. Console showed a Firestore
`net::ERR_BLOCKED_BY_CLIENT` and "Missing or insufficient permissions" — both red
herrings (see below).

### Root cause

The stack trace of the drop was **not** an app `signOut()` call — it was Firebase
Auth's own `_onStorageEvent → _updateCurrentUser(null) → notifyAuthListeners`.
Firebase's `browserLocalPersistence` **syncs auth state across all same-origin
tabs via localStorage**: when any tab clears the `firebase:authUser:*` key, every
other tab gets a `storage` event and follows it to "signed out". The Firestore
`ERR_BLOCKED_BY_CLIENT` was a _downstream symptom_ — Firebase closing the
Firestore webchannel because the credential just changed. The "Missing/insufficient
permissions" is a separate, harmless `loadConfig()` read that falls back to local
defaults (happens on both envs).

The trigger: **leftover Claude-controlled `localhost` admin tabs from an
idle-timeout smoke test** (timeout temporarily set to **8s**). Each backgrounded
tab has its **own** idle timer, receives no mouse/keyboard events, so it counted
as idle, fired `signOut()`, and broadcast the logout to the active tab. Closing
the extra tabs stopped it — confirming cross-tab propagation, not an extension.
(This also exposed a latent flaw: even at 2h, a forgotten background admin tab
would eventually sign the user out of their active tab.)

### Fix

Made `useIdleTimeout` **cross-tab aware** via an optional `storageKey`: activity
writes a shared last-activity timestamp to localStorage, and the idle check uses
`max(thisTab, sharedAcrossTabs)`. So any tab's activity keeps every tab alive, and
`onTimeout` only fires once **all** tabs are idle. `AdminAuth` passes
`ADMIN_IDLE_ACTIVITY_KEY`. (localStorage access degrades gracefully to per-tab
behavior if unavailable.)

### Verified

- `tsc --noEmit` clean · smoke 25/25.
- Owner confirmed the force-logouts stopped after closing the stale tabs; the
  fix removes the underlying cross-tab-idle race. Multi-tab timing is logic-level
  (not automated) — manual check: open admin in two tabs, keep one active, and the
  other no longer times out.

### Watch-out

Don't leave short-timeout idle-test tabs open — with cross-tab auth sync they log
out every other tab. Verify idle-timeout changes in a real browser, then close the
tabs.

---

## 2026-07-02 — Map doesn't re-fit on window resize (desktop fixed · mobile pending)

**Area:** landing map (`LeafletMountainMap` / `MapViewController`) · **Branch:**
`dev` · **Severity:** low (cosmetic; recoverable via the fit button) ·
**Status:** ✅ desktop · ⏳ mobile (tracked in PROJECT_PLAN §4)

### Symptom

Resizing the browser window left the map at its old dimensions: white margins
around it when the window grew, clipped/partial map when it shrank. Clicking the
전체 보기 (fit) control fixed it.

### Root cause

The container is `h-full w-full`, so the DIV resizes with the window, and
Leaflet's built-in `trackResize` keeps the canvas size in sync
(`invalidateSize`) — but it **preserves zoom**, so the image stays at its old
scale relative to the new viewport. Nothing re-fit the view to the new size.

### Fix

In `MapViewController`, on a debounced (150ms) window `resize`, call
`map.invalidateSize({ animate: false })` then `map.fitBounds(bounds)` — i.e. the
same `applyFit()` the 전체 보기 control runs. `invalidateSize` first so `fitBounds`
measures against the new size regardless of handler ordering. Listener cleaned up
on unmount.

**Files:** `src/components/LeafletMountainMap.tsx`.

### Verified

- `npx tsc --noEmit` clean · smoke 25/25.
- **Desktop: confirmed by the owner** in a real browser (re-fits, no margins).
- **Mobile: pending** — owner saw irregularities at mobile widths; deferred to the
  mobile UI phase (PROJECT_PLAN §4, "Map re-fit on window resize — mobile"),
  which must cover the portrait layout and the landscape↔portrait remount
  boundary (`key={isMobile}`).

### Notes / watch-outs

- **The automation could not reproduce a real window resize** for this map:
  `resize_window` didn't change the page viewport, and simulating a resize by
  poking the container height + dispatching a synthetic `resize` event gives
  **false negatives** — even the known-good fit button fails under that
  simulation, because `fitBounds` relies on Leaflet's real layout-driven size
  tracking. Verify map-resize behaviour in a real browser, not via DOM pokes.

---

## 2026-07-02 — Kakao login failure messages shown in English

**Area:** auth (`auth-service` / `AuthProvider`) · **Branch:** `dev` ·
**Severity:** low (Korean-first UI violation)

### Symptom

A failed Kakao login showed an **English** message (e.g. "Kakaotalk sign-in was
cancelled…"), breaking the Korean-first UI.

### Root cause

Not (only) relayed from Kakao/Firebase — the English was **mostly our own
code**. `auth-service.signInWithKakao()`'s catch block built the message from a
`switch (error.code)` where **every case was a hardcoded English string** (and
several were verbose developer text); the `default` relayed the raw upstream
`error.message`. Two other throws (provider-not-enabled early return; anonymous-
link fallback failure) and `AuthProvider`'s fallback (`'Failed to sign in with
Kakaotalk'`) were English too.

### Fix

Added `strings.auth.kakao.errors` (Korean: `cancelled` / `popupBlocked` /
`timeout` / `accountExists` / `generic`). The `switch` now sets a friendly
Korean `errorMessage` per code while **keeping its `console.error` diagnostics**;
config/unknown codes and the raw upstream `error.message` collapse to the generic
Korean message (upstream detail logged to console only — owner's call). The two
out-of-band throws and the `AuthProvider` fallback now use the Korean generic.
Errors surface in the shared login banner (see the entry below).

**Files:** `src/constants/strings.ts`, `src/services/auth-service.ts`,
`src/components/auth/AuthProvider.tsx`.

### Verified

- `npx tsc --noEmit` clean (needed `let errorMessage: string` — `strings` is
  `as const`, which otherwise narrowed it to the `generic` literal) · smoke
  25/25.
- Browser: drove the login flow until the real Kakao OAuth popup opened;
  couldn't cancel it from automation (popup is outside the tab group), so the
  final Korean string was not captured live. Change is a direct English→Korean
  swap; banner placement was verified in the entry below.

---

## 2026-07-01 — Kakao (social) login errors shown under the email login block

**Area:** auth UI (`LoginForm`) · **Branch:** `dev` · **Severity:** low
(cosmetic/UX — error attributed to the wrong sign-in method)

### Symptom

A failed **카카오톡으로 로그인** (Kakao) attempt surfaced its error message in the
red box **below the email/password form**, making the failure look like it
belonged to email login.

### Root cause

`LoginForm` had a single "Error Messages" block rendered **inside the email
`<form>`** that displayed _both_ the email `error` state **and** the
`kakaoSignInError` from `useAuth`. So any Kakao failure appeared under the email
inputs. (Phone login was unaffected — `PhoneLoginForm` shows its own inline
errors next to the phone fields.)

### Fix

Chose the "shared location" approach (owner's call): moved the email + Kakao
error display into **one shared banner at the top of the login form**, above all
sign-in sections, and removed the block from inside the email form. Phone login
intentionally keeps its own field-adjacent inline errors — several are
contextual validation messages ("code format invalid") that read best next to
the phone inputs, and they were never misattributed.

**Files:** `src/components/LoginForm.tsx`.

### Verified

- `npx tsc --noEmit` clean · `npm run test:smoke` 25/25.
- Browser (localhost:3000/login): triggered an email-login failure with bad
  credentials — the error now renders in the top shared banner, not under the
  email form. Kakao errors use the identical banner code path (same
  `(error || kakaoSignInError)` render), so they surface in the same place.

### Notes / watch-outs

- The empty **green** success-message container under the Kakao button
  (`t.kakaoSuccess`) still renders as an empty box even when there's no success
  message — pre-existing cosmetic nit, left as-is (out of scope).

---

## 2026-07-01 — Media album hidden behind the cat modal (map flow only)

**Area:** public overlay stacking (`Modal` / `Lightbox` / `VideoPlayer`) ·
**Branch:** `dev` · **Severity:** medium (feature unusable via one entry point)

### Symptom

From the map: click a feeding-spot marker → click a cat in the gallery → click
**사진 보기** or **동영상 보기**. The album modal opened but was rendered _behind_ the
cat-detail modal, so it was invisible/unusable. The **same** albums worked
correctly when opened from the 입양홍보 (adoption) page.

### Root cause

The public overlays used hand-maintained `z-index` values, and they were
inconsistent with the depth at which `CatInfo` gets rendered:

- `CatGallery` opened its nested cat-detail modal at `z-[60]`.
- The album modals (`PhotoAlbum` / `VideoAlbum`) inside `CatInfo` used `Modal`'s
  **default `z-50`**. Since all modals portal to `<body>`, `50 < 60` meant the
  album painted **below** the cat modal.
- From the adoption page the cat modal is the default `z-50` and the album is
  also `z-50`, but the album mounts **later**, so with equal z-index it stacked
  on top by DOM order — which is why the bug only appeared from the map.

A naive "bump the album's z-index" fix couldn't be made correct: `Lightbox` /
`VideoPlayer` were rendered **inside** the cat modal's subtree and did **not**
portal, so they were confined to the cat modal's stacking context. Elevating the
album above the cat modal would have pushed it above the lightbox/player too,
trading one stacking bug for another.

### Fix

Made overlay `z-index` **dynamic**, derived from the shared layer stack instead
of magic numbers:

- `useModalLayer` already tracked every open overlay in mount order (for
  topmost-only keyboard handling). It now **also returns a `z-index`** computed
  from the layer's depth in that stack (`50 + depth·10`) — one source of truth.
- `Modal` applies that value; its `zIndexClassName` prop and both call-site
  overrides (`CatGallery` `z-[60]`, `CatInfo` `z-[70]`) were removed.
- `Lightbox` and `VideoPlayer` now **portal to `<body>`** and use the same
  stack-derived z-index, so they escape any ancestor stacking context and always
  paint above the album that opened them — at any nesting depth.

Net effect: each overlay always sits exactly one layer above whatever is beneath
it, so the map, adoption, and nested cat-link flows are all correct by
construction.

**Files:** `src/components/ui/useModalLayer.ts`, `src/components/ui/Modal.tsx`,
`src/components/ui/Lightbox.tsx`, `src/components/ui/VideoPlayer.tsx`,
`src/components/CatGallery.tsx`, `src/components/CatInfo.tsx`.

### Verified

- `npx tsc --noEmit` clean · `npm run test:smoke` 25/25.
- Browser (localhost:3000): reproduced the bug from the map flow, applied the
  fix, confirmed the album now renders on top of the cat modal.
- **Caveat:** every cat in the local dataset has an empty album, so the
  `Lightbox` / `VideoPlayer` layers could not be exercised with real media. Their
  fix is correct by construction (same mechanism) but not yet data-verified.

### Notes / watch-outs

- The overlay stacking scheme now lives entirely in `useModalLayer`
  (`BASE_Z_INDEX` / `Z_INDEX_STEP`). Add new overlays by calling `useModalLayer`
  and applying the returned z-index — don't reintroduce hardcoded `z-[…]` on
  modal roots.
- Non-`Modal`, non-portaled transient spinners still carry a hardcoded z
  (`CatInfo` loading overlay `z-[60]`; about-page loading overlay `z-50`). They
  are brief and out of scope here; revisit if a 3-deep nesting makes one appear
  behind a modal.
- Not a Firestore read-rule bug, so the `firebase-read-access-inventory.md`
  cross-check did not apply.

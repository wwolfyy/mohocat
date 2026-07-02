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

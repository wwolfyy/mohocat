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

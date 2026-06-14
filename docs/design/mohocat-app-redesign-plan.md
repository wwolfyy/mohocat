# 산냥이집냥이 — App-Wide Redesign Plan (PLACEHOLDER)

> **Status: placeholder / not yet planned.** Created as a hand-off scaffold for the
> _next_ design phase — fine-tuning beyond the landing page (modals, photo album,
> etc.). Flesh out the sections below before implementing. Companion docs:
> [`design.md`](./design.md) (intent), [`mohocat-landing-redesign-plan.md`](./mohocat-landing-redesign-plan.md)
>
> - [`mohocat-landing-redesign-tasks.md`](./mohocat-landing-redesign-tasks.md) (the
>   completed landing/Leaflet work — use as the precedent for structure & rigor).

---

## Hand-off status (as of 2026-06-15)

**Done & verified (landing page):**

- **Phase 0** — brand design tokens (`tailwind.config.js`: `brand`/`accent`/`ink`), `design.md`.
- **Phase 1** — desktop landing: grouped frosted nav + `NavDropdown`, `입양홍보` CTA, restyled markers, `IntroCard`, `Footer`.
- **Phase 2** — Leaflet map migration (the big one): `CRS.Simple` + `imageOverlay`; full-bleed sizing; modifier-gated wheel-zoom + restore-view control + tuned zoom; `divIcon` markers (avatar/ring/pointer/label) w/ hover-scale + pulse + entrance-pop, edge-aware label flip, click→`CatGallery`; needle compass; mobile clustering + tap-to-spiderfy; **90°-CW rotated portrait map on mobile**; gap/footer/zoom-control cleanups; ghost hamburger.
- **Build/asset pipeline hardened** — see [`asset-pipeline` memory]; about-photo dev fix; fail-loud guards in `fetch-static-assets.js`; `vercel-build` now fetches; thumbnails+about-photos unified as build-fetched.

**Uncommitted on branch `dev`** (NOT committed/pushed): landing redesign source edits (`layout.tsx`, `page.tsx`, `Footer`, `IntroCard`, `MountainViewer`, `Navigation`), new files (`LeafletMountainMap.tsx`, `Compass.tsx`, `hooks/useIsMobile.ts`, `public/images/screenshot_mt_geyang_50_rot90cw.png`), deleted `RandomCatThumbnail.tsx`, pipeline changes (`fetch-static-assets.js`, `package.json`, `.gitignore`), and the **staged un-tracking of 32 thumbnails** (takes effect on commit). → **Decide: commit/push these before or alongside the next phase.**

**Known open items / quirks (deferred):**

- Footer legal links (`개인정보처리방침`/`이용약관`) pending the compliance workstream (`docs/compliance/`).
- Mobile map has minor "quirks" the user chose to leave for now (unspecified — revisit).
- Clustering aggressiveness (`maxClusterRadius=50`) is a taste knob.
- `build` script runs `export_all_to_cloud_storage.js` on every build (writes TO storage) — questionable; review if touching build.

---

## Scope of THIS plan (to define)

Design fine-tuning **beyond the landing page**. Candidate areas (confirm & prioritize with the user):

### 1. Modals — TBD

- `CatGallery` modal (current/former residents), `CatInfo`, the about-page cat modal, announcement modal.
- Likely goals: consistent sizing/spacing, close affordance, mobile fit, scroll behavior, brand-consistent styling. _(Specifics TBD.)_

### 2. Photo album arrangement — TBD

- `/pages/photo-album` (and `/pages/video-album`): grid/layout, spacing, responsive columns, lightbox/viewer, captions. _(Specifics TBD.)_

### 3. Other non-landing pages — TBD

- 소개(about), 공지(announcements), FAQ, 동참(contact), 입양홍보(adoption), 집사메뉴 pages — audit for consistency with the new brand language. _(Specifics TBD.)_

---

## Conventions (carry over from the landing work)

- **Design tokens are the source of truth** — `tailwind.config.js` (`brand`/`accent`/`ink`); keep classes literal so Tailwind JIT generates them.
- **Verify in a real browser**, not compile/lint alone (`localhost:3000` via the Chrome extension). Work in **small chunks**, one at a time.
- **Content is live from Firebase** (shared dev/prod project) — admin/console text edits hit production instantly; only _code_ needs build+deploy. Media (thumbnails/about-photos) is build-fetched (`npm run fetch:assets`), not in git.
- Mirror the **plan + tasks-checklist** structure of the landing redesign docs once this plan is fleshed out.

## How to resume

1. With the user, pick & prioritize target areas (modals first?) and fill in concrete specs above.
2. Optionally split into a companion `mohocat-app-redesign-tasks.md` checklist (like the landing one).
3. Implement in small, browser-verified chunks.

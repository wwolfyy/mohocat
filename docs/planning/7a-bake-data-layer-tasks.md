# 산냥이집냥이 — §7a Bake the Data Layer · Task List

Companion to [`PROJECT_PLAN.md` §7a](./PROJECT_PLAN.md) (the problem statement + hotspots) and
[handoff-8](../handoff/2026-06-28-handoff-8.md) §3–4 (the resume brief). Deployment mechanics
(how the ISR fallback is configured + where) live in
[`docs/deployment/README.md`](../deployment/README.md).

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` deferred/out of scope

---

## 0. Locked decisions (design forks settled 2026-06-28, with the user)

These were debated and chosen before any code; do not silently revisit.

- **Freshness model = HYBRID** — **on-demand revalidation** (admin save → `revalidatePath`)
  for instant reflect, **plus** a time-based `revalidate` **fallback backstop** for the cases
  on-demand can't cover (Firebase-console edits, `update:*`/migration scripts, dropped
  revalidate POSTs). On-demand is "time-based **plus** an instant path," not an alternative.
- **N (fallback `revalidate`) = `3600` (1 hour).** It is the _backstop_, not the primary
  freshness mechanism, so it is deliberately long; cost is ~one Admin-SDK `cats` read per hour
  per page (traffic-triggered). Rationale in the deployment README.
- **N is HARDCODED in the codebase** (a route-segment `export const revalidate`), **not** an
  env var and **not** a config file — Next requires it statically analyzable, and an env var
  would still need a redeploy while hiding the value from the repo. The two baked segments are
  the canonical locations (documented in the deployment README):
  1. `src/app/page.tsx` (landing)
  2. `src/app/pages/adoption/page.tsx` (입양홍보)
     Changing N later = one-line literal edit in each + `git push`. _Implementation note:_ prefer a
     single shared literal (`src/lib/cache-config.ts` → `REVALIDATE_SECONDS`) re-exported as
     `revalidate`; **verify it survives `next build`** as ISR (cross-module segment config can trip
     Next's static analysis). If it does not, fall back to a plain literal in each file with a
     comment pointing at `cache-config.ts` for the rationale.
- **Server/build reads = Admin SDK** (`@/lib/firebase-admin`, already used by the contact route
  - `fetch-static-assets.js`). New server-only read path; the client service layer
    (`getCatService`) is untouched. Resolves the `page.tsx` tech-debt (client Web SDK on the
    server, unauthenticated).
- **Scope = landing + adoption** (both baked surfaces). Galleries that are genuinely on-demand
  (a user clicked a marker) get their data threaded as props from the already-baked parent
  rather than re-fetching.

---

## 1. Before-measurement (quantify the win)

- [~] **Qualitative win proven via the Network tab** (browser-verified, see §3): on landing
  load the client fires **zero** `getCatsByPointId` queries, and a marker click opens the
  gallery with **zero** new Firestore requests (previously N+1 client reads). A quantified
  ms before/after was **not** captured — eliminating the client cat-query waterfall is the
  win; revisit ms timing only if a number is needed.

---

## 2. Server read path (Admin SDK)

- [x] New `src/lib/server/cat-reads.ts` — `getAllCatsServer(): Promise<Cat[]>` via
      `@/lib/firebase-admin` `db.collection('cats').get()` (mirrors `fetchCatsData` in
      `fetch-static-assets.js`; same `Cat` shape as the client service). Logs + re-raises on
      error per repo conventions.
- [x] Helper `groupCatsByPoint(cats)` → `{ [pointId]: { current: Cat[]; former: Cat[] } }`
      (current = `dwelling`, former = `prev_dwelling`) — the shape `getCatsByPointId` returns,
      precomputed for all points in one pass.
- [x] `src/lib/cache-config.ts` — `export const REVALIDATE_SECONDS = 3600` (single source for N).

## 3. Landing — bake cats into the Server Component ✅ browser-verified

- [x] `src/app/page.tsx`: `export const revalidate = REVALIDATE_SECONDS`; `Promise.all` of
      points + `getAllCatsServer()`; build the by-point map; pass `catsByPoint` to
      `MountainViewer`. _(ISR-via-`next build` static-analysis check still pending — see §7.)_
- [x] `MountainViewer`: accepts `catsByPoint`; **removed** the
      `thumbnailPreloader.preloadThumbnailsForPoints` waterfall (now preloads image _files_ from
      the baked URLs, no Firestore); threads data to map + gallery.
- [x] `LeafletMountainMap.usePointMarkers`: derives markers from `catsByPoint` **synchronously**
      via `useMemo` (random thumbnail pick from baked data) → **zero client Firestore queries**
      for avatars. Per-point degrade-to-no-avatar preserved.
- [x] `CatGallery`: takes the selected point's `{ current, former }` as a prop; the on-open
      `getCatsByPointId` fetch + loading spinner are gone.
- [x] Browser-verified (dev): all pins show avatars on first paint; SSR HTML carries 47
      thumbnail refs + `dwelling`; marker click opens the gallery instantly with no new
      Firestore request (only `Listen/channel` traffic is the app-wide auth/permission
      connection, same session id).

## 4. Adoption — convert to Server Component ✅ browser-verified

- [x] `src/app/pages/adoption/page.tsx`: `'use client'` → async Server Component;
      `export const revalidate = REVALIDATE_SECONDS`; `await getAllCatsServer()`, filter
      `adoptable` server-side. Interactive bits (card grid + `selectedCat` modal) extracted into
      a `'use client'` child `src/app/pages/adoption/AdoptionGallery.tsx`. Error/empty states
      preserved (server-side `try/catch` logs + renders the friendly error block; no client
      `getAllCats()` waterfall).
- [x] Browser-verified (dev): adoptable card (삼숙이) renders on first paint with no spinner;
      detail modal opens correctly; only `Listen/channel` (auth) traffic, no cat query.

## 5. On-demand revalidation (the instant path)

- [ ] `POST /api/revalidate` — Node runtime, **auth'd with the Firebase ID token** (same pattern
      as `/api/contact`), calls `revalidatePath('/')` + `revalidatePath('/pages/adoption')`.
      Logs + re-raises; no secrets/PII logged.
- [ ] Hook every admin cat mutation (create / update / delete — **including `dwelling` /
      `prev_dwelling` moves**) to call it after a successful save. Enumerate the write sites so
      none is missed (a miss = silent staleness until the N backstop).
- [ ] Browser-verify: edit a cat in `/admin` → public `/` reflects it without a redeploy.

## 6. Static-data export seam — decide its fate (§7a entangled seam)

- [ ] Decide `cats-static-data.json` + the `update:*` scripts: revive / replace / remove. The
      build still writes it (`saveStaticDataJson`) and `migrate-cats-to-firestore.js` reads it;
      the app does not read it at runtime. Document the decision here; don't rip out piecemeal.

## 7. Gates + docs

- [ ] `npx tsc --noEmit` clean · `npm run test:smoke` green.
- [ ] After-measurement vs §1 baseline recorded here.
- [ ] Deployment README note (N hardcoded + the two locations) — **done in this session.**
- [ ] PROJECT_PLAN §7a checkboxes + a fresh handoff.
- [ ] Ask before committing.

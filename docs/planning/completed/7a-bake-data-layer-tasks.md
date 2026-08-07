# 산냥이집냥이 — §7a Bake the Data Layer · Task List

Companion to [`PROJECT_PLAN.md` §7a](./PROJECT_PLAN.md) (the problem statement + hotspots) and
[handoff-8](../handoff/2026-06-28-handoff-8.md) §3–4 (the resume brief). Deployment mechanics
(how the ISR fallback is configured + where) live in
[`docs/manuals/deployment/README.md`](../manuals/deployment/README.md).

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

- [x] **Qualitative win proven via the Network tab** (browser-verified, see §3): on landing
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
      `MountainViewer`. _ISR confirmed via `next build` — see §7._
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

## 5. On-demand revalidation (the instant path) ⚠️ end-to-end pending preview deploy

- [x] `POST /api/revalidate` (`src/app/api/revalidate/route.ts`) — Node runtime,
      **auth'd with the Firebase ID token** (mirrors `/api/contact`), calls `revalidatePath`
      over `BAKED_PATHS = ['/', '/pages/adoption']`. No secrets/PII logged. Verified:
      returns **401** for missing + invalid tokens.
- [x] Client helper `src/lib/revalidate-client.ts` → `triggerCatRevalidate(user)`:
      best-effort POST with the ID token; **intentionally non-throwing** (the mutation already
      committed; the N backstop catches misses — the documented hybrid contract).
- [x] **Write-site enumeration** (the only live admin cat-write surface is
      `src/app/admin/cats/page.tsx`): hooked all four — `handleSubmit` (create/update, incl.
      `dwelling`/`prev_dwelling`/`adoptable`), `handleDelete`, and the two bulk migration
      buttons (neutering / DOB — one revalidate after each batch). _Confirmed not writers:_
      `api/admin/cats/route.ts` (POST only stubs an unimplemented import; GET reads),
      `utils/cat-migration-helper.ts` (no callers — out-of-band, covered by N backstop).
- [x] **End-to-end "edit → instant public reflect" — VERIFIED on preview (owner-confirmed
      2026-06-30).** `revalidatePath` is a no-op under `next dev` (no ISR cache) and `/admin`
      needs a login, so this was confirmed on the Vercel **preview** deploy with an admin login:
      editing a cat reflected on `/` without a redeploy.

## 6. Static-data export seam — decision: **REMOVE (in a dedicated cleanup pass)**

**Decision (2026-06-28):** remove the static-data export entirely. With §7a done, the app
reads cats **live via the Admin SDK** at build/server time — the JSON is now provably dead
output on every axis. Confirmed all readers/writers live in `scripts/` only (no `src/`
runtime read): `fetch-static-assets.js` (`saveStaticDataJson` write), the `update:*` scripts
(`export_cats/points/feeding_spots_to_static.js`, `update_all_static_data.js`), and the
completed one-off `migrate-cats-to-firestore.js`.

**What to remove (the cleanup, deferred to its own focused commit — not bundled into this
docs wrap-up, per "don't rip out piecemeal"):**

- `saveStaticDataJson()` + its call in `scripts/maintenance/fetch-static-assets.js` (pure dead
  output each build).
- The four `update:*` scripts in `package.json` + `scripts/migration/export_*_to_static.js` +
  `update_all_static_data.js`.
- `scripts/migration/migrate-cats-to-firestore.js` (completed one-off; cats already in
  Firestore) → archive or delete.
- `src/lib/cats-static-data.json` + `src/lib/feeding-spots-static-data.json` (the artifacts).

**Why deferred, not done here:** it touches the build script + `package.json` + several
migration scripts, and wants its own `npm run build` re-run to prove `fetch-static-assets.js`
still succeeds without `saveStaticDataJson`. That's a code change deserving its own gate, not
a rider on a documentation commit. Tracked as the next §7a follow-up in the handoff.

- [x] Decision made + documented. Mechanical removal carried forward (see handoff).
- [x] **Re-verified 2026-06-29** (independent trace during §5 admin cleanup): whole-repo
      grep confirms **zero** `*-static-data.json` references in `src/`; runtime cats come from
      `getAllCatsServer()` (`src/lib/server/cat-reads.ts`, Admin SDK → Firestore) via
      `src/app/page.tsx`, never the JSON. Observed the dead-output mechanism firsthand — a
      `npm run build` rewrote `cats-static-data.json` from live Firestore and nothing consumed
      it (the churn was reverted). No new blockers; the REMOVE plan above stands as written.
- [x] **DONE 2026-06-30 — mechanical removal executed.** Dropped `saveStaticDataJson()` (fn +
      call + the two `STATIC_DATA_JSON_PATH*` constants) from `fetch-static-assets.js` (kept the
      thumbnail download; its now-unused return is discarded with an explanatory comment);
      removed the four `update:*` scripts from `package.json`; `git rm`'d
      `export_{cats,points,feeding_spots}_to_static.js`, `update_all_static_data.js`,
      `migrate-cats-to-firestore.js`, and both `src/lib/*-static-data.json` artifacts. Fixed
      dangling doc refs (`AGENTS.md`/`CLAUDE.md` dev-commands, `scripts/README.md`, root
      `README.md` stale "Static Data"/Cloud-Storage sections). **Gates green:** `node --check`
      on the fetcher, `tsc --noEmit` clean, smoke 25/25, and **`npm run fetch:assets` ran
      end-to-end (exit 0)** — thumbnails + about photos fetched, no JSON written, no errors;
      `git status` shows no `mountains.json` drift. §7a is now fully closed.

## 7. Gates + docs

- [x] **`next build` — ISR confirmed.** Both `/` and `/pages/adoption` prerender as
      `○ (Static)` (not `ƒ Dynamic`) and the prerender-manifest carries
      `initialRevalidateSeconds: 3600` for each. The shared-constant
      `export const revalidate = REVALIDATE_SECONDS` (imported from `cache-config.ts`)
      **survives Next's static analysis** — no literal-fallback needed. The build also
      exercised the Admin SDK server reads (`getAllCatsServer`) at build time successfully.
- [x] `npx tsc --noEmit` clean · `npm run test:smoke` green (25/25, incl. the new route).
- [x] After-measurement: qualitative only (see §1) — no ms figure captured (by decision).
- [x] Deployment README note (N hardcoded + the two locations) — **done this session.**
- [x] PROJECT_PLAN §7a checkboxes + a fresh handoff (#9).
- [x] Ask before committing — landing/§4/§5 each committed on the user's go-ahead.

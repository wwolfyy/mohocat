# 산냥이집냥이 (mohocat) — Agent Guide

> Context for AI coding agents working in this repo. (Consolidated from the former
> `.github/copilot-instructions.md` + `.github/instructions/.instructions.md`.)
> `CLAUDE.md` is a symlink to this file.

## Project Overview

This is a Next.js 14 (App Router, TypeScript strict) multi-tenant platform for tracking
mountain cats with a Korean UI ("계양산 고양이들"). Data, auth, and image hosting run on
**Firebase**; the app is deployed to **Vercel**. The codebase is **multi-tenant ready** —
a `MOUNTAIN_ID` drives per-mountain config, theme, and feature flags.

## Where the docs live (orient here first)

Before re-deriving context from scratch, check these — they hold the current state and the
deep detail this file deliberately keeps out:

- **`docs/handoff/`** — chronological engineering hand-offs. **Read the latest first** for
  current state and what's next (e.g. what feature is mid-flight).
- **`docs/planning/PROJECT_PLAN.md`** — the cross-workstream status tracker (what's done,
  in progress, deferred). Companion plans sit alongside it in `docs/planning/`.
- **`docs/codebase/`** — per-domain deep dives (auth, permissions, services, API routes,
  admin, media, map, multi-tenant, deployment) with diagrams and **watch-outs**. Start at
  `CODEBASE_OVERVIEW.md`. _(Snapshot docs — verify against code before trusting specifics.)_
- **`docs/design/`** — design source-of-truth + redesign plan/tasks.
- **`docs/manuals/`** — **manuals**: `admin-manual/` (operator-facing how-to for the
  `/admin` CMS — content link tokens, cat/post fields, config & ops) and `deployment/`
  (how deploys work + new-mountain provisioning). Distinct from `docs/codebase/` (how
  it's built) — manuals are "what do I click/type to do X."
- **`log/`** — operational logs (repo root, not under `docs/`), newest-first:
  - `log/DEBUG_LOG.md` — **bug** fixes whose root cause was non-obvious
    (symptom → root cause → fix → verified); skim it before chasing a bug in case
    it (or a sibling) was seen before.
  - `log/FEATURE_MOD_LOG.md` — **intentional product changes** (feature
    enhancements / small fixes / removals), i.e. changes made by choice rather
    than bug investigations (what changed → rationale → verified).
  - `log/doc_updates.log` — codebase-doc refresh runs.
  - _Which log?_ "X was broken, here's why" → `DEBUG_LOG`; "we decided to
    add/change/remove X" → `FEATURE_MOD_LOG`.

## Working Agreements

- **Don't make code changes unless explicitly requested.** A question is not a request to
  change code — answer it first.
- **Reuse before writing.** Prefer existing modules, components, classes, and functions
  over new code blocks for the same need.
- **Separation of concerns.** Each module/component should hold a single responsibility (or
  one group of closely related ones).
- **Ask before committing.** Make the edits, run the gates (`npx tsc --noEmit` +
  `npm run test:smoke`), summarize what's staged — then wait for a go-ahead before
  `git commit` (and before pushing).
- **Error handling (per the repo owner's global conventions):** `try/catch` that **logs and
  re-raises** — never silently swallow errors or add fallbacks unless asked. Don't log
  secrets or PII.

## Core Architecture Patterns

### 1. Data Flow — live Firestore via the service layer

- **The app reads Firestore live**, through the service layer — there is **no** static-data
  read path and **no** Cloud Storage data serving.
- **Home page is a Server Component** (`src/app/page.tsx`): it `await`s
  `getPointService().getAllPoints()` with no `dynamic`/`revalidate`, so Next statically
  renders it and **point/marker positions are baked at build**.
- **Cat data is fetched client-side, live** (e.g. `MountainViewer` / `thumbnailPreloader`
  call `getCatsByPointId` after hydration). Reducing this client-side Firestore waterfall is
  tracked tech-debt (PROJECT_PLAN §7a — "bake the data layer"); not yet implemented.
- **Build assets**: `scripts/maintenance/fetch-static-assets.js` downloads cat thumbnails /
  about-photos from Firebase Storage into `public/` at build time.

### 2. Multi-Tenant Configuration System

- **Mountain configs**: `config/mountains/mountains.json` defines per-mountain settings
  (public branding/theme/features/social); secrets come from env and are merged in.
- **Environment switching**: `MOUNTAIN_ID` (or `NEXT_PUBLIC_MOUNTAIN_ID`) selects the active
  mountain.
- **Config utils**: `src/utils/config.ts` provides `getMountainConfig()`,
  `getCurrentMountainId()`, `isFeatureEnabled()`, etc. Import mountain context from here —
  never read `process.env.MOUNTAIN_ID` directly.
- **Default**: falls back to `'geyang'` if no env var is set.

### 3. Service Layer Abstraction

- **Factory pattern**: `src/services/index.ts` exports service getters (`getCatService()`,
  `getPointService()`, `getImageService()`, …).
- **Interface-based**: services implement interfaces from `src/services/interfaces.ts`.
- **Firebase implementation**: all services currently use Firebase, abstracted for future
  backends and per-mountain DB separation.
- **Lazy singletons**: each getter instantiates and caches on first use.

## Key Development Workflows

### Build Process

```bash
npm run build         # Runs: fetch-static-assets.js → next build
npm run vercel-build  # Same as build (what Vercel runs)
```

### Development Commands

```bash
npm run dev                # Development server
npm run fetch:assets       # Download thumbnails/about-photos from Firebase Storage
npm run test:smoke         # Fast structural smoke suite (gate for refactors/cleanup)
```

### Admin CMS Access

- Navigate to `/admin` for the Cat Management System (gated by `AdminAuth`).
- Direct Firestore-backed editing of cats, media, posts, announcements, members/roles, and
  the about-page content — no Google Sheets dependency.

## Critical Component Patterns

- **Server-render the slow-changing reads, client-fetch the rest.** The home page
  (`src/app/page.tsx`) is an `async` Server Component that `await`s
  `getPointService().getAllPoints()` (no `dynamic`/`revalidate` → baked at build). Cat data
  is fetched client-side, live, via the service layer (`getCatsByPointId` in a
  post-hydration effect).
- **Always go through the service factory.** Components call `getCatService()`,
  `getImageService()`, etc. from `@/services` — never `import` from `firebase/*` directly.
  (See `docs/codebase/services-layer.md` for the full pattern.)

## Project-Specific Conventions

### Cat Data Structure

- `dwelling`: current location point ID
- `prev_dwelling`: previous location point ID
- Categorized as "현재 거주 중" (current) or "예전에 거주" (former)

### Image Optimization

- **Next.js `<Image>` optimization enabled** (WebP/AVIF, 1-year TTL) — works on Vercel.
- **Firebase Storage domains** whitelisted in `next.config.js` (`remotePatterns`).
- **Thumbnail preloading**: `src/services/thumbnailPreloader.ts`.

### Styling Conventions

- **TailwindCSS**, utility-first (tokens in `tailwind.config.js`).
- **Korean-first UI**: user-facing text should be in Korean (해요체 for friendly copy).
- User-facing modals use the shared `ui/Modal` system — don't hand-roll new modal shells.

## Deployment Architecture

### Vercel (the only target)

- Next.js-optimized hosting with full SSR/SSG + image optimization.
- **Deploy = `git push`** (Vercel Git integration): Production = `main`, Preview ("staging")
  = `dev`. There is no deploy command. See `docs/manuals/deployment/README.md`.
- **Env vars are managed by hand in the Vercel dashboard** (Production + Preview), not by IaC.
- _Terraform is **parked/not in use** — the config lives under `_infra/_terraform/`
  (underscore = stale) as a blueprint for a possible future (multi-tenant / DR). Do not treat
  it as the live deployment path._
- _Cloud Run, the home-server Docker path, and Firebase Hosting were removed in the
  deployment cleanup — do not reintroduce them._

### Firebase Integration

- **Firestore**: primary database (read live via the service layer).
- **Firebase Auth**: email/password, phone (SMS), Kakao OIDC.
- **Firebase Storage**: image hosting with CDN; CORS configured.
- **Firestore rules** still deploy to Firebase via the CLI
  (`firebase deploy --only firestore:rules`); `firebase.json` is trimmed to the `firestore`
  block.

## Environment Variables Required

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
SERVICE_ACCOUNT_KEY=                 # Admin SDK creds (server-side)
MOUNTAIN_ID=geyang                   # Optional, defaults to 'geyang'
```

## Testing & Debugging

- **Smoke suite**: `npm run test:smoke` (`tests/smoke/`) — structural regression net; keep
  it green when refactoring.
- **Migration scripts**: `scripts/migration/` for one-shot data updates.
- **Permission inspection**: `PermissionDebug.tsx` (dev-only) resolves a user's effective
  permissions.
- **Debug log**: after fixing a bug whose root cause was non-obvious, add an entry to
  `log/DEBUG_LOG.md` (newest first) — symptom, root cause, fix, and how it was verified —
  so the reasoning survives without re-reading the diff.
- **Feature mod log**: for intentional changes (feature enhancements / small fixes /
  removals) rather than bug fixes, add an entry to `log/FEATURE_MOD_LOG.md` (newest first) —
  what changed, rationale, how it was verified. (See the `log/` bullet above for which log.)

## Anti-Patterns to Avoid

- ❌ Direct Firebase calls in components (use the service layer)
- ❌ Reading `process.env.MOUNTAIN_ID` directly (use `@/utils/config`)
- ❌ Hard-coded mountain configs (use the config system)
- ❌ Reintroducing Cloud Run / Docker / Firebase Hosting / a Cloud Storage data path
- ❌ English text in user-facing UI (Korean-first platform)

# Mountain Cat Tracking Platform - AI Agent Guide

## Project Overview

This is a Next.js 14 (App Router, TypeScript strict) multi-tenant platform for tracking
mountain cats with a Korean UI ("계양산 고양이들"). Data, auth, and image hosting run on
**Firebase**; the app is deployed to **Vercel**. The codebase is **multi-tenant ready** —
a `MOUNTAIN_ID` drives per-mountain config, theme, and feature flags.

## Core Architecture Patterns

### 1. Data Flow — live Firestore via the service layer

- **The app reads Firestore live**, through the service layer — there is **no** static-data
  read path and **no** Cloud Storage data serving. (Historical docs that mention a
  `src/lib/static-data.ts` or "static-first" Cloud Storage flow are obsolete.)
- **Home page is a Server Component** (`src/app/page.tsx`): it `await`s
  `getPointService().getAllPoints()` with no `dynamic`/`revalidate`, so Next statically
  renders it and **point/marker positions are baked at build**.
- **Cat data is fetched client-side, live** (e.g. `MountainViewer` /
  `thumbnailPreloader` call `getCatsByPointId` after hydration). Reducing this
  client-side Firestore waterfall is tracked tech-debt (PROJECT_PLAN §7a — "bake the
  data layer"); it is not yet implemented.
- **Build assets**: `scripts/maintenance/fetch-static-assets.js` downloads cat
  thumbnails / about-photos from Firebase Storage into `public/` at build time.

### 2. Multi-Tenant Configuration System

- **Mountain configs**: `config/mountains/mountains.json` defines per-mountain settings
  (public branding/theme/features/social); secrets come from env and are merged in.
- **Environment switching**: `MOUNTAIN_ID` (or `NEXT_PUBLIC_MOUNTAIN_ID`) selects the
  active mountain.
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
# npm run update:cats / update:points / update:feeding-spots / update:static-data
#   export Firestore to local src/lib/*-static-data.json. NOTE: the app does NOT read
#   these files at runtime; they're parked pending the §7a data-layer redesign.
```

### Admin CMS Access

- Navigate to `/admin` for the Cat Management System (gated by `AdminAuth`).
- Direct Firestore-backed editing of cats, media, posts, announcements, members/roles,
  and the about-page content — no Google Sheets dependency.

## Critical Component Patterns

### Data Flow Architecture

```tsx
// Home page — Server Component (SSG): points baked at build
import MountainViewer from '@/components/MountainViewer';
import { getPointService } from '@/services';

export default async function Home() {
  const points = await getPointService().getAllPoints();
  return <MountainViewer points={points} />;
}

// MountainViewer — Client Component: cats fetched live via the service layer
useEffect(() => {
  getCatService().getCatsByPointId(pointId).then(/* … */);
}, [pointId]);
```

### Service Usage Pattern

```tsx
import { getCatService, getImageService } from '@/services';

// Always use factory functions, never direct firebase/* imports in components
const catService = getCatService();
const imageService = getImageService();
```

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

- **TailwindCSS**: utility-first with custom gradients.
- **Responsive grids**: center items including incomplete rows.
- **Modal z-indexing**: CatGallery (z-50), CatInfo (z-60).
- **Korean-first UI**: user-facing text should be in Korean.

## Deployment Architecture

### Vercel (the only target)

- Next.js-optimized hosting with full SSR/SSG + image optimization.
- Git-integration driven: Production = `main`, Preview ("staging") = `dev`.
- Provisioned via Terraform under `infra/terraform/` (env vars incl.
  `SERVICE_ACCOUNT_KEY` set there for production + preview).
- _Cloud Run, the home-server Docker path, and Firebase Hosting were removed in the
  deployment cleanup — do not reintroduce them._

### Firebase Integration

- **Firestore**: primary database (read live via the service layer).
- **Firebase Auth**: email/password, phone (SMS), Kakao OIDC.
- **Firebase Storage**: image hosting with CDN; CORS configured.
- **Firestore rules** still deploy to Firebase via the CLI
  (`firebase deploy --only firestore:rules`); `firebase.json` is trimmed to the
  `firestore` block.

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

- **Smoke suite**: `npm run test:smoke` (`tests/smoke/`) — structural regression net;
  keep it green when refactoring.
- **Migration scripts**: `scripts/migration/` for one-shot data updates.
- **Permission inspection**: `PermissionDebug.tsx` (dev-only) resolves a user's effective
  permissions.

## Anti-Patterns to Avoid

- ❌ Direct Firebase calls in components (use the service layer)
- ❌ Reading `process.env.MOUNTAIN_ID` directly (use `@/utils/config`)
- ❌ Hard-coded mountain configs (use the config system)
- ❌ Reintroducing Cloud Run / Docker / Firebase Hosting / a Cloud Storage data path
- ❌ English text in user-facing UI (Korean-first platform)
  </content>

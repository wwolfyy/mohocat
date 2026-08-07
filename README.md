# MOHOCAT (<ins>MO</ins>untain cat and <ins>HO</ins>use <ins>CAT</ins>)

## Mountain Cat Tracking Platform

A Next.js 14 (App Router, TypeScript) multi-tenant platform for tracking mountain cats,
with a Korean-first UI. Data, auth and image hosting run on **Firebase**; the app is
deployed to **Vercel**.

## 📚 Where the documentation lives

- **[`AGENTS.md`](./AGENTS.md)** (= `CLAUDE.md`) — the agent/contributor guide: architecture
  patterns, working agreements, anti-patterns. **Start here.**
- **[`docs/handoff/HANDOFF.md`](./docs/handoff/HANDOFF.md)** — current engineering state and
  what's next. Read it first when picking work up.
- **[`docs/planning/PROJECT_PLAN.md`](./docs/planning/PROJECT_PLAN.md)** — cross-workstream
  status tracker · **[`BACKLOG.md`](./docs/planning/BACKLOG.md)** — known, non-urgent gaps.
- **[`docs/codebase/CODEBASE_OVERVIEW.md`](./docs/codebase/CODEBASE_OVERVIEW.md)** — per-domain
  deep dives (auth, permissions, services, API routes, admin, media, map, multi-tenant).
- **[`docs/manuals/`](./docs/manuals/)** — operator manuals: the `/admin` CMS
  ([`admin-manual/`](./docs/manuals/admin-manual/)) and deployment
  ([`deployment/`](./docs/manuals/deployment/)).
- **[`log/`](./log/)** — `DEBUG_LOG.md` (non-obvious bug fixes) and `FEATURE_MOD_LOG.md`
  (intentional product changes).

## 🚀 Major features

### Cat Management System (CMS) 🐱

Direct, real-time cat management at `/admin` — add, edit, delete and search cats, with
built-in validation. **No Google Sheets dependency**; changes save straight to Firestore.
The same CMS covers media, posts, announcements, members/roles and the about page.

### Multi-tenant

One Firebase project and one Vercel project serve every mountain. The active tenant is
resolved **per request by Host** (production subdomains; a `/{id}` path in dev/preview), every
content document carries a `mountainId`, and per-mountain config/theme/features come from
[`config/mountains/mountains.json`](./config/mountains/mountains.json). Permissions are scoped
per mountain — a role on one grants nothing on another.

### Service layer

`src/services/index.ts` exports lazily-cached service getters (`getCatService()`,
`getPointService()`, `getImageService()`, …) implementing interfaces in
`src/services/interfaces.ts`. Components never call Firebase directly.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Copy [`.env.example`](./.env.example) to
`.env.local` and fill it in first — Firebase, YouTube OAuth, Kakao, SMTP.

> **Note:** `npm run build` is not a bare `next build` — it runs
> `scripts/maintenance/fetch-static-assets.js` first to download cat thumbnails from Firebase
> Storage into `public/`. In dev, run `npm run fetch:assets` once if images are missing.

## 📊 Data management

### Data source

All data is read **live from Firestore** through the service layer. Cats are read server-side
via the Admin SDK and baked into the home + adoption Server Components (ISR,
`revalidate=3600`, with on-demand `revalidatePath` on admin edits — see PROJECT_PLAN §7a).
There is **no** static-data JSON export and **no** Cloud Storage data-serving path.

### Data update workflow

1. Update data in Firestore through the admin interface.
2. Admin cat-edits trigger on-demand `revalidatePath`, so the baked home + adoption pages
   reflect changes immediately; a 1-hour ISR fallback backstops console/script edits.
3. All other reads come straight from Firestore live via the service layer.

### Admin operations

Use `/admin` to manage cats, media, posts and announcements, members and roles, the about
page, and to view the statistics dashboard.

## 🖼️ Image optimization

Next.js `<Image>` optimization is enabled (WebP/AVIF, 1-year TTL, responsive sizes, priority
loading). Firebase Storage hosts the files, whitelisted via `remotePatterns` in
[`next.config.js`](./next.config.js).

## 🚀 Deployment

**Vercel is the only target, and deploying is `git push`** (Vercel Git integration):

| Branch | Environment         |
| ------ | ------------------- |
| `main` | Production          |
| `dev`  | Preview ("staging") |

There is no deploy command, Dockerfile, or CI deploy workflow. Environment variables are
managed by hand in the Vercel dashboard. Firestore **rules** are the one thing that still
deploys to Firebase, via the CLI:

```bash
firebase deploy --only firestore:rules
```

See [`docs/manuals/deployment/README.md`](./docs/manuals/deployment/README.md) for the full
story, including new-mountain provisioning.

> Cloud Run, the home-server Docker path, and Firebase Hosting were all removed in the
> 2026-06-27 deployment cleanup. Do not reintroduce them.

## 🧪 Testing

```bash
npx tsc --noEmit      # types
npm test              # unit
npm run test:smoke    # structural regression net
npm run test:rules    # Firestore security rules (starts the emulator)
npm run test:e2e      # Playwright, emulator-backed
```

`test:rules` and `test:e2e` need a JDK for the Firebase emulators. On this project's macOS
setup that means `export PATH=/usr/local/opt/openjdk/bin:$PATH` first.

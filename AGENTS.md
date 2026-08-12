# 산냥이집냥이 (mohocat) — Agent Guide

> Context for AI coding agents working in this repo. (Consolidated from the former
> `.github/copilot-instructions.md` + `.github/instructions/.instructions.md`.)
> `CLAUDE.md` is a symlink to this file.

## First action in a new session

**Read [`work_tracking/HANDOFF.md`](./work_tracking/HANDOFF.md).** It is short by design and it
says what is in flight, what needs the owner, and where the branch stands. **Do this without
being asked** — the owner should not have to say "pick up the hand-off" at the start of every
session. Then, if you are about to do work:

```bash
node work_tracking/scripts/checkout.js --query "status = 'open'" --out /tmp/open.json
```

Everything below is orientation you can read on demand. The hand-off is the part that changes
between sessions, so it is the part you cannot skip.

## Project Overview

This is a Next.js 14 (App Router, TypeScript strict) multi-tenant platform for tracking
mountain cats with a Korean UI ("계양산 고양이들"). Data, auth, and image hosting run on
**Firebase**; the app is deployed to **Vercel**. The codebase is **multi-tenant** (M1–M8
complete): one Firebase + one Vercel project serve every mountain, the active tenant is
resolved **per request by Host** (production subdomains, `/{id}` path in dev/preview), every
content doc carries a `mountainId`, and per-mountain config/theme/features come from
`config/mountains/mountains.json`.

## Where things live (orient here first)

**Two parts, and the distinction is the point.** [**§A — Tracking work**](#a--tracking-work)
is the live state: what is open, what was decided, what changed. It is a **store**, and it is
written to. [**§B — Reference**](#b--reference) is what the codebase already knows about itself.
It is read. **If you are about to write something down, it belongs in §A** unless it is a
durable explanation of how the system works.

> ⏸️ **Application work is still PAUSED** (owner, 2026-08-08) while the work-tracking
> restructure finishes. **`work_tracking/HANDOFF.md` says what remains** — one record. Removing
> this notice is that record's job, not a side effect of some other change.

---

### A — Tracking work

Everything lives in `work_tracking/`, **one record per item**.

**Start at [`work_tracking/HANDOFF.md`](./work_tracking/HANDOFF.md)** — current state and what
is in flight, deliberately short — then query the registry. A bug fixed, a change made, a
decision reached, a new task, an owner question: **each is one record**, distinguished by a
`type` field rather than by which file it lives in.

```bash
node work_tracking/scripts/checkout.js --query "status = 'open'"   # what needs doing
node work_tracking/scripts/checkout.js --new                       # start a record
#   edit work_tracking/work.json — type: bug | change | task | decision | question
#   long prose goes in work_tracking/records/R-XXXX.md, never in the row
node work_tracking/scripts/checkin.js
node work_tracking/scripts/build.js                                # regenerates registry.md
```

**Four rules bind here. They are the four that fail _silently_** — nothing refuses you, and the
result looks fine:

- **R1 — that loop is the only write path.** Every change to the store is
  `checkout → edit work.json → checkin → build`. ⚠️ **`registry.ndjson` is written by `checkin.js`
  and by nothing else — never hand-edit it**, and correct a mistake with the **next revision**
  rather than by editing the line that was wrong. A brand-new item goes through the same loop —
  `checkout.js --new` opens an empty `work.json` to add to. Having nothing checked out is normal,
  not a reason to write a row by hand.
- **R2 — finish the work, _then_ check in.** A record has two parts: its **row** in
  `registry.ndjson`, which `checkin.js` versions, and its **prose file** `records/R-XXXX.md`, which
  nothing versions. Check in while the prose is still changing, and the row keeps claiming a
  revision whose text has since moved on, with nothing in the store recording that it did. A
  substantive correction afterwards is a **new revision with a `note`**, not a silent edit.
- **R3 — never `grep` the store; query it.** It is append-only and JSON-escaped, so grep
  over-counts superseded revisions and misses escaped text — wrong in both directions, and it
  returns a plausible number either way. Use `checkout.js --query`, and pass `--out /tmp/x.json`
  when you are only looking, or the query overwrites a checkout you have open.
- **R4 — the record goes in the same change as the work.** Not before (that is R2), and not
  after: **a diff records what changed, never what you decided not to do**, so a record
  reconstructed later has already lost the abandoned approach and the premise that turned out
  false. Work that no existing record asked for still gets a record — "nothing was open for it" is
  not an exemption, and it does not matter who noticed. A finding you are _not_ going to act on
  gets one too, with `status: open`. A query returns **rows**; it never returns the prose inside a
  record's body. So a finding written into the body of whatever record you had open is not findable
  by any query, and `--query "status = 'open'"` is what the next session runs.

**Why each holds is [`WORKFLOW.md`](./work_tracking/WORKFLOW.md) §2, §5 — do not restate it here.**
One rule, one statement, one expansion: a copy in two files drifts, and `R-0440` went stale inside a
day when its prose named a file the content had moved out of.

**This list is not every rule, deliberately.** A rule the tooling **refuses** (check-in rejects a
`split_from` you did not check out, and the error says what to do) or one you cannot meet without
already reading its section (merge-conflict recovery) lives in `WORKFLOW.md` beside its
explanation. Only the silent ones are here, because those are the ones nothing else will tell you
about.

- **[`work_tracking/WORKFLOW.md`](./work_tracking/WORKFLOW.md)** — how to operate the store: the
  loop in full, looking things up, `work.json` and its stamp, merge-conflict recovery, and why
  grep is wrong about the store. Read it before your first check-in.
- **[`work_tracking/SCHEMA.md`](./work_tracking/SCHEMA.md)** — what the store **is**: every field,
  the relationships, the views, and what the schema cannot enforce.
- **[`work_tracking/registry.md`](./work_tracking/registry.md)** — the human view: open work,
  parked work with its reason, every record. ⚠️ **Generated — never hand-edit it.** CI fails if
  it does not equal `build(registry.ndjson)`.
- **[`work_tracking/PROJECT_PLAN.md`](./work_tracking/PROJECT_PLAN.md)** — cross-workstream
  prose and the §-numbered sections records point back at. Its snapshot table is an **index**:
  status plus where to read more, never the narrative itself.

⚠️ **Do not add entries to `log/DEBUG_LOG.md`, `log/FEATURE_MOD_LOG.md` or
`docs/planning/BACKLOG.md`.** All three are **stubs** — their content is in the registry, and
each stub says so at the top. A bug fix is a record with `type: bug`; an intentional change is
`type: change`; a deferred gap is `status: deferred` with its reason in `note`. **Nothing
moves between files any more** — a status change is a field, so the old "move the item and
delete its origin in the same change" rule no longer applies to anything.

⚠️ **`work.json` is gitignored — never commit it**, and do not delete it after a check-in; it is
the merge-conflict recovery file.

**Living documents have size budgets** in
[`work_tracking/size-policy.json`](./work_tracking/size-policy.json), and **CI fails** when one
is exceeded — `node work_tracking/scripts/size-check.js --report` shows the room left. Budgets
sit just above each file's real size, so growth needs someone to raise the number in a diff.
That is allowed; doing it by accident is what stops. _(This is why a long narrative goes in a
record and not in the hand-off.)_

---

### B — Reference

What the codebase knows about itself. Check here before re-deriving context from scratch — but
⚠️ **nothing here tracks state**; if what you found is a status, it is stale by definition and
§A is authoritative.

- **`docs/codebase/`** — per-domain deep dives (auth, permissions, services, API routes,
  admin, media, map, multi-tenant, deployment) with diagrams and **watch-outs**. Start at
  `CODEBASE_OVERVIEW.md`. _(Snapshot docs — verify against code before trusting specifics.)_
- **`docs/design/`** — design source-of-truth + redesign plan/tasks.
- **`docs/manuals/`** — **manuals**: `admin-manual/` (operator-facing how-to for the
  `/admin` CMS — content link tokens, cat/post fields, config & ops) and `deployment/`
  (how deploys work + new-mountain provisioning). Distinct from `docs/codebase/` (how
  it's built) — manuals are "what do I click/type to do X."
- **`docs/planning/pending/` and `completed/`** — companion plans for a single workstream,
  too long to be a record. Records point at them by `detail_ref`. A doc moves to `completed/`
  when its own status line says it is done.
- **`docs/handoff/archive/`** — every frozen hand-off, including the 3,396-line living document
  this structure replaced. History, not state. ⚠️ **Some of its internal links no longer
  resolve** — these files have been relocated twice and were never repointed.
- **`log/doc_updates.log`** — codebase-doc refresh runs. The only live file left in `log/`; its
  two `.md` neighbours are stubs.

## Working Agreements

- **Don't make code changes unless explicitly requested.** A question is not a request to
  change code — answer it first.
- **Reuse before writing.** Prefer existing modules, components, classes, and functions
  over new code blocks for the same need.
- **Separation of concerns.** Each module/component should hold a single responsibility (or
  one group of closely related ones).
- **Ask before committing.** Make the edits, run the gates, summarize what's staged — then wait
  for a go-ahead before `git commit` (and before pushing). **Application gates:**
  `npx tsc --noEmit` + `npm run test:smoke`. **If you touched `work_tracking/` or any document
  it governs, also run:** `node work_tracking/tests/run.js`,
  `node work_tracking/scripts/build.js --check`, `node work_tracking/scripts/size-check.js`, and
  `node work_tracking/scripts/link-check.js`. **`link-check.js` covers every tracked `.md` in
  the repo, not only `work_tracking/`** — so run it after any documentation change that moves a
  file or adds a link. The record for the work goes in the **same** change — see §A.
- **Error handling (per the repo owner's global conventions):** `try/catch` that **logs and
  re-raises** — never silently swallow errors or add fallbacks unless asked. Don't log
  secrets or PII.

## Core Architecture Patterns

### 1. Data Flow — live Firestore via the service layer

- **The app reads Firestore live**, through the service layer — there is **no** static-data
  read path and **no** Cloud Storage data serving.
- **Home page is a Server Component** (`src/app/page.tsx`): it `await`s **points and cats
  together** server-side (`getAllPoints()` + `getAllCatsServer()`) and passes them to the
  client map as props. It sets `export const revalidate = REVALIDATE_SECONDS` (3600s / 1h) —
  so it's **ISR, not baked-at-build**: a Firestore point-coordinate or cat edit reflects
  **without a redeploy** (≤1h via the time backstop; admin **cat** edits also fire on-demand
  `revalidatePath('/')` for an immediate refresh — point edits rely on the ≤1h backstop).
- **§7a "bake the data layer" is done for the landing map**: cat avatars are server-read and
  baked into the render, so the map makes **zero client Firestore queries** for avatars —
  `MountainViewer` receives `catsByPoint` as a prop and no longer calls `getCatsByPointId`
  after hydration. (`thumbnailPreloader` remains for image preloading.)
  - **Config knobs are a different mental model — still baked.** `mountains.json` (theme,
    features, `map.*`) is a static import, so those change **only on redeploy**; Firestore
    data (points/cats) is ISR-fresh per above.
- **Build assets**: `scripts/maintenance/fetch-static-assets.js` downloads cat thumbnails
  from Firebase Storage into `public/` at build time. ⚠️ **About photos are no longer baked**
  (2026-08-02) — they serve live from Storage, keyed on the filename in the CMS record
  (`about_content/{mountainId}`); the whole about page is CMS-authored, with **no** `about`
  block in `mountains.json`.

### 2. Multi-Tenant Configuration System

- **Mountain configs**: `config/mountains/mountains.json` defines per-mountain settings
  (public branding/theme/features/social/`domains`/`storagePrefix`/`hidden`); secrets come from
  env and are merged in. A new mountain is also added to `config/permissions.json`'s `mountains`
  block (kept coherent).
- **Host resolution**: the active tenant is resolved **per request by Host** via each
  mountain's `domains` (`src/lib/tenant.ts` + middleware), with a `/{id}` path fallback for
  dev/preview. `MOUNTAIN_ID` (or `NEXT_PUBLIC_MOUNTAIN_ID`) is only the **default** fallback,
  not a selector.
- **Config utils**: `src/utils/config.ts` provides `getMountainConfig()`,
  `getDefaultMountainId()`, `getPublicMountains()`, `isFeatureEnabled()`, etc.; tenant
  resolution helpers live in `src/lib/tenant.ts`. Import mountain context from here — never read
  `process.env.MOUNTAIN_ID` directly.
- **Theme is GLOBAL, not per-tenant (owner decision 2026-08-05 — supersedes M8).** Every
  mountain uses the same colors; `mountains.json` has **no `theme` block** and there is no
  per-tenant color knob. Values live in **`tailwind.config.js` only** (`docs/design/design.md`
  is intent-and-usage, and defines no values). `globals.css` declares
  `--color-primary: theme('colors.brand.DEFAULT')`, resolved at **build** time — the variable
  exists so non-Tailwind CSS (`<style jsx global>`, `.dsg-*`, Leaflet) can reach the same
  value, not as a second definition. ⚠️ **Never inline a brand hex** in a component, in
  `globals.css`, or as a `var()` fallback.
- **Default**: an unmapped host or missing env falls back to `'geyang'`.

### 3. Service Layer Abstraction

- **Factory pattern**: `src/services/index.ts` exports service getters (`getCatService()`,
  `getPointService()`, `getImageService()`, …).
- **Interface-based**: services implement interfaces from `src/services/interfaces.ts`.
- **Firebase implementation**: all services currently use Firebase, abstracted for future
  backends and per-mountain DB separation.
- **Lazy singletons**: each getter instantiates and caches on first use.

## Key Development Workflows

### Build Process

- `npm run build` (and `vercel-build`, what Vercel runs) is **not** a bare `next build` — it
  runs `scripts/maintenance/fetch-static-assets.js` first to download cat thumbnails from
  Firebase Storage into `public/`. Other scripts are in `package.json`.

### Admin CMS Access

- Navigate to `/admin` for the Cat Management System (gated by `AdminAuth`).
- Direct Firestore-backed editing of cats, media, posts, announcements, members/roles, and
  the about-page content — no Google Sheets dependency.

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

## Environment Variables

- **See [`.env.example`](./.env.example)** for the full set (Firebase, YouTube OAuth, Kakao,
  SMTP, `SERVICE_ACCOUNT_KEY`). `MOUNTAIN_ID` is optional and only the **fallback** tenant
  (defaults to `geyang`) — never a selector; see §2 above.

## Testing & Debugging

- **Smoke suite**: `npm run test:smoke` (`tests/smoke/`) — structural regression net; keep
  it green when refactoring.
- **Migration scripts**: `scripts/migration/` for one-shot data updates. Dry-run by default
  (`APPLY=true` to write). Those with emulator coverage are tested by
  `npm run test:scripts` (`tests/scripts/`, `vitest.scripts.config.ts`) — the third
  emulator-backed suite alongside `test:rules` and `test:e2e`, and like them **excluded from
  `npm test`**, so a script regression is caught only in its own CI job.
- **Permission inspection**: `PermissionDebug.tsx` (dev-only) resolves a user's effective
  permissions.
- **Recording a fix**: after fixing a bug whose root cause was non-obvious, write a **record**
  with `type: bug` — symptom, root cause, fix, and how it was verified — so the reasoning
  survives without re-reading the diff. An intentional change (enhancement, small fix, removal)
  is `type: change`. ⚠️ **Not `log/DEBUG_LOG.md` or `log/FEATURE_MOD_LOG.md`** — both are stubs
  now; see the orientation section above.
- **Before you look for a prior sighting of a bug**, query the store rather than grepping the
  logs: `checkout.js --query "type = 'bug'"` — per **R3** in §A above, which is where that rule is
  stated and `WORKFLOW.md` §5 is where it is demonstrated.

## Anti-Patterns to Avoid

- ❌ Direct Firebase calls in components (use the service layer)
- ❌ Reading `process.env.MOUNTAIN_ID` directly (use `@/utils/config`)
- ❌ Hard-coded mountain configs (use the config system)
- ❌ Reintroducing Cloud Run / Docker / Firebase Hosting / a Cloud Storage data path
- ❌ English text in user-facing UI (Korean-first platform)

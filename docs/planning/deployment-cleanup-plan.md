# Deployment Cleanup Plan — Vercel-only

**Created:** 2026-06-27 · **Owner workstream:** PROJECT_PLAN §7 (tech-debt) ·
**Context:** [`docs/handoff/2026-06-27-handoff-5.md`](../handoff/2026-06-27-handoff-5.md)
§1–§3.

## Goal

The repo carries **four** historical deployment paths (Firebase Hosting, Cloud Run,
home-server Docker, Vercel). **Vercel is now the only target.** Remove every trace of
the others so the build/deploy story is unambiguous and the next engineer can't
mistake dead config for live config (which is exactly what led the contact-form
notification down a Firebase-Functions dead end).

## Guiding principle — separate compute from data

- **Compute = Vercel.** Anything that builds/serves/containerizes the app for another
  host is dead.
- **Data/Auth = Firebase** (Firestore project `mountaincats-61543`), unchanged.
  Firestore **rules** still deploy to Firebase via the CLI. **Keep** `.firebaserc`,
  `config/firebase/firestore.rules`, and the `firestore` block in `firebase.json`.

## Non-goals

- No behavior changes to the running app. This is config/file removal + script
  hygiene only.
- The contact-form feature stays **parked** (handoff-5 §2); we resume it after this.
- The `docs/archive/**` reorg is a pre-existing separate concern (handoff-3 §6.3) —
  only lightly touched here (Phase 3).

---

## Phase 1 — Core deployment cleanup (the ask)

Grouped by the dead target. Verify each before deleting.

### 1a. Firebase Hosting (retired — was the static era)

| File / change                                         | Action     | Why                                                                                                  |
| ----------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| `.github/workflows/firebase-hosting-merge.yml`        | **delete** | Already fully commented-out; Hosting retired.                                                        |
| `.github/workflows/firebase-hosting-pull-request.yml` | **delete** | Same.                                                                                                |
| `firebase.json` → `hosting.frameworksBackend` block   | **remove** | Firebase Hosting/App-Hosting not used; the app serves from Vercel. Leave only the `firestore` block. |

### 1b. Google Cloud Run

| File / change                                     | Action     | Why                                      |
| ------------------------------------------------- | ---------- | ---------------------------------------- |
| `.github/workflows/deploy-cloud-run.yml`          | **delete** | Cloud Run not used.                      |
| `package.json` → `cloud-run:deploy-backup` script | **remove** | `gcloud run deploy` of a backup service. |

### 1c. Home server (Docker Compose)

| File / change                                                                 | Action     | Why                                                    |
| ----------------------------------------------------------------------------- | ---------- | ------------------------------------------------------ |
| `.github/workflows/deploy-home-server.yml`                                    | **delete** | Self-hosted-runner deploy on push to `main`; not used. |
| `Dockerfile`                                                                  | **delete** | Containerization only served Cloud Run / home server.  |
| `docker-compose.yml`                                                          | **delete** | Same.                                                  |
| `.dockerignore`                                                               | **delete** | Docker-only.                                           |
| `build-docker.bat`                                                            | **delete** | Windows Docker build helper.                           |
| `package.json` → `docker:build`, `docker:run`, `docker:build-and-run` scripts | **remove** | Docker-only.                                           |

### 1d. Firebase Functions (from handoff-5 — the abandoned trigger approach)

| File / change                                | Action     | Why                                                                                                                              |
| -------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `functions/` (whole directory)               | **delete** | Cloud Function can't run on Vercel; notification moves to a Next.js API route (handoff-5 §2). No app code imports it (verified). |
| `firebase.json` → `functions` block          | **remove** | No functions codebase to deploy.                                                                                                 |
| `tsconfig.json` → `"functions"` in `exclude` | **revert** | Only added to hide `functions/` from the app typecheck.                                                                          |

### 1e. Static-export leftover

| File / change                 | Action     | Why                                                                                   |
| ----------------------------- | ---------- | ------------------------------------------------------------------------------------- |
| `next.config.staticexport.js` | **delete** | Dead `output: 'export'` config from the static era; `next.config.js` is the live one. |

### 1f. Legacy second Firebase config

| File / change                   | Action                   | Why                                                                                                                                                                                                |
| ------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config/firebase/firebase.json` | **delete (consolidate)** | Second, stale `firebase.json` (static `out` hosting + a functions codebase that doesn't exist). The **root** `firebase.json` is the active one. Confirm nothing references this path, then remove. |

**End state of root `firebase.json`:**

```json
{ "firestore": { "rules": "config/firebase/firestore.rules" } }
```

---

## Phase 2 — Deployment-adjacent cleanup encountered

### 2a. The `build` script runs a GCS export on every build 🔴

`package.json`:

- `build` = `export_all_to_cloud_storage.js && fetch-static-assets.js && next build`
- `vercel-build` = `fetch-static-assets.js && next build`

Vercel runs **`vercel-build`** (it takes precedence), so the GCS export only ever ran
inside the now-deleted Docker build. This is the §7 "build re-exports to GCS every
run" debt. **Action:** align `build` with `vercel-build` (drop the
`export_all_to_cloud_storage.js` step from `build`), and keep that export available as
an explicit manual script if it's still useful (e.g. `update:static-data` already
exists for data exports). **Confirm in the Vercel dashboard** that the Build Command
is `vercel-build` (or `build` after we align them) and the Install Command is right.

### 2b. Orphaned health endpoint

`src/app/api/health/route.ts` — header says "Health check endpoint for Cloud Run";
it was hit by the Cloud Run + home-server health checks (both deleted). Not referenced
by app code. **Action:** delete unless you want a generic uptime probe (harmless to
keep — decide).

### 2c. Stray deployment comments

- `src/app/pages/butler_stream/new/page.tsx:11` — comment "avoids HTTP calls to self
  during build which fails in Docker." The _code_ may still be worth keeping (avoiding
  self-fetch at build is good on Vercel too); just **refresh the comment** so it
  doesn't cite Docker. Low priority.

### 2d. `.firebaserc` staging alias

`staging` → `mountaincats-staging`. Keep `default` (needed for rules deploy). **Decide**
whether the `staging` alias is still real; drop if not.

---

## Phase 3 — Broader cleanup encountered (out of strict scope — confirm before doing)

Found while surveying; already noted in PROJECT_PLAN §7. List here so they're not lost;
**do these as a separate pass** unless you want to fold them in.

- **Duplicate admin API routes** — `src/app/api/admin/get-all-user-permissions-*`
  has ~8 variants (`-client`, `-working`, `-final`, `-real`, `-fixed`, `-simple`,
  `-live`, plus the base). `RoleManagement.tsx` uses **`-client`**. Verify usages,
  then delete the rest. (§7 "dead code".)
- **`src/services/MIGRATION_EXAMPLE.ts`** — example/scaffold, not imported by app. (§7)
- **`src/services/role-assignment-service.ts`** — flagged dead in §7; verify before
  removing (it's used by `RoleManagement.tsx` — re-check, may NOT be dead).
- **`docs/archive/` deployment docs** — `[OBSOLETE] DEPLOYMENT.md`, `CICD_server.md`,
  `MONITORING.md` describe the dead Docker/Cloud-Run/home-server flows. Already
  archived; optionally prune. `DOMAIN_SETUP.md` may still be relevant (external
  whitelists) — keep/review, don't blind-delete.

---

## Verification (after Phase 1 + 2)

1. `npx tsc --noEmit` — clean (the `functions` exclude removal must not reintroduce
   errors; it won't, since `functions/` is gone).
2. `next lint` — no new warnings.
3. `npm run vercel-build` locally — completes (proves the real Vercel build path is
   intact without the deleted scripts). _Requires the asset fetch to reach Firebase;
   see the asset-pipeline note._
4. `firebase deploy --only firestore:rules --dry-run` (or `firebase deploy
--only firestore:rules` when ready) still resolves the rules path — proves the
   Firebase data-layer wiring survived the `firebase.json` trim.
5. Grep sweep: no remaining references to `Dockerfile`, `docker compose`, `cloud run`,
   `mtcat-next`/`mcathcat`, `firebase-hosting`, `staticexport`, or `functions/`
   outside `docs/archive/`.
6. Sanity-check the **Vercel project settings** (build command, env vars) — the one
   thing not visible from the repo.

## Suggested commits

1. `chore: remove dead deploy targets (Cloud Run, home server, Firebase Hosting, Docker)`
   — Phase 1a–1c + 1e.
2. `chore: drop Firebase Functions scaffold; trim firebase.json to firestore rules`
   — Phase 1d + 1f.
3. `chore: align build script with vercel-build; remove orphaned health route`
   — Phase 2 (per the decisions made).

Phase 3 = its own follow-up commit(s).

## Open questions for the user

1. **Vercel Build Command** — is it set to `vercel-build` in the dashboard? (Determines
   whether 2a is "delete the GCS step from `build`" or "merge the two".)
2. **Keep `/api/health`?** (generic probe vs delete)
3. **Keep the `staging` Firebase alias?**
4. **Fold Phase 3 in now, or separate pass?**

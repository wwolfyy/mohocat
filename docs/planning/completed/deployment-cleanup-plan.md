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

## Phase 1 — Core deployment cleanup (the ask) — ✅ DONE (commit `f62816b`, 2026-06-27)

All 1a–1f executed; `firebase.json` trimmed to `{ firestore: { rules } }`; docker/
cloud-run scripts + the `functions` tsconfig exclude removed. Verified: `tsc` clean,
`npm run test:smoke` green (24), no refs to deleted paths. Phase 2/3 pending the
open questions at the bottom.

> ⚠️ **Phase 1 was incomplete, and the tables below are why — corrected 2026-08-03.**
> Owner-reported (`config/deployment/cloud-run-service.yaml` "is still here"), and a sweep
> found more: `scripts/deployment/deploy-cloud-run.{sh,bat}` and `public/index.html` —
> Firebase Hosting's "Setup Complete" welcome page, which Next was **serving publicly at
> `/index.html`** on the production domain. All now deleted.
>
> 🔑 **The plan's own shape caused the miss.** These tables enumerate _files someone already
> knew about_ — the workflows, the `package.json` scripts — and "verify each before deleting"
> reads as thoroughness while scoping the work to that list. Nothing ever grepped for
> `cloud-run` across the tree. §1b deleted `.github/workflows/deploy-cloud-run.yml` and the
> `cloud-run:deploy-backup` npm script while `scripts/deployment/deploy-cloud-run.sh` sat
> untouched one directory away. **A removal plan needs a pattern sweep, not an inventory** —
> and the check that would have caught it is the one the commit message claimed to have run:
> "no refs to deleted paths" was true; "no refs to the dead _target_" was not.
>
> 📌 The `README.md` fallout outlived the code by 14 months: it still told a new engineer to
> deploy with `npm run cloud-run:deploy` — a script **this very phase deleted** — and linked
> four root-level architecture docs that no longer exist. Rewritten 2026-08-03.

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

## Phase 2 — Deployment-adjacent cleanup — ✅ DONE (2026-06-27)

> **Infra note (discovered this phase):** Vercel is wired via **Terraform**
> (`infra/terraform/`), not just the dashboard. Production = `main`, **Vercel Preview
> "staging" = `dev` branch** (distinct from the Firebase staging project). All env
> vars — incl. `SERVICE_ACCOUNT_KEY` (Admin SDK creds) — are set there for both
> `production` + `preview`. No Build Command is set, so Vercel uses **`vercel-build`**
> by default (confirms the GCS export never ran on Vercel).

### 2a. `build` ran a GCS export on every run — ✅ aligned

Dropped `export_all_to_cloud_storage.js` from `build`; it's now
`fetch-static-assets.js && next build` (identical to `vercel-build`). The export was
never part of the Vercel deploy and writes Cloud Storage JSON **nothing in the app
reads**. _The script file stays_ (the admin route imports it — see Phase 3 flag).

### 2b. Orphaned health endpoint — ✅ deleted

Deleted `src/app/api/health/route.ts`. It existed only for the Cloud Run / home-server
load-balancer probes (both gone). Confirmed: **not needed for Vercel to operate**, and
the app's monitoring is **Firebase Analytics** (`AnalyticsTracker.tsx` /
`services/firebase.ts` `getAnalytics`) — client-side, doesn't use the endpoint. Trivial
to re-add if an external uptime monitor is introduced later.

### 2c. Stray deployment comments — ⏳ deferred (low priority)

- `src/app/pages/butler_stream/new/page.tsx:11` — "avoids HTTP calls to self … fails
  in Docker." Keep the code; just refresh the comment. Roll into Phase 3.

### 2d. `.firebaserc` Firebase staging alias — ✅ removed

Removed `staging` → `mountaincats-staging` (user confirmed the Firebase staging
project is retired; Vercel is the deploy path). Kept `default` (mountaincats-61543),
needed for `firebase deploy --only firestore:rules`. **Not** the Terraform/Vercel
`staging` (that's Preview on `dev` — kept).

---

## Phase 3 — Broader cleanup encountered — ✅ DONE (2026-06-27, `e0763b1`…`e408e30`)

> **Executed.** Detailed plan + outcomes:
> [`phase3-cleanup-plan.md`](./phase3-cleanup-plan.md). Summary of how each surveyed
> item below was resolved:
>
> - **Static-data export subsystem** — split into Half A (Cloud Storage push: the
>   `update-static-data` route + admin "Static Data 관리" tab + `export_all_to_cloud_storage.js`
>   - `test_admin_api.js`) → **removed**, preserved on branch
>     `archive/static-data-cloud-export`; and Half B (local `src/lib/*.json` export) →
>     **left for §7a** (entangled with the kept `fetch-static-assets.js`).
> - **Duplicate admin API routes** — the 7 unreferenced `get-all-user-permissions-*`
>   variants + `get-all-users` **deleted**; `-client` kept.
> - **`MIGRATION_EXAMPLE.ts`** — **deleted**.
> - **`role-assignment-service.ts`** — verified **live** (used by `RoleManagement` +
>   `PermissionDebug`); **kept**; the §7 "dead" flag was corrected.
> - **`docs/archive/` deploy docs** — left archived (not pruned, as planned).
> - **Doc accuracy** — rewrote `.github/copilot-instructions.md`; fixed stale flags in
>   PROJECT_PLAN §7 + `services-layer.md`; bannered the cloud-storage migration READMEs.

The original survey notes follow (kept for provenance).

- **🚩 Cloud Storage static-data export subsystem (unconsumed)** — `build` no longer
  runs `export_all_to_cloud_storage.js`, but the script is still imported by
  `src/app/api/admin/update-static-data/route.ts` (the admin "static-data" tab calls
  it). It exports Firestore → Cloud Storage `static-data/*.json` that **nothing in the
  app reads**. Investigate why the admin page references it and whether the reference +
  the script (+ the admin tab) can be removed. Note the sibling `export_*_to_static.js`
  writes a _local_ `src/lib/cats-static-data.json` — check if _that_ is consumed before
  touching the family. Overlaps §7a (bake-the-data-layer may want to revive baking).
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

0. `npm run test:smoke` — the structural smoke suite (`tests/smoke/smoke.test.ts`,
   added 2026-06-27) must stay **green**. It's the regression net for this cleanup:
   referenced `/api/*` routes still resolve to handler files (the dead-route guard),
   the `firebase.json`→Firestore-rules wiring + `contacts` rule + `adminEmail`
   survive, and the critical public pages exist. Runs in <1s, no server/env. Run it
   **before** (baseline: 24 passing) and **after** each phase.
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

## Open questions for the user — ✅ all resolved

1. **Vercel Build Command** — confirmed no Build Command set, so Vercel uses
   `vercel-build`; `build` was aligned to match (Phase 2a).
2. **Keep `/api/health`?** — deleted (Phase 2b); app monitoring is Firebase Analytics.
3. **Keep the `staging` Firebase alias?** — removed (Phase 2d); Vercel Preview on `dev`
   is the staging path.
4. **Fold Phase 3 in now, or separate pass?** — done as a separate, fully-planned pass
   ([`phase3-cleanup-plan.md`](./phase3-cleanup-plan.md)), executed 2026-06-27.

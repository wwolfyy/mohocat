# Phase 3 Cleanup — Detailed Plan

**Created:** 2026-06-27 · **Branch:** `dev` · **Baseline commit:** `6b7e005`
**Supersedes:** the Phase 3 stub in
[`deployment-cleanup-plan.md`](./deployment-cleanup-plan.md) §Phase 3 ·
**Companions:** [`handoff-6`](../handoff/2026-06-27-handoff-6.md) (why the first
attempt was reverted), [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) §7 / §7a.

---

## 0. Why this plan exists

The first Phase 3 attempt was **reverted** (`git reset --hard`) because it had no plan
and was done reactively: 3.1 (isolated dead code) was clean, but 3.2 (the static-data
subsystem) kept pulling in more surface — admin UI, an API route, ~5 scripts, 2 data
files, npm scripts, ~5 docs — and mid-way discovered the subsystem is **entangled with
the kept asset pipeline**. This plan fixes that by:

1. **Scoping every commit to an isolated, individually-verifiable unit.**
2. **Splitting the static-data subsystem into two halves** (see §2) so the entangled
   half is explicitly deferred, not stumbled into.
3. **Recording exact, verified file inventories and smoke-count expectations** up front
   so execution doesn't re-investigate.

### Verified baseline (at `6b7e005`)

- `npx tsc --noEmit` — clean
- `npm run test:smoke` — **24 passing**
- Working tree — clean

### The smoke suite is the gate (understand it before editing)

`tests/smoke/smoke.test.ts` scans **all of `src`** for string literals matching
`/api/...` and asserts each referenced path has a `src/app/<path>/route.ts` handler.
Consequences for this plan:

- Deleting an **unreferenced** route is **invisible** to the suite → **count stays 24.**
- Deleting a **referenced** route **and its only reference together** drops the
  referenced set by one → **count drops by one (expected, not a failure).**
- The suite does **not** assert the inverse (every route dir must be referenced), so
  unreferenced-route deletions never fail it.

Gate **every** commit with: `npx tsc --noEmit` + `npm run test:smoke`
(+ `next lint` on changed files). **`tsc` is NOT in the pre-commit hook** (only
Prettier/ESLint via lint-staged) — run it yourself.

---

## 1. Verified inventory (the facts execution relies on)

### 1A — Isolated dead code (safe; unreferenced)

| Item                                                              | Status                      | Evidence                                                     |
| ----------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------ |
| `src/app/api/admin/get-all-user-permissions` (base)               | **DELETE**                  | 0 string refs in `src`/`tests`                               |
| `…-final`, `…-fixed`, `…-live`, `…-real`, `…-simple`, `…-working` | **DELETE**                  | 0 string refs each                                           |
| `src/app/api/admin/get-all-users`                                 | **DELETE**                  | 0 string refs                                                |
| `src/app/api/admin/get-all-user-permissions-client`               | **KEEP**                    | used by `RoleManagement.tsx:29`                              |
| `src/services/MIGRATION_EXAMPLE.ts`                               | **DELETE**                  | 0 imports anywhere                                           |
| `src/services/role-assignment-service.ts`                         | **KEEP — §7 flag is WRONG** | imported by `RoleManagement.tsx:6` + `PermissionDebug.tsx:5` |

`-client` imports only `next/server` + `@/lib/firebase-admin` — it does **not**
chain-import any sibling route, so deleting the others can't break it.

→ **8 directories deleted** (7 permission variants + `get-all-users`); `-client` kept.
**Smoke count unchanged (24)** — none of the 8 are referenced.

### 1B — Static-data subsystem, split into two halves

> **Premise correction (important):** Phase 2 already removed the exporter from the
> build. Both `build` and `vercel-build` are now
> `node scripts/maintenance/fetch-static-assets.js && next build` — **no exporter
> runs at build/deploy time.** That decoupling is what makes the clean split below
> possible (the handoff-6 worry that this was one inseparable blob no longer holds).

#### Half A — Cloud Storage "push" path → **REMOVE this round (after preserving)**

Genuinely dead and **not** the architecture §7a will revive (§7a bakes via Server
Components + SSG/ISR + Admin SDK, _not_ by pushing JSON to GCS from an admin button).

| File / surface                                                   | Role          | Ref / consumer                                              |
| ---------------------------------------------------------------- | ------------- | ----------------------------------------------------------- |
| `src/app/api/admin/update-static-data/route.ts`                  | API route     | fetched by `app-management/page.tsx:83`                     |
| `src/app/admin/app-management/page.tsx` — "Static Data 관리" tab | admin UI      | the only caller of the route                                |
| `scripts/migration/export_all_to_cloud_storage.js`               | GCS exporter  | imported by the route + `test_admin_api.js`                 |
| `test_admin_api.js` (repo root)                                  | manual tester | imports `exportAllToCloudStorage`; not in any npm script/CI |

- Output: GCS `static-data/*.json` — **nothing in the app reads it** (no `.ts/.tsx`
  imports `cats-static-data` / `points-static-data` / `feeding-spots-static-data`).
- The admin page edit is **partial** (the file is 527 lines; only the `static-data`
  tab — state `dataUpdaterLoading`/`dataUpdaterMessage`, the `update-static-data`
  fetch handler, the tab button, the tab panel, and `'static-data'` in the
  `activeTab` union in 3 places — is removed). **Keep** the `about` / `faq` /
  `posts-config` tabs and `AboutContentEditor`.
- **Smoke count 24 → 23** (route + its only reference removed together — expected).

#### Half B — local `src/lib/*.json` export → **DO NOT TOUCH — defer to §7a**

This is the half-built "baking" seam §7a wants to redesign, and it is **entangled
with the kept asset pipeline**:

| File                                                                           | Note                                                                                                                                                                                    |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/migration/export_cats_to_static.js` (`update:cats`)                   | writes `src/lib/cats-static-data.json`                                                                                                                                                  |
| `scripts/migration/export_points_to_static.js` (`update:points`)               | local export                                                                                                                                                                            |
| `scripts/migration/export_feeding_spots_to_static.js` (`update:feeding-spots`) | writes `src/lib/feeding-spots-static-data.json`                                                                                                                                         |
| `scripts/migration/update_all_static_data.js` (`update:static-data`)           | orchestrates the above                                                                                                                                                                  |
| `src/lib/cats-static-data.json` (tracked)                                      | **⚠️ also written every build by the KEPT `fetch-static-assets.js` (`saveStaticDataJson`, L416/L525); read by `migrate-cats-to-firestore.js`** — a build artifact, not simply dead data |
| `src/lib/feeding-spots-static-data.json` (tracked)                             | committed, unconsumed by app                                                                                                                                                            |
| `update:*` npm scripts                                                         | wired to the above                                                                                                                                                                      |

Leaving Half B untouched keeps the kept `fetch-static-assets.js` write-path intact and
hands §7a a clean, undisturbed baking seam to redesign. **§7a must decide its fate.**

### 1C / 1D — Comment + doc accuracy

- `src/app/pages/butler_stream/new/page.tsx:11` — stale comment "fails in Docker"
  (Docker removed in Phase 1). Refresh wording; **keep the code**.
- `.github/copilot-instructions.md` (5.1 KB) — broadly stale: describes a nonexistent
  `src/lib/static-data.ts`, Cloud-Storage data serving, and Cloud Run deploy. Also
  references `test_admin_api.js` (L135), which Half A deletes. **Rewrite to match
  reality** (live Firestore via the service layer; Vercel deploy; service-factory
  pattern).
- `PROJECT_PLAN.md` §7 "Dead code" bullet + `docs/codebase/services-layer.md` (Watch-out
  - Key Components row) — both call `role-assignment-service.ts` dead. **It is not.**
    Correct both.

---

## 2. Preservation strategy for Half A (per user instruction)

The user vaguely recalls needing static-data management and asked to preserve Half A.
Git history retains the code permanently regardless, so the real goal is
**discoverability of both the code and the intent**:

1. **Archive branch (code bookmark).** Immediately before the Half-A removal commit,
   create a branch at that exact commit:
   ```
   git branch archive/static-data-cloud-export
   ```
   Its tip contains the full, in-context Half A code. Push it if the remote should
   carry it (`git push -u origin archive/static-data-cloud-export`). Do **not** delete
   this branch.
2. **Intent note (what + how-to-revive).** Add a short subsection to PROJECT_PLAN §7a
   recording: what Half A provided (admin "Static Data 관리" tab → `POST
/api/admin/update-static-data` → `export_all_to_cloud_storage.js` → GCS
   `static-data/*.json`), why it was removed (output unconsumed; superseded by §7a's
   server/SSG baking direction), and the restore pointer
   (`archive/static-data-cloud-export`, or `git show 6b7e005:<path>` for individual
   files).

This preserves the _code_ (branch) **and** the _reason it existed_ (note), so a future
engineer doesn't have to reverse-engineer it from a dangling branch.

---

## 3. Execution — small, isolated, individually-verified commits

> Run the gate (`npx tsc --noEmit` && `npm run test:smoke`, + `next lint` on changed
> files) **after each commit's edits, before committing**. Commit messages end with the
> Co-Authored-By trailer.

### Commit 1 — `chore: remove dead admin permission routes + migration example (Phase 3A)`

- Delete the 8 route directories from §1A (keep `-client`).
- Delete `src/services/MIGRATION_EXAMPLE.ts`.
- Remove any now-empty dirs: `find src/app/api/admin -type d -empty -delete`.
- **Expect:** tsc clean, **smoke 24** (unchanged), lint clean.

### Preservation step (no commit) — branch the archive point

- `git branch archive/static-data-cloud-export` (at the post-Commit-1 HEAD, i.e. the
  commit just before Half A is removed). Optionally push.

### Commit 2 — `chore: remove unused Cloud Storage static-data export path (Phase 3B Half A)`

- Delete `src/app/api/admin/update-static-data/route.ts` (+ empty dir).
- Delete `scripts/migration/export_all_to_cloud_storage.js`.
- Delete root `test_admin_api.js`.
- Surgically remove the `static-data` tab from `src/app/admin/app-management/page.tsx`
  (state, handler, tab button, tab panel, and `'static-data'` from the `activeTab`
  union in all 3 sites). Keep the other tabs + `AboutContentEditor`.
- Update script docs that mention the exporter: `scripts/README.md`,
  `scripts/migration/README_cloud_storage_migration.md`,
  `scripts/migration/README_points_static_migration.md`, and root `README.md` if it
  references it. (Leave `docs/archive/**` as-is.)
- **Expect:** tsc clean, **smoke 23** (the `update-static-data` reference is gone with
  its route — expected drop), lint clean. Manually confirm `/admin/app-management`
  still renders the remaining tabs.

### Commit 3 — `chore: refresh stale Docker comment in butler_stream (Phase 3C)`

- Reword `butler_stream/new/page.tsx:11` ("fails in Docker" → "during static build")
  or drop the Docker reference. **No code change.**
- **Expect:** tsc clean, **smoke 23**, lint clean.

### Commit 4 — `docs: correct stale architecture docs + role-assignment-service flags (Phase 3D)`

- Rewrite `.github/copilot-instructions.md` to reflect reality (live Firestore via
  service layer; Vercel; service-factory pattern; no `src/lib/static-data.ts`; drop
  the `test_admin_api.js` mention).
- Fix `PROJECT_PLAN.md` §7 "Dead code" bullet — remove `role-assignment-service.ts`
  from the dead list (note it's live: `RoleManagement` + `PermissionDebug`).
- Fix `docs/codebase/services-layer.md` — the Watch-out and the Key-Components row that
  call it un-exposed/dead.
- Add the §7a "static-data management — removed, how to revive" note from §2.2.
- Mark this Phase 3 plan's items done where applicable; update the handoff/plan
  cross-links.
- **Expect:** tsc clean (docs-only, trivially), **smoke 23**, lint clean.

---

## 4. Explicit "do NOT touch" list (the anti-sprawl guardrails)

- **Half B** — every file in §1B's lower table (`export_*_to_static.js`,
  `update_all_static_data.js`, `update:*` npm scripts, `src/lib/cats-static-data.json`,
  `src/lib/feeding-spots-static-data.json`) → **§7a**.
- **`scripts/maintenance/fetch-static-assets.js`** — kept; do not strip
  `saveStaticDataJson`. (That's a Half-B / §7a decision.)
- **`src/services/role-assignment-service.ts`** — live; keep.
- **`get-all-user-permissions-client`** — live; keep.
- **`docs/archive/**`\*\* — already archived; do not prune in this phase.
- **`firebase.json` / `.firebaserc` / Firestore rules** — Phase-1 keepers; untouched.
- **No behavior changes** beyond removing the dead admin tab.

---

## 5. Rollback

Each commit is isolated and individually revertable. If smoke/tsc regress unexpectedly
after a commit, `git revert <sha>` that single commit — the others stand alone. Half A's
code remains recoverable from `archive/static-data-cloud-export` and from history
(`git show 6b7e005:<path>`).

---

## 6. Final verification (after Commit 4)

1. `npx tsc --noEmit` — clean.
2. `npm run test:smoke` — **23 passing** (24 minus the `update-static-data` route).
3. `next lint` — no new warnings.
4. Grep sweep — no live refs remain to: `update-static-data`, `export_all_to_cloud_storage`,
   `test_admin_api`, `get-all-user-permissions-final|fixed|live|real|simple|working`,
   `get-all-users`, `MIGRATION_EXAMPLE` (outside `docs/archive/**` and the archive branch).
5. Load `/admin/app-management` locally — remaining tabs render; About editor works.
6. Confirm `archive/static-data-cloud-export` exists (and is pushed, if desired).

---

## 7. After Phase 3

Unpark the **동참 (contact)** feature — Variant-A Next.js API route (Admin SDK email
notification), per `handoff-5` §2. Then §7a (bake-the-data-layer), which inherits
Half B + the preserved Half A intent note.
</content>
</invoke>

# Playwright CI — Prerequisite Plan (harness enablers, spikes, and flag resolution)

> **Status: ✅ EXECUTED (2026-07-11)** — spikes S1–S3 resolved, S4 admin-path
> proven (non-admin blocked by a flagged repo-rules finding, see §3/S4); harness
> green locally (3 passing specs, full emulator→seed→build→serve loop); prod build
> verified untouched; CI workflow authored. **Remaining owner actions:** push/open
> a PR to watch CI go 3× green, enable branch protection, and decide the non-admin
> `users`-write rule question. Then the main plan Phase 2 begins.
>
> **Status:** 📋 PLAN — the execution companion to
> [`playwright-ci-plan.md`](./playwright-ci-plan.md). That doc's §2 carried
> _recommendations_ and its §4/§7 carried _flags_ (⚠️ unverified assumptions).
> This plan _adopts_ the recommendations as working decisions (§1) and expands
> every enabler + flag into a concrete, verifiable work package (§3–§5).
> **Everything here must be green before a single real spec is written** —
> i.e. this doc IS Phase 0 + Phase 1 of the main plan, at full resolution.
>
> **Exit criterion (§7):** one trivial Playwright spec passes locally _and_ in
> GitHub Actions against the emulator-backed, seeded, prod-mode app.
>
> **Cross-checked 2026-07-11** against the dead-code removal (commit `7a46db1`):
> no impact — the F1–F12 flag citations all sit in files the cleanup didn't touch
> (line numbers re-verified), and WP3's Admin-SDK consumer list is fully live.
> (`cat-reads.ts` is at `src/lib/server/cat-reads.ts`.)

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` deferred ·
🔬 spike (verify before building on it)

---

## 1. Decisions — adopted (main-plan §2 recommendations, now locked)

| #          | Decision            | Adopted choice                                                                                                                                                                                                                                      |
| ---------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1         | Backend under test  | **Firebase Emulator Suite** (Auth + Firestore + Storage), seeded fixtures, no CI secrets. Live-project testing rejected (탈퇴 hard-delete, shared prod data).                                                                                       |
| D2         | App under test      | **`next build` + `next start`** (prod render path; build doubles as a gate). `next dev` stays available for local spec iteration via env override.                                                                                                  |
| D3         | Browser matrix      | **Chromium desktop (1280×720) + Chromium mobile-emulation (~390px, touch)**. WebKit/Firefox deferred.                                                                                                                                               |
| D4         | Locators            | Role/text locators on `strings.ts`/`adminStrings.ts` copy; `data-testid` only where no accessible name exists (map, lightbox).                                                                                                                      |
| D5         | Auth state          | Seeded users + `storageState` per role via global setup; throwaway users for destructive tests.                                                                                                                                                     |
| D6         | Data isolation      | Seed once per run (before build); mutation tests own uniquely-named entities; no mid-run wipes.                                                                                                                                                     |
| D7 _(new)_ | Emulator project id | A **`demo-` prefixed id** (e.g. `demo-mohocat`). `demo-*` guarantees the emulators/SDKs can never touch production even if an env var goes missing. Consequence: every hardcoded `mountaincats-61543` in the test path needs an env override (WP3). |

Owner veto window: these go final when Phase A starts. Flag disagreement now.

---

## 2. The flags being resolved (inventory)

From the main plan, verified against source in this planning pass:

| Flag | Source of truth                                                                                                                                                                                                                               | Resolution           |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| F1   | `src/services/firebase.ts:63` — `getAnalytics` runs unconditionally on the client; fake/emulator config (no `measurementId`) throws                                                                                                           | WP2                  |
| F2   | `src/services/firebase.ts` — no `connect*Emulator` calls exist                                                                                                                                                                                | WP2                  |
| F3   | `src/lib/firebase-admin.ts:16` — `cert(serviceAccount)` requires a real-shaped key; no emulator branch                                                                                                                                        | WP3 + 🔬S1           |
| F4   | `scripts/maintenance/fetch-static-assets.js:8-9` — **hardcodes** `FIREBASE_PROJECT_ID = 'mountaincats-61543'` + a local service-account file path; requires `SERVICE_ACCOUNT_KEY` or that file                                                | WP4                  |
| F5   | `fetch-static-assets.js:125,182` — downloads via **`getSignedUrl` + axios**; signed-URL generation against the Storage emulator is a known rough edge in `@google-cloud/storage`                                                              | 🔬S2                 |
| F6   | `fetch-static-assets.js:267` — thumbnail matching rule: filename (ext stripped) **split on `_` must contain the cat's Firestore doc id**; missing thumbnail = warning, failed download = build failure                                        | WP5 fixture contract |
| F7   | `fetch-static-assets.js:343,364-366,463-479` — about photo **must** exist at `about-photos/{mountainId}/{mountains.json about.mainPhoto.filename}` or the build fails (two separate guards)                                                   | WP5 fixture contract |
| F8   | `fetch-static-assets.js:437-458` — the script **rewrites `config/mountains/mountains.json`** (injects `localPath`) — a tracked file mutates during build; harmless in CI (ephemeral checkout), noisy locally                                  | WP4 note + README    |
| F9   | `next.config.js:10-17` — `images.remotePatterns` allows **only** `https://firebasestorage.googleapis.com`; fixture media URLs pointing at the Storage emulator (`http://127.0.0.1:9199/...`) would be **rejected by `next/image`** at runtime | WP6 + 🔬S3           |
| F10  | `requireApiPermission` / `/api/*` routes verify **ID tokens** via the Admin SDK — must verify against the **Auth emulator** in test mode                                                                                                      | 🔬S1                 |
| F11  | Leaflet map has no deterministic ready signal for tests                                                                                                                                                                                       | WP7                  |
| F12  | Emulator loads `config/firebase/firestore.rules` from the repo — which is **ahead of prod** (points rules deploy still owner-owed, handoff-25/26). Correct for testing, but document the divergence                                           | WP8 README           |

---

## 3. Spikes — 🔬 verify FIRST (half a day; they gate the design)

Run these as throwaway experiments before writing any keeper code. Each has a
pre-planned fallback so a failed spike changes the _how_, not the _whether_.

- [x] **🔬 S1 — Admin SDK against the emulators.** ✅ **PASS (2026-07-11).**
      Credential-less `initializeApp({ projectId: 'demo-mohocat', storageBucket })`
      with the three `*_EMULATOR_HOST` vars set: (a) Firestore read/write ✅,
      (b) `auth.createUser` ✅, (c) `verifyIdToken` of an emulator-minted ID token
      (obtained via the Auth-emulator `signInWithPassword` REST endpoint) ✅ —
      decoded uid matched. (d) **The `cert()` path must be _bypassed_**, not fed a
      dummy key — credential-less init is sufficient, so WP3 branches to
      `initializeApp({ projectId })` and the dummy-service-account fallback is
      **not needed.**
- [x] **🔬 S2 — `getSignedUrl` vs the Storage emulator.** ✅ **RESOLVED — fallback
      required (2026-07-11).** `file.getSignedUrl({action:'read'})` **FAILS**
      credential-less (`Could not load the default credentials` — signing needs a
      real service-account private key). `file.download()` against the same seeded
      file **PASSES** (bytes returned intact). → **WP4 uses an emulator-gated
      `file.download()` branch** instead of signed-URL+axios.
- [x] **🔬 S3 — `next/image` + emulator-hosted media.** ✅ **DECIDED — use
      `public/`-served fixtures (2026-07-11).** Because S2 forces `file.download()`
      at build time, thumbnails + about photo already land in `public/images/…`
      and are served as local Next static assets (no remote pattern needed).
      Fixture album/lightbox media docs will likewise point at `public/`-served
      fixture files, so **the Storage emulator only serves the build-time asset
      fetch** and **WP6 is skipped** (no `next.config.js` change). Confirmed
      concretely when album specs land (main-plan Phase 2).
- [x] **🔬 S4 — client SDK + emulators through the real UI.** ✅ **PASS for admin;
      ⚠️ non-admin blocked by a repo-rules finding (2026-07-11).** `global.setup.ts`
      signs **admin** in through the real `/login` page against the Auth emulator
      and saves `storageState` — proving WP2's client-SDK emulator wiring
      authenticates end-to-end and the seeded `users/{uid}` + `role-config`
      resolve. **Finding:** a **non-admin** login (member) FAILS under the repo
      rules — on every login the app calls `permissionService.ensureUserExists()`,
      which `updateDoc`s the user's own `users/{uid}` doc, but the repo `users`
      write rule requires `manage-users`, so a non-admin self-update is **denied**
      and login never completes. This is an F12-class divergence (emulator enforces
      repo rules). Owner decision needed before the Phase-3 member/admin suites:
      **relax the `users` write rule to allow self-writes**, or **make
      `ensureUserExists` tolerate a denied self-update.** `global.setup.ts` sets up
      **admin only** until then. Logged in `log/DEBUG_LOG.md`.

**Gate:** S1–S3 recorded above; S4 confirmed in Phase D. Ports in use:
**auth 9099, firestore 8088** (8080 was taken by a local `gvproxy`), **storage
9199**; test server on **3100** (3000 was taken locally). These ports are fixed
in `firebase.json` + the WP2 `connect*Emulator` calls + `playwright.config.ts`.

---

## 4. Work packages

### WP1 — Config & scaffolding (no app code)

- [x] devDeps: `@playwright/test`, `firebase-tools`.
- [x] `firebase.json`: `emulators` block — `auth` (9099), `firestore` (8088; 8080 taken locally),
      `storage` (9199), `ui` off in CI; `singleProjectMode: true`. (The existing
      `firestore.rules` pointer makes the emulator enforce repo rules — F12.)
- [x] Storage emulator rules file (Storage emulator requires one; permissive
      read is fine for tests) + reference it from `firebase.json`.
- [x] `.env.test` (committed — contains **only fake values**):
      `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`, fake `NEXT_PUBLIC_FIREBASE_*`
      (apiKey `demo-key`, projectId `demo-mohocat`, the bucket name, authDomain),
      `MOUNTAIN_ID=geyang`, `FIREBASE_PROJECT_ID_OVERRIDE=demo-mohocat` (WP4).
- [x] npm scripts: `test:e2e` (wraps `firebase emulators:exec --project
demo-mohocat`), `test:e2e:ui`, `seed:emulators`.
- [x] `tests/e2e/` skeleton dirs per the main plan §3.

### WP2 — Client SDK emulator wiring (`src/services/firebase.ts`) — F1, F2

- [x] After init, when `process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true'`:
      `connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })`,
      `connectFirestoreEmulator(db, '127.0.0.1', 8080)`,
      `connectStorageEmulator(storage, '127.0.0.1', 9199)` — guarded against
      double-connect (hot reload / the existing `already-initialized` catch).
- [x] Same flag **skips `getAnalytics`** (F1) — `analytics` exports `null`,
      which is already its SSR value, so no consumer changes.
- [x] Guard is explicit `=== 'true'`; the var is never set in the Vercel
      dashboard → prod behavior byte-identical. `npx tsc --noEmit` +
      `npm run test:smoke` green.

### WP3 — Admin SDK emulator branch (`src/lib/firebase-admin.ts`) — F3, F10

- [x] Per S1's result: when the emulator env vars are present, initialize
      credential-less with `projectId` from env (demo id), bypassing
      `getFirebaseAdminServiceAccount()`; otherwise the existing path runs
      untouched. (Emulator env vars are set by `emulators:exec`, never by
      Vercel — the branch is unreachable in prod.)
- [x] Verify every Admin-SDK consumer works in this mode: `cat-reads.ts`
      (build-time reads), `requireApiPermission` (`verifyIdToken` — F10),
      `/api/contact`, `/api/account/delete`, `/api/revalidate`.

### WP4 — Asset-fetch script emulator compatibility (`fetch-static-assets.js`) — F4, F5, F8

- [x] `FIREBASE_PROJECT_ID`: honor an env override (`FIREBASE_PROJECT_ID_OVERRIDE`
      or reuse `NEXT_PUBLIC_FIREBASE_PROJECT_ID`) — currently hardcoded to the
      prod id, which under D7's `demo-` project would read an empty namespace
      and produce a thumbnail-less build.
- [x] Init: under emulator env vars, skip the `cert()`/local-file requirement
      (credential-less init, mirroring WP3). Today the script hard-exits without
      `SERVICE_ACCOUNT_KEY` or the gitignored key file — CI has neither.
- [x] Download path per S2: keep signed-URL+axios if it works against the
      emulator; else the emulator-gated `file.download()` branch.
- [x] F8 (script rewrites `mountains.json`): no code change — document in
      `tests/e2e/README.md` that a local e2e run dirties `config/mountains/
mountains.json` (same as any local `npm run build`) and it must not be
      committed.
- [x] Prove: seeded emulator → `npm run fetch:assets` exits 0, thumbnails +
      about photo land in `public/images/…`, fail-loud guards still fire when a
      fixture is deliberately removed (negative test, run once manually).

### WP5 — Fixture set (`tests/e2e/fixtures/`) — F6, F7

The fixture _contract_ is dictated by the asset script + the suites the main
plan §5 needs:

- [x] **Cats (~6 docs):** stable doc ids (e.g. `test-cat-01`…); mix of 현재
      거주/예전 거주 (`dwelling`/`prev_dwelling` pointing at fixture points),
      ≥2 `adoptable: true`, one with `작명 사유`, valid `isNeutered`/
      `date_of_birth` (grid-editor mandatory fields), **one cat deliberately
      thumbnail-less** (exercises the warning path — F6 says that's legal).
- [x] **Thumbnail images:** tiny (≤5 KB) placeholders named to satisfy F6 —
      `_`-separated parts must contain the doc id, e.g. `cat_test-cat-01.jpg`.
      ⚠️ doc ids therefore must not contain `_` themselves (the split would
      shred them) — use hyphens.
- [x] **About photo:** one file at `about-photos/geyang/{exact filename from
mountains.json → geyang.about.mainPhoto.filename}` — F7 fails the build on
      any mismatch, so the seed reads the filename **from the config**, never
      hardcodes it.
- [x] **Points (~4 docs):** valid x/y for the geyang map; one with a
      `labelSide` override; one point deliberately cat-less (adm delete-guard
      test needs a referenced one AND the CMS create/delete test needs headroom).
- [x] **Posts:** 공지 ×2 (one with `[img]`/`[video]` link-tokens), 입양홍보 ×1,
      butler_talk ×2 + enough rows to cross one pagination boundary (check the
      page size in `PostList` and seed page-size+2), butler_stream ×1.
- [x] **Users + auth:** Auth-emulator users `admin@test.local` /
      `member@test.local` / `viewer@test.local` (+ one phone-auth user with a
      fixed number for the OTP spec) and matching `users/{uid}` docs with
      `currentRole` set.
- [x] **RBAC:** `role_permissions/role-config` granting admin all `manage-*`;
      `resource_permissions` map matching prod shape (Navigation reads it
      anonymously — main-plan 5.5 asserts its GET stays open).
- [x] **about_content** doc (the about page + admin editor read it).
- [x] **Media docs** (`cat_images` ×~6, `cat_videos` ×2): URLs per S3's
      outcome (emulator Storage or `public/` fixture files).
- [x] Format: one JSON file per collection + an `images/` dir; ids/emails/
      phone numbers obviously fake; **no data copied from prod** (fixtures are
      hand-authored — deterministic and PII-free by construction).

### WP6 — `next/image` remote pattern for emulator media — F9

> ✅ **SKIPPED (correctly).** S3 chose `public/`-served fixtures, so no
> `next.config.js` change was needed — the box below is checked to mean
> "resolved," not "code written."

- [x] Per S3: if fixture media stays on emulator Storage, add an env-gated
      `remotePatterns` entry (`http://127.0.0.1:9199`) in `next.config.js`
      (gated on the same `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` flag at build
      time). If S3 chose `public/`-served fixtures, **no change** — skip.

### WP7 — Seed script + readiness signals + Playwright harness

- [x] `scripts/test/seed-emulators.mjs`: Admin SDK against emulator hosts;
      loads WP5 JSON → Firestore batch writes, creates Auth users, uploads
      Storage files. Idempotent (delete-then-write per fixture id). Refuses to
      run unless `FIRESTORE_EMULATOR_HOST` is set **and** the project id is
      `demo-*` (belt-and-suspenders against ever touching prod).
- [x] **Leaflet ready signal (F11):** `data-testid="mountain-map"` on the map
      container + `data-testid="map-marker"` per rendered marker — specs wait on
      `getByTestId('map-marker')` count, never on timeouts. (Smallest possible
      `src/` touch; agreed exception to D4.)
- [x] `playwright.config.ts`: two projects (D3), `baseURL`, `webServer`
      (`next start`, `reuseExistingServer: !CI`), `trace: 'on-first-retry'`,
      CI `retries: 2` / local `0`, `fullyParallel`.
- [x] `tests/e2e/setup/global.setup.ts`: sign in through the real login UI
      against the Auth emulator → save `storageState` per role. **Admin only for
      now** — non-admin login is blocked by the repo `users`-write rule (see §3/S4);
      member/admin (non-admin) storageState is owner-gated on that decision.
- [x] Console-error watchdog fixture (shared `test` extension) — ready for
      Phase 2 of the main plan even if only the trivial spec uses it now.
- [x] **Trivial spec** (`public/landing.smoke.spec.ts`): home page loads, map
      container + ≥1 marker visible, nav renders — the harness proof.

### WP8 — Local loop, CI workflow, docs

- [x] Prove the full local chain: `firebase emulators:exec --project demo-mohocat
"seed && npm run build && npx playwright test"` → trivial spec green.
      (Env vars from `emulators:exec` propagate through build → `webServer`
      `next start` → specs, satisfying constraint "client env baked at build".)
- [x] `.github/workflows/ci.yml`: - **Job `checks`:** `npm ci` → `tsc --noEmit` → `npm run lint` → `npm test`. - **Job `e2e`** (needs `checks`): cache node_modules + Playwright browsers + emulator jars → `playwright install --with-deps chromium` → the WP8
      wrapper command → upload `playwright-report/` + traces on failure. - Triggers: `pull_request` → `dev`/`main`; `push` → `dev`. No secrets.
- [x] `tests/e2e/README.md`: how to run locally, fixture conventions, the
      F8 mountains.json-dirty note, the F12 rules-ahead-of-prod note, locator
      conventions (D4), flake policy (fix or `test.fixme` same-day).
- [x] Update main plan (mark its Phase 0+1 as delegated→done), PROJECT_PLAN §10 + §1 snapshot, FEATURE_MOD_LOG entry for the env-gated `src/` touches.

---

## 5. Explicitly NOT in this plan

- Writing any real test suites (main plan Phases 2–6).
- Kakao OIDC automation, WebKit, visual regression, Lighthouse/perf, Vercel
  Preview smoke, YouTube admin flows (main plan Phase 8 deferrals).
- Any `src/` change beyond: WP2 (firebase.ts), WP3 (firebase-admin.ts),
  WP6 (next.config.js, conditional), WP7's two `data-testid`s, WP4
  (fetch-static-assets.js). Anything else that turns out to be needed gets
  flagged before it's built.

---

## 6. Sequencing & gates

```
Phase A  WP1 scaffolding ──→ Spikes S1–S4 (record results in §3)
Phase B  WP2 + WP3 (SDK wiring; shaped by S1/S4)
Phase C  WP5 fixtures + WP7 seed script ──→ WP4 asset script (needs seeded storage)
                                        └─→ WP6 (only if S3 says so)
Phase D  WP7 harness (config, storageState, watchdog, trivial spec) → local loop green
Phase E  WP8 CI workflow green on a draft PR ×3 consecutive runs → EXIT
```

Gates after every phase: `npx tsc --noEmit` + `npm run test:smoke` green;
`npm run build` (real Firebase) still green after WP4 — the emulator branches
must not disturb the production build path. Ask before each commit (repo
working agreement).

## 7. Exit criteria (hand back to `playwright-ci-plan.md` Phase 2)

- [x] Spikes S1–S4 resolved + recorded. (S4: admin ✅; non-admin blocked by the
      repo-rules finding above — owner decision, does not block Phase 2 public/api.)
- [x] Trivial spec green **locally** (full emulator loop, prod-mode serve) — 3
      passing tests (desktop + mobile landing, admin storageState) in ~6s.
- [~] Trivial spec green **in GitHub Actions**, 3× consecutively, < 10 min job —
  **workflow authored (`.github/workflows/ci.yml`); needs a push/PR + branch
  protection to observe the 3× green.** (Owner action.)
- [x] Production build path verified untouched — `npm run build` against **real**
      Firebase succeeds (32 cats, no EMULATOR-mode init, `mountains.json` diff
      clean); `vercel-build` unchanged; **no new Vercel env vars** (the flag is
      never set there).
- [x] Docs + logs updated (WP8).

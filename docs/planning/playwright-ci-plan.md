# Playwright E2E Test Suite + CI — Plan (PROJECT_PLAN §10)

> **Status:** 📋 PLAN — awaiting owner sign-off on the open decisions in §2, then
> execute the checklist in §8.
> **Goal:** a thorough, deterministic, CI-run Playwright browser-test suite covering
> the public app, auth, member flows, and the admin CMS — plus the CI wiring that
> runs it (today there is **no** `.github/` at all; the only automation is the
> pre-commit hook + Vitest structural smoke).
>
> Companion: [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) §10 ·
> latest hand-off [`2026-07-11-handoff-28.md`](../handoff/2026-07-11-handoff-28.md)
>
> **Cross-checked 2026-07-11** against the dead-code removal
> ([`dead-code-removal-assessment-20260711.md`](./dead-code-removal-assessment-20260711.md),
> commit `7a46db1`): nothing in this plan referenced the removed code. The API surface
> shrank by 5 unreferenced routes (`auth/status`, `feeding-spots-basic`,
> `fetch-playlists`, `manage-playlist-membership`, `test-youtube-auth`) — none were in
> the §5.5 sweep (the §5.5 `admin/youtube-auth/status` entry is the separate, live
> route). Smoke stays 26 tests (§1.8).

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` deferred/out of scope

---

## 1. Constraints the design must respect (from the codebase, not negotiable)

These shape every choice below; they were verified against source, not the docs
snapshot:

1. **The app has no test/offline mode.** `src/services/firebase.ts` (client Web
   SDK) and `src/lib/firebase-admin.ts` (Admin SDK) both initialize against real
   Firebase; there is **zero emulator wiring** anywhere in `src/` or `scripts/`.
2. **The build itself needs Firebase.** `npm run build` runs
   `scripts/maintenance/fetch-static-assets.js` (downloads cat thumbnails +
   about-photos from **Storage**, fail-loud — missing files throw and kill the
   build), then `next build` renders the home + adoption Server Components which
   `await` **Firestore** reads via the Admin SDK (ISR `revalidate=3600`).
3. **Client env is baked at build time.** All `NEXT_PUBLIC_*` vars (including any
   emulator flag) must be set **before** `next build`, not just at `next start`.
4. **Auth is three-headed:** email/password, phone (SMS OTP), Kakao OIDC.
   - Phone OTP **is** automatable against the **Auth emulator** (it exposes fake
     verification codes — no real SMS).
   - Kakao is an external IdP → **not automatable**; out of scope.
5. **ISR staleness is real.** Home/adoption bake at build; a Firestore mutation
   during a test run will NOT appear there without `revalidatePath`. Mutation
   tests must target surfaces that read live (client-side reads: albums,
   butler pages, admin lists) or explicitly exercise `/api/revalidate`.
6. **No `data-testid` exists anywhere.** But user-facing copy is centralized in
   `src/constants/strings.ts` / `adminStrings.ts` (Korean) — stable,
   single-sourced text = good locator targets.
7. **Deploys are `git push`** (Vercel Git integration: `dev` → Preview, `main` →
   Production). CI must gate the push-based flow — i.e. run on PRs/pushes, not as
   a deploy step.
8. **Existing gates to preserve:** `npx tsc --noEmit`, `npm run test:smoke`
   (Vitest, 26 tests, no server/env), pre-commit hook (TruffleHog + Prettier/
   ESLint + tsc).

---

## 2. Architecture decisions (recommendations — confirm with owner)

### D1. Backend under test: **Firebase Emulator Suite** (recommended) vs live project

|               | Emulator Suite (Auth + Firestore + Storage)                        | Live Firebase project                                     |
| ------------- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| Determinism   | ✅ hermetic, seeded fixtures, no network flake                     | ❌ shared mutable prod data                               |
| Safety        | ✅ mutation tests (admin edits, 탈퇴 hard-delete!) are free        | 🔴 tests would write/delete **production** data           |
| Secrets in CI | ✅ none needed (fake API key + project id)                         | ❌ real `SERVICE_ACCOUNT_KEY` + client keys in GH secrets |
| Phone OTP     | ✅ fake codes, fully automatable                                   | ❌ real SMS — not automatable                             |
| Cost          | one-time wiring (env-gated `connect*Emulator` calls + seed script) | zero app changes                                          |

**Recommendation: emulator-first.** The 탈퇴 flow alone (irreversible
`auth.deleteUser`) makes running mutations against the live project a
non-starter, and there is no second/staging Firebase project. The wiring cost is
small and strictly env-gated (see §4).

A thin **Tier-2 read-only smoke against the Vercel Preview URL** (post-push to
`dev`) is a cheap later add-on — it validates real env vars/SMTP/Firestore rules
that the emulator can't. Deferred to Phase 8.

### D2. App under test: **`next build` + `next start`** (recommended) vs `next dev`

Prod-mode serve exercises the real render path — ISR, baked Server-Component
data, the asset-fetch step — and doubles as a build gate. `next dev` is the
local-iteration fallback (Playwright's `webServer.command` stays overridable via
env). CI order matters: **emulators up → seed → build → start → test** (the
build reads seeded Firestore/Storage).

### D3. Browser matrix: **Chromium desktop + Chromium mobile-emulation** first

- `chromium-desktop` (1280×720) — primary.
- `mobile` (Playwright device profile, e.g. Galaxy S9+/Pixel 7 ≈390px, touch
  enabled) — the §4 mobile workstream showed mobile is where bugs live. Playwright
  device emulation genuinely reflows + emulates touch (unlike the broken
  `resize_window` tooling from the mobile pass).
- `[-]` WebKit/Firefox: deferred — add WebKit later for iOS-Safari coverage once
  the suite is stable (real iOS quirks like pinch/rAF need devices anyway).

### D4. Locator strategy: **role/text locators on `strings.ts` copy**, `data-testid` only where unavoidable

Korean text locators are stable because copy is single-sourced. Add
`data-testid` sparingly for things with no accessible name: Leaflet markers/
clusters, lightbox stage, dynamic list rows. Keep a short conventions doc in
`tests/e2e/README.md`.

### D5. Auth state: **seeded users + `storageState` per role**

Global setup signs in once per role (admin / member / fresh-signup pool) against
the emulator and saves `storageState`; suites reuse it instead of logging in per
test. Firebase web auth persists in `localStorage` (the app deliberately uses
`browserLocalPersistence`), which `storageState` captures. Destructive tests
(탈퇴) get dedicated throwaway users created via Admin SDK inside the test.

### D6. Data isolation: **seed once per CI run; mutation tests own their entities**

Seed a fixed fixture set once (before build — the build bakes it). Tests that
mutate create uniquely-named entities and clean up (or don't — the emulator dies
with the job). Full Firestore wipes mid-run are avoided because the baked
home page depends on the seed. Escape hatch if cross-test bleed appears:
emulator REST `DELETE /emulator/v1/projects/{id}/databases/(default)/documents`

- reseed between Playwright _projects_, not tests.

---

## 3. Repo layout + tooling

```
tests/
  smoke/            (existing Vitest — untouched)
  unit/             (existing Vitest — untouched)
  e2e/
    fixtures/        seed data: cats.json, points.json, posts, users, role-config,
                     images/ (tiny placeholder thumbnails for Storage)
    setup/           global.setup.ts (storageState per role), seed helpers
    public/          *.spec.ts — anonymous surfaces
    auth/            *.spec.ts — login/signup/logout/OTP
    member/          *.spec.ts — signed-in member flows
    admin/           *.spec.ts — /admin CMS
    api/             *.spec.ts — request-context security assertions
    README.md        conventions (locators, seeding, how to run locally)
playwright.config.ts
scripts/test/seed-emulators.mjs   (Admin SDK against emulator hosts)
.github/workflows/ci.yml
```

- **Deps:** `@playwright/test` (devDep) + `firebase-tools` (devDep or npx) —
  nothing enters the runtime bundle.
- **npm scripts:** `test:e2e` (local, wraps `firebase emulators:exec`),
  `test:e2e:ui` (headed/PW UI mode), `seed:emulators`.
- **`firebase.json`:** add an `emulators` block (auth/firestore/storage ports +
  `singleProjectMode`). The existing `firestore.rules` path already there means
  the **Firestore emulator enforces the real production rules** — client-SDK
  write tests double as rules regression tests (the §7 `hasPermission` saga
  says these rules deserve coverage).

---

## 4. App-code enablers (small, env-gated — the only `src/` changes)

1. **`src/services/firebase.ts`** — after init, if
   `NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true'`, call
   `connectAuthEmulator` / `connectFirestoreEmulator` / `connectStorageEmulator`
   (idempotent-guarded for hot reload). Also **skip `getAnalytics`** in emulator
   mode (fake config has no `measurementId` → it throws).
2. **Admin SDK — zero code change.** `firebase-admin` + the Firebase CLI honor
   `FIRESTORE_EMULATOR_HOST` / `FIREBASE_AUTH_EMULATOR_HOST` /
   `FIREBASE_STORAGE_EMULATOR_HOST` env vars automatically;
   `emulators:exec` sets them. Verify `initAdmin()`'s `cert()` path tolerates a
   dummy service account in emulator mode (or branch to credential-less
   `initializeApp({ projectId })` when the emulator env vars are present).
3. **`scripts/maintenance/fetch-static-assets.js`** — same story: under
   emulator env vars it downloads the seeded placeholder images. Verify its
   fail-loud guards pass with the seeded set (fixtures must include a thumbnail
   per seeded cat with a thumbnail-bearing name, + the about photo).
4. **Possible `data-testid` sprinkles** (map marker/cluster, lightbox) — added
   lazily during Phase 2 only where role/text locators can't reach.

Nothing else in `src/` changes. The flag never ships on in Vercel (not set in
the dashboard), and the guard is explicit `=== 'true'`.

---

## 5. Test scope — the suites (thorough = this list)

### 5.1 `public/` — anonymous surfaces (highest value, least flake)

- **Navigation integrity:** every desktop-nav + hamburger + footer link resolves
  (no 404) — this is exactly the §11 "broken nav destinations" class of bug.
  Includes `/pages/privacy` + `/pages/terms` (new, compliance-critical).
- **Home map (Leaflet):** map container renders; seeded point markers appear
  with **baked cat avatars** (regression on §7a: zero client Firestore queries —
  assert no Firestore network calls fire for avatars); marker click → cat
  info modal opens with seeded cat's fields (incl. 작명 사유); label side
  rendering.
- **Mobile map (mobile project):** static proximity clusters render;
  tap-to-spiderfy expands; collapse on second tap; landscape viewport shows the
  rotate-notice (portrait-only map) — regressions on the entire §4 Pass-2/3 saga.
- **Cat gallery** (`/pages/cats`): grid renders seeded cats, 현재/예전 grouping.
- **입양홍보** (`/pages/adoption`): adoptable-flagged seeded cats render; 소식
  post feed renders; accordion + search behave; empty-state when no adoptables
  (second fixture variant or filtered assertion).
- **Albums:** photo-album grid + filter bar; **Lightbox** open/next/prev/close;
  **back-button closes the lightbox instead of navigating** (the
  `useModalLayer` history contract — high regression value); video-album tiles
  - VideoPlayer modal.
- **공지** list + `[id]` detail; inline `[img]`/`[video]` link-tokens open
  Lightbox/VideoPlayer in-app.
- **About / FAQ:** render, key sections present, zero horizontal overflow at
  mobile width.
- **동참 form (anonymous):** login-required state renders correctly.
- **Auth-gated redirects:** butler_talk / butler_stream / mypage anonymous →
  login-required UI (mypage → `/login` full-page redirect per handoff-28 fix).

### 5.2 `auth/` — the flows the emulator unlocks

- **Email signup:** consent checkboxes gate the submit (both required — §8
  compliance behavior); successful signup lands signed-in.
- **Email login:** happy path; wrong password → Korean error copy; logout via
  nav `LogoutModal` → lands on `/`.
- **Phone OTP login:** enter seeded number → fetch the fake code from the Auth
  emulator REST API → verify → signed in. (First automated coverage this flow
  has ever had.)
- **mypage logout → `/` redirect** (regression: handoff-28 DEBUG_LOG spinner
  bug), including the **mobile** logout-through-hamburger path (regression:
  handoff-27 pointerdown-unmount bug).
- `[-]` Kakao OIDC — external IdP, not automatable; rendering of the button only.

### 5.3 `member/` — signed-in (storageState: member)

- **butler_talk:** list + pagination (the long-owed auth-gated verification from
  §4/A4); create a new post (unique title) → appears in list.
- **butler_stream:** list renders; new-post form reachable.
- **mypage:** profile fields render; nickname inline-edit saves; edit-row layout
  at mobile width (handoff-27 regression).
- **동참 submit (signed-in):** POST `/api/contact` succeeds
  (`emailDelivered:false` without SMTP is acceptable — assert the success UI and,
  via Admin SDK helper, the Firestore `contacts` write).
- **탈퇴 (account deletion):** throwaway user → confirm modal →
  `/api/account/delete` → signed out + redirected; Admin SDK helper asserts the
  Auth user + `users/{uid}` doc are gone. (The "live click-through owed" item
  from handoff-28 — automatable _only_ because of the emulator.)

### 5.4 `admin/` — the CMS (storageState: admin; seeded role-config)

- **AdminAuth gate:** anonymous → login screen; signed-in **non-admin** →
  access-denied (permission enforcement, not just UI).
- **Dashboard** renders with seeded counts.
- **Cats:** card-editor edit persists (client-SDK write → also exercises the
  live `firestore.rules` `hasPermission('manage-cat')` path in the emulator);
  spreadsheet-grid: edit cell → 전체 저장 → persisted; mandatory-field
  (`isNeutered`/`date_of_birth`) block-save validation; adoptable toggle.
- **Posts:** create 공지 + 입양홍보 posts; edit an existing post (shared
  `EditPostForm`); modal-toggle on announcements.
- **Points (급식소 관리):** create/edit a point via the visual picker;
  delete-guard blocks while a seeded cat references it.
- **Members:** role assignment persists (viewer → butler…) — the §7 four-bug
  chain regression.
- **Contact Management:** the member-submitted 동참 entry appears.
- `[-]` tag-images / tag-videos batch flows + YouTube panels: **deferred** —
  YouTube API is external; cover only that the pages render for an admin.

### 5.5 `api/` — security assertions via Playwright request context (no browser)

Cheap, fast, and directly regression-guards the 2026-06-28 security fixes:

- Unauthenticated → **401**: `POST /api/admin/role-permissions`,
  `GET /api/admin/get-all-user-permissions-client`, `GET /api/admin/youtube-auth/status`
  (the former token leak), `POST /api/contact`, `POST /api/account/delete`,
  `POST /api/revalidate`.
- Authenticated **non-admin** ID token → still 401/403 on `manage-*` routes.
- `GET /api/admin/resource-permissions` stays open (by design — assert 200).

### 5.6 Cross-cutting

- **Console-error watchdog:** shared fixture fails any test on unexpected
  `console.error` / `pageerror` (allowlist for known-benign noise, e.g. the
  ad-blocker Firestore Listen case doesn't occur in CI).
- **Mobile project** runs: 5.1 map/nav/albums + auth login/logout + mypage
  (the surfaces §4 fixed). Desktop project runs everything.
- `[-]` **Visual-regression screenshots:** deferred — map tiles + image-heavy
  pages make pixel snapshots flaky; revisit with masked screenshots once the
  functional suite is stable.
- `[-]` **Performance budgets** (§4 mobile perf): separate workstream —
  Lighthouse CI is the right tool, not Playwright.

---

## 6. CI wiring (`.github/workflows/ci.yml` — greenfield)

Triggers: `pull_request` → `dev`/`main`, `push` → `dev`.

**Job 1 — `checks` (fast, ~1–2 min):** checkout → setup-node (cache) →
`npm ci` → `npx tsc --noEmit` → `npm run lint` → `npm test` (all Vitest).

**Job 2 — `e2e` (needs: checks):**

1. `npm ci` + cache Playwright browsers (`~/.cache/ms-playwright`) + cache the
   Firebase emulator jars.
2. `npx playwright install --with-deps chromium`.
3. Single wrapper: `firebase emulators:exec --only auth,firestore,storage
--project demo-mohocat "node scripts/test/seed-emulators.mjs && npm run
build && npx playwright test"` — emulator env vars propagate to seed, build
   (Admin SDK reads + asset fetch), and the `next start` that
   `playwright.config.ts`'s `webServer` boots. `.env.test` supplies the fake
   `NEXT_PUBLIC_FIREBASE_*` values + `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`.
4. Upload `playwright-report/` + traces as artifacts on failure
   (`trace: 'on-first-retry'`, `retries: 2` in CI, 0 locally).

**No GitHub secrets required** — the emulator project is a `demo-*` id with fake
keys. (Secrets enter only if/when Phase 8's preview-URL smoke lands.)

**Budget:** target < 10 min wall clock; `fullyParallel` with 2–4 workers;
shard the matrix later only if needed.

**Branch protection** (owner, in GitHub UI): require both jobs on PRs to `main`
(the production gate); optionally on `dev`.

---

## 7. Risks / watch-outs

- **Leaflet readiness:** the map initializes async; tests need a deterministic
  ready signal (marker-count locator wait, or one `data-testid` on the map
  container once tiles/markers mount). Never `waitForTimeout`.
- **`getAnalytics` + fake config** throws → the §4 guard must land before any
  page loads in emulator mode.
- **`fetch-static-assets` fail-loud guards** vs fixtures: seed images must
  satisfy the "thumbnail exists in Storage for cats named like X" logic — build
  the fixture set by reading the script's matching rules, not by guessing.
- **ISR interplay:** don't assert home-page content that a test mutated (D6);
  `/api/revalidate` gets its own targeted test instead.
- **Emulator rules parity:** the emulator loads `config/firebase/firestore.rules`
  from the repo — which may be **ahead of** what's deployed (e.g. the owner-owed
  `points` rules deploy from handoff-25/26). That's the right thing to test
  (repo = source of truth), but be aware live-prod behavior can differ until
  deploys catch up.
- **Korean text locators** are fine in Playwright (unicode-safe), but prefer
  `getByRole(..., { name })` over raw text where roles exist — resilient to
  copy tweaks that keep semantics.
- **Flake discipline:** any test that fails intermittently gets fixed or
  quarantined (`test.fixme`) same-day — a red-noisy suite dies of neglect.

---

## 8. Task checklist (execution order)

### Phase 0 + 1 — decisions, harness enablers, spikes, CI skeleton

> **Delegated in full to
> [`playwright-ci-prerequisite-plan.md`](./playwright-ci-prerequisite-plan.md)**,
> which adopts this doc's §2 recommendations as locked decisions (D1–D7) and
> expands every §4 enabler + §7 flag into spikes (S1–S4) and work packages
> (WP1–WP8) with fallbacks. Phases 2+ below start only when its exit criteria
> (trivial spec green locally + 3× in CI, prod build path untouched) are met.

- [x] **Prerequisite plan executed (2026-07-11).** Harness green locally (3
      specs: desktop + mobile landing, admin storageState); emulator wiring
      (WP2/WP3/WP4), fixtures + seed (WP5/WP7), Playwright config + watchdog +
      trivial spec (WP7), and CI workflow (WP8) all landed; prod build verified
      untouched. **Two owner follow-ups before Phase 2 hardens:** (1) push/PR to
      confirm CI 3× green + branch protection; (2) the non-admin `users`-write
      rule decision that blocks member/admin (non-admin) login (prereq §3/S4).
      Phase 2 `public/` + Phase 6 `api/` specs are unblocked now; Phases 3–5
      (signed-in) wait on (2).

### Phase 2 — `public/` suites

> **Done 2026-07-12** (7 spec files, ~60 tests, desktop + mobile). **Verified GREEN via
> the full `npm run test:e2e` gate** (64 passed / 13 skipped / 0 failed; prod build
> clean). Details + scoping decisions in the testing hand-off
> (`docs/handoff/testing/2026-07-12-e2e-harness-handoff.md`, "Phase 2 `public/` suites
> written").

- [x] Nav/footer integrity spec (`nav.spec.ts`) — desktop dropdowns + mobile hamburger +
      footer; anonymous-clickable destinations only (permission-gated 사진첩/동영상 +
      집사메뉴 excluded → asserted in the gating spec).
- [x] Home map spec (`home-map.spec.ts`) — markers, **avatars-baked / no-client-Firestore**,
      marker → CatGallery → CatInfo (작명 사유). Desktop-scoped marker flow.
- [x] Mobile map spec (`mobile-map.spec.ts`) — portrait pins + tap → gallery; landscape
      rotate-notice. **`[-]` clusters/spiderfy deferred** — geyang sets `map.clustering:
false` (baked static import, not runtime-overridable); needs a clustering-enabled
      fixture mountain. (`utils/mapClustering` is unit-testable independently.)
- [x] Galleries + adoption spec (`galleries-adoption.spec.ts`) — 냥이들 search + detail;
      입양홍보 adoptable-only gallery + 소식 accordion/search empty-state. (`[-]` no-adoptables
      empty state — needs a separate seed; covered the 소식 search empty state instead.)
- [x] Albums + Lightbox/VideoPlayer + back-button-closes-modal spec (`albums.spec.ts`) —
      photo Lightbox open/nav/close + back-button-closes (`useModalLayer`); video grid +
      player shell (YouTube embed is external → assert chrome only). Album tiles need
      `click({ force: true })` (decorative hover-overlay intercepts); nav keyed on tile
      position (order is service-defined). Public-served fixtures (spike-S3) laid down by
      the seed step's `copyPublicFixtures()` before the build.
- [x] 공지 list/detail + about/FAQ/privacy/terms render spec (`announcements-static.spec.ts`)
      — list → `[id]` detail → back; static pages render + zero mobile h-overflow. **`[-]`
      link-token interaction** out of scope for 공지 (detail renders `post.message` as plain
      text; token processing lives in the cat/adoption surfaces, not here).
- [x] Anonymous gating spec (`anonymous-gating.spec.ts`) — butler 접근 제한; `/mypage` →
      `/login`; 동참 login-required; nav permission-gating (사진첩/동영상 spans, 집사메뉴 disabled).
- [x] Console-error watchdog fixture wired into all of the above (shared `setup/test.ts`,
      auto). Allowlist gained `"Failed to fetch RSC payload"` (benign redirect prefetch-abort).

### Phase 3 — `auth/`

- [ ] Email signup (consent gating) + login + bad-password + logout specs.
- [ ] Phone-OTP login spec (emulator code fetch helper).
- [ ] mypage logout-redirect + mobile hamburger-logout regression specs.

### Phase 4 — `member/`

- [ ] butler_talk list/pagination/create; butler_stream render.
- [ ] mypage nickname edit (+ mobile layout).
- [ ] 동참 submit e2e; 탈퇴 deletion e2e (throwaway user).

### Phase 5 — `admin/`

- [ ] AdminAuth gate (anon + non-admin) spec.
- [ ] Cats card-edit + grid-save + validation + adoptable specs.
- [ ] Posts create/edit specs; points CMS + delete-guard spec.
- [ ] Members role-assignment spec; Contact Management spec.

### Phase 6 — `api/` security suite

> **Done 2026-07-12** (`tests/e2e/api/security.spec.ts`, request context, no browser).
> Verified green in the full `npm run test:e2e` gate. The non-admin ID token is minted
> straight from the Auth-emulator Identity-Toolkit REST (`signInWithPassword`) — the §5
> UI-login blocker (`ensureUserExists`) does not gate token issuance, so signed-in API
> coverage is unblocked without resolving §5.

- [x] Unauth-401 sweep — 6 routes (admin `requireApiPermission` + contact/account-delete/
      revalidate direct Bearer check).
- [x] Non-admin-403 sweep — the 4 `manage-*` routes with a valid `butler-ground` token
      (403-not-401 also proves the token verified → the gate is permission-based).
- [x] Open-by-design 200 — `GET /api/admin/resource-permissions`.
      (Destructive routes are only hit **unauthenticated** — the 401 lands before any
      delete/send/revalidate side effect.)

### Phase 7 — hardening & docs

- [ ] Flake audit (3× consecutive green CI runs); runtime < 10 min.
  - [ ] ⚠️ **Known intermittent (pre-existing, app-side):** the landing map occasionally
        bakes **markerless** at `next build` (all marker tests then fail: landing.smoke,
        home-map, mobile-map). Same class as the DEBUG_LOG 2026-07-12 landing-marker entry
        — the `getAllPointsServer`/`getAllCatsServer` Admin-SDK bake is **not 100%
        deterministic**; a build-time emulator race still slips through (~1 in 3 gate runs
        observed). CI `retries: 2` will NOT save it (whole-build issue, not per-test). Needs
        an owner-signed build-path fix (e.g. retry/await emulator readiness before the
        Server-Component reads) before the 3× exit criterion is meetable.
- [ ] `tests/e2e/README.md` (run locally, conventions, fixtures).
- [ ] Update PROJECT_PLAN §10 + §1 snapshot; FEATURE_MOD_LOG entry; hand-off.
- [ ] Owner: enable branch protection requiring CI on PRs to `main`.

### Phase 8 — deferred (revisit later)

- [-] Vercel Preview URL read-only smoke (post-push, needs secrets).
- [-] WebKit project (iOS Safari).
- [-] Visual-regression screenshots (masked).
- [-] Lighthouse CI / mobile perf budgets (§4 perf item — separate workstream).
- [-] YouTube tagging admin flows (external API).

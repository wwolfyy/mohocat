# E2E tests (Playwright + Firebase Emulator Suite)

Browser tests that run the **real** app (prod build, `next start`) against a
hermetic, seeded **Firebase Emulator Suite** — no production data, no secrets.

**Full walkthrough + troubleshooting:** `docs/manuals/testing/README.md` (the
developer manual — start there if you're new to the suite). This file is the terse
co-located reference.

See the plans for the full design + rationale:
`docs/planning/playwright-ci-plan.md` (scope) and
`docs/planning/playwright-ci-prerequisite-plan.md` (this harness, Phase 0+1).

## Run it locally

```bash
npm run test:e2e         # emulators → seed → prod build → next start → playwright (headless)
npm run test:e2e:ui      # same, but Playwright UI mode (time-travel)
npm run test:e2e:headed  # same, but a real browser window drives itself live (chromium-desktop)
npm run test:e2e:debug   # same, but opens the Playwright Inspector (step line-by-line)
npm run seed:emulators   # seed only (must be inside an emulators:exec shell)
```

`test:e2e` wraps everything in `firebase emulators:exec`, so one command does:
**emulators up → `seed-emulators.mjs` → `npm run build` → `next start` (port 3100)
→ `playwright test`**. Env comes from the committed `.env.test` (fake values) via
`dotenv-cli`; the emulator host vars are injected by `emulators:exec`.

### Prerequisites

- **Java** (the emulators are JVM processes). On macOS with the keg-only Homebrew
  `openjdk`, put it on `PATH` for the run, e.g.
  `export PATH="/usr/local/opt/openjdk/bin:$PATH"`. CI uses `actions/setup-java`.
- Dev deps only: `@playwright/test`, `firebase-tools`, `dotenv-cli` (all installed
  by `npm ci`). Browsers: `npx playwright install chromium`.

### Ports

`firebase.json` pins **auth 9099, firestore 8088, storage 9199**; the test server
runs on **3100**. (Firestore is on 8088, not the Firebase default 8080, because
8080 was taken locally by an unrelated `gvproxy`; 3100 avoids a local dev server
on 3000.) These are matched by the `connect*Emulator` calls in
`src/services/firebase.ts` and by `playwright.config.ts`.

## Layout

```
tests/e2e/
  fixtures/        hand-authored seed JSON (one file per collection) + images/
  setup/           test.ts (console-error watchdog fixture), global.setup.ts (captures
                   admin + member storageState), auth-helpers.ts (email login + signup),
                   phone-otp.ts (reads the emulator's SMS code over REST)
  public/          anonymous-surface specs      (chromium-desktop + mobile projects)
  auth/            login / signup / logout / phone-OTP  (anonymous `auth` project)
  member/          butler-ground member flows   (member storageState)
  admin/           /admin CMS flows             (admin storageState)
  api/             API-route security           (request context, no browser)
scripts/test/seed-emulators.mjs   Admin SDK → Firestore/Auth/Storage (demo-* guarded)
playwright.config.ts
```

**Playwright projects** (`playwright.config.ts`): `setup` (captures storageState) →
`chromium-desktop` + `mobile` (`public/`) · `auth` (anonymous, drives the login UI) ·
`member` / `admin` (signed-in via storageState, depend on `setup`) · `api` (no browser).

## Conventions

- **Locators (D4):** prefer `getByRole(..., { name })` on the single-sourced
  Korean copy in `src/constants/strings.ts` / `adminStrings.ts`. Use `data-testid`
  only where there is no accessible name — currently just the map
  (`mountain-map`) and its markers (`map-marker`).
- **No `waitForTimeout`.** Wait on a locator/state (e.g. the map's async layer is
  ready when a `.leaflet-marker-icon` is visible).
- **Console-error watchdog:** import `test` from `tests/e2e/setup/test.ts`; any
  unexpected `console.error` / `pageerror` fails the test (allowlist inside it).
  Two cases need the **base** `@playwright/test` `test` instead of the watchdog —
  role assignment (writes an audit log to `permission_logs` the repo rules deny for
  the client → a benign `console.error`) and the `api/` request-context specs (no
  page). Reach for the base `test` only for a source-verified benign error, not to
  paper over a real one.
- **Recoverable-hydration tolerance (authed projects only):** on a signed-in page the
  server pre-renders the **anonymous** nav, then the client hydrates to the
  **authenticated** nav — an expected, React-recoverable hydration mismatch
  (minified #418/#421/#423/#425) that surfaces non-deterministically as a `pageerror`.
  The watchdog tolerates **only** that error family and **only** on the
  `auth`/`member`/`admin` projects; the anonymous `public` suite still fails hard on
  any hydration error.
- **Signed-in vs. anonymous specs:**
  - `member`/`admin` specs run with a captured `storageState` (from `global.setup.ts`,
    which logs each seeded role in through the real UI).
  - `auth` specs drive the login/signup UI themselves from a **fresh anonymous**
    context (no storageState, no `setup` dependency) — use the `emailLogin` /
    `signUpNewUser` helpers in `setup/auth-helpers.ts`.
  - A spec that needs to start signed-out under an otherwise-authed project overrides
    per-file with `test.use({ storageState: { cookies: [], origins: [] } })` — e.g.
    `member/account-withdrawal.spec.ts` signs a throwaway user in itself to exercise
    the real `POST /api/account/delete`.
- **Phone-OTP:** the Auth emulator disables real reCAPTCHA and exposes the SMS code
  over REST; `getLatestPhoneCode()` in `setup/phone-otp.ts` polls it so signup/phone-
  login complete end-to-end.
- **Fixtures are PII-free by construction** — hand-authored, obviously-fake
  ids/emails/phone numbers; never copied from prod. A cat's thumbnail file is
  `thumbnails/cat_<docId>.jpg` in Storage (the asset script matches the doc id in
  the `_`-split name), so **doc ids must use hyphens, not underscores**.
- **Flake policy:** a test that fails intermittently is fixed or quarantined
  (`test.fixme`) the same day.

## Gotchas / divergences

- **`mountains.json` gets dirtied (F8).** Any local `npm run build` (incl.
  `test:e2e`) rewrites `config/mountains/mountains.json` to inject the about-photo
  `localPath`. Harmless — do **not** commit that change.
- **Repo rules are ahead of prod (F12).** The Firestore emulator loads
  `config/firebase/firestore.rules` from the repo, which may be ahead of what's
  deployed. That's the source of truth we want to test, but live prod behavior can
  differ until deploys catch up.
- **Non-admin login (resolved 2026-07-13).** On every login the app calls
  `ensureUserExists()`, which writes the user's own `users/{uid}` doc via the client
  SDK. A **scoped self-write rule** in `config/firebase/firestore.rules` now lets a
  user create/update their own doc but **not** set/change `currentRole` (no
  self-escalation), so the seeded `butler-ground` member logs in cleanly and
  `global.setup.ts` captures **both** admin and member `storageState`. Covered by
  `npm run test:rules` (`tests/rules/users.rules.test.ts`). **⚠️ Deploy note:** the
  repo rule is ahead of prod — run `firebase deploy --only firestore:rules` to match.
- **Fixture watch-outs.**
  - A cat's `date_of_birth` is a **4-digit year** (rendered `${date_of_birth}년생`),
    not an epoch timestamp; the cats admin form also validates it as a year
    (`min=1990 max=2030`).
  - The cats admin form's `thumbnailUrl` input is `type="url"`, but the app stores
    **relative** paths (`/images/...`) that fail HTML5 URL validation and silently
    block save — the cats spec clears the field to proceed. (App follow-up: relative
    thumbnails are legitimate.)
- **Two latent app behaviors the suites pin (not test bugs).** `butler_talk` /
  `butler_stream` gate on `isAdmin()`, so a butler-ground member is **denied** despite
  the "allow butler roles" comment — `member/butler-access.spec.ts` asserts that; if
  the gate is widened, that spec is the intended failure signal. Role assignment's
  `permission_logs` audit write is denied by the repo rules (non-fatal; the role still
  assigns).

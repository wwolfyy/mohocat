# Testing manual — Playwright e2e (emulator-backed)

> Developer how-to for **running, debugging, and extending** the Playwright
> end-to-end suite. This is the walkthrough + troubleshooting guide; the terse
> co-located reference is [`tests/e2e/README.md`](../../../tests/e2e/README.md).
> Design rationale lives in
> [`docs/planning/playwright-ci-plan.md`](../../planning/completed/playwright-ci-plan.md) and
> [`…-prerequisite-plan.md`](../../planning/completed/playwright-ci-prerequisite-plan.md).

The e2e tests run the **real production build** (`next build` → `next start`)
against a **hermetic Firebase Emulator Suite** (Auth + Firestore + Storage) that is
seeded with hand-authored fixtures. No production data is touched and **no secrets
are needed** — the emulator project is a fake `demo-mohocat`.

---

## TL;DR

```bash
# one-time
brew install openjdk                       # emulators are JVM processes (macOS)
npm ci
npx playwright install chromium

# run everything (macOS: put keg-only Java on PATH first)
export PATH="/usr/local/opt/openjdk/bin:$PATH"
npm run test:e2e
```

That single command does the whole chain:

```
firebase emulators:exec
  └─ seed-emulators.mjs        seed Firestore + Auth + Storage from fixtures
  └─ npm run build             fetch-static-assets (emulator) + next build
  └─ playwright test           next start (:3100) + run the specs
```

Expected result today: **3 passing** (desktop + mobile landing map, admin
`storageState`) in a few seconds, then the emulators shut down.

---

## 1. Prerequisites

| Need               | Why                                                               | How                                                                      |
| ------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Java (JRE/JDK)** | The Firebase emulators are Java processes.                        | macOS: `brew install openjdk` (see the PATH note below). CI: setup-java. |
| **Node deps**      | `@playwright/test`, `firebase-tools`, `dotenv-cli` (all devDeps). | `npm ci`                                                                 |
| **Chromium**       | The browser Playwright drives.                                    | `npx playwright install chromium`                                        |

### The macOS Java PATH gotcha

Homebrew's `openjdk` is **keg-only** — it is not symlinked onto `PATH`, so
`firebase emulators:exec` will fail with _"Unable to locate a Java Runtime."_ Fix it
for the shell that runs the tests:

```bash
export PATH="/usr/local/opt/openjdk/bin:$PATH"   # Intel Homebrew prefix
# (Apple Silicon: /opt/homebrew/opt/openjdk/bin)
java -version   # verify
```

Add that `export` to your shell profile if you run the suite often, or create the
symlink Homebrew suggests (`sudo ln -sfn …/openjdk.jdk /Library/Java/JavaVirtualMachines/`).

---

## 2. Commands

| Command                   | What it does                                                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test:e2e`        | Full loop: emulators → seed → prod build → `next start` → `playwright test`. Headless; the canonical run.                                                                             |
| `npm run test:e2e:ui`     | Same, but opens the **Playwright UI** (time-travel, watch, pick-locator). Best for understanding a test.                                                                              |
| `npm run test:e2e:headed` | Same loop, but a **real browser window opens and drives itself live**. Scoped to `chromium-desktop` (one window). Add `--slowmo=1000` inside the script to slow it down.              |
| `npm run test:e2e:debug`  | Opens the **Playwright Inspector** — step through the test line-by-line, watch the browser, and use pick-locator / DevTools. Forces one worker, headed. Scoped to `chromium-desktop`. |
| `npm run seed:emulators`  | Seed only. **Must** run inside an `emulators:exec` shell (it refuses otherwise).                                                                                                      |

> **Why the wrapper matters:** you can't append Playwright flags to `npm run
test:e2e` (e.g. `-- --headed`) — `playwright test` is buried inside the quoted
> `emulators:exec` command, so npm would append the flag to the _outer_ command
> instead. That's why headed/debug are their own scripts. `:headed` and `:debug`
> are pinned to `chromium-desktop` so you get a single window (the suite also has a
> `mobile` project); drop `--project=chromium-desktop` from the script to run both.

All three are defined in `package.json`. `test:e2e` wraps everything in
`dotenv -e .env.test -- firebase emulators:exec …` so the fake `NEXT_PUBLIC_*`
config and the emulator host vars reach the seed, the build, and the server.

### Running a subset

Once you understand the loop, you can pass Playwright flags through by editing the
inner command, or run Playwright directly **against already-running emulators**
(advanced — see §6). Quick filters when iterating via `test:e2e:ui`:

```bash
# these are Playwright flags; append inside the emulators:exec quoted command
playwright test tests/e2e/public          # one folder
playwright test --project=chromium-desktop # one project
playwright test -g "landing page"          # by title
```

---

## 3. What runs where — the moving parts

| Piece             | File                                                 | Role                                                             |
| ----------------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| Emulator config   | `firebase.json`                                      | Ports + rules; `singleProjectMode`.                              |
| Fake env          | `.env.test`                                          | Committed, **fake-only** `NEXT_PUBLIC_*` + the emulator flag.    |
| Seed script       | `scripts/test/seed-emulators.mjs`                    | Loads fixtures → Firestore/Auth/Storage. `demo-*`-guarded.       |
| Fixtures          | `tests/e2e/fixtures/*.json` + `images/`              | Hand-authored, PII-free seed data.                               |
| Playwright config | `playwright.config.ts`                               | Projects, `webServer` (`next start -p 3100`), retries, trace.    |
| Auth setup        | `tests/e2e/setup/global.setup.ts`                    | Logs roles in through the real UI → saves `storageState`.        |
| Console watchdog  | `tests/e2e/setup/test.ts`                            | Shared `test` — fails on unexpected `console.error`/`pageerror`. |
| Specs             | `tests/e2e/{public,auth,member,admin,api}/*.spec.ts` | The tests themselves.                                            |

### Ports (fixed)

| Service            | Port     | Note                                                    |
| ------------------ | -------- | ------------------------------------------------------- |
| Auth emulator      | **9099** |                                                         |
| Firestore emulator | **8088** | Not the Firebase default 8080 (that was taken locally). |
| Storage emulator   | **9199** |                                                         |
| Test web server    | **3100** | `next start` (3000 avoided — common dev-server port).   |

These are matched in three places — `firebase.json`, the `connect*Emulator` calls
in `src/services/firebase.ts`, and `playwright.config.ts`. **Change one, change all
three.**

### Projects (browser matrix)

- `setup` — runs `global.setup.ts` first; saves per-role `storageState`.
- `chromium-desktop` (1280×720) and `mobile` (Pixel 7) — run the `public/` specs.
- `member` / `admin` — reuse `storageState`, depend on `setup` (specs land later).
- `api` — request-context security assertions (no browser).

---

## 4. How the emulator wiring works (and why prod is safe)

Every emulator branch is gated on **`NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true'`**
(or the presence of `FIRESTORE_EMULATOR_HOST`), which is **only** set by `.env.test`
/ `emulators:exec` — **never** in the Vercel dashboard. So production behaviour is
byte-identical.

- **Client SDK** (`src/services/firebase.ts`) — connects Auth/Firestore/Storage to
  the emulators and skips `getAnalytics` (fake config has no `measurementId`).
- **Admin SDK** (`src/lib/firebase-admin.ts`) — initializes **credential-less**
  against the emulators (no service-account key).
- **Asset script** (`scripts/maintenance/fetch-static-assets.js`) — overrides the
  project id and downloads seeded images via `file.download()` (signed URLs don't
  work credential-less).

Verify prod is untouched at any time with `npm run build` (no emulator env) — it
should read **real** Firebase and never log `EMULATOR mode`.

---

## 5. Writing a new spec

1. Put it under the folder for its actor: `public/`, `auth/`, `member/`, `admin/`,
   or `api/`. The folder decides which Playwright project (and viewport/auth) runs it.
2. Import the shared `test` so the **console watchdog** applies:

   ```ts
   import { test, expect } from '../setup/test';

   test('does the thing', async ({ page }) => {
     await page.goto('/pages/cats');
     await expect(page.getByRole('heading', { name: '냥이들' })).toBeVisible();
   });
   ```

3. **Locators (convention D4):** prefer `getByRole(…, { name })` on the
   single-sourced Korean copy in `src/constants/strings.ts` / `adminStrings.ts`.
   Add a `data-testid` only where there's no accessible name (today: the map).
4. **No `waitForTimeout`.** Wait on a locator/state (e.g. the map is ready when a
   `.leaflet-marker-icon` is visible).
5. Need new seed data? Add it to the JSON in `tests/e2e/fixtures/` — see §7. Signed-in
   specs read `storageState` automatically via their project.

---

## 6. Debugging a failure

- **Report + trace:** after a run, open the HTML report:
  ```bash
  npx playwright show-report
  ```
  `trace: 'on-first-retry'` captures a full trace on the retry; `test-results/`
  holds screenshots + `error-context.md` (a DOM snapshot) per failure.
- **UI mode** (`npm run test:e2e:ui`) is the fastest way to see what the page looked
  like at each step and to try locators live.
- **Console errors:** the watchdog attaches the offending lines to the failing test
  and lists them in the failure message. If a message is known-benign, add a
  substring to the allowlist in `tests/e2e/setup/test.ts` — sparingly.
- **Iterate without rebuilding each time (advanced):** start the emulators in one
  shell (`firebase emulators:exec … "sleep 100000"` after seeding, or
  `firebase emulators:start`), build + `next start -p 3100` in another, then run
  `npx playwright test` directly. `reuseExistingServer` is on locally, so Playwright
  will attach to your running server instead of booting its own.

---

## 7. Fixtures

One JSON file per Firestore collection under `tests/e2e/fixtures/`, plus an
`images/` tree seeded into Storage. Everything is hand-authored — **no data is
copied from production**, so fixtures are deterministic and PII-free by construction.

Key contract (enforced by the build):

- A cat's thumbnail lives in Storage at `thumbnails/cat_<docId>.jpg`; the asset
  script matches the **doc id in the `_`-split filename**, so **doc ids must use
  hyphens, not underscores**. A cat with no thumbnail is legal (build warns).
- The about photo must exist in the Storage emulator at
  `about-photos/geyang/<about-content.json → mainPhoto.filename>` (the seeder uploads
  `tests/e2e/fixtures/images/about-photos/geyang/`). ⚠️ Since 2026-08-02 it is fetched
  **live at render time**, not baked, so a mismatch no longer fails the build — it fails the
  `/pages/about` spec instead, as a `next/image` error.
- Users (`users.json`) create Auth users **and** matching `users/{uid}` docs whose
  `currentRole` drives `firestore.rules` `hasPermission()` — resolved against
  `role-config.json`.

After editing fixtures, just re-run `npm run test:e2e` (seed is idempotent —
delete-then-write).

---

## 8. CI

`.github/workflows/ci.yml` runs on PRs to `dev`/`main` and pushes to `dev`:

- **`checks`** (fast) — `npm ci` → `tsc --noEmit` → `npm run lint` → `npm test`.
- **`e2e`** (needs `checks`) — sets up Java, caches Playwright browsers + emulator
  jars, `playwright install --with-deps chromium`, then `npm run test:e2e`. The
  Playwright report is uploaded as an artifact. In CI `CI=true` flips on retries (2),
  2 workers, and disables server reuse. **No secrets required.**

To make CI a required gate, enable **branch protection** on `main` (GitHub → Settings
→ Branches) requiring both jobs.

---

## 9. Troubleshooting

| Symptom                                                         | Cause / fix                                                                                                                                                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Unable to locate a Java Runtime`                               | Java not on PATH — see §1 (macOS keg-only openjdk).                                                                                                                                              |
| `Port 8088/9099/9199 is not open … could not start`             | Another process holds the port. Free it, or change the port in **all three** places (§3).                                                                                                        |
| `port taken` on 3100                                            | A stale `next start` is running. Kill it (`lsof -nP -iTCP:3100 -sTCP:LISTEN`).                                                                                                                   |
| Seed exits with _"REFUSING TO RUN"_                             | You ran `seed:emulators` outside `emulators:exec` (no `FIRESTORE_EMULATOR_HOST`), or the project isn't `demo-*`.                                                                                 |
| Map/marker assertions flake or time out                         | The Leaflet map inits async; wait on `.leaflet-marker-icon` with a generous timeout (already done in the trivial spec). Heavy parallel load slows it — the spec allows 25s.                      |
| `config/mountains/mountains.json` shows as modified after a run | **No longer expected** (F8 retired 2026-08-02): the build used to inject the about-photo `localPath`, but nothing writes to this file now. A diff here is a real edit of yours.                  |
| Member/non-admin login setup fails                              | Known: the repo `users` write rule blocks non-admin self-writes in `ensureUserExists`. `global.setup.ts` sets up **admin only** pending an owner decision — see `log/DEBUG_LOG.md` (2026-07-11). |
| `next/image` complains about a fixture image                    | Fixture album media is served from `public/`, not the emulator (spike S3). Check the URL points at a `public/` path.                                                                             |

---

## 10. Guarantees

- **Hermetic** — a `demo-*` project + fake keys; the seed script refuses to run
  against anything else. Nothing here can reach production Firebase.
- **Prod-path parity** — the suite runs the same `next build` + `next start` Vercel
  runs; emulator branches are flag-gated off in prod.
- **Deterministic** — fixtures are hand-authored and seeded fresh each run; the
  emulators are torn down with the job.

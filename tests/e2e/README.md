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
  setup/           test.ts (console-error watchdog fixture) + global.setup.ts (storageState)
  public/          anonymous-surface specs   (chromium-desktop + mobile projects)
  auth|member|admin|api/   role-scoped specs (land in main-plan Phases 3–6)
scripts/test/seed-emulators.mjs   Admin SDK → Firestore/Auth/Storage (demo-* guarded)
playwright.config.ts
```

## Conventions

- **Locators (D4):** prefer `getByRole(..., { name })` on the single-sourced
  Korean copy in `src/constants/strings.ts` / `adminStrings.ts`. Use `data-testid`
  only where there is no accessible name — currently just the map
  (`mountain-map`) and its markers (`map-marker`).
- **No `waitForTimeout`.** Wait on a locator/state (e.g. the map's async layer is
  ready when a `.leaflet-marker-icon` is visible).
- **Console-error watchdog:** import `test` from `tests/e2e/setup/test.ts`; any
  unexpected `console.error` / `pageerror` fails the test (allowlist inside it).
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
- **Non-admin login is currently blocked under the repo rules.** On every login
  the app calls `ensureUserExists()`, which `updateDoc`s the user's own
  `users/{uid}` doc — but the repo `users` write rule requires `manage-users`, so
  a non-admin self-update is denied and login never completes. `global.setup.ts`
  therefore sets up **admin only** for now; member/admin (non-admin actor) suites
  are blocked until the owner decides whether to relax the `users` write rule
  (allow self-writes) or make `ensureUserExists` tolerate a denied self-update.
  Tracked in `log/DEBUG_LOG.md` and the prerequisite plan §3 (S4).

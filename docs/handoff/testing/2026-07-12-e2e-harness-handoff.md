# 산냥이집냥이 — Testing Hand-off (Playwright e2e harness + CI)

**Date:** 2026-07-12 · **Branch:** `dev` · **Committed** to `dev` in 2 commits
(harness/code/CI, then docs/logs) · **Push:** ❌ not pushed.

> **This is a standalone testing hand-off — deliberately kept OUT of the numbered
> `docs/handoff/handoff-NN` engineering series.** It is the single narrative for the
> e2e/testing workstream: what exists, how to run it, what's decided, and what's next.
> Future testing hand-offs go here (`docs/handoff/testing/`), newest first.

**Companions:**
[`docs/manuals/testing/README.md`](../../manuals/testing/README.md) (developer manual — how to run),
[`tests/e2e/README.md`](../../../tests/e2e/README.md) (terse co-located reference),
[`docs/planning/playwright-ci-plan.md`](../../planning/playwright-ci-plan.md) (scope) +
[`…-prerequisite-plan.md`](../../planning/playwright-ci-prerequisite-plan.md) (this harness, ✅ EXECUTED),
[`log/FEATURE_MOD_LOG.md`](../../../log/FEATURE_MOD_LOG.md) (1 new: harness),
[`log/DEBUG_LOG.md`](../../../log/DEBUG_LOG.md) (1 new: non-admin login).

---

## TL;DR

The **e2e test _harness_ and CI are built and green** — but the actual test _suites_
are **not written yet** (that's the next workstream). Today there is exactly **one
real spec** (a landing-page smoke test) plus an admin-login setup, proving the whole
machine works end-to-end: **emulators → seed → real prod build → `next start` →
Playwright**, hermetic, no secrets.

**Two owner actions are outstanding** (neither blocks writing more tests):

1. **Push / open a PR** to watch CI go green in GitHub Actions (3× for the exit
   criterion) and enable branch protection.
2. **Decide the non-admin-login question** (see §5) — it gates the signed-in
   (member/admin) suites, not the public/api ones.

---

## 1. What was built

A hermetic **Firebase Emulator Suite** (Auth + Firestore + Storage) seeded with
hand-authored fixtures, driving the **real production build** under Playwright,
wired into a greenfield GitHub Actions CI. Every emulator branch in app code is
gated on `NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true'` (or the emulator host
vars), which is **never set in Vercel** — production is byte-identical.

| Area                            | Files                                                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Emulator config                 | `firebase.json` (emulators block), `config/firebase/storage.rules`                                                                   |
| Fake env (committed, fake-only) | `.env.test`                                                                                                                          |
| Seed                            | `scripts/test/seed-emulators.mjs` (+ fixtures under `tests/e2e/fixtures/`)                                                           |
| App wiring (env-gated)          | `src/services/firebase.ts` (client `connect*Emulator` + skip Analytics), `src/lib/firebase-admin.ts` (credential-less emulator init) |
| Build script                    | `scripts/maintenance/fetch-static-assets.js` (emulator project-id override, credential-less init, `file.download()` path)            |
| Readiness signals               | `src/components/MountainViewer.tsx` + `LeafletMountainMap.tsx` (`data-testid`)                                                       |
| Harness                         | `playwright.config.ts`, `tests/e2e/setup/{test,global.setup}.ts`                                                                     |
| The one spec                    | `tests/e2e/public/landing.smoke.spec.ts`                                                                                             |
| CI                              | `.github/workflows/ci.yml` (checks + emulator-backed e2e)                                                                            |
| npm scripts                     | `test:e2e`, `test:e2e:ui`, `test:e2e:headed`, `test:e2e:debug`, `seed:emulators`                                                     |
| Docs                            | `docs/manuals/testing/README.md`, `tests/e2e/README.md`                                                                              |

---

## 2. How to run it

```bash
# one-time
brew install openjdk                       # emulators are JVM processes
export PATH="/usr/local/opt/openjdk/bin:$PATH"   # keg-only Java onto PATH (macOS)
npm ci && npx playwright install chromium

npm run test:e2e          # headless (canonical)
npm run test:e2e:ui       # time-travel UI (best for understanding a test)
npm run test:e2e:headed   # live browser window (chromium-desktop)
npm run test:e2e:debug    # Playwright Inspector, step line-by-line
```

Full walkthrough + troubleshooting: **`docs/manuals/testing/README.md`**.

**Ports (fixed, matched in 3 places — `firebase.json`, `src/services/firebase.ts`,
`playwright.config.ts`):** auth 9099, firestore **8088** (8080 was taken locally),
storage 9199, test server 3100.

---

## 3. Current state — verified green

- **Local loop:** 3 passing (desktop + mobile landing map, admin `storageState`) in
  ~6s. The asset-fetch step downloads 5 fixture thumbnails via `file.download()`,
  honours the no-thumbnail warning path (1 deliberately thumbnail-less cat), and
  passes the about-photo gate.
- **Gates:** `npx tsc --noEmit` clean · `npm run lint` warnings-only · `npm test`
  40/40 vitest.
- **Production build path verified UNTOUCHED:** real `npm run build` succeeds (32
  real cats, no `EMULATOR mode` init, clean `mountains.json` diff).
- **Spikes recorded** in the prerequisite plan §3: S1 credential-less Admin SDK ✅,
  S2 `getSignedUrl` fails credential-less → `file.download()` fallback, S3 →
  `public/`-served album fixtures (WP6 skipped), S4 admin login ✅ / non-admin blocked.

---

## 4. What is NOT here yet (the next workstream)

**No real test suites exist.** The dozens of specs in the main plan (§5) — nav
integrity, map-marker → cat modal, galleries, adoption, albums/lightbox, auth flows,
member flows, admin CMS, API-security — are **unwritten**. The folders
`tests/e2e/{auth,member,admin,api}/` are empty placeholders.

Recommended order (main-plan Phases 2–6):

- **Phase 2 `public/`** and **Phase 6 `api/`** are **unblocked now** — they don't
  need a signed-in user. Start here.
- **Phases 3–5 (`auth`/`member`/`admin`)** are **blocked on the §5 decision** (they
  need non-admin login working to capture member `storageState`).

The `member`/`admin` Playwright projects and `global.setup.ts` are already wired for
these; they just need the login fix + the specs.

---

## 5. ⚠️ Open decision — non-admin login is blocked under the repo rules

**Owner call needed before the signed-in suites.** Every login runs
`permissionService.ensureUserExists()`, which `updateDoc`s the user's own
`users/{uid}` doc — but the repo `config/firebase/firestore.rules` `users` **write**
rule requires `manage-users`, with no self-write allowance. So a **non-admin login is
permission-denied** and never redirects. Admin works (it has `manage-users`). The
emulator enforces the repo rules (the F12 divergence), which is what surfaced it —
this would also break non-admin login anywhere the repo rules are the deployed rules.

Two options (both are the owner's to choose — I did **not** change security rules or
the login path to make a test pass):

1. **Relax the `users` write rule** to allow a user to write their **own** doc
   (scoped to self-fields).
2. **Make `ensureUserExists` tolerate** a denied self-update (best-effort; don't
   block login on it).

Until decided, `global.setup.ts` sets up **admin only**. Full write-up:
`log/DEBUG_LOG.md` (2026-07-11) + prerequisite plan §3 (S4).

---

## 6. Key facts a successor needs

- **Java on PATH (macOS):** keg-only openjdk must be exported or the emulators won't
  start (`Unable to locate a Java Runtime`).
- **Fixtures contract:** a cat's thumbnail is `thumbnails/cat_<docId>.jpg` in Storage
  and the asset script matches the doc id in the `_`-split filename → **doc ids must
  use hyphens, not underscores**. About photo must exist at
  `about-photos/geyang/<mountains.json filename>` or the build fails.
- **F8 (mountains.json dirtied):** any local `npm run build` (incl. `test:e2e`)
  injects the about-photo `localPath` into `config/mountains/mountains.json`. Harmless
  — **do not commit** it.
- **Album media uses `public/`-served fixtures** (spike S3), not emulator Storage —
  so no `next/image` remotePattern was needed.
- **The e2e suite has no React/app-code dependency** — pure DOM automation via
  Playwright locators + `data-testid`; it tests React output without importing it.
- **CI needs no secrets** — the `demo-mohocat` project + fake keys are hermetic.

---

## 7. Commit / tree state

The e2e work is **committed to `dev`, not pushed**, in two commits: (1) the
harness/code/CI, (2) docs/logs (incl. this hand-off). New/changed files are listed in
§1. **Left uncommitted on purpose:** the working tree still has **unrelated**
`docs/pretagging_uploading_program/*` deletions that are **not part of this
workstream** — those are not mine; review/commit them separately.

**Suggested next steps:** (1) push/PR to see CI green + enable branch protection,
(2) make the §5 call, (3) start the Phase-2 `public/` specs.

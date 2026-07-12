# 산냥이집냥이 — Testing Hand-off (Playwright e2e harness + CI)

**Date:** 2026-07-12 · **Branch:** `dev` · **Committed** to `dev` in 3 commits
(harness/code/CI, then docs/logs, then the landing-marker bake fix — see the
2026-07-12 update below) · **Push:** ❌ not pushed.

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
[`log/DEBUG_LOG.md`](../../../log/DEBUG_LOG.md) (2 new: non-admin login; landing-marker bake).

---

## Update — 2026-07-12 (cont.): Phase 2 `public/` suites written

The next workstream is under way: **all Phase 2 `public/` specs are written** (main
plan §8 Phase 2). Seven new spec files under `tests/e2e/public/`, ~60 tests across
the `chromium-desktop` + `mobile` projects:

| Spec                           | Covers                                                                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `nav.spec.ts`                  | anonymous-clickable nav + footer links resolve (no 404); desktop dropdowns / mobile hamburger expose them                   |
| `home-map.spec.ts`             | one pin per point; **§7a baked avatars ⇒ zero client Firestore calls**; marker → CatGallery → CatInfo (incl. 작명 사유)     |
| `mobile-map.spec.ts`           | portrait pins + tap → gallery; landscape rotate-notice                                                                      |
| `galleries-adoption.spec.ts`   | 냥이들 search + detail modal; 입양홍보 adoptable-only gallery + 소식 accordion/search empty-state                           |
| `announcements-static.spec.ts` | 공지 list → `[id]` detail → back; about/FAQ/privacy/terms render + zero mobile h-overflow                                   |
| `anonymous-gating.spec.ts`     | butler 접근 제한; `/mypage` → `/login`; 동참 login-required; nav permission-gating (사진첩/동영상 spans, 집사메뉴 disabled) |
| `albums.spec.ts`               | photo Lightbox open/nav/close + **back-button-closes** (`useModalLayer`); video grid + player shell                         |

**Verification state:** the first **six** are **verified green** against the running
emulator-seeded server (run per-file with `npx playwright test <file>` reusing the
`:3100` server). **`albums.spec.ts` is written but NOT yet run green** — it depends on
the spike-S3 public-served album fixtures, which `next start` only serves after a
fresh build (a reused server snapshots `public/` at boot). **The canonical full-suite
gate (`npm run test:e2e`) has not been run yet** — it's the outstanding validation
step (see below). `npx tsc --noEmit` is clean. **All of this is uncommitted** on `dev`.

**Supporting changes (test-only — no `src/`, prod build path untouched):**

- Created the missing **spike-S3 album fixtures** (`tests/e2e/fixtures/images/test-fixtures/album-0{1,2}.jpg`)
  and a `copyPublicFixtures()` step in `scripts/test/seed-emulators.mjs` that lays them
  into the gitignored `public/images/test-fixtures/` **before the build** (so
  `media.json`'s `/images/test-fixtures/*` URLs resolve). `.gitignore` updated.
- Added `"Failed to fetch RSC payload"` to the console-watchdog allowlist
  (`tests/e2e/setup/test.ts`) — benign Next.js prefetch-abort noise from full-page
  redirects (e.g. `/mypage` → `/login`).

**Scoping decisions baked into the specs (verified against source, not the plan text):**

- **Mobile clustering / spiderfy is NOT exercisable** with the geyang fixture —
  `config/mountains/mountains.json` sets `map.clustering: false`, and that flag is a
  static import baked at build, not runtime-overridable. Covering spiderfy e2e needs a
  **clustering-enabled fixture mountain**; tracked as a Phase-2 gap (the clustering math
  in `utils/mapClustering` is unit-testable independently).
- **公지 detail renders `post.message` as plain text** — link-token processing lives in
  the cat/adoption surfaces (`processTextWithLinks` / `CatLinkedText`), not on the
  announcement detail. Link-token interaction is therefore **out of scope for the 공지
  spec** (the fixture's "링크 토큰" announcement is a poor vehicle; a token test belongs
  in a cat/adoption context and needs a token-bearing fixture).
- **`photo_album` / `video_album` are permission-gated** (`view-photo` / `view-video`),
  so anonymous users see them as **disabled nav spans**, not links — the nav-integrity
  spec excludes them and the gating is asserted in `anonymous-gating.spec.ts`. (The album
  _pages_ still render for anonymous by direct URL — only the nav entry is gated.)
- **Adoptable empty-state** needs a no-adoptables seed (not available); the reachable
  **소식 search** empty-state is covered instead.

**Outstanding validation (do this next):** run `npm run test:e2e` (rebuild → seed lays
down album fixtures → full suite, all projects) to (a) validate `albums.spec.ts`,
(b) confirm the whole Phase-2 set green together, and (c) reconfirm the prod build path
is untouched. At the time of writing this was blocked only by an interactive
`test:e2e:ui` session holding the fixed ports (9099/8088/9199/3100) — kill it first.

**After that:** **Phase 6 `api/`** is still unblocked and unwritten (good next target);
**Phases 3–5** (`auth`/`member`/`admin`) remain blocked on the §5 non-admin-login
decision. Then Phase 7 (flake audit + `PROJECT_PLAN`/plan-checklist updates + this
hand-off's final state).

---

## Update — 2026-07-12: landing-marker bake bug found & fixed (harness green)

On picking this up, the **one real spec failed reproducibly** on a fresh machine:
`landing.smoke.spec.ts` rendered the map but **zero markers** (2× full
`npm run test:e2e`, desktop + mobile). Not a harness defect — an **incomplete §7a
migration** in app code: `src/app/page.tsx` baked **cats** via the Admin SDK but still
read **points** via the **client Web SDK**, which doesn't reliably connect to the
Firestore emulator during `next build`, so the map baked with an empty point set.
(Production was never affected — there the client SDK hits real Firebase.)

**Fixed** by adding `getAllPointsServer()` (`src/lib/server/point-reads.ts`, Admin SDK,
mirrors `cat-reads.ts`) and switching `page.tsx` to it — commit
`02c412a` (with owner sign-off, since it touches a prod read path; functionally
identical). **Harness now 3/3 green, twice**, markers appearing in ~2s instead of a 25s
timeout. Full write-up: `log/DEBUG_LOG.md` (2026-07-12, newest).

**Net effect on this hand-off:** §3's "verified green" holds again; **Phase 2 (`public/`)
and Phase 6 (`api/`) are unblocked and ready to start** (§4). The two owner actions in
the TL;DR still stand.

> **Successor note:** Java must be on PATH for the emulators
> (`export PATH="/usr/local/opt/openjdk/bin:$PATH"` on macOS, §6) — the suite can't run
> without it. Leftover emulator/`next start` processes from an interrupted run hold the
> fixed ports (auth 9099 / firestore 8088 / storage 9199 / server 3100); kill them before
> re-running.

---

## TL;DR

The **e2e test _harness_ and CI are built and green**, and the **Phase 2 `public/`
suites are now written** (see the newest update above — 6/7 verified, `albums.spec.ts`

- the full-suite gate pending a clean `npm run test:e2e`). Before that the machine had
  exactly one real spec (landing smoke) + admin-login setup, proving the whole chain
  works end-to-end: **emulators → seed → real prod build → `next start` → Playwright**,
  hermetic, no secrets.

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

> **Superseded in part — see the "Phase 2 `public/` suites written" update at the top.**
> The `public/` specs (nav, map-marker → cat modal, galleries, adoption, albums/lightbox,
> 공지, static pages, anonymous gating) **now exist** (6/7 verified; albums + full-suite
> gate pending a clean run). The rest below still stands.

The remaining main-plan specs — **auth flows, member flows, admin CMS, API-security** —
are **unwritten**. The folders `tests/e2e/{auth,member,admin,api}/` are empty
placeholders. **Phase 6 `api/`** is unblocked (good next target); **Phases 3–5**
(`auth`/`member`/`admin`) remain blocked on the §5 non-admin-login decision.

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

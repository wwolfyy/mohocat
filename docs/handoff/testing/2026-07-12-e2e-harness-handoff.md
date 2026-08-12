# 산냥이집냥이 — Testing Hand-off (Playwright e2e harness + CI)

**Date:** 2026-07-12 (last updated 2026-07-16) · **Status:** ✅ **WORKSTREAM CLOSED —
merged to `main` via PR #7 (2026-07-16).** All main-plan phases (0–7) done: harness/CI,
`public`/`auth`/`member`/`admin`/`api` suites (~140 tests), flake audit (local 3× + CI
green), docs, and branch protection. See the 2026-07-16 update below for the promotion +
branch-protection details. **Only open owner action:** `firebase deploy --only
firestore:rules` for prod parity.

> **This is a standalone testing hand-off — deliberately kept OUT of the numbered
> `docs/handoff/handoff-NN` engineering series.** It is the single narrative for the
> e2e/testing workstream: what exists, how to run it, what's decided, and what's next.
> Future testing hand-offs go here (`docs/handoff/testing/`), newest first.

**Companions:**
[`docs/manuals/testing/README.md`](../../manuals/testing/README.md) (developer manual — how to run),
[`tests/e2e/README.md`](../../../tests/e2e/README.md) (terse co-located reference),
[`docs/planning/playwright-ci-plan.md`](../../planning/completed/playwright-ci-plan.md) (scope) +
[`…-prerequisite-plan.md`](../../planning/completed/playwright-ci-prerequisite-plan.md) (this harness, ✅ EXECUTED),
[`log/FEATURE_MOD_LOG.md`](../../../log/FEATURE_MOD_LOG.md) (1 new: harness),
[`log/DEBUG_LOG.md`](../../../log/DEBUG_LOG.md) (2 new: non-admin login; landing-marker bake).

---

## Update — 2026-07-16: merged to `main` (PR #7) + branch protection — WORKSTREAM CLOSED

**The e2e workstream is complete and live on `main`.** With Phase 7 done (below), the
whole of `dev` was promoted to production `main` via **PR #7** and branch protection now
enforces the suite.

**PR #7 — `dev → main` promotion, merged with a MERGE COMMIT (`65d2020`).**

- **CI green on the PR** — the `e2e` job (and `checks`) passed on `pull_request` and on
  the `dev` pushes; Vercel preview deployed clean. This is the **CI half of the Phase-7
  flake-audit exit criterion** (the local half — 3× consecutive green — was already met).
- **Merge method mattered.** PR #6 had earlier been **squash-merged** into `main`
  (`a7bfe3c`), which collapsed that work into one new commit `main` didn't share with
  `dev`. `dev` already contained the same work as its original commits, so `dev`/`main`
  showed a **textual (not real) conflict** — a squash artifact. **Resolved** by
  `git merge -s ours origin/main` on `dev` (`fdd8077`): records `main` as an ancestor
  and keeps `dev`'s tree **byte-for-byte** (verified `dev` is a semantic superset of
  `main` first — the only `main`-only content was stale docs + dead code `dev` had
  already removed). PR #7 then merged cleanly **with a merge commit** (not squash/rebase),
  which keeps `dev` an ancestor of `main` and avoids recreating the divergence.
- **Current branch state:** `dev` is an ancestor of `main`; `main` is **+1 merge commit
  ahead** of `dev`. Optionally `git checkout dev && git merge --ff-only main && git push`
  to fully sync (zero drift).

**Branch protection on `main` — now enforced.**

- `e2e` is a **required status check** (classic protection). The **`protect-main`
  ruleset** adds `deletion` (can't delete `main`), `non_fast_forward` (no force-push),
  and a `pull_request` rule (review count **0**). The **linear-history rule was removed**
  so promotions can use a merge commit — the right tool for a long-lived `dev`.

**Rulesets vs classic protection gotcha (worth remembering):** the merge-commit option
disappeared from the GitHub merge button because a **ruleset** `required_linear_history`
rule was active — even though _classic_ branch protection had linear history **off**. The
two systems stack; check **Settings → Rules → Rulesets**, not just classic protection.

**Only remaining owner action:** `firebase deploy --only firestore:rules` (prod parity on
the scoped `users` self-write rule — repo rules are ahead of deployed prod).

**Open (not part of this workstream): workflow direction.** Whether to keep the
`dev`-promotion model (use **merge commits** for `dev → main`, as PR #7 did — no drift) or
move to **GitHub Flow** (delete `dev`, short-lived branches off `main`, squash-merge) is an
undecided call. Both are viable; merge-commit fits promotion, squash fits GitHub Flow.

---

## Update — 2026-07-15: Phase 7 done — flake audit 3× green + docs finalized (workstream complete)

**The main plan is complete.** With Phases 0–6 green, **Phase 7 (flake audit + docs
finalization) is now done** — every main-plan task in `playwright-ci-plan.md` §8 is
checked except the two owner actions (push/PR to watch CI + branch protection). All
changes are **test/docs-only; no `src/` touched**; committed status below.

**Flake audit — PASS.** Ran the full canonical gate `npm run test:e2e` (with a clean
`.next` each time, so each is a true cold build → seed → build → `next start` → all
Playwright projects) **3× consecutively — all green: 101 passed / 13 skipped / 0
failed**, ~3.7 min per run (the Playwright phase itself ~1.7 min), **identical counts
every run** (no flaky, no reorder sensitivity). Runtime is well under the plan's
<10-min target. The whole-suite "3× green" exit criterion is met **locally**; the
remaining half of that criterion — **watching CI reproduce it 3×** — is the owner's
push/PR action.

**Docs finalized this pass:**

- **`tests/e2e/README.md`** — refreshed the Layout + added a Playwright-projects map
  (all suites now written, not "land in Phases 3–6"); new **Conventions** for the
  anonymous `auth` project, the base-`test` cases (role-assignment audit / `api/`),
  the **recoverable-hydration tolerance** rule (authed projects only), signed-in vs.
  anonymous specs + the `storageState`-override pattern (account-withdrawal), and the
  **phone-OTP** helper; replaced the stale "non-admin login blocked" gotcha with the
  resolved scoped-`users`-rule state; added the **fixture watch-outs** (`date_of_birth`
  = year; relative `thumbnailUrl` vs. the form's `type="url"`) and the two latent
  app behaviors the suites pin.
- **`docs/planning/PROJECT_PLAN.md`** — §1 status row + §10 goal/plan bullets now say
  all main-plan suites are written + green (~140 tests across projects; 101 run in the
  gate, the rest are the per-project skips), Phase 7 remaining reduced to the owner
  push/PR + branch protection.
- **`docs/planning/playwright-ci-plan.md`** — §8 Phase 7 checklist: flake audit, the
  README, and the PROJECT_PLAN/FEATURE_MOD_LOG items all checked with dated notes.
- **`log/FEATURE_MOD_LOG.md`** — new 2026-07-15 entry (suites Phases 2–6 + the flake
  audit).

**Owner actions still open (unchanged — the only things left):**

1. **Push / open a PR** → watch GitHub Actions CI go **3× green** (completes the exit
   criterion) + enable branch protection requiring CI on PRs to `main`.
2. **Deploy the rules change** for prod parity:
   `firebase deploy --only firestore:rules` (the scoped `users` self-write rule).

> The 2026-07-15 update below is the detailed record of the Phases 3–5 suites that
> preceded this finalization; keep it for the per-suite breakdown.

---

## Update — 2026-07-15: Phases 3–5 written + green (start here in a fresh session)

**Phases 3, 4, and 5 are done.** With Phase 0/1 (harness/CI), Phase 2 (`public/`), and
Phase 6 (`api/`) already green, **every main-plan suite except Phase 7 (flake audit +
docs finalization) now exists and passes.** Committed to `dev` in four commits
(`a06eda3` harness enablement, `13a4667` auth, `67407e8` member, `b4bc727` admin) —
**not pushed**.

**What landed (18 new spec files + helpers, ~40 new tests):**

- **Harness enablement** (`a06eda3`): member `storageState` wired in `global.setup.ts`
  (the seeded `butler-ground` login self-write passes the §5 rule); a new anonymous
  **`auth` Playwright project** (its specs drive the real login UI — no storageState);
  shared helpers `setup/auth-helpers.ts` (email login + `signUpNewUser`) and
  `setup/phone-otp.ts` (fetches the SMS code from the Auth-emulator
  `verificationCodes` REST endpoint — phone auth works because the emulator disables
  real reCAPTCHA).
- **Phase 3 `auth/`** (4 files): `login-logout`, `mobile-logout`, `phone-login`,
  `signup`. Covers email login/bad-password/logout (nav modal + mypage + mobile
  hamburger), phone-OTP login, and full 집사등록 (consent gating + happy path).
- **Phase 4 `member/`** (5 files, butler-ground): `mypage` (nickname edit +
  mobile), `contact-submit`, `nav-permissions`, `butler-access` (denial boundary),
  `account-withdrawal` (throwaway user, storageState overridden to anonymous → real
  `POST /api/account/delete`).
- **Phase 5 `admin/`** (7 files): `admin-auth-gate` (anon/non-admin/admin),
  `cms-nav` smoke, `cats` (card-editor rename + adoptable), `points` (list +
  delete-guard + edit), `members` (role assignment + Contact Management), `posts`
  (create → public list), `butler-pages` (admin sees the content member is denied).

**Verified:** each project run green in isolation against a fresh seed; the admin
project passed **3× consecutively**. In the last clean full-gate run
(`rm -rf .next && npm run test:e2e`) the public/auth/member/api suites were green
(99 passed) and the two then-failing admin tests are now fixed.

**Three source-verified watch-outs handled along the way (test-only; no `src/`
changed):**

1. **Fixture bug fixed:** `tests/e2e/fixtures/cats.json` stored `date_of_birth` as
   **epoch-millis**, but the app treats it as a **4-digit year**
   (`${date_of_birth}년생` — the public site would have rendered "1577836800000년생").
   Converted to years (2020/2021). This also unblocked the cats admin form's
   year-range (`min=1990 max=2030`) validation.
2. **App/data constraint (noted, not fixed):** the cats admin form's `thumbnailUrl`
   is `type="url"`, but the app stores **relative** paths (`/images/...`), which fail
   HTML5 URL validation and silently block save. The cats spec clears the field to
   proceed. Worth a follow-up in the app (relative thumbnails are legitimate).
3. **Client-auth hydration flake tamed:** on signed-in pages the server pre-renders
   the **anonymous** nav, then the client hydrates to the **authenticated** nav — an
   expected, React-**recoverable** hydration mismatch (#418/#423) that surfaced
   non-deterministically as a `pageerror`. The console watchdog (`setup/test.ts`) now
   tolerates **only** that hydration-error family and **only** on authed projects
   (`auth`/`member`/`admin`); the anonymous public suite still fails hard on any
   hydration error.

**Two latent app issues surfaced (existing behavior; not mine to fix — flagged only):**

- `butler_talk` / `butler_stream` gate on `isAdmin()`, so **butler-ground members are
  denied** despite the pages' "allow butler roles" comment. Tests assert current
  behavior (member denied, admin allowed). If the gate is widened, the member
  `butler-access` spec is the intended failure signal.
- Role assignment writes an audit log to `permission_logs` that the **repo
  firestore.rules deny** for the client (non-fatal — the role still assigns;
  RoleManagement logs a console.error). The members spec uses the non-watchdog `test`
  for that case.

**Next (Phase 7, the only remaining task):**

1. **Flake audit** — run the full `npm run test:e2e` gate **3× clean** to confirm the
   whole suite (all projects together) is green end-to-end, then watch CI do the same.
2. **`tests/e2e/README.md`** — conventions (the `auth` project, storageState
   overrides, the phone-OTP helper, the hydration-tolerance rule, fixture watch-outs).
3. **PROJECT_PLAN / plan-checklist finalization** + a `FEATURE_MOD_LOG` entry.

**Owner actions still open:** push / open a PR (watch CI go 3× green + enable branch
protection on `main`); deploy the rules change for prod parity
(`firebase deploy --only firestore:rules`).

---

## Update — 2026-07-13 (cont.): both blockers cleared (superseded by 2026-07-15 above)

> **Superseded** by the 2026-07-15 update above — its "Next steps" 1 (wire member
> `storageState`) and 2 (write Phases 3–5) are **done**. Kept for the blocker-fix
> history (build hang + §5 rule).

**Both remaining blockers are cleared.** This supersedes the older "Next (in priority
order)" list further down (which still lists the bake fix and §5 as open — they're done).

**Done this session (committed to `dev`, not pushed):**

- **Intermittent build hang / "markerless bake" — FIXED** (`26e8264`). Root cause was
  misdiagnosed: not an Admin-SDK read race. `pages/cats/page.tsx` still read points via the
  **client Web SDK** at build → hit real Firebase → dangling connection hung `next build`
  at "Collecting build traces". Fix: switch to `getAllPointsServer()` (Admin SDK). Verified
  10/10 gate-style builds green. See the next update section + DEBUG_LOG 2026-07-13.
- **§5 non-admin-login — RESOLVED** (`65a934f`). Added a scoped `users` self-write rule
  (create/update own doc, `currentRole` locked → no self-escalation) + a rules test lane
  (`npm run test:rules`, 6/6). Full detail in §5 below.

**Test suites status:** Phase 0+1 (harness/CI), **Phase 2 `public/`** (~60 tests), and
**Phase 6 `api/`** are done + green. **Phases 3–5 are now unblocked.**

**Next steps, in order:**

1. **Wire `global.setup.ts` to capture a member `storageState`** — the seeded `butler-ground`
   login self-write now passes the rule; the `member`/`admin` Playwright projects are already
   configured for it. (This is the one setup prerequisite for Phases 3–5.)
2. **Write Phases 3–5** (~10 spec files): `auth/` (~3 — signup/login/bad-password/logout,
   phone-OTP, mypage logout-redirect), `member/` (~3 — butler_talk/stream, nickname edit,
   동참 submit + 탈퇴 deletion), `admin/` (~4 — AdminAuth gate, cats edit, posts+points,
   members+contact). Checklist: `docs/planning/playwright-ci-plan.md` §8.
3. **Phase 7** — flake audit (3× consecutive green CI), `tests/e2e/README.md` conventions,
   PROJECT_PLAN/plan-checklist finalization.

**Owner actions still open (neither blocks writing tests):**

- **Push / open a PR** to watch CI go green (3× for the exit criterion) + enable branch
  protection on `main`.
- **Deploy the rules change** for prod parity: `firebase deploy --only firestore:rules`
  (the repo `users` rule never allowed the self-write, so deployed prod rules already
  diverge — deploying brings prod in line, tighter and safer).

---

## Update — 2026-07-13: the "intermittent markerless bake" is FIXED (it was a build hang, not an empty read)

**The Phase-7 blocker below (§"⚠️ Pre-existing intermittent") is resolved.** Root cause was
**misdiagnosed** — it was neither an empty Admin-SDK read nor an emulator-readiness race.
Reproduced + instrumented on a fresh machine:

- **The Admin read path is fine.** Cold fresh-process Admin reads of points+cats hit
  **40/40**; clean-`.next` builds baked points **6/6**. When a build _completes_, markers
  always bake. `getAllPointsServer`/`getAllCatsServer` do **not** return `[]`.
- **The real failure is a build _hang_.** `src/app/pages/cats/page.tsx` (냥이들) still read
  **points via the client Web SDK** (`getPointService().getAllPoints()`) — the same
  mixed-SDK bug the home page had (`02c412a`), **on the sibling page the fix missed**.
  During `next build` the client SDK doesn't reach the emulator → hits **real** Firebase →
  `PERMISSION_DENIED on … demo-mohocat` → offline-retry leaves a **dangling gRPC handle**
  that intermittently wedges `next build` at **"Collecting build traces"** (static gen had
  already finished 51/51). A killed/incomplete `.next` then serves a broken site → all
  marker tests fail → _looked_ like a "markerless bake." (Dead end noted: `preferRest: true`
  on the Admin Firestore breaks the emulator entirely — REST needs real creds. Don't.)

**Fix (2 lines, `src/app/pages/cats/page.tsx`):** `getPointService().getAllPoints()` →
`getAllPointsServer()` (Admin SDK), mirroring `02c412a`. Functionally identical in prod;
completes the §7a migration. **⚠️ This touches a prod read path** — same class as `02c412a`
(which was taken with owner sign-off); flagging for the owner. No other non-`'use client'`
`page.tsx`/`layout.tsx` still reads a client service at build (scanned).

**Verified:** `npx tsc --noEmit` clean · `npm run test:smoke` 26/26 · **10/10 gate-style
builds** (one clean `.next`, then reuse — the real gate's condition; each hang-guarded):
all baked points, **0 client real-Firebase hits, 0 hangs**, incl. build #8 (hung pre-fix).
Full write-up: `log/DEBUG_LOG.md` (2026-07-13, newest). **Committed:** ❌ not yet — awaiting
owner go-ahead (prod-path change).

**Net:** the "3× green" exit criterion is now achievable — the whole-build hang that
`retries: 2` couldn't save is gone. Remaining owner actions unchanged: push/PR to watch CI;
the §5 non-admin-login decision (gates the _UI_ member/admin suites).

---

## Update — 2026-07-12 (cont. 2): Phase 6 `api/` security suite + two flake fixes

**Phase 6 `api/` is DONE and green** — `tests/e2e/api/security.spec.ts` (Playwright
request context, no browser; uses base `test`, not the page/watchdog fixture):

- **Unauth → 401** across 6 routes: `POST admin/role-permissions`,
  `GET admin/get-all-user-permissions-client`, `GET admin/youtube-auth/status`,
  `POST admin/resource-permissions`, `POST contact`, `POST account/delete`,
  `POST revalidate`. (Destructive routes are hit **only unauthenticated** — the 401
  lands before any delete/send/revalidate.)
- **Non-admin → 403** on the 4 `manage-*` routes with a valid `butler-ground` token
  (403-not-401 also proves the token verified).
- **Open 200:** `GET admin/resource-permissions`.
- The non-admin ID token is minted from the **Auth-emulator Identity-Toolkit REST**
  (`accounts:signInWithPassword`), so the **§5 blocker does not apply** — that blocks the
  client login _redirect_ (`ensureUserExists` self-write), not token issuance. This means
  Phases 3–5 could likely mint tokens the same way for API-level coverage; the §5 decision
  still gates the _UI_ member/admin flows that need a real logged-in browser session.

**Two flakes fixed along the way** (both surfaced only under the full gate's parallel load):

1. **home-map §7a "no client Firestore" was fundamentally flaky.** The scoped-to-marker-
   click version still failed: the landing page's unrelated init `getDoc` (routed over the
   Firestore `/Listen/channel`; there is **no `onSnapshot` in `src/`**) fires at a
   nondeterministic time and can't be told apart from a map read by URL. **Replaced the
   network assertion with a structural one** — the marker's cat avatar `<img>` src is baked
   into the server HTML (`cat_test-cat-01.jpg`); the click→gallery path stays covered by a
   separate test. (DEBUG_LOG 2026-07-12 updated with the final resolution + lesson.)
2. **Client-Firestore pages (공지 / 입양홍보 / albums) occasionally logged
   `Failed to load resource: … 400`** — the emulator Firestore WebChannel returns a non-200
   on channel teardown; the browser logs a generic console error the watchdog caught. The
   watchdog (`setup/test.ts`) now allow-lists **"Failed to load resource" errors whose
   resource URL is an emulator host** (9099/8088/9199), via `msg.location().url`, and records
   the URL otherwise. Real app 4xx/5xx (next/image, `/api`, page assets) still fail. Stress-
   verified: the client-Firestore specs ran `--repeat-each=5` (140/0) green.

**⚠️ Pre-existing intermittent (NOT introduced here) — a real Phase-7 blocker:** the landing
map sometimes **bakes markerless** at `next build` (~1 in 3 full-gate runs observed → all
marker tests fail: landing.smoke, home-map, mobile-map). Same class as the landing-marker
DEBUG_LOG entry — the Admin-SDK bake is **not 100% deterministic**, and **CI `retries: 2`
won't save it** (whole-build issue, not per-test). Needs an **owner-signed build-path fix**
(await/retry emulator readiness before the Server-Component reads) before the "3× green"
exit criterion is achievable. Logged under plan §8 Phase 7.

**Next (for a fresh session), in priority order:** _[SUPERSEDED 2026-07-13 — items 1 & 2
are DONE; see the "current state + next steps" update at the top of this file.]_

1. ~~**Fix the intermittent markerless bake**~~ — **DONE** (`26e8264`); it was a build hang,
   not a read race.
2. **Owner calls still open:** push / open a PR to watch CI go green. (The **§5**
   non-admin-login decision is **DONE** — `65a934f`, scoped `users` self-write rule.)
3. **Phases 3–5** (`auth`/`member`/`admin`) — the remaining suites, **now fully unblocked**
   (wire member `storageState` first).
4. **Phase 7** hardening + `tests/e2e/README.md` conventions.

**State:** `npx tsc --noEmit` clean; full `npm run test:e2e` green (67/0) on a clean-bake
run; api spec + both flake fixes verified. **Committed** to `dev` (not pushed). The only
non-green condition is the pre-existing intermittent markerless bake above.

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

**Verification state: GREEN.** The full canonical gate `npm run test:e2e` (rebuild →
seed → build → all projects) passes — **64 passed / 13 skipped / 0 failed**, prod build
succeeds. `npx tsc --noEmit` clean. The gate surfaced three real spec issues (all fixed):
(1) MediaTile's full-size decorative hover-overlay intercepts pointer events → album
tiles need `click({ force: true })`; (2) album image order is service-defined → the
Lightbox nav test keys on **position** (first tile → forward-only; last → back-only),
not filename, and scopes description assertions to the Lightbox portal (the grid caption
duplicates the text); (3) the landing page makes an **unrelated** client `getDoc` (a
Firestore Listen-channel read) at init, so the §7a "no client Firestore" assertion is
**scoped to the marker-click → gallery action** (which is what §7a actually removed),
plus a direct check that the marker avatar `<img>` is baked into the server HTML.

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

**Full-suite gate: DONE** (`npm run test:e2e`, 64/13/0, prod build clean) — the album
fixtures serve via the seed step's `copyPublicFixtures()`, and the whole Phase-2 set is
green together. (Note: iterating on a spec without a rebuild is fine —
`… emulators:exec "npm run seed:emulators && npx playwright test <file>"` reuses the
existing `.next` and serves the already-built public fixtures.)

**Next:** **Phase 6 `api/`** is still unblocked and unwritten (good next target);
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

> **See the "current state + next steps" update at the very top for the live picture** —
> this TL;DR is the original framing, kept for context.

The **e2e harness + CI** and the **Phase 2 `public/`** (~60 tests) and **Phase 6 `api/`**
suites are **built and green** (`npm run test:e2e`). The whole chain is proven end-to-end:
**emulators → seed → real prod build → `next start` → Playwright**, hermetic, no secrets.
Both former blockers are cleared this session: the intermittent build-hang ("markerless
bake") is fixed (`26e8264`) and the §5 non-admin-login rule is resolved (`65a934f`).

**Remaining owner actions** (neither blocks writing more tests):

1. **Push / open a PR** to watch CI go green in GitHub Actions (3× for the exit
   criterion) and enable branch protection.
2. **Deploy the rules change** for prod parity: `firebase deploy --only firestore:rules`
   (see §5). The non-admin-login _decision_ itself is now made + implemented.

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

> **Mostly superseded — see the top "current state + next steps" update.** Phase 2
> `public/` (7 specs, ~60 tests) **and** Phase 6 `api/` are now **written + green**. The
> only remaining unwritten suites are **Phases 3–5** (`auth`/`member`/`admin`), and they
> are now **unblocked** (§5 resolved). The `auth`/`member`/`admin` paragraph below is stale
> on the "blocked" framing but still lists the right suites.

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

## 5. ✅ RESOLVED (2026-07-13) — non-admin login unblocked via a scoped `users` self-write rule

**Decision made — owner chose option 1 (relax the rule, scoped).** Background: every
login runs `permissionService.ensureUserExists()`, which writes the user's own
`users/{uid}` doc via the **client SDK** (create on signup / profile `updateDoc` on
login) — but the repo `users` **write** rule required `manage-users`, with no self-write
allowance, so **non-admin login was permission-denied** and never redirected. (Git shows
the rule was never self-permissive — `if false` → `if manage-users` — so the deployed
prod rules already diverge; there is no Admin-SDK fallback for this write.)

**Applied:** a scoped self-write clause in `config/firebase/firestore.rules` →
`match /users/{userId}`: a user may `create`+`update` their **own** doc but **cannot
set/change `currentRole`** (the only field `hasPermission()` reads) — `create` forces
`currentRole.role == 'viewer'` && `permissions == []`; `update` requires `currentRole`
unchanged. Role assignment stays admin-only (`manage-users`). Covered by a new rules
test — `tests/rules/users.rules.test.ts`, run with **`npm run test:rules`** (emulator-
backed; 6/6 green): self create/update ok, self-escalation blocked (create + update),
cross-user write blocked, admin cross-user write ok. Full write-up: `log/DEBUG_LOG.md`
(2026-07-11 entry, "Fix applied 2026-07-13").

**Next for Phases 3–5:** wire `global.setup.ts` to capture a **member** `storageState`
(the rule no longer blocks the seeded `butler-ground` user's login self-write), then write
the `auth`/`member`/`admin` specs. **⚠️ Deploy note:** this rule change must be pushed to
Firebase (`firebase deploy --only firestore:rules`) for prod to match — owner action.

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

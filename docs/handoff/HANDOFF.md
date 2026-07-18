# 산냥이집냥이 — Engineering Hand-off (living / continuously updated)

**Last updated:** 2026-07-19 · **Branch:** `dev` · **`main`:** promoted through PR #7
(2026-07-16)

> **How this doc works.** This is the **single, continuously-updated** current-state
> hand-off — read it first. It is edited **in place** (present tense = how things are
> now), not appended to. It **supersedes the discrete `handoff-NN` series** as the
> entry point; those numbered files (…26, 27, 28) stay as **frozen history** for the
> detail behind a given session. The **testing** workstream keeps its own closed
> narrative under `docs/handoff/testing/`.
>
> When you finish a chunk of work, update the relevant section here in place and add a
> one-line note to the **Changelog** at the bottom.

**Where the deep detail lives:** [`PROJECT_PLAN.md`](../planning/PROJECT_PLAN.md)
(cross-workstream status) · [`log/FEATURE_MOD_LOG.md`](../../log/FEATURE_MOD_LOG.md) +
[`log/DEBUG_LOG.md`](../../log/DEBUG_LOG.md) · the frozen
[`handoff-28`](./2026-07-11-handoff-28.md) / [`-27`](./2026-07-10-handoff-27.md) ·
the testing hand-off
[`testing/2026-07-12-e2e-harness-handoff.md`](./testing/2026-07-12-e2e-harness-handoff.md).

---

## Current state (TL;DR)

- **Production `main` now carries the whole `dev` bundle** — merged via **PR #7**
  (`dev → main`, merge commit `65d2020`, 2026-07-16): the landing + admin redesign,
  the adoption / 입양홍보 feature, compliance (privacy/terms/consent/탈퇴), the mobile
  map work, the Seoul storage migration, and the full e2e test suite. This was the
  first `dev → main` promotion in a long while (~192 commits).
- **Testing & CI workstream is CLOSED** (see below) — main is now CI-gated.
- **Branch model in effect:** `dev` (staging / Vercel Preview) promotes to `main`
  (production / Vercel) via a **merge commit**. After PR #7, `dev` is an ancestor of
  `main` and `main` is **+1 merge commit ahead**; fast-forward `dev` to `main`
  (`git checkout dev && git merge --ff-only main && git push`) to fully sync.
- **Active track: complexity retirement — IN EXECUTION.** P0 (`6454d80`), P1
  (`431c69f`), P2 (`fdba4ee`) **committed & DONE**. **P3 (Family A) is DONE — all
  gates green** (full e2e **116 passed / 13 skipped / 0 failed**; tsc / smoke 29-29 /
  unit 25-25) — **bundle UNCOMMITTED, awaiting commit go-ahead**, then **P4**
  (editors: `CatSelectorModal` swap + toolkit skeleton). Four content forms now
  2,135→859 lines on shared `src/components/forms/` primitives; P3 also **fixed
  집사톡's latently-broken image upload** (`log/DEBUG_LOG.md` 2026-07-19).
- **Parked track:** **multi-tenant / 2nd mountain** — PARKED at a clean seam:
  decision framework drafted (Q1–Q8 open), its one §9-independent prerequisite
  (**Tier 1 write migration**) **done & committed** (`6f288d7`); resume = answer Q1
  (thinking work, parallelizable with the refactor).
- **Tree:** P0 test bundle staged/uncommitted as of this update — see _Uncommitted_
  below.

---

## Workstreams — current status

### Testing & CI — ✅ COMPLETE (merged to `main`)

Emulator-backed Playwright e2e harness + GitHub Actions CI, and the full main-plan
suite: `public/`, `auth/`, `member/`, `admin/`, `api/` (~140 tests). Flake audit green
(local full-gate 3× consecutive: 101 passed / 13 skipped / 0 failed; **CI** green on
PR #7 and `dev` pushes). **Branch protection enforces the `e2e` required status check
on `main`** (classic protection + the `protect-main` ruleset: `deletion`,
`non_fast_forward`, `pull_request`; review count 0; linear-history removed so
promotions can use a merge commit). Full narrative + run instructions:
[`testing/2026-07-12-e2e-harness-handoff.md`](./testing/2026-07-12-e2e-harness-handoff.md).

### Compliance / legal — ✅ SHIPPED & LIVE

개인정보처리방침 (`/pages/privacy`) + 이용약관 (`/pages/terms`), footer links, email-signup
consent gating, 국외 이전 disclosure (PIPA Art. 28-8, disclosure-based not consent), and a
member self-service **탈퇴/deletion** flow (`POST /api/account/delete`, Admin-SDK
hard-delete). Detail: [`handoff-28`](./2026-07-11-handoff-28.md) §1–2 +
[`compliance-plan.md`](../compliance/compliance-plan.md). **⚠️ Draft copy — a
professional/legal review is still owed before scaling membership.**

### Public / admin redesign, adoption, mobile, storage — ✅ LIVE (via PR #7)

Landing redesign (Leaflet map), shared `<Button>`/`Modal` primitives + brand tokens,
admin CMS re-skin + Korean, 급식소 CMS, adoptable-cat + 입양홍보 features, inline
`[img]`/`[video]` link tokens, mobile map (portrait + rotate-notice + clustering
toggle), Lightbox pinch-to-zoom, Firebase Storage → Seoul bucket. Per-change detail:
[`FEATURE_MOD_LOG.md`](../../log/FEATURE_MOD_LOG.md) + PROJECT_PLAN.

### Multi-tenant / second mountain — ⏸️ PARKED (framework drafted, Tier 1 done)

**Read-first to resume:**
[`multi-tenant-architecture-decision-20260718.md`](../planning/multi-tenant-architecture-decision-20260718.md)
— the full decision framework (verified current state → custody-vs-management gating
question → deployment/data axes → open questions **Q1–Q8** → blocked task sequencing).
PROJECT_PLAN **§9** links it and is the tracker entry.

**How this got here (2026-07-18 session):** started as "replace Firebase with Supabase
to escape vendor lock-in?" → **set aside** (framework §0: zero `onSnapshot` listeners
make an eventual exit easy; $25/mo/project is a per-tenant floor; nothing about a 2nd
mountain is vendor-blocked). Owner requirements locked along the way: **central
auth/user management** (2nd-mountain owner must not set up Kakao/SMS), **localized
content management**, **central analytics with a per-mountain identifier**; drop-down
mountain selection, possibly subdomains (`geyangsan.`/`manisan.mohocats.org`) — **not**
fully thought through yet (framework §2 + Q2/Q7).

**Done before parking — Tier 1 write migration** (commit `6f288d7`, the framework's §6
prerequisite; detail in `log/FEATURE_MOD_LOG.md` + `log/DEBUG_LOG.md` 2026-07-18):
role assignment → `POST /api/admin/assign-role` (Admin SDK, `manage-users`-gated),
role write + `permission_logs` **audit entry in one transaction** — the audit trail
(silently lost since forever: rule-denied client write, swallowed catch) is restored.
Client role-write methods deleted; `users` admin write clause removed from the rules
(owner self-provision clauses kept). Verified: tsc + smoke + e2e `members.spec.ts` 4/4.

**To resume:** answer the framework's §9 questions — **Q1 (custody vs management-only)
gates everything**; then Q2–Q4 pick the deployment/data axes. Everything else in its
§10 sequencing is blocked on those answers. Independent-of-decision items live in its
§8 (storage _paths_ not URLs; retire `src/lib/firebase.ts`; `next/image` prod re-test
on the media surfaces; the §9 PROJECT_PLAN gaps).

### Complexity retirement (refactor) — 🚧 IN EXECUTION — P0–P2 ✅ committed; P3 ✅ done (uncommitted); next P4

Source-verified deep dive + execution plan:
[`complexity-retirement-assessment-20260716.md`](../planning/complexity-retirement-assessment-20260716.md).

Started as a "should we move Next.js/React → HTMX?" feasibility question; answer is **no**
— the complexity is duplication + local-state sprawl _inside client components_, not
framework complexity, and HTMX would land worst on the parts it can't express (client-SDK
auth, Leaflet map, the admin editors). Retire it **in place** instead.

**Reducible surface ≈ 2,800–3,400 LOC across 6 files**, with no framework migration, no
auth rewrite, no deploy-stack change:

- **Target A — admin media editors** (`tag-images` 1,860 + `tag-videos` 2,570 LOC): they
  are **copy-renamed twins that have drifted** (identically-named handlers with structurally
  identical bodies differing only by an `image`→`video` rename — which is why a line-diff
  sees only 3 shared lines). 34 and 41 `useState` each. _(2026-07-18 deep-dive: the
  twin-ness holds for the **read side** only — the write paths diverge structurally
  (Firestore service calls vs YouTube API orchestration), so converge via a
  **toolkit** of shared hooks + presentational components, not the originally-planned
  generic `MediaTaggingEditor<T>`; assessment §1.3a.)_
- **Target B — content forms** (4 files, ~2,133 LOC): two literal-duplicate families —
  Post+ButlerTalk (250 identical lines) and Announcement+Adoption (193). ⚠️
  **`react-hook-form` is a declared dependency used in zero files**; all forms are
  hand-rolled `useState`.
- ⚠️ Both admin editors **hand-roll cat-selection** instead of reusing the existing shared
  `CatSelectorModal` (which the forms already use) — a reuse win available on its own.

**Decisions re-locked (2026-07-18 owner deep-dive — supersede 2026-07-16):** both
targets, **B first** (survives) · **`react-hook-form` DROPPED** — not adopted, the
unused dep is removed in P2 (reverses 2026-07-16) · Target A converges via the
**toolkit shape** (assessment §1.3a), not `MediaTaggingEditor<T>` · behavior-preserving
stays, with one accepted intentional exception: the P4 `CatSelectorModal` swap moves
the editors to **commit-on-done** tag selection (admin `alert()/confirm()` → shared
`ui/Modal` remains a separate P6 follow-up). Plan is 7 gated phases (**P0**–P6) with a
~30-item task list; every phase gates on `tsc --noEmit` + `test:smoke` + browser
verification. **Execution starts only on explicit go-ahead — at P0.**

**Reviewed 2026-07-18 — claims verified, plan amended.** Every quantitative claim
re-checked against source: all exact (duplication is if anything **understated** —
380/346 shared lines in the two form families vs 250/193 stated; 989 common lines
between the "3-identical-lines" editor twins). Amendments: new **P0 characterization-test
phase** (the original verification bar cited the Playwright `admin/` suite, but **no e2e
spec touches the two editors** and only `NewAnnouncementForm` has a text-only create
test — the parity net must be written first, against unrefactored code); YouTube-API
surfaces named as manual-parity-only (P5.4); signed-URL+YouTube strategy lift
re-sequenced P1→P3.0 (point of use); P6.1 scope note (**the four content forms fire
`alert()` too** — converting them is public-facing); `docs/codebase/admin.md` →
`admin-platform.md`; stale `P4`→`P6.1` cross-refs; `useEffect` 3→2.

**✅ Owner deep-dive DONE (2026-07-18, later session)** — a side-by-side source
walkthrough of `tag-images`/`tag-videos` + `CatSelectorModal` + the four forms'
upload paths. Verdicts on the 4 queued items (full detail in the assessment):

1. **Worth it, do it now** — with Target A's retired-LOC projection revised down:
   the write paths (~550+ LOC of YouTube orchestration) are irreducible, so realistic
   total is **~2,100–2,900** (was 2,800–3,400).
2. **`MediaTaggingEditor<T>` rejected** — every mutation diverges structurally (one
   Firestore service call vs multi-step YouTube API orchestration with propagation
   waits), so the generic would be a props-explosion shell. Replaced by a **toolkit**:
   `useMediaListController<T>` / `useDateAutoParse<T>` hooks + presentational set
   (`MediaStatsCards`, `MediaFilterBar`, `BatchActionsPanel`, `MediaGrid`,
   `PaginationBar`, `CatTagField`); pages stay page-owned (assessment §1.3a).
3. **Decisions re-locked:** B-first survives; **`react-hook-form` dropped** (dep
   removed in P2 — the forms' complexity is upload management, not field state);
   behavior-preserving survives with the `CatSelectorModal` **commit-on-done** change
   accepted as intentional. Factual fix: assessment §2.2 — **video upload is YouTube
   in all four forms**; the strategy axis is images only.
4. **Priority:** this track executes next; multi-tenant stays parked (Q1 is thinking
   work, parallelizable).

**✅ P0 DONE (2026-07-19, on explicit go-ahead).** The characterization net exists and
is green against unrefactored code: Family B create-flows now include an image upload
(`admin/posts.spec.ts` — announcement upgraded, 입양홍보 new) and both editors have
characterization specs (`admin/tag-images.spec.ts`, `admin/tag-videos.spec.ts` —
YouTube-orchestrated writes excluded per P5.4; the video editor's automated net is
load/form/local-tagging/title-parse + the Firestore-only bulk 자동 날짜 인식).
Supporting infra: `media.json` +2 images/+1 video (auto-parse targets),
`albums.spec.ts` adjusted, one scoped console-watchdog allowance for the
credential-less `/api/manage-playlists` 500 on tag-videos mount. Full-gate baseline
**112 passed / 13 skipped / 0 failed** + tsc + smoke green. Detail + pinned-behavior
notes: assessment §8 P0 (execution notes).

**✅ P1 DONE (2026-07-19).** `src/components/forms/` now holds `MediaUploadField`
(presentational hybrid file+URL section; `kind` selects the shared image/video label
set) and `uploadStrategies.ts` (`uploadImagesToStorage` verbatim from
NewAnnouncementForm with the path prefix parameterized; `uploadVideo(s)ToYouTube`
with optional Family-A fields — its stricter failure handling reconciles at P3).
Unit tests (6) + smoke structural checks; vitest gained the `@`→`src` alias.
**No form imports these yet** — zero behavior change; gates green (tsc, unit,
smoke 29/29). Detail: assessment §8 P1.

**✅ P2 DONE (2026-07-19).** Family B migrated onto `useSimpleContentForm` +
`MediaUploadField` (899→248 lines; `react-hook-form` uninstalled). Full e2e
**114/13/0** — the P0.1 create-flow specs (incl. image upload → public surface)
passed against the migrated forms, and the net gained whitespace-validation specs
for both. Detail: assessment §8 P2.

**✅ P3 DONE (2026-07-19) — bundle UNCOMMITTED, awaiting commit go-ahead.** What
exists in the working tree (detail: assessment §8 P3):

- `useRichContentForm` + `uploadImagesWithSignedUrls` (canonical
  `{signedUrl, publicUrl}` + PUT ok-check — **fixes 집사톡's broken image upload**,
  `DEBUG_LOG` 2026-07-19) + the `!result.videoUrl` guard reconciled into the shared
  YouTube strategy; `NewPostForm` 697→363 and `NewButlerTalkForm` 539→248 migrated;
  +5 unit tests (25 total); `tests/e2e/admin/butler-create.spec.ts` (Family A
  text-only creates + `CatSelectorModal` wiring — media paths are manual-parity by
  design, see the spec header).
- Gates all green (2026-07-19 re-run): full e2e **116 passed / 13 skipped / 0
  failed** (first run's single failure was the new spec's `/완료/` locator matching
  both the modal's `완료 (n개 선택)` and the page's `작성 완료` submit; fixed to
  `/완료 \(/`; the earlier "expect 117" was an off-by-one — the new spec adds 2
  tests to the 114 P2 baseline). tsc 0 / smoke 29-29 / unit 25-25.

**Next:** commit the P3 bundle **on explicit go-ahead**, then proceed to **P4**
(editors: `CatSelectorModal` swap — commit-on-done accepted — + toolkit skeleton;
P4.5 interface-review checkpoint before P5). ⚠️ Before the next `dev → main`
promotion, the Family A media paths (YouTube upload, signed-URL images) owe the
**scripted manual pass** on Preview.

---

## Open threads / owner-owed

- ⚠️ **`firebase deploy --only firestore:rules`** — the one recurring pending **prod**
  action. The repo `config/firebase/firestore.rules` is **ahead of deployed prod** by
  accumulated changes (the 급식소 CMS rules from handoff-25/26, the testing
  workstream's scoped `users` self-write rule, **and the Tier 1 `users`
  admin-write-clause removal, 2026-07-18**). **One deploy syncs all of them.** Until
  then prod rules lag the repo (harmless for Tier 1 — the app no longer uses the
  removed clause). Post-deploy check: assign a role on `/admin/members` → confirm a
  `permission_logs` doc appears.
- **탈퇴 flow live click-through** with a **throwaway** account — it irreversibly
  deletes, so it hasn't been end-to-end clicked in prod yet.
- **Compliance carry-overs** (deferred, accepted — reopen before scaling membership):
  professional/legal review; phone-login-as-signup + Kakao social-signup consent;
  security audit vs the PIPA safety-measures standard; Kakao scope verification.
- **Branch-workflow decision (undecided):** keep the `dev`-promotion model (promote
  with **merge commits**, as PR #7 did — no drift) **or** move to **GitHub Flow**
  (delete `dev`, short-lived branches off `main`, squash-merge). Both viable;
  merge-commit fits promotion, squash fits GitHub Flow.
- **Deferred e2e Phase 8** (not required for "done"): Vercel Preview smoke, WebKit/iOS,
  visual-regression, Lighthouse/perf, YouTube-tagging flows (`playwright-ci-plan.md` §8).
- **Older carry-over:** album-nav un-greying action.

---

## Uncommitted (as of this update)

**The P3 bundle** (P0 = `6454d80`, P1 = `431c69f`, P2 = `fdba4ee` committed).
Awaiting the gate re-run + commit go-ahead:

- `src/components/forms/useRichContentForm.ts` (new — shared Family A flow)
- `src/components/forms/uploadStrategies.ts` (+`uploadImagesWithSignedUrls`,
  +videoUrl guard)
- `src/components/NewPostForm.tsx` + `NewButlerTalkForm.tsx` (migrated;
  1,236→611 lines)
- `tests/e2e/admin/butler-create.spec.ts` (new — Family A create specs; locator
  fix applied post-run)
- `tests/unit/uploadStrategies.test.ts` (+5 signed-URL/guard tests)
- `log/DEBUG_LOG.md` (집사톡 broken-upload entry)
- `docs/handoff/HANDOFF.md` + `docs/planning/complexity-retirement-assessment-20260716.md`
  (this update)

---

## Changelog (living-doc audit trail — newest first)

- **2026-07-19 (latest)** — **Complexity retirement P3 DONE**: full-gate re-run
  green — e2e **116/13/0** (locator fix held; "expect 117" was an off-by-one — the
  Family A spec adds 2 tests to the 114 P2 baseline), tsc/smoke/unit green.
  Assessment §8 P3.4/P3.5 flipped ✅. Bundle **uncommitted, awaiting commit
  go-ahead**; next: P4.
- **2026-07-19** — **Complexity retirement P3 code+specs done, gate re-run
  pending** (session ended mid-gate): Family A migrated onto `useRichContentForm` +
  the lifted signed-URL strategy (집사톡's broken image upload fixed — `DEBUG_LOG`);
  Family A create specs added to the net (text-only by design). First full run
  115/1 — the 1 failure a spec locator ambiguity, fixed in-tree. Bundle
  **uncommitted**; resume = re-run `test:e2e`, flip P3.4/P3.5, commit on go-ahead,
  then P4.
- **2026-07-19** — **Complexity retirement P2 DONE**: Family B migrated
  onto `useSimpleContentForm` + `MediaUploadField` (공지사항 488→153, 입양홍보
  411→95; −651 lines), `react-hook-form` uninstalled, +2 whitespace-validation
  specs. Full e2e **114/13/0** against the migrated forms. P3 scouting: butler-talk
  signed-URL upload latently broken (wrong destructured keys) — fix lands with the
  P3 convergence. Next: P3.
- **2026-07-19** — **Complexity retirement P1 DONE**: `MediaUploadField` +
  injectable upload strategies landed under `src/components/forms/` (direct-storage
  image strategy verbatim-B, shared YouTube upload with optional Family-A fields —
  failure-handling reconciliation deferred to P3), unit (6) + smoke coverage, vitest
  `@` alias. No form migrated; gates green. Next: P2 (migrate Announcement +
  Adoption, drop `react-hook-form`).
- **2026-07-19** — **Complexity retirement P0 DONE** (on explicit
  go-ahead): characterization net written against unrefactored code — Family B
  create-flow specs incl. image upload, editor specs for `tag-images`/`tag-videos`
  (YouTube surfaces excluded), fixture + watchdog infra. Full e2e baseline **112
  passed / 13 skipped / 0 failed**; tsc + smoke green. Assessment §8 P0 checked off
  with execution notes (pinned: `batchUpdateTags` keeps selection; commit-path-only
  cat-selection assertions so P4's commit-on-done lands without net rewrite).
  Next: P1.
- **2026-07-18** — **Owner deep-dive DONE** (complexity retirement): walked
  `tag-images`/`tag-videos` side-by-side — the write paths are **not** twins (Firestore
  service calls vs YouTube API orchestration), so the generic `MediaTaggingEditor<T>`
  was **replaced by a toolkit** of shared hooks + presentational components (§1.3a);
  **`react-hook-form` dropped** (dep removed in P2; §2.2 corrected — video upload is
  YouTube in all four forms, strategy axis is images only); `CatSelectorModal`
  **commit-on-done** accepted as intentional; retired-LOC revised to **~2,100–2,900**;
  priority: this track next, multi-tenant stays parked. Assessment §7 re-locked +
  plan/tasks reworded (P1–P5). **Execution awaits the explicit P0 go-ahead.**
- **2026-07-18** — Queued the **owner deep-dive into the complexity-retirement
  decision substance** as its own track (4 items: worth-it/timing, `MediaTaggingEditor<T>`
  shape, re-examine the locked decisions, priority) — execution gate moved behind it.
  TL;DR now routes to **two resumable tracks** (multi-tenant Q1, or the complexity
  deep-dive).
- **2026-07-18 (later)** — Added the **multi-tenant / second mountain** workstream and
  **parked it**: decision framework drafted
  (`multi-tenant-architecture-decision-20260718.md`, Q1–Q8 open), Tier 1 write
  migration **done & committed** (`6f288d7` — role writes → Admin-SDK transactional
  route, audit log restored, `users` admin write clause removed). Updated the rules
  deploy bullet + the Uncommitted list (PROJECT_PLAN rode along with `6f288d7`).
  Then **reviewed the complexity-retirement assessment** (side task): all quantitative
  claims verified exact against source; amendments applied — new **P0
  characterization-test phase** (no e2e touches the editors; the parity net must
  pre-exist the refactor), YouTube manual-parity constraint (P5.4), P1→P3.0
  strategy-lift re-sequencing, P6.1 forms-alert scope note, plus
  filename/cross-ref/`useEffect` fixes. Detail in the workstream section above + the
  assessment's own review note.
- **2026-07-18** — Added the **complexity retirement (refactor)** workstream (📋 planned,
  not started) + the `PROJECT_PLAN` §7 entry. Answered the "Next.js/React → HTMX?"
  feasibility question (**no** — complexity is in the client components, not the
  framework) and replaced it with an in-place plan over ~2,800–3,400 LOC across 6 files;
  decisions locked, 6 gated phases, ~27 tasks. _Doc-housekeeping note: the assessment
  file existed untracked from a 2026-07-16 session and was **overwritten** by the current
  rewrite before being read; the prior draft is unrecoverable (untracked, no editor
  history/snapshot, no surviving transcript). Today's version is source-verified against
  the code on `dev`._
- **2026-07-16** — Created this living hand-off, consolidating `handoff-28`'s
  still-current state (compliance shipped, 탈퇴 flow, mypage logout fix, map re-fit)
  with the **testing-workstream closure** and the **PR #7 `dev → main` promotion** +
  branch protection. Supersedes the discrete `handoff-NN` series as the read-first
  entry point.

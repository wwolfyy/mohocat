# Work registry

> ⚠️ **Generated file — do not edit.** Regenerate with `node work_tracking/scripts/build.js`.
>
> The source of truth is [`registry.ndjson`](./registry.ndjson); this is the current
> revision of every record, rendered for humans and pull-request review. To change
> anything here, run `checkout.js`, edit `work.json`, then `checkin.js`. See
> [SCHEMA.md](./SCHEMA.md).

## Summary

| type | open | in-progress | deferred | done | abandoned | total |
| --- | --- | --- | --- | --- | --- | --- |
| task | 37 | 7 | 10 | 184 | 0 | **238** |
| bug | 1 | 0 | 0 | 52 | 0 | **53** |
| change | 0 | 0 | 0 | 93 | 0 | **93** |
| decision | 0 | 0 | 1 | 52 | 8 | **61** |
| question | 7 | 0 | 0 | 0 | 0 | **7** |
| **total** | **45** | **7** | **11** | **381** | **8** | **452** |

## Open work

| id | type | status | outcome | plan | title | detail |
| --- | --- | --- | --- | --- | --- | --- |
| R-0140 | task | open | — | — | `view-analytics` is enforced by the rules and held by nobody | [detail](./records/R-0140.md) |
| R-0142 | task | open | — | — | Two live login pages, and the one members get bounced to has no 집사등록 and no tests | [detail](./records/R-0142.md) |
| R-0144 | question | open | — | — | Should the about page render `sections`? | [detail](./records/R-0144.md) |
| R-0165 | task | open | — | §4 | Performance on mobile networks — image sizes, above-the-fold, the thumbnail preloader's eagerness on cellular | [detail](./records/R-0165.md) |
| R-0166 | task | in-progress | — | §4 | Sign-in-gated surfaces at mobile widths: butler*talk, butler_stream, mypage. *(mypage + | [detail](./records/R-0166.md) |
| R-0168 | task | in-progress | — | §5 | Visual/UX consistency — Core done 2026-06-30; folds into the new cross-cutting | [detail](./records/R-0168.md) |
| R-0174 | task | in-progress | — | §5 | Unified branded design + admin Korean — IN PROGRESS (2026-06-30, handoffs 17–18). | [detail](./records/R-0174.md) |
| R-0176 | task | open | — | §6 | Decide the mobile-supported admin task set vs the desktop-only heavy tasks | [detail](./records/R-0176.md) |
| R-0177 | task | open | — | §6 | Admin nav on mobile — the top nav needs a responsive pattern (drawer/hamburger) | [detail](./records/R-0177.md) |
| R-0178 | task | open | — | §6 | Tables → cards — list views reflow to stacked cards or scrollable tables on narrow screens | [detail](./records/R-0178.md) |
| R-0179 | task | open | — | §6 | Batch-tagging UIs (tag-images / tag-videos) — the grid + multi-select + CatSelectorModal flow on touch; or explicitly… | [detail](./records/R-0179.md) |
| R-0180 | task | open | — | §6 | Forms on mobile — cat add/edit, announcement create, about-content editor: input sizing and modal fit | [detail](./records/R-0180.md) |
| R-0181 | task | open | — | §6 | Inline-style layout makes responsive work harder — coordinate with §5's convention decision first | [detail](./records/R-0181.md) |
| R-0189 | task | open | — | §7 | 📄 NEW workstream — per-page admin button spec sheets; the first, tag-videos, has shipped | [detail](./records/R-0189.md) |
| R-0195 | task | open | — | §7 | Error handling — read paths swallow errors into []/null (silent degradation); align with the fail-loud convention | [detail](./records/R-0195.md) |
| R-0196 | task | open | — | §7 | Structured logging — replace ad-hoc `console.*` with per-module loggers, and never log secrets | [detail](./records/R-0196.md) |
| R-0202 | task | open | — | §7 | Request validation — no zod/schema at API boundaries. | [detail](./records/R-0202.md) |
| R-0203 | task | open | — | §7 | Upload-on-edit for posts (shared media-upload util) | [detail](./records/R-0203.md) |
| R-0208 | task | in-progress | — | §7a | Timing: qualitative win proven (zero client cat reads); no ms figure captured. | [detail](./records/R-0208.md) |
| R-0215 | task | open | — | §8 | Verify Kakao scopes + document received fields (compliance-plan task 8). | [detail](./records/R-0215.md) |
| R-0216 | task | open | — | §8 | Professional/legal review of the policy text + consent flows before scaling. | [detail](./records/R-0216.md) |
| R-0217 | task | open | — | §8 | Security audit vs the PIPA safety-measures standard (compliance-plan task 7). | [detail](./records/R-0217.md) |
| R-0224 | task | in-progress | — | §9 | Per-mountain DB isolation at the service-factory seam. Seam parameterized | [detail](./records/R-0224.md) |
| R-0246 | task | open | — | §10d | A CMS-controlled toggle for whether multiple upload is allowed | [detail](./records/R-0246.md) |
| R-0253 | task | open | — | §10d | D3 — align the media-section order across composers (proposed, still not decided) | [detail](./records/R-0253.md) |
| R-0324 | task | open | — | §10u | U8 — one browser confirmation of the /admin/* screens, which were never seen rendered | [detail](./records/R-0324.md) |
| R-0328 | task | in-progress | — | — | Plan — 입양홍보 posts + per-cat 입양정보 | [detail](../docs/planning/completed/adoption-promotion-and-cat-adoption-info-plan.md) |
| R-0333 | task | in-progress | — | §4 | Plan — 급식소 관리 (feeding-station points) admin CMS | [detail](../docs/planning/completed/feeding-station-points-admin-cms-plan.md) |
| R-0344 | task | open | — | — | Prerequisites for a real mountain #2 | [detail](../docs/planning/pending/mountain-2-prerequisites.md) |
| R-0345 | task | open | — | — | Subdomain → path-based tenancy — execution plan — 20260728 | [detail](../docs/planning/pending/tenancy-path-migration-plan-20260728.md) |
| R-0347 | bug | open | — | — | Signing out issues an unauthenticated Firestore permission read, and the catch swallows it | [detail](./records/R-0347.md) |
| R-0348 | task | open | — | — | The orphan-delete path has never been verified in production — the last live PIPA gap | [detail](./records/R-0348.md) |
| R-0350 | question | open | — | — | Owner call: should the `설명 없음` filler come back on the photo modal? | [detail](./records/R-0350.md) |
| R-0353 | question | open | — | — | Owner call: a GA4 `page_view` now fires on every cat-modal open | [detail](./records/R-0353.md) |
| R-0355 | question | open | — | — | Owner call: should the CMS "YouTube에 없는 영상" panel show thumbnails instead of a title list? | [detail](./records/R-0355.md) |
| R-0356 | question | open | — | — | Owner call: a video's 제목 appears twice — YouTube's player overlay and our caption | [detail](./records/R-0356.md) |
| R-0357 | question | open | — | — | Owner call: may an 입양홍보 popup displace a 공지사항 one? | [detail](./records/R-0357.md) |
| R-0358 | task | open | — | — | Local uploads went to the pre-migration Storage bucket, and what landed there is stranded | [detail](./records/R-0358.md) |
| R-0359 | task | open | — | — | Unverified on Preview: the 입양홍보 popup and the duplicate-filename 409 | [detail](./records/R-0359.md) |
| R-0360 | task | open | — | — | Four /admin/tag-videos repairs are unverified against real YouTube | [detail](./records/R-0360.md) |
| R-0361 | task | open | — | — | Per-page admin button spec sheets — the owner wants one for every CMS page | [detail](./records/R-0361.md) |
| R-0363 | task | open | — | — | M5 post-cutover cleanup — legacy role fields, the superseded about doc, and the local dumps | [detail](./records/R-0363.md) |
| R-0364 | task | open | — | — | Click through the 탈퇴 flow in production with a throwaway account | [detail](./records/R-0364.md) |
| R-0366 | question | open | — | — | Owner question: keep the dev-promotion model, or move to GitHub Flow? | [detail](./records/R-0366.md) |
| R-0367 | task | open | — | — | Glance at the admin screens while logged in — the only unverified part of the colour work | [detail](./records/R-0367.md) |
| R-0426 | task | open | — | — | Phase 5 — un-pause application work; the successor workstream is still unnamed | [detail](./records/R-0426.md) |
| R-0445 | task | open | — | — | Six record files state a status their row contradicts, and no gate compares the two | [detail](./records/R-0445.md) |
| R-0446 | task | open | — | — | README.md labels the hand-off with a path it no longer has, and link-check cannot see it | [detail](./records/R-0446.md) |
| R-0449 | task | open | — | — | Audit the project-status memories against the registry, which now holds what most of them hold | [detail](./records/R-0449.md) |
| R-0450 | task | open | — | — | Make the pre-commit hook verify rather than repair, and format on save instead | [detail](./records/R-0450.md) |
| R-0451 | task | open | — | — | Replace next lint with ESLint directly, and resolve the two competing ESLint configs | [detail](./records/R-0451.md) |
| R-0452 | task | open | — | — | Decide whether ESLint warnings should fail the build, and answer the nine that exist | [detail](./records/R-0452.md) |

## Deferred — parked, with the condition that would restart it

- **R-0139** — The about page's 대표 사진 has no upload control
  - _Deferred: not a drop-in reuse of the existing uploader — the signed-url route must learn a target path (it hard-codes uploads/) and replacement semantics need deciding first._
- **R-0141** — `npx eslint <file>` cannot resolve the shared config, so per-file linting is broken
  - _Deferred: every gate that blocks a merge still lints (next lint, and the pre-commit hook calls next lint --file), so only the ad-hoc per-file invocation is broken._
- **R-0234** (§10) — Vercel Preview-URL read-only smoke (post-push; needs secrets).
  - _Deferred — e2e Phase 8 (playwright-ci-plan.md §8), an explicitly-parked extension: needs Preview-URL secrets. Blocks nothing in the completed suite._
- **R-0235** (§10) — WebKit project (iOS Safari) alongside the Chromium/mobile projects.
  - _Deferred — e2e Phase 8 (playwright-ci-plan.md §8), an explicitly-parked extension alongside the Chromium/mobile projects. Blocks nothing in the completed suite._
- **R-0236** (§10) — Visual-regression screenshots (masked).
  - _Deferred — e2e Phase 8 (playwright-ci-plan.md §8), an explicitly-parked extension. Blocks nothing in the completed suite._
- **R-0237** (§10) — Lighthouse CI / mobile perf budgets — belongs to the separate perf workstream
  - _Deferred — e2e Phase 8: belongs to the separate perf workstream (§4 perf item), not this suite._
- **R-0238** (§10) — YouTube tagging admin flows (external API).
  - _Deferred — e2e Phase 8 (playwright-ci-plan.md §8), an explicitly-parked extension: external API. Blocks nothing in the completed suite._
- **R-0362** — 촬영일 is guessed from the filename when it should be read from the file's own metadata
  - _the owner deferred this explicitly on 2026-07-27 and does not want it picked up — restart only if the owner asks for it. Recorded to explain why 촬영일 comes out empty on an iPhone upload, not to schedule the work_
- **R-0365** — Compliance carry-overs — legal review, signup consent, a PIPA audit, and Kakao scope verification
  - _deferred and accepted as such; the restart condition is scaling membership, and the source says to reopen them before that happens. Undated in the source, so the ts is this hand-off's creation date_
- **R-0377** — Known gap, logged not fixed: the YouTube status panel reports healthy on a token that cannot write
  - _it validates by refreshing, which succeeds regardless of scope; detecting it means probing a write endpoint, which is a product call the owner has not made. That call is the restart condition_
- **R-0427** — Repoint the 20 companion-document `detail_ref`s when the archive move happens
  - _starts when the owner archives `docs/planning/**` to `docs/archive/` (R-0407); all 20 links go stale in that same change and must be repointed in it_

## Hierarchy

- **R-0154** [done] Static clustering — durable fix for the recurring pin loss (2026-07-05, DEBUG_LOG). — _(1/1 children done)_
  - R-0155 [done] Cleanup: npm uninstall leaflet.markercluster (2026-07-05) — dead dependency removed
- **R-0169** [done] ✅ AdminAuth hardening (UX side) — DONE (2026-06-29 → 2026-06-30). — _(2/2 children done)_
  - R-0170 [done] Emergency-bypass buttons removed (commit 0cd9c2c)
  - R-0171 [done] 10s init-timeout removed (commit dc1d748) — a vestigial guard for the long-fixed indexedDB persistence hang
- **R-0343** [done] Color token centralization — plan — 20260805 — _(2/2 children done)_
  - R-0322 [done] U6 (plan Phase 4) — hygiene. All three sites resolved.
  - R-0323 [done] U7 (plan Phase 5) — the design.md audit D5 opened, deliberately UNSIZED

## All records

| id | type | status | outcome | plan | title | detail |
| --- | --- | --- | --- | --- | --- | --- |
| R-0001 | bug | done | — | — | CI's e2e job was red on a test defect, and the retries were doomed by design | [detail](./records/R-0001.md) |
| R-0002 | bug | done | — | — | The e2e suite was sending real email to the production admin, two per run | [detail](./records/R-0002.md) |
| R-0003 | bug | done | — | — | Deleted posts stayed in the collection, and no permission could remove them | [detail](./records/R-0003.md) |
| R-0004 | bug | done | — | — | Every 집사톡 post opened on "Post not found." | [detail](./records/R-0004.md) |
| R-0005 | bug | done | — | — | Hydration mismatch wiped input a visitor had already typed | [detail](./records/R-0005.md) |
| R-0006 | bug | done | — | — | The e2e "flake set" was three real bugs, one of them in app code | [detail](./records/R-0006.md) |
| R-0007 | bug | done | — | — | An uploaded video was recorded as having been filmed the day it was uploaded | [detail](./records/R-0007.md) |
| R-0008 | bug | done | — | — | the 이 냥이 링크 chip did nothing at all on desktop | [detail](./records/R-0008.md) |
| R-0009 | bug | done | — | — | the new `?cat=` deep link kept erasing itself, then stopped opening at all | [detail](./records/R-0009.md) |
| R-0010 | bug | done | — | — | videos deleted from YouTube kept their tile in the public 영상첩 | [detail](./records/R-0010.md) |
| R-0011 | bug | done | — | — | 공지사항 was empty, missing, or untagged for 30 seconds: a Firestore transport probe waiting out its timeout | [detail](./records/R-0011.md) |
| R-0012 | bug | done | — | — | an 입양홍보 post's photos rendered out of proportion with the video beside them | [detail](./records/R-0012.md) |
| R-0013 | bug | done | — | — | expanding an 입양홍보 post showed no image (and never could, if it had a video) | [detail](./records/R-0013.md) |
| R-0014 | bug | done | — | — | a one-header hardening silently blocked every image upload (self-inflicted, same day) | [detail](./records/R-0014.md) |
| R-0015 | bug | done | — | — | every video upload over 4.5 MB failed: the file was POSTed through a Vercel function | [detail](./records/R-0015.md) |
| R-0016 | bug | done | — | — | 촬영일 landed a day early in KST: a calendar date round-tripped through an instant | [detail](./records/R-0016.md) |
| R-0017 | bug | done | — | — | Batch edits reached YouTube but never came back to Firestore: the sync was called with Firestore doc ids | [detail](./records/R-0017.md) |
| R-0018 | bug | done | — | — | Every metadata sync reset a video's 게시일 to "now", reordering the public 영상첩 | [detail](./records/R-0018.md) |
| R-0019 | bug | done | — | — | Batch playlist assignment updated one video (or none): the modal's save ignored the batch selection | [detail](./records/R-0019.md) |
| R-0020 | bug | done | — | — | 자동 날짜 인식's parsed dates silently vanished: it wrote Firestore, and the sync overwrites Firestore from YouTube | [detail](./records/R-0020.md) |
| R-0021 | bug | done | — | — | "Insufficient Permission" on video metadata edits: the admin OAuth flow asked for too few scopes | [detail](./records/R-0021.md) |
| R-0022 | bug | done | — | — | Re-authorizing YouTube fixed nothing: the button writes the token to Firestore, every route read it from env | [detail](./records/R-0022.md) |
| R-0023 | bug | done | — | — | Modal dialog conversion silently canceled the post-submit redirect (App-Router transition vs. modal-unmount re-render) | [detail](./records/R-0023.md) |
| R-0024 | bug | done | — | — | 집사톡 image upload could never have worked (signed-URL response keys drifted in the copy) | [detail](./records/R-0024.md) |
| R-0025 | bug | done | — | — | Every admin role change silently lost its audit entry (permission_logs write denied & swallowed) | [detail](./records/R-0025.md) |
| R-0026 | bug | done | — | — | Intermittent e2e build hang/"markerless bake" — a SECOND page (냥이들) read points via the client Web SDK at build | [detail](./records/R-0026.md) |
| R-0027 | bug | done | — | — | Home-map §7a "no client Firestore" spec: green per-file, red in the full gate | [detail](./records/R-0027.md) |
| R-0028 | bug | done | — | — | Album Lightbox/VideoPlayer spec fails only in the full gate — overlay-intercepted clicks + order-dependent nav | [detail](./records/R-0028.md) |
| R-0029 | bug | done | — | — | Landing map bakes markerless in the e2e harness — points read via client SDK at build (incomplete §7a) | [detail](./records/R-0029.md) |
| R-0030 | bug | done | — | — | Non-admin login fails under the repo Firestore rules (emulator) — `ensureUserExists` self-write denied | [detail](./records/R-0030.md) |
| R-0031 | bug | done | — | — | Logout on /mypage strands the page on a spinner (client redirect never commits) | [detail](./records/R-0031.md) |
| R-0032 | bug | done | — | — | Landscape rotate-notice shows a broken image (GIF filename mismatch) | [detail](./records/R-0032.md) |
| R-0033 | bug | done | — | — | Mobile logout does nothing: confirm modal opens but the button never logs out | [detail](./records/R-0033.md) |
| R-0034 | bug | done | — | — | Mobile hamburger menu stays open across login navigation / after sign-in | [detail](./records/R-0034.md) |
| R-0035 | bug | done | — | — | 급식소 CMS coordinate inputs: can't edit any digit but the last (caret jumps to end) | [detail](./records/R-0035.md) |
| R-0036 | bug | done | — | — | Mobile map pins vanishing / drawn outside the map / stuck pan — the durable fix (replaced markercluster) | [detail](./records/R-0036.md) |
| R-0037 | bug | done | — | — | Mountain-selector dropdown clipped on the left (계양산 → 양산) | [detail](./records/R-0037.md) |
| R-0038 | bug | done | — | — | Mobile map: cat-thumbnail pins vanished on S22 after a pinch-out bounce-back | [detail](./records/R-0038.md) |
| R-0039 | bug | done | — | — | Mobile map: zoom-out grey persisted on S22 (device-dependent floor clamp) + pins | [detail](./records/R-0039.md) |
| R-0040 | bug | done | — | — | Mobile map: cat-thumbnail pins vanished at default zoom (min-zoom clamp regression) | [detail](./records/R-0040.md) |
| R-0041 | bug | done | — | — | Mobile map: zoom-out grey margins, landscape wastes space, can't scroll the page | [detail](./records/R-0041.md) |
| R-0042 | bug | done | — | — | 냥이들 desktop-table thumbnails rendered as vertical ellipses (preflight max-width clamp) | [detail](./records/R-0042.md) |
| R-0043 | bug | done | — | — | `[catmodal:name]` links in posts rendered as broken `<a>` (link-converter ordering) | [detail](./records/R-0043.md) |
| R-0044 | bug | done | — | — | 입양홍보 admin tab showed 급식현황 posts (stale state on failed fetch) | [detail](./records/R-0044.md) |
| R-0045 | bug | done | — | — | Admin force-logout on localhost (cross-tab sign-out from idle background tabs) | [detail](./records/R-0045.md) |
| R-0046 | bug | done | — | — | Map doesn't re-fit on window resize (desktop fixed · mobile pending) | [detail](./records/R-0046.md) |
| R-0047 | bug | done | — | — | Kakao login failure messages shown in English | [detail](./records/R-0047.md) |
| R-0048 | bug | done | — | — | Kakao (social) login errors shown under the email login block | [detail](./records/R-0048.md) |
| R-0049 | bug | done | — | — | Media album hidden behind the cat modal (map flow only) | [detail](./records/R-0049.md) |
| R-0050 | change | done | — | — | the admin CMS is measured against `design.md` for the first time (colour plan Phase 5) | [detail](./records/R-0050.md) |
| R-0051 | change | done | — | — | a 동참 notification that never sent is now visible to the visitor and to the operator | [detail](./records/R-0051.md) |
| R-0052 | change | done | — | — | `npm run smtp:verify`, because a broken 동참 email is invisible from every direction | [detail](./records/R-0052.md) |
| R-0053 | change | done | — | — | the last raw colour hexes leave two components, and the design reference finally says the palette is global | [detail](./records/R-0053.md) |
| R-0054 | change | done | — | — | 급식현황's freshness scale goes green→red ⇒ blue→red, and becomes readable | [detail](./records/R-0054.md) |
| R-0055 | change | done | — | — | brand yellows adopt the `brand`/`accent` tokens (Phase 2) | [detail](./records/R-0055.md) |
| R-0056 | change | done | — | — | the colour palette becomes global; per-tenant theming (M8) is withdrawn | [detail](./records/R-0056.md) |
| R-0057 | change | done | — | — | 냥이들 re-bakes on a cat edit (closes BACKLOG **B3**) | [detail](./records/R-0057.md) |
| R-0058 | change | done | — | — | a video's YouTube 설명 is taken verbatim on every composer; 공지/입양홍보 stop inheriting the post body | [detail](./records/R-0058.md) |
| R-0059 | change | done | — | — | the rename cascade reaches 엄마/애 too, found by dry-running it on real data | [detail](./records/R-0059.md) |
| R-0060 | change | done | — | — | migration scripts get an emulator-backed test suite, and `rename-cat.js` gets a guard | [detail](./records/R-0060.md) |
| R-0061 | change | done | — | — | renaming a cat is a cascade, and now there is a script for it | [detail](./records/R-0061.md) |
| R-0062 | change | done | — | — | 급식현황 publishing is gated on a confirmation that names the 급식소 it will stamp | [detail](./records/R-0062.md) |
| R-0063 | change | done | — | — | authors may delete their own posts; reply authors may edit and delete their replies | [detail](./records/R-0063.md) |
| R-0064 | change | done | — | — | 집사톡 members can attach media (narrow `upload-own-*`), and §10n turned out to be live | [detail](./records/R-0064.md) |
| R-0065 | change | done | — | — | the dead deploy targets, swept a second time | [detail](./records/R-0065.md) |
| R-0066 | change | done | — | — | the about page has one source of truth: the CMS | [detail](./records/R-0066.md) |
| R-0067 | change | done | — | — | 집사톡 is edited by its create composer too | [detail](./records/R-0067.md) |
| R-0068 | change | done | — | — | the post detail page renders in the shared post shell | [detail](./records/R-0068.md) |
| R-0069 | change | done | — | — | 공지사항 / 입양홍보 are edited by their create composer | [detail](./records/R-0069.md) |
| R-0070 | change | done | — | — | 집사톡 capped at one video + one photo, via static config | [detail](./records/R-0070.md) |
| R-0071 | change | done | — | — | 앱 관리's 게시물 컬렉션 설정 removed; the dashboard tile now counts for real | [detail](./records/R-0071.md) |
| R-0072 | change | done | — | — | The modal albums converged onto the shared MediaTile | [detail](./records/R-0072.md) |
| R-0073 | change | done | — | — | Video tiles name the clip; the mislabelled "제목 없음" filler is gone | [detail](./records/R-0073.md) |
| R-0074 | change | done | — | — | Signup consent recorded, a default role, and PII out of the auth logs | [detail](./records/R-0074.md) |
| R-0075 | change | done | — | — | 이 냥이 링크: a share chip in the cat modal | [detail](./records/R-0075.md) |
| R-0076 | change | done | — | — | one cat is now linkable: `/pages/cats?cat=<id>` | [detail](./records/R-0076.md) |
| R-0077 | change | done | — | — | the 공지사항 detail page's "중요한 안내사항" banner is gone | [detail](./records/R-0077.md) |
| R-0078 | change | done | — | — | a post's media shows its 제목/설명/태그, on every surface | [detail](./records/R-0078.md) |
| R-0079 | change | done | — | — | 입양홍보 posts can pop up on a site visit, like 공지사항 | [detail](./records/R-0079.md) |
| R-0080 | change | done | — | — | the three composers converge: per-file media, cat tagging, no name collisions | [detail](./records/R-0080.md) |
| R-0081 | change | done | — | — | video uploads no longer invent tags nobody chose | [detail](./records/R-0081.md) |
| R-0082 | change | done | — | — | video uploads show a progress bar | [detail](./records/R-0082.md) |
| R-0083 | change | done | — | — | admin CMS idle timeout raised from 2 hours to 24 | [detail](./records/R-0083.md) |
| R-0084 | change | done | — | — | 내 집사 정보 offers a 관리자 shortcut to members who have CMS access | [detail](./records/R-0084.md) |
| R-0085 | change | done | — | — | 집사게시판 stops composing media; 집사톡 becomes the media composer; playlists go per-mountain | [detail](./records/R-0085.md) |
| R-0086 | change | done | — | — | Removed: the `YOUTUBE_REFRESH_TOKEN` env var and the command-line token workflow | [detail](./records/R-0086.md) |
| R-0087 | change | done | — | — | Decision: one shared YouTube channel for all mountains (per-mountain channels rejected) | [detail](./records/R-0087.md) |
| R-0088 | change | done | — | — | Analytics: `mountain_id` becomes a GA4 default parameter (all events, not just `page_view`) | [detail](./records/R-0088.md) |
| R-0089 | change | done | — | — | Auth gate on the 7 ungated media / credential API routes (one deleted) | [detail](./records/R-0089.md) |
| R-0090 | change | done | — | — | Multi-mountain M8: per-tenant theming (minimal — primary color only) | [detail](./records/R-0090.md) |
| R-0091 | change | done | — | — | Multi-mountain M7: analytics decoupled from Firebase → gtag.js + `mountain_id` | [detail](./records/R-0091.md) |
| R-0092 | change | done | — | — | Multi-mountain M6: per-tenant upload namespacing (scope corrected mid-flight) | [detail](./records/R-0092.md) |
| R-0093 | change | done | — | — | CI: emulator-backed `rules` job (mountain-aware Firestore rules now gated) | [detail](./records/R-0093.md) |
| R-0094 | change | done | — | — | Multi-mountain M5.4b: two-tenant isolation e2e (M5 code-complete) | [detail](./records/R-0094.md) |
| R-0095 | change | done | — | — | Multi-mountain M5.4a: second stub tenant (`manisan`) + `hidden` config flag | [detail](./records/R-0095.md) |
| R-0096 | change | done | — | — | Multi-mountain M5.3 route audit: Admin-SDK routes verified tenant-safe; prod-cutover order corrected | [detail](./records/R-0096.md) |
| R-0097 | change | done | — | — | Complexity retirement executed (P0–P6): forms + admin editors on shared primitives; alerts → Modal dialogs | [detail](./records/R-0097.md) |
| R-0098 | change | done | — | — | Tier 1 write migration: role assignment → Admin-SDK route, audit log restored | [detail](./records/R-0098.md) |
| R-0099 | change | done | — | — | Playwright e2e main-plan suites complete (Phases 2–6) + Phase 7 flake audit | [detail](./records/R-0099.md) |
| R-0100 | change | done | — | — | Playwright e2e harness + CI (emulator-backed) — prerequisite plan executed | [detail](./records/R-0100.md) |
| R-0101 | change | done | — | — | Dead-code removal (≈3,200 LOC across 19 files + 2 method-level items) | [detail](./records/R-0101.md) |
| R-0102 | change | done | — | — | Compliance: 개인정보처리방침 + 이용약관 pages, footer links, consent, 국외 이전 | [detail](./records/R-0102.md) |
| R-0103 | change | done | — | — | Account withdrawal (탈퇴) / deletion flow | [detail](./records/R-0103.md) |
| R-0104 | change | done | — | — | Adoption page: enlarge 소식 heading + post title/content fonts | [detail](./records/R-0104.md) |
| R-0105 | change | done | — | — | Mobile UI polish: mypage edit rows + login/logout menu pills | [detail](./records/R-0105.md) |
| R-0106 | change | done | — | — | Converge public/auth CTAs onto the shared `<Button>` primitive | [detail](./records/R-0106.md) |
| R-0107 | change | done | — | — | Back button / swipe-back closes modal instead of navigating away | [detail](./records/R-0107.md) |
| R-0108 | change | done | — | — | Mobile lightbox: pinch-to-zoom on images | [detail](./records/R-0108.md) |
| R-0109 | change | done | — | — | Mobile nav: reduced the top bar height | [detail](./records/R-0109.md) |
| R-0110 | change | done | — | — | Mobile nav: close the hamburger menu on outside click | [detail](./records/R-0110.md) |
| R-0111 | change | done | — | — | Map: moved the click-a-pin nudge card from bottom-left to top-left | [detail](./records/R-0111.md) |
| R-0112 | change | done | — | — | Cleanup: `triggerCatRevalidate` → `triggerPublicRevalidate` | [detail](./records/R-0112.md) |
| R-0113 | change | done | — | — | Admin: 급식소 관리 (feeding-station points) CMS | [detail](./records/R-0113.md) |
| R-0114 | change | done | — | — | Map: per-Point title-label side override (`labelSide`) | [detail](./records/R-0114.md) |
| R-0115 | change | done | — | — | Map: per-mountain clustering toggle (`map.clustering` in mountains.json) | [detail](./records/R-0115.md) |
| R-0116 | change | done | — | — | Mobile: portrait-only map (landscape rotate-notice) + one-line nav in landscape | [detail](./records/R-0116.md) |
| R-0117 | change | done | — | — | Mountain selector label: 계양산 냥이들 → 계양산 | [detail](./records/R-0117.md) |
| R-0118 | change | done | — | — | Mobile nav menu: drop category headers, separate groups with hairline rules | [detail](./records/R-0118.md) |
| R-0119 | change | done | — | — | Mobile nav menu: fix mislabeled section header + prevent clip on short viewports | [detail](./records/R-0119.md) |
| R-0120 | change | done | — | — | Album search/filter bar de-emphasized on mobile | [detail](./records/R-0120.md) |
| R-0121 | change | done | — | — | Mobile map marker-clustering radius is now per-mountain config | [detail](./records/R-0121.md) |
| R-0122 | change | done | — | — | Photo gallery: translucent cat-name tags + drop album icon heroes | [detail](./records/R-0122.md) |
| R-0123 | change | done | — | — | 냥이들 thumbnails back to square + search/filter de-emphasis + 동영상앨범 rename | [detail](./records/R-0123.md) |
| R-0124 | change | done | — | — | New public page: 냥이들 (browse-all-cats) | [detail](./records/R-0124.md) |
| R-0125 | change | done | — | — | Public hand-rolled-button sweep (→ shared `<Button>` primitive) | [detail](./records/R-0125.md) |
| R-0126 | change | done | — | — | Phase C: 집사메뉴/butler brand restyle + cross-cutting button cleanup | [detail](./records/R-0126.md) |
| R-0127 | change | done | — | — | Admin post editing (all post types) | [detail](./records/R-0127.md) |
| R-0128 | change | done | — | — | 입양홍보 posts + per-cat 입양정보 | [detail](./records/R-0128.md) |
| R-0129 | change | done | — | — | Redesign video-album tiles (caption footer + cat-name tags) | [detail](./records/R-0129.md) |
| R-0130 | change | done | — | — | Enhance the cat-management grid header (color + sort affordance) | [detail](./records/R-0130.md) |
| R-0131 | change | done | — | — | Harden auth so a failed Firestore read no longer signs users out | [detail](./records/R-0131.md) |
| R-0132 | change | done | — | — | Add idle session timeout to the admin CMS (2 hours) | [detail](./records/R-0132.md) |
| R-0133 | change | done | — | — | Add show/hide password toggle to the login modal | [detail](./records/R-0133.md) |
| R-0134 | change | done | — | — | Change site (browser-tab) title to 산냥이집냥이 | [detail](./records/R-0134.md) |
| R-0135 | change | done | — | — | Add `tsc --noEmit` type-check to the pre-commit hook | [detail](./records/R-0135.md) |
| R-0136 | change | done | — | — | Emphasize capital letters in the About subtitle (MOHOCATS wordplay) | [detail](./records/R-0136.md) |
| R-0137 | change | done | — | — | Display the 부제 (subtitle) on the About/intro page | [detail](./records/R-0137.md) |
| R-0138 | change | done | — | — | Remove 문의 (contact) link from the footer | [detail](./records/R-0138.md) |
| R-0139 | task | deferred | — | — | The about page's 대표 사진 has no upload control | [detail](./records/R-0139.md) |
| R-0140 | task | open | — | — | `view-analytics` is enforced by the rules and held by nobody | [detail](./records/R-0140.md) |
| R-0141 | task | deferred | — | — | `npx eslint <file>` cannot resolve the shared config, so per-file linting is broken | [detail](./records/R-0141.md) |
| R-0142 | task | open | — | — | Two live login pages, and the one members get bounced to has no 집사등록 and no tests | [detail](./records/R-0142.md) |
| R-0143 | task | done | — | — | `/api/revalidate` never refreshes 냥이들, so cat edits take up to an hour there | [detail](./records/R-0143.md) |
| R-0144 | question | open | — | — | Should the about page render `sections`? | [detail](./records/R-0144.md) |
| R-0145 | task | done | — | §4 | Mobile audit pass of the public pages at ≈360 / 390 / 414 px — home/map, about, 공지, FAQ, 동참, 입양홍보, albums, login | [detail](./records/R-0145.md) |
| R-0146 | task | done | — | §4 | Navigation on mobile — frosted grouped nav + hamburger dropdown audited | [detail](./records/R-0146.md) |
| R-0147 | task | done | — | §4 | Modals on mobile — shared ui/Modal verified (Lightbox + 고양이 선택 cat-picker) | [detail](./records/R-0147.md) |
| R-0148 | task | done | — | §4 | Album grids on mobile — grid-cols-2 density and tile captions/chips legible; filter-bar reduction mobile-verified | [detail](./records/R-0148.md) |
| R-0149 | task | done | — | §4 | Forms on mobile — login + contact verified: 16px inputs (no iOS auto-zoom), correct input types, single-column | [detail](./records/R-0149.md) |
| R-0150 | task | done | — | §4 | Content pages on mobile — about / 공지 / FAQ / 입양홍보 / 동참: zero horizontal overflow at 390, no fixes needed | [detail](./records/R-0150.md) |
| R-0151 | task | done | — | §4 | Map zoom / orientation / scroll — Pass 2 (2026-07-04), three owner-reported S22 bugs fixed | [detail](./records/R-0151.md) |
| R-0152 | task | done | — | §4 | Map pinch-bounce pin loss — S22 (2026-07-05, DEBUG_LOG). ✅ S22-verified by owner. | [detail](./records/R-0152.md) |
| R-0153 | task | done | — | §4 | Portrait-only mobile map + one-line landscape nav (2026-07-05, FEATURE_MOD_LOG). | [detail](./records/R-0153.md) |
| R-0154 | task | done | — | §4 | Static clustering — durable fix for the recurring pin loss (2026-07-05, DEBUG_LOG). | [detail](./records/R-0154.md) |
| R-0155 | task | done | — | §4 | Cleanup: npm uninstall leaflet.markercluster (2026-07-05) — dead dependency removed | [detail](./records/R-0155.md) |
| R-0156 | task | done | — | §4 | Per-Point title-label side override (labelSide) — 2026-07-05, FEATURE_MOD_LOG. | [detail](./records/R-0156.md) |
| R-0157 | task | done | — | §4 | 급식소 관리 (feeding-station points) admin CMS — 2026-07-05, `FEATURE_MOD_LOG` | [detail](./records/R-0157.md) |
| R-0158 | task | done | — | §4 | Mobile lightbox pinch-to-zoom (2026-07-08, off-plan) — react-zoom-pan-pinch wraps the image on mobile only | [detail](./records/R-0158.md) |
| R-0159 | task | done | — | §4 | Back button / swipe-back closes modals (2026-07-08, off-plan) — useModalLayer pushes a history entry on open | [detail](./records/R-0159.md) |
| R-0160 | task | done | — | §4 | Page-wide UI scale reduction (2026-07-08–09, off-plan) | [detail](./records/R-0160.md) |
| R-0161 | task | done | — | §4 | Map mobile quirks — DEVICE-OWED (remaining): cluster radius tuning, edge-clipping, spiderfy ergonomics | [detail](./records/R-0161.md) |
| R-0162 | task | done | — | §4 | Map re-fit on resize — mobile; MapViewController re-fits and re-clamps min-zoom on resize | [detail](./records/R-0162.md) |
| R-0163 | task | done | — | §4 | Touch-target sizing, hit areas, and hover-only affordances that do not exist on touch | [detail](./records/R-0163.md) |
| R-0164 | task | done | — | §4 | Mobile nav + auth-flow fixes (2026-07-10, off-plan — DEBUG_LOG ×2, FEATURE_MOD_LOG). | [detail](./records/R-0164.md) |
| R-0165 | task | open | — | §4 | Performance on mobile networks — image sizes, above-the-fold, the thumbnail preloader's eagerness on cellular | [detail](./records/R-0165.md) |
| R-0166 | task | in-progress | — | §4 | Sign-in-gated surfaces at mobile widths: butler*talk, butler_stream, mypage. *(mypage + | [detail](./records/R-0166.md) |
| R-0167 | task | done | — | §5 | ✅ Spreadsheet-grid cat editor (shipped 2026-06-29) | [detail](./records/R-0167.md) |
| R-0168 | task | in-progress | — | §5 | Visual/UX consistency — Core done 2026-06-30; folds into the new cross-cutting | [detail](./records/R-0168.md) |
| R-0169 | task | done | superseded | §5 | ✅ AdminAuth hardening (UX side) — DONE (2026-06-29 → 2026-06-30). | [detail](./records/R-0169.md) |
| R-0170 | task | done | — | §5 | Emergency-bypass buttons removed (commit 0cd9c2c) | [detail](./records/R-0170.md) |
| R-0171 | task | done | — | §5 | 10s init-timeout removed (commit dc1d748) — a vestigial guard for the long-fixed indexedDB persistence hang | [detail](./records/R-0171.md) |
| R-0172 | task | done | — | §5 | Dead/duplicate cleanup (routes + example) — ✅ removed in Phase 3A | [detail](./records/R-0172.md) |
| R-0173 | task | done | — | §5 | ✅ react-admin decision — REMOVED (2026-06-29); the whole subsystem was dead | [detail](./records/R-0173.md) |
| R-0174 | task | in-progress | — | §5 | Unified branded design + admin Korean — IN PROGRESS (2026-06-30, handoffs 17–18). | [detail](./records/R-0174.md) |
| R-0175 | task | done | — | §5 | ✅ Two auth listeners — CONSOLIDATED (commit dc1d748) | [detail](./records/R-0175.md) |
| R-0176 | task | open | — | §6 | Decide the mobile-supported admin task set vs the desktop-only heavy tasks | [detail](./records/R-0176.md) |
| R-0177 | task | open | — | §6 | Admin nav on mobile — the top nav needs a responsive pattern (drawer/hamburger) | [detail](./records/R-0177.md) |
| R-0178 | task | open | — | §6 | Tables → cards — list views reflow to stacked cards or scrollable tables on narrow screens | [detail](./records/R-0178.md) |
| R-0179 | task | open | — | §6 | Batch-tagging UIs (tag-images / tag-videos) — the grid + multi-select + CatSelectorModal flow on touch; or explicitly… | [detail](./records/R-0179.md) |
| R-0180 | task | open | — | §6 | Forms on mobile — cat add/edit, announcement create, about-content editor: input sizing and modal fit | [detail](./records/R-0180.md) |
| R-0181 | task | open | — | §6 | Inline-style layout makes responsive work harder — coordinate with §5's convention decision first | [detail](./records/R-0181.md) |
| R-0182 | task | done | — | §7 | ✅ EXECUTED (2026-07-19) — complexity retirement (duplication + local-state sprawl). | [detail](./records/R-0182.md) |
| R-0183 | task | done | — | §7 | ✅ YouTube credential source unified — the admin re-authorize button now fixes everything (FIXED 2026-07-26) | [detail](./records/R-0183.md) |
| R-0184 | task | done | — | §7 | ✅ manage-playlists POST read a global env var for the channel ID (found + FIXED 2026-07-26) | [detail](./records/R-0184.md) |
| R-0185 | task | done | — | §7 | ✅ Admin OAuth flow requested too few scopes (found + FIXED 2026-07-26, 05fdbd9). | [detail](./records/R-0185.md) |
| R-0186 | task | done | — | §7 | ✅ Three /admin/tag-videos write-path bugs (found + FIXED 2026-07-26 — b5f08b7, 80ba04a, dc8391f) | [detail](./records/R-0186.md) |
| R-0187 | task | done | — | §7 | 🔑 Principle adopted (owner, 2026-07-26): YouTube is the source of truth for video data | [detail](./records/R-0187.md) |
| R-0188 | task | done | — | §7 | ✅ Batch edits reached YouTube but never Firestore (owner-reported + FIXED 2026-07-26) | [detail](./records/R-0188.md) |
| R-0189 | task | open | — | §7 | 📄 NEW workstream — per-page admin button spec sheets; the first, tag-videos, has shipped | [detail](./records/R-0189.md) |
| R-0190 | task | done | — | §7 | ✅ SECURITY (FIXED 2026-06-28): the permission-matrix API route is gated. | [detail](./records/R-0190.md) |
| R-0191 | task | done | — | §7 | ✅ SECURITY (FIXED 2026-06-28): gated the remaining /api/admin/* routes. | [detail](./records/R-0191.md) |
| R-0192 | task | done | — | §7 | ✅ Admin CMS writes un-blocked (DONE 2026-06-29; deployed + browser-verified). | [detail](./records/R-0192.md) |
| R-0193 | task | done | — | §7 | ✅ users / role-assignment — FIXED and browser-verified on the members page | [detail](./records/R-0193.md) |
| R-0194 | task | done | — | §7 | ✅ Deployment-target cleanup (DONE) — Vercel is the deployment target. | [detail](./records/R-0194.md) |
| R-0195 | task | open | — | §7 | Error handling — read paths swallow errors into []/null (silent degradation); align with the fail-loud convention | [detail](./records/R-0195.md) |
| R-0196 | task | open | — | §7 | Structured logging — replace ad-hoc `console.*` with per-module loggers, and never log secrets | [detail](./records/R-0196.md) |
| R-0197 | task | done | — | §7 | ✅ 🔴 PII in the auth logs — FIXED 2026-08-01 | [detail](./records/R-0197.md) |
| R-0198 | task | done | — | §7 | ✅ API route auth — DONE; closed in two passes and re-verified 2026-08-01 | [detail](./records/R-0198.md) |
| R-0199 | task | done | — | §7 | ✅ RBAC collection drift — DONE (2026-06-28, 5c096a9) | [detail](./records/R-0199.md) |
| R-0200 | task | done | — | §7 | Dead code — ✅ route variants + MIGRATION_EXAMPLE.ts removed (Phase 3A). | [detail](./records/R-0200.md) |
| R-0201 | task | done | — | §7 | Build pipeline — ✅ build no longer exports to GCS; Phase 2 aligned it to fetch-static-assets + next build | [detail](./records/R-0201.md) |
| R-0202 | task | open | — | §7 | Request validation — no zod/schema at API boundaries. | [detail](./records/R-0202.md) |
| R-0203 | task | open | — | §7 | Upload-on-edit for posts (shared media-upload util) | [detail](./records/R-0203.md) |
| R-0204 | task | done | — | §7a | Cats moved to build/server reads via the Admin SDK, baked into the home + adoption Server Components with ISR | [detail](./records/R-0204.md) |
| R-0205 | task | done | — | §7a | The marker { pointId → cats } map is baked in page.tsx — zero client Firestore queries for avatars | [detail](./records/R-0205.md) |
| R-0206 | task | done | — | §7a | On-demand path: POST /api/revalidate wired to every admin cat-write, so edits reflect without a redeploy | [detail](./records/R-0206.md) |
| R-0207 | task | done | — | §7a | Resolved the page.tsx client-Web-SDK-on-server tech-debt (now Admin SDK). | [detail](./records/R-0207.md) |
| R-0208 | task | in-progress | — | §7a | Timing: qualitative win proven (zero client cat reads); no ms figure captured. | [detail](./records/R-0208.md) |
| R-0209 | task | done | — | §7a | ✅ Carried follow-up — DONE 2026-06-30; the dead static-data export seam was removed | [detail](./records/R-0209.md) |
| R-0210 | task | done | — | §8 | Privacy policy + terms content (Korean; PIPA) — done 2026-07-10 | [detail](./records/R-0210.md) |
| R-0211 | task | done | — | §8 | Data-subject rights: account withdrawal/deletion (탈퇴) — done 2026-07-10 | [detail](./records/R-0211.md) |
| R-0212 | task | done | — | §8 | Wire the footer legal links to real pages/routes — done 2026-07-10 | [detail](./records/R-0212.md) |
| R-0213 | task | done | — | §8 | Consent touchpoints at signup (email path) — done 2026-07-10 | [detail](./records/R-0213.md) |
| R-0214 | task | done | — | §8 | ✅ Consent capture for the phone / Kakao paths — RESOLVED 2026-08-01, but not the way this item assumed | [detail](./records/R-0214.md) |
| R-0215 | task | open | — | §8 | Verify Kakao scopes + document received fields (compliance-plan task 8). | [detail](./records/R-0215.md) |
| R-0216 | task | open | — | §8 | Professional/legal review of the policy text + consent flows before scaling. | [detail](./records/R-0216.md) |
| R-0217 | task | open | — | §8 | Security audit vs the PIPA safety-measures standard (compliance-plan task 7). | [detail](./records/R-0217.md) |
| R-0218 | task | done | — | §8 | Stub docs/compliance/ exists (compliance-plan.md). | [detail](./records/R-0218.md) |
| R-0219 | task | done | — | §9 | ?mountain= switch is a no-op — MountainSelector sets the query but getCurrentMountainId() only reads env | [detail](./records/R-0219.md) |
| R-0220 | task | done | — | §9 | Hard-coded service-account path + bucket fallbacks — partially done 2026-07-10 | [detail](./records/R-0220.md) |
| R-0221 | task | done | — | §9 | Hard-coded map image path in the map host; source it from mountain config. | [detail](./records/R-0221.md) |
| R-0222 | task | done | — | §9 | ✅ mountains.json vs permissions.json inconsistency — CLOSED by M5.4a (2026-07-23) | [detail](./records/R-0222.md) |
| R-0223 | task | done | — | §9 | ✅ Theme wired through — CLOSED by M8 (a237e8b, 2026-07-25) | [detail](./records/R-0223.md) |
| R-0224 | task | in-progress | — | §9 | Per-mountain DB isolation at the service-factory seam. Seam parameterized | [detail](./records/R-0224.md) |
| R-0225 | task | done | — | §10 | Test stack bootstrapped (Vitest) — npm test / npm run test:smoke, first suite tests/smoke/smoke.test.ts | [detail](./records/R-0225.md) |
| R-0226 | task | done | — | §10 | Playwright e2e harness + CI foundation landed (2026-07-11) — a hermetic Firebase Emulator Suite | [detail](./records/R-0226.md) |
| R-0227 | task | done | — | §10 | All e2e spec suites written and green (2026-07-13 → 2026-07-15) — main-plan Phases 2–6 | [detail](./records/R-0227.md) |
| R-0228 | task | done | — | §10 | Phase 7 done + merged to main (2026-07-16) — flake audit green | [detail](./records/R-0228.md) |
| R-0229 | task | done | — | §10 | Test stack decided and built — Vitest for unit, emulator-backed Playwright for e2e | [detail](./records/R-0229.md) |
| R-0230 | task | done | — | §10 | Runtime HTTP smoke — subsumed by the e2e suite, which asserts far more than 200s | [detail](./records/R-0230.md) |
| R-0231 | task | done | — | §10 | Mock service implementations — not needed, and deliberately not built | [detail](./records/R-0231.md) |
| R-0232 | task | done | — | §10 | Smoke/UI tests for critical public paths — delivered by the public/ + auth/ suites | [detail](./records/R-0232.md) |
| R-0233 | task | done | — | §10 | CI wiring beyond tsc/lint — .github/workflows/ci.yml landed 2026-07-11 | [detail](./records/R-0233.md) |
| R-0234 | task | deferred | — | §10 | Vercel Preview-URL read-only smoke (post-push; needs secrets). | [detail](./records/R-0234.md) |
| R-0235 | task | deferred | — | §10 | WebKit project (iOS Safari) alongside the Chromium/mobile projects. | [detail](./records/R-0235.md) |
| R-0236 | task | deferred | — | §10 | Visual-regression screenshots (masked). | [detail](./records/R-0236.md) |
| R-0237 | task | deferred | — | §10 | Lighthouse CI / mobile perf budgets — belongs to the separate perf workstream | [detail](./records/R-0237.md) |
| R-0238 | task | deferred | — | §10 | YouTube tagging admin flows (external API). | [detail](./records/R-0238.md) |
| R-0239 | task | done | — | §10a | B1 0f9190f — 집사게시판 drops media upload; it is a 급식소 check-in log | [detail](./records/R-0239.md) |
| R-0240 | task | done | — | §10a | B2 c2fc78f — config-driven, per-mountain playlist filing via `social.youtubePlaylistId` | [detail](./records/R-0240.md) |
| R-0241 | task | done | — | §10a | B3 bd7ce23 — 집사톡 one file per section, each with its own 제목/설명 | [detail](./records/R-0241.md) |
| R-0242 | task | done | — | §10a | B4 97b72ed + docs — 촬영일 is a calendar date; it was a day early in KST | [detail](./records/R-0242.md) |
| R-0243 | task | done | — | §10c | C1 — ?cat=<id> on /pages/cats (DONE) | [detail](./records/R-0243.md) |
| R-0244 | task | done | — | §10c | C2 — keyed on the cat id, not the name (DONE) | [detail](./records/R-0244.md) |
| R-0245 | task | done | — | §10c | C3 — the 이 냥이 링크 chip (DONE 2026-08-01, owner-requested) | [detail](./records/R-0245.md) |
| R-0246 | task | open | — | §10d | A CMS-controlled toggle for whether multiple upload is allowed | [detail](./records/R-0246.md) |
| R-0247 | task | done | — | §10d | D1 — per-file media in 공지사항 / 입양홍보 (DONE 2026-07-30) | [detail](./records/R-0247.md) |
| R-0248 | task | done | — | §10d | D1c — cat selector on both forms (DONE 2026-07-30, owner-requested) | [detail](./records/R-0248.md) |
| R-0249 | task | done | — | §10d | D1d — pasted-URL lists removed (DONE 2026-07-30, owner's call) | [detail](./records/R-0249.md) |
| R-0250 | task | done | — | §10d | D1e — filename collisions prevented (DONE 2026-07-30) | [detail](./records/R-0250.md) |
| R-0251 | task | done | — | §10d | D1b — conspicuous separators (DONE 2026-07-30, owner-requested) | [detail](./records/R-0251.md) |
| R-0252 | task | done | — | §10d | D2 — the multiple-upload toggle (DONE 2026-08-02), shipped as static config rather than a CMS setting | [detail](./records/R-0252.md) |
| R-0253 | task | open | — | §10d | D3 — align the media-section order across composers (proposed, still not decided) | [detail](./records/R-0253.md) |
| R-0254 | task | done | — | §10e | E1 — 입양홍보 expanded post shows the whole post | [detail](./records/R-0254.md) |
| R-0255 | task | done | — | §10e | E2 — 입양홍보 posts can pop up on a site visit | [detail](./records/R-0255.md) |
| R-0256 | task | done | — | §10e | E3 — each medium shows its 제목 / 설명 / 태그 | [detail](./records/R-0256.md) |
| R-0257 | task | done | — | §10e | E4 — the announcement detail page joined the shared renderer | [detail](./records/R-0257.md) |
| R-0258 | task | done | — | §10f | F1 — photos render at the video's width (be8eb77) | [detail](./records/R-0258.md) |
| R-0259 | task | done | — | §10f | F2 — the 중요한 안내사항 banner is gone (6e55463) | [detail](./records/R-0259.md) |
| R-0260 | task | done | — | §10f | F3 — the 30-second stall, and pages that lied during it (be36c9e) | [detail](./records/R-0260.md) |
| R-0261 | task | done | — | §10g | G1 — POST /api/admin/video-availability (gated manage-video) asks YouTube with the | [detail](./records/R-0261.md) |
| R-0262 | task | done | — | §10g | G2 — public reads drop missing/private videos, filtered in memory rather than by a where clause | [detail](./records/R-0262.md) |
| R-0263 | task | done | — | §10g | G3 — the CMS keeps seeing them; /admin/tag-videos grows a panel listing the missing ones with 기록 삭제 | [detail](./records/R-0263.md) |
| R-0264 | task | done | — | §10g | G4 — 동기화 runs the availability check as a third step, and a failure there never fails the sync | [detail](./records/R-0264.md) |
| R-0265 | task | done | — | §10h | Videos + photos store null when the date is unknown — the same value the sync writes | [detail](./records/R-0265.md) |
| R-0266 | task | done | — | §10h | 공지사항 / 입양홍보 gained a 촬영 날짜 field, auto-filled from the filename exactly as 집사톡 does | [detail](./records/R-0266.md) |
| R-0267 | task | done | — | §10h | Deliberately unchanged: uploadDate / publishedAt stay new Date(), because 게시일 genuinely is now | [detail](./records/R-0267.md) |
| R-0268 | task | done | — | §10i | MediaTile gained a title prop for the below shelf, clamped to 2 lines above the tag chips | [detail](./records/R-0268.md) |
| R-0269 | task | done | — | §10i | The '제목 없음' filler is gone from both places it lived — it announced a missing title over a description | [detail](./records/R-0269.md) |
| R-0270 | task | done | — | §10i | The modal albums converged onto MediaTile — the root cause of both symptoms | [detail](./records/R-0270.md) |
| R-0271 | task | done | — | §10k | K1 — a post is addressed by (type, id), not id (c4789c5) | [detail](./records/R-0271.md) |
| R-0272 | task | done | — | §10k | K2 — it renders in the shared post shell (d7c601f) | [detail](./records/R-0272.md) |
| R-0273 | task | done | — | §10l | L1 — useSimpleContentForm gained an edit block (load · prefill · updatePost) | [detail](./records/R-0273.md) |
| R-0274 | task | done | — | §10l | L2 — useRichContentForm gained the same, and NewButlerTalkForm takes a postId. | [detail](./records/R-0274.md) |
| R-0275 | task | done | — | §10l | L3 — MediaItemList gained existing / onExistingChange, so media already on the post shows as 기존 rows | [detail](./records/R-0275.md) |
| R-0276 | task | done | — | §10m | M1 — the about photo serves live from Storage via useAboutPhoto | [detail](./records/R-0276.md) |
| R-0277 | task | done | — | §10m | M2 — no JSON fallback anywhere; the page and AboutContentEditor read Firestore only | [detail](./records/R-0277.md) |
| R-0278 | task | done | — | §10m | M3 — about deleted from mountains.json (both mountains) along with its types and getter | [detail](./records/R-0278.md) |
| R-0279 | task | done | — | §10m | M4 — the build-time about-photo leg retired from fetch-static-assets.js | [detail](./records/R-0279.md) |
| R-0280 | task | done | — | §10m | M5 — scripts/migration/migrate-about-content-to-cms.js, APPLIED to prod 2026-08-02 | [detail](./records/R-0280.md) |
| R-0281 | task | done | — | §10m | M6 — next.config.js allows the Storage emulator's host under the emulator flag. | [detail](./records/R-0281.md) |
| R-0282 | task | done | — | §10n | N1 — two permissions, write-own-post-butler / write-own-post-feeding, each covering create and edit-own | [detail](./records/R-0282.md) |
| R-0283 | task | done | — | §10n | N2 — authorUid stamped at creation is what the rules authorize against; username is display | [detail](./records/R-0283.md) |
| R-0284 | task | done | — | §10n | N3 — rules split into create / update / delete, each with its own authorship constraint | [detail](./records/R-0284.md) |
| R-0285 | task | done | — | §10n | N4 — board pages gate on the view-post-* permissions, and the /new routes gained a gate at all | [detail](./records/R-0285.md) |
| R-0286 | task | done | — | §10n | N5 — member edit route /pages/posts/[postType]/[id]/edit, author-only, using the composers | [detail](./records/R-0286.md) |
| R-0287 | task | done | — | §10n | N6 — e2e: six new member specs. Full suite 220 / 13 / 0. | [detail](./records/R-0287.md) |
| R-0288 | task | done | — | §10n | N7 — the rules, tested directly (2026-08-03). tests/rules/posts.rules.test.ts, | [detail](./records/R-0288.md) |
| R-0289 | task | done | — | §10p | P1 — narrow permissions, not broad ones (owner's call): upload-own-photo / upload-own-video | [detail](./records/R-0289.md) |
| R-0290 | task | done | — | §10p | P2 — uploadedByUid is the authorization identity, mirroring §10n's authorUid | [detail](./records/R-0290.md) |
| R-0291 | task | done | — | §10p | P3 — rules: cat_images gains a create clause gated on upload-own-photo and uploadingAsSelf() | [detail](./records/R-0291.md) |
| R-0292 | task | done | — | §10p | P4 — API gates accept any-of. requireApiPermission takes string \| string[]. | [detail](./records/R-0292.md) |
| R-0293 | task | done | — | §10p | P5 — tests, and mutation-tested | [detail](./records/R-0293.md) |
| R-0294 | task | done | — | §10p | P6 — the admin UI could not manage the new permissions (owner-raised: update the 권한 tab) | [detail](./records/R-0294.md) |
| R-0295 | task | done | — | §10p | P7 — a guard, because a comment is not a constraint: smoke compares the catalogue against permissions.json | [detail](./records/R-0295.md) |
| R-0296 | task | done | — | §10p | P8 — deployed 2026-08-03 (owner), in the correct order, and verified against production | [detail](./records/R-0296.md) |
| R-0297 | task | done | — | §10q | Q1 — delete opens to the author on posts_butler / posts_feeding, still refusing everyone else | [detail](./records/R-0297.md) |
| R-0298 | task | done | — | §10q | Q2 — the reply cascade needed its own clause, because the replies belong to other people | [detail](./records/R-0298.md) |
| R-0299 | task | done | — | §10q | Q3 — replyCount may now move ±1, not just +1 | [detail](./records/R-0299.md) |
| R-0300 | task | done | — | §10q | Q4 — UI: 삭제 beside the existing 수정 in PostList, and inline 수정 + 삭제 on a reply's own card | [detail](./records/R-0300.md) |
| R-0301 | task | done | — | §10q | Q5 — tests: rules suite +17 (86 total), mutation-tested, plus unit and e2e cover | [detail](./records/R-0301.md) |
| R-0302 | task | done | — | §10q | Q6 — rules deployed 2026-08-04 (owner), verified against production | [detail](./records/R-0302.md) |
| R-0303 | task | done | — | §10o | O1 — scripts/migration/stamp-missing-mountain-id.js audits every content collection and repairs via the Admin SDK | [detail](./records/R-0303.md) |
| R-0304 | task | done | — | §10o | O2 — post-service.updateReplyCount recounts instead of increment(1). | [detail](./records/R-0304.md) |
| R-0305 | task | done | — | §10r | R1 — 확인 before any write, listing every ticked 급식소 by name plus the 방문 시간 | [detail](./records/R-0305.md) |
| R-0306 | task | done | — | §10r | R2 — the empty branch says something different: 선택한 급식소가 없어요 rather than a write warning | [detail](./records/R-0306.md) |
| R-0307 | task | done | — | §10r | R3 — the message builder is a pure module (src/utils/feedingCheckIn.ts), not a closure in the form | [detail](./records/R-0307.md) |
| R-0308 | task | done | — | §10r | R4 — time formatting reads the datetime-local components literally, avoiding a zone round-trip | [detail](./records/R-0308.md) |
| R-0309 | task | done | — | §10s | S1 — scripts/migration/rename-cat.js, dry-run by default (APPLY=true to write) | [detail](./records/R-0309.md) |
| R-0310 | task | done | — | §10s | S2 — token rewriting matches [catmodal:NAME] only, never the bare name | [detail](./records/R-0310.md) |
| R-0311 | task | done | — | §10s | S3 — parents/offspring added after the owner's dry run (70e2c60), whole members only | [detail](./records/R-0311.md) |
| R-0312 | task | done | — | §10s | S4 — patches merge per document before committing, since a cat can appear in two passes | [detail](./records/R-0312.md) |
| R-0313 | task | done | — | §10s | S5 — emulator coverage + a demo-* guard — see §10s-bis below. | [detail](./records/R-0313.md) |
| R-0314 | task | done | — | §10t | T1 — useSimpleContentForm passes videoItems through unchanged | [detail](./records/R-0314.md) |
| R-0315 | task | done | — | §10t | T2 — youtubeDefaults.description removed from both composers and from the config type | [detail](./records/R-0315.md) |
| R-0316 | task | done | — | §10t | T3 — the UI changed with the behaviour; the descriptionHelp override is deleted rather than reworded | [detail](./records/R-0316.md) |
| R-0317 | task | done | — | §10u | U1 — the palette is global (supersedes M8); theme deleted from mountains.json | [detail](./records/R-0317.md) |
| R-0318 | task | done | — | §10u | U2 — ~30 brand utilities adopt brand/accent across 9 files, admin included (D5). | [detail](./records/R-0318.md) |
| R-0319 | task | done | — | §10u | U3 — 급식현황's freshness ramp goes green→red ⇒ blue→red, the only user-visible change in the workstream | [detail](./records/R-0319.md) |
| R-0320 | task | done | — | §10u | U4 — feeding_spots is seeded, so the table has e2e cover for the first time. | [detail](./records/R-0320.md) |
| R-0321 | task | done | — | §10u | U5 — design.md's scope line corrected; it had outlived the react-admin subsystem it described | [detail](./records/R-0321.md) |
| R-0322 | task | done | — | §10u | U6 (plan Phase 4) — hygiene. All three sites resolved. | [detail](./records/R-0322.md) |
| R-0323 | task | done | — | §10u | U7 (plan Phase 5) — the design.md audit D5 opened, deliberately UNSIZED | [detail](./records/R-0323.md) |
| R-0324 | task | open | — | §10u | U8 — one browser confirmation of the /admin/* screens, which were never seen rendered | [detail](./records/R-0324.md) |
| R-0325 | task | done | — | §11 | 입양홍보 (/pages/adoption) — built 2026-06-26 as an 입양 가능 냥이 갤러리 (adoptable-cats gallery) | [detail](./records/R-0325.md) |
| R-0326 | task | done | — | §11 | 동참 (/pages/contact) — end-to-end, DONE 2026-06-28 (Variant A) | [detail](./records/R-0326.md) |
| R-0327 | task | done | — | §7a | 산냥이집냥이 — §7a Bake the Data Layer · Task List | [detail](../docs/planning/completed/7a-bake-data-layer-tasks.md) |
| R-0328 | task | in-progress | — | — | Plan — 입양홍보 posts + per-cat 입양정보 | [detail](../docs/planning/completed/adoption-promotion-and-cat-adoption-info-plan.md) |
| R-0329 | task | done | — | — | 집사게시판 미디어 분리 · 집사톡 작성기 개선 · 마운틴별 재생목록 — Plan — 20260727 | [detail](../docs/planning/completed/butler-media-separation-plan-20260727.md) |
| R-0330 | task | done | — | — | Complexity-Retirement Assessment — 20260716 | [detail](../docs/planning/completed/complexity-retirement-assessment-20260716.md) |
| R-0331 | task | done | — | — | Dead-code Removal Assessment — 20260711 | [detail](../docs/planning/completed/dead-code-removal-assessment-20260711.md) |
| R-0332 | task | done | — | §7 | Deployment Cleanup Plan — Vercel-only | [detail](../docs/planning/completed/deployment-cleanup-plan.md) |
| R-0333 | task | in-progress | — | §4 | Plan — 급식소 관리 (feeding-station points) admin CMS | [detail](../docs/planning/completed/feeding-station-points-admin-cms-plan.md) |
| R-0334 | task | done | — | — | Firebase read-access inventory (Client SDK vs Admin SDK) | [detail](../docs/planning/completed/firebase-read-access-inventory.md) |
| R-0335 | task | done | — | — | Firebase SDK usage inventory (Client SDK vs Admin SDK) | [detail](../docs/planning/completed/firebase-sdk-usage-inventory.md) |
| R-0336 | task | done | — | §10p | Member media upload on 집사톡 — narrow `upload-own-*` permissions — plan | [detail](../docs/planning/completed/member-media-upload-permissions-20260803.md) |
| R-0337 | task | done | — | — | Member authoring on 집사톡 + 급식현황 — plan | [detail](../docs/planning/completed/member-post-authoring-20260802.md) |
| R-0338 | task | done | — | — | Multi-Mountain Refactor — Execution Plan — 20260719 | [detail](../docs/planning/completed/multi-mountain-refactor-plan-20260719.md) |
| R-0339 | decision | done | adopted | — | Multi-Tenant Architecture — Decision Framework — 20260718 | [detail](../docs/planning/completed/multi-tenant-architecture-decision-20260718.md) |
| R-0340 | task | done | — | — | Phase 3 Cleanup — Detailed Plan | [detail](../docs/planning/completed/phase3-cleanup-plan.md) |
| R-0341 | task | done | — | §10 | Playwright E2E Test Suite + CI — Plan (PROJECT_PLAN §10) | [detail](../docs/planning/completed/playwright-ci-plan.md) |
| R-0342 | task | done | — | — | Playwright CI — Prerequisite Plan (harness enablers, spikes, and flag resolution) | [detail](../docs/planning/completed/playwright-ci-prerequisite-plan.md) |
| R-0343 | task | done | — | — | Color token centralization — plan — 20260805 | [detail](../docs/planning/pending/color-token-centralization-plan-20260805.md) |
| R-0344 | task | open | — | — | Prerequisites for a real mountain #2 | [detail](../docs/planning/pending/mountain-2-prerequisites.md) |
| R-0345 | task | open | — | — | Subdomain → path-based tenancy — execution plan — 20260728 | [detail](../docs/planning/pending/tenancy-path-migration-plan-20260728.md) |
| R-0346 | decision | done | adopted | — | Tenancy URL model — subdomains or paths? — Decision doc — 20260728 | [detail](../docs/planning/pending/tenancy-url-model-decision-20260728.md) |
| R-0347 | bug | open | — | — | Signing out issues an unauthenticated Firestore permission read, and the catch swallows it | [detail](./records/R-0347.md) |
| R-0348 | task | open | — | — | The orphan-delete path has never been verified in production — the last live PIPA gap | [detail](./records/R-0348.md) |
| R-0349 | task | done | — | — | Live-verify the auth changes on Preview — Kakao sign-in, its linking fallback, and the orphan delete | [detail](./records/R-0349.md) |
| R-0350 | question | open | — | — | Owner call: should the `설명 없음` filler come back on the photo modal? | [detail](./records/R-0350.md) |
| R-0351 | task | done | — | — | Existing photo records carry fabricated 촬영일 — videos self-heal, photos do not | [detail](./records/R-0351.md) |
| R-0352 | task | done | — | — | Tap the 이 냥이 링크 chip on a real phone — the mobile half proven only by stubs | [detail](./records/R-0352.md) |
| R-0353 | question | open | — | — | Owner call: a GA4 `page_view` now fires on every cat-modal open | [detail](./records/R-0353.md) |
| R-0354 | task | done | — | — | Safari pass — confirm the 30-second Firestore stall is gone in production | [detail](./records/R-0354.md) |
| R-0355 | question | open | — | — | Owner call: should the CMS "YouTube에 없는 영상" panel show thumbnails instead of a title list? | [detail](./records/R-0355.md) |
| R-0356 | question | open | — | — | Owner call: a video's 제목 appears twice — YouTube's player overlay and our caption | [detail](./records/R-0356.md) |
| R-0357 | question | open | — | — | Owner call: may an 입양홍보 popup displace a 공지사항 one? | [detail](./records/R-0357.md) |
| R-0358 | task | open | — | — | Local uploads went to the pre-migration Storage bucket, and what landed there is stranded | [detail](./records/R-0358.md) |
| R-0359 | task | open | — | — | Unverified on Preview: the 입양홍보 popup and the duplicate-filename 409 | [detail](./records/R-0359.md) |
| R-0360 | task | open | — | — | Four /admin/tag-videos repairs are unverified against real YouTube | [detail](./records/R-0360.md) |
| R-0361 | task | open | — | — | Per-page admin button spec sheets — the owner wants one for every CMS page | [detail](./records/R-0361.md) |
| R-0362 | task | deferred | — | — | 촬영일 is guessed from the filename when it should be read from the file's own metadata | [detail](./records/R-0362.md) |
| R-0363 | task | open | — | — | M5 post-cutover cleanup — legacy role fields, the superseded about doc, and the local dumps | [detail](./records/R-0363.md) |
| R-0364 | task | open | — | — | Click through the 탈퇴 flow in production with a throwaway account | [detail](./records/R-0364.md) |
| R-0365 | task | deferred | — | — | Compliance carry-overs — legal review, signup consent, a PIPA audit, and Kakao scope verification | [detail](./records/R-0365.md) |
| R-0366 | question | open | — | — | Owner question: keep the dev-promotion model, or move to GitHub Flow? | [detail](./records/R-0366.md) |
| R-0367 | task | open | — | — | Glance at the admin screens while logged in — the only unverified part of the colour work | [detail](./records/R-0367.md) |
| R-0368 | decision | abandoned | rejected | — | Renaming the Firestore database was investigated and dropped | [detail](./records/R-0368.md) |
| R-0369 | decision | abandoned | rejected | §10k | The `?type=` fallback for post routing was written and rejected on review | [detail](./records/R-0369.md) |
| R-0370 | decision | done | adopted | §10u | Destructive modals keep a red button, so they are not on `useDialog.confirm()` | [detail](./records/R-0370.md) |
| R-0371 | decision | abandoned | rejected | §10d | "One video per post" was reversed before it was built — do not implement a cap | [detail](./records/R-0371.md) |
| R-0372 | decision | done | adopted | §10d | Not a bug: 공지사항's picker refuses videos because it is the image picker | [detail](./records/R-0372.md) |
| R-0373 | decision | abandoned | rejected | §10c | A per-cat page /pages/cats/[id] was declined on cost — so link previews still do not show the cat | [detail](./records/R-0373.md) |
| R-0374 | decision | done | adopted | — | YouTube is the source of truth for videos — no UI path may write video data to Firestore | [detail](./records/R-0374.md) |
| R-0375 | decision | done | adopted | §10s | A cat doc id need not match the cat's name — do not "fix" it | [detail](./records/R-0375.md) |
| R-0376 | decision | done | adopted | — | The YouTube refresh token lives only in Firestore — an env fallback was rejected | [detail](./records/R-0376.md) |
| R-0377 | decision | deferred | — | — | Known gap, logged not fixed: the YouTube status panel reports healthy on a token that cannot write | [detail](./records/R-0377.md) |
| R-0378 | decision | done | adopted | — | Everything gated on "before a real mountain #2" lives in one document — do not re-list it elsewhere | [detail](./records/R-0378.md) |
| R-0379 | decision | done | superseded | — | The cross-subdomain sign-out defect became structurally impossible, so revokeRefreshTokens is optional hardening | [detail](./records/R-0379.md) |
| R-0380 | decision | done | adopted | — | generate-youtube-signed-url was deleted rather than gated — it had no caller in any commit | [detail](./records/R-0380.md) |
| R-0381 | decision | done | adopted | — | The butler post pages keep gating on `isAuthenticated` only — accepted | [detail](./records/R-0381.md) |
| R-0382 | decision | done | adopted | §10t | A video's YouTube 설명 is taken verbatim on every composer, empty included — reversing an earlier decision | [detail](./records/R-0382.md) |
| R-0383 | decision | done | adopted | §12 | Auto-detect long polling was discarded as a no-op; the browser is forced onto long polling instead | [detail](./records/R-0383.md) |
| R-0384 | decision | done | adopted | §10g | `youtubeStatus` is absent on any record never checked, and absent means watchable | [detail](./records/R-0384.md) |
| R-0385 | decision | done | adopted | — | .env.test declares the SMTP keys blank, and blank is load-bearing | [detail](./records/R-0385.md) |
| R-0386 | decision | done | adopted | — | /api/contact still returns success when the notification fails — deliberately | [detail](./records/R-0386.md) |
| R-0387 | decision | done | adopted | — | .env.example is force-added to git — .gitignore had swallowed it entirely | [detail](./records/R-0387.md) |
| R-0388 | decision | done | adopted | — | The e2e "flake set" advice is retired — a red run means something again | [detail](./records/R-0388.md) |
| R-0389 | decision | done | adopted | — | Nothing the server could not have known may affect the first client render | [detail](./records/R-0389.md) |
| R-0390 | decision | done | adopted | §10l | Four things decided inside the edit-composer change, plus 급식현황 staying on the URL editor | [detail](./records/R-0390.md) |
| R-0391 | decision | done | adopted | — | Standing rule: snapshot before any script writes to prod data | [detail](./records/R-0391.md) |
| R-0392 | decision | abandoned | rejected | — | A GCS export bucket was considered and rejected | [detail](./records/R-0392.md) |
| R-0393 | decision | done | adopted | — | Weekly, not daily, backups — deliberate | [detail](./records/R-0393.md) |
| R-0394 | decision | done | adopted | — | The Firestore shared with a second app is benign — no action needed | [detail](./records/R-0394.md) |
| R-0395 | decision | done | adopted | §9 | The multi-tenant URL model is path-based, and planning it found an authorization inversion | [detail](./records/R-0395.md) |
| R-0396 | decision | abandoned | rejected | — | Cross-origin session propagation would multiply the sign-out defect, not fix it | [detail](./records/R-0396.md) |
| R-0397 | decision | done | adopted | — | Correction: Kakao needs no per-subdomain redirect URI | [detail](./records/R-0397.md) |
| R-0398 | decision | done | adopted | — | 집사게시판 lost media upload entirely — it is a 급식소 check-in log, not a second composer | [detail](./records/R-0398.md) |
| R-0399 | decision | abandoned | rejected | — | Replacing Firebase with Supabase to escape vendor lock-in was set aside | [detail](./records/R-0399.md) |
| R-0400 | decision | done | adopted | §9 | The multi-tenant architecture questions Q1–Q8 were answered | [detail](./records/R-0400.md) |
| R-0401 | decision | done | adopted | §9 | The role model is a map keyed by mountainId — one account can hold roles on several mountains | [detail](./records/R-0401.md) |
| R-0402 | decision | done | adopted | §9 | Accepted dev-only caveat: relative links escape a path-prefixed tenant back to the default | [detail](./records/R-0402.md) |
| R-0403 | decision | done | adopted | — | The same-day auto-commit grant was revoked — every commit is owner-gated again | [detail](./records/R-0403.md) |
| R-0404 | decision | done | adopted | — | `build.js` also writes a gitignored `registry.db`, reversing "no .db is ever written" | [detail](./records/R-0404.md) |
| R-0405 | decision | done | adopted | — | Work tracking lives in a root `work_tracking/` folder, scripts included — not under the app's `scripts/` | [detail](./records/R-0405.md) |
| R-0406 | decision | done | adopted | — | Companion planning documents are indexed as one pointer row each, never flattened into rows | [detail](./records/R-0406.md) |
| R-0407 | decision | done | adopted | — | The owner archives superseded artifacts to `docs/archive/` by hand — the migration does not relocate files | [detail](./records/R-0407.md) |
| R-0408 | decision | done | adopted | — | `PROJECT_PLAN.md` and `HANDOFF.md` move into `work_tracking/` — owner-confirmed, and still not done | [detail](./records/R-0408.md) |
| R-0409 | decision | done | adopted | — | Source files are migrated one at a time, each ticked off before the next begins | [detail](./records/R-0409.md) |
| R-0410 | decision | done | adopted | — | The schema is not frozen — change it when changing it is the best fix | [detail](./records/R-0410.md) |
| R-0411 | decision | done | adopted | — | `status` gains `deferred`, and a deferred row must carry a non-empty `note` | [detail](./records/R-0411.md) |
| R-0412 | decision | done | adopted | — | `R-0140` and `R-0142` stay `open`, not `deferred` | [detail](./records/R-0412.md) |
| R-0413 | decision | done | adopted | — | `type` gains `question` — an unanswered owner question is not a task | [detail](./records/R-0413.md) |
| R-0414 | decision | done | adopted | — | `checkin` stamps `work.json` with `checked_in` and never deletes it | [detail](./records/R-0414.md) |
| R-0415 | decision | done | adopted | — | Unknown field names are rejected in `lib.js` rather than left to SQLite | [detail](./records/R-0415.md) |
| R-0416 | decision | done | adopted | — | Import a decision only when its reasoning is recorded nowhere else | [detail](./records/R-0416.md) |
| R-0417 | decision | done | adopted | — | `HANDOFF.md` was cut to ~150 lines in the same commit as its import, ahead of Phase 4 | [detail](./records/R-0417.md) |
| R-0418 | decision | done | adopted | — | The work-tracking CI job is independent of the app's jobs | [detail](./records/R-0418.md) |
| R-0419 | task | done | — | — | Phase 3a — migrate `MIGRATION_JOB.md` into the registry and stub it (the dogfooding test) | [detail](./records/R-0419.md) |
| R-0420 | task | done | — | — | Phase 3 — lift the decisions held *inside* the two decision documents as their own rows | [detail](./records/R-0420.md) |
| R-0421 | task | done | — | — | Phase 3 — set `split_from` on the `PROJECT_PLAN` break-outs | [detail](./records/R-0421.md) |
| R-0422 | task | done | — | — | Phase 3 — repoint the 18 cross-references that still aim at stubbed files | [detail](./records/R-0422.md) |
| R-0423 | task | done | — | — | Phase 4 — break up `PROJECT_PLAN.md`'s mega-cells | [detail](./records/R-0423.md) |
| R-0424 | task | done | — | — | Phase 4 — apply a size policy to `docs/handoff/`, so the living document cannot grow back | [detail](./records/R-0424.md) |
| R-0425 | task | done | — | — | Phase 5 — rewrite `CLAUDE.md` and `AGENTS.md` to describe the new structure | [detail](./records/R-0425.md) |
| R-0426 | task | open | — | — | Phase 5 — un-pause application work; the successor workstream is still unnamed | [detail](./records/R-0426.md) |
| R-0427 | task | deferred | — | — | Repoint the 20 companion-document `detail_ref`s when the archive move happens | [detail](./records/R-0427.md) |
| R-0428 | task | done | — | — | Move `PROJECT_PLAN.md` and `HANDOFF.md` into `work_tracking/` | [detail](./records/R-0428.md) |
| R-0429 | bug | done | — | — | The `HANDOFF.md` import wrote all 57 record files with an empty body, and every count still reported success | [detail](./records/R-0429.md) |
| R-0430 | decision | done | adopted | §9 | Management only, not custody — the second mountain owner manages content; you hold the data, the bill and the PIPA duty | [detail](./records/R-0430.md) |
| R-0431 | decision | done | adopted | §9 | Under B1 tenant isolation is a correctness property, and the shared permission check had no mountain dimension | [detail](./records/R-0431.md) |
| R-0432 | decision | done | adopted | §9 | GA4 stays one shared property with a `mountain_id` dimension; per-mountain dual-tagging is deferred | [detail](./records/R-0432.md) |
| R-0433 | decision | abandoned | rejected | §9 | Closing the cross-subdomain login friction was rejected — both designs mean owning a bearer credential Firebase does not validate | [detail](./records/R-0433.md) |
| R-0434 | decision | done | adopted | §9 | Path-based tenancy is not a one-way door — the host-rewrite middleware and the `domains` config stay | [detail](./records/R-0434.md) |
| R-0435 | bug | done | — | — | The Phase 2 import truncated ten records mid-sentence, and left four of the tails orphaned in `PROJECT_PLAN.md` | [detail](./records/R-0435.md) |
| R-0436 | task | done | — | — | 139 record titles trailed off mid-phrase — the import used an item first physical line as its title | [detail](./records/R-0436.md) |
| R-0437 | bug | done | — | — | 193 relative links across the docs do not resolve, most of them in docs/handoff/archive/ | [detail](./records/R-0437.md) |
| R-0438 | decision | done | adopted | — | The "643 of 1,274" grep figure is withdrawn; never-grep-the-store stands on reproducible evidence instead | [detail](./records/R-0438.md) |
| R-0439 | change | done | — | — | The session-close hand-off procedure is now a skill, .claude/skills/handoff/ | [detail](./records/R-0439.md) |
| R-0440 | change | done | — | — | Two guards written down: only checkin.js writes the store, and prose is finished before check-in | [detail](./records/R-0440.md) |
| R-0441 | decision | done | adopted | — | SCHEMA.md was two documents wearing one name; the workflow is now WORKFLOW.md | [detail](./records/R-0441.md) |
| R-0442 | task | done | — | — | Three statements still live in both AGENTS.md and WORKFLOW.md, and they predate the split | [detail](./records/R-0442.md) |
| R-0443 | decision | done | adopted | — | Which rules belong in AGENTS.md: the ones that fail silently, and each explanation names its rule | [detail](./records/R-0443.md) |
| R-0444 | change | done | — | — | R1 read as if new items were outside the loop, and the same-change rule was never numbered | [detail](./records/R-0444.md) |
| R-0445 | task | open | — | — | Six record files state a status their row contradicts, and no gate compares the two | [detail](./records/R-0445.md) |
| R-0446 | task | open | — | — | README.md labels the hand-off with a path it no longer has, and link-check cannot see it | [detail](./records/R-0446.md) |
| R-0447 | change | done | — | — | Seven places in AGENTS.md and WORKFLOW.md explained less than they appeared to | [detail](./records/R-0447.md) |
| R-0448 | task | done | — | — | Make emoji markers scarce in the four living documents; the owner declined to gate it | [detail](./records/R-0448.md) |
| R-0449 | task | open | — | — | Audit the project-status memories against the registry, which now holds what most of them hold | [detail](./records/R-0449.md) |
| R-0450 | task | open | — | — | Make the pre-commit hook verify rather than repair, and format on save instead | [detail](./records/R-0450.md) |
| R-0451 | task | open | — | — | Replace next lint with ESLint directly, and resolve the two competing ESLint configs | [detail](./records/R-0451.md) |
| R-0452 | task | open | — | — | Decide whether ESLint warnings should fail the build, and answer the nine that exist | [detail](./records/R-0452.md) |

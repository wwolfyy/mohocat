# 산냥이집냥이 — Engineering Hand-off (living / continuously updated)

**Last updated:** 2026-07-27 · **Branch:** `dev` · **`main`:** promoted through PR #8
(2026-07-23 — the multi-mountain M1–M5 bundle; supersedes PR #7)

> ### 🔜 Starting a fresh session? Read this box first.
>
> The last session (2026-07-27) separated the two post composers and made YouTube filing
> per-mountain — four commits, plan
> [`butler-media-separation-plan-20260727.md`](../planning/butler-media-separation-plan-20260727.md).
> **집사게시판 no longer uploads media at all** (it is a 급식소 log; 집사톡 is the media
> composer), 집사톡 gained one-file-per-section with per-file 제목/설명, and every uploaded
> video is now filed into its mountain's playlist from config instead of by matching a
> playlist _title_.
>
> 🔎 **Pattern worth carrying forward, again:** the 촬영일 off-by-one (`97b72ed`) was
> **correct at UTC and wrong in KST**, so CI could never have caught it — the same shape as
> the fixture problems of 2026-07-26. When a date, a fixture, or an environment differs
> between CI and production, green means nothing. The new date tests pin `TZ=Asia/Seoul` and
> assert the timezone fixture is real before anything else.
>
> **Do these next, in this order:**
>
> 1. **Push.** Everything from `d7999e2` on is committed locally but **not pushed**, so
>    Preview does not have it yet.
> 2. **Verify on Preview what no test can reach** (needs the deploy + one **🔄 토큰 갱신** on
>    대쉬보드, since the OAuth scopes changed): a metadata edit, a playlist save,
>    `자동 날짜 인식`, that a synced video **keeps its original 게시일** and that
>    **메타데이터 수정** shows a date, and that **batch** tag / 촬영일 / playlist edits reach
>    Firestore **without** a manual 동기화. **New this session:** that a 집사톡 upload lands in
>    the **계양산** playlist, an 입양홍보 upload lands in **both** its mountain playlist and
>    **산냥이집냥이 - 입양홍보**, and that an empty 설명 uploads with no description.
> 3. **Re-run the P5.4 manual pass from the top.** Still the gate on the next `dev → main`
>    promotion.
> 4. Then the promotion itself (M6/M7/M8 + the GA4 guide + both July sessions are waiting).
>
> **Do NOT** delete `YOUTUBE_REFRESH_TOKEN` from Vercel **Production** until the promotion
> lands — `main` is pre-fix and reads the token from env only.
>
> 🔑 **One owner chore is outstanding:** the 계양산 playlist holds **4** of the channel's
> **13** videos. The back catalogue needs a one-time bulk add, because the per-mountain
> playlist is the handle the deferred `syncVideos` fix will use — videos left out will look
> unowned.

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

- **🎉 Production `main` now runs the multi-mountain platform** — promoted via **PR #8**
  (`dev → main`, merge commit `366425c`, 2026-07-23), a 34-commit bundle: the whole
  multi-tenant **M1–M5** refactor, data protection (PITR/backups), and the CI rules gate.
  Supersedes **PR #7** (`65d2020`, 2026-07-16 — landing/admin redesign, adoption,
  compliance, mobile map, Seoul storage, e2e suite).
- **🔑 The M5 prod cutover is COMPLETE (owner-run, 2026-07-23):** snapshot → migration
  (`currentRole`→`roles` map, `'default'`→`geyang` normalized) → `firestore:indexes`
  deployed (6 composite, Enabled) → **PR #8 merge** → `firestore:rules` deployed
  (mountain-aware). So production now **stamps + scopes by `mountainId`, resolves
  `roles[mountainId]`, and enforces the mountain-aware rules**. _(Post-cutover cleanup —
  deleting the legacy `currentRole` + `about_content/about` + the local dump — is the
  only tail; see Open threads.)_
- **Testing & CI workstream is CLOSED** — main is CI-gated (+ the new emulator-backed
  `rules` job runs `test:rules`).
- **Branch model in effect:** `dev` (staging / Vercel Preview) promotes to `main`
  (production / Vercel) via a **merge commit**. After PR #8, `dev` is an ancestor of
  `main` and `main` is a merge commit ahead; fast-forward `dev` to `main`
  (`git checkout dev && git merge --ff-only main && git push`) to fully sync.
- **Complexity retirement — ✅ COMPLETE & COMMITTED (P0–P6, all on `dev`).**
  Seven commits: P0 `6454d80` → P1 `431c69f` → P2 `fdba4ee` → P3 `1d13e09` →
  P4 `34c5c68` → P5 `ea2fab4` → P6 `2584dcb`. Final gates: full e2e
  **116 passed / 13 skipped / 0 failed**, tsc / smoke 29-29 / unit 25-25. Net:
  four content forms 2,135→859 on `src/components/forms/` primitives; both admin
  editors 4,430→~2,650 on the `src/components/admin/media/` toolkit; ~45 native
  `alert()/confirm()` prompts now shared-Modal dialogs (`ui/useDialog`); 집사톡's
  broken image upload fixed; `react-hook-form` removed. ⚠️ **The one remaining
  track item is owner-owed:** the P5.4 scripted manual YouTube pass (editor
  sync/playlists + form video upload, real creds, on Preview) before the next
  `dev → main` promotion. 🐛 **STARTED 2026-07-26 and became a bug hunt — six defects found
  and fixed, all pre-existing, none reachable by the automated suites as they stood.** In
  order: (1) routes read the refresh token from env while the 「토큰 갱신」 button writes it to
  Firestore; (2) `manage-playlists` POST read a channel-ID env var set nowhere; (3) the admin
  OAuth flow requested too few **scopes**, so its tokens could never edit metadata; (4)
  `자동 날짜 인식` wrote Firestore, and the sync erased those dates; (5) batch playlist save
  ignored the batch selection; (6) every sync reset a video's 게시일 to "now", reordering the
  **public** 영상첩; (7) **owner-reported** — batch edits reached YouTube but never synced back,
  because the batch mutations handed the sync route **Firestore doc ids** where it needs
  **YouTube ids**. All ✅ fixed and pushed. **The pass must re-run from the top** — the
  credential source, the scopes, and four write paths all changed under it.
  _Exactly what a manual pass is for; the automated suites were green throughout._
- **Multi-tenant / multi-mountain refactor — ✅ M1–M5 DONE & DEPLOYED TO PROD (PR #8,
  2026-07-23; cutover complete). ✅ M6 DONE on `dev` (2026-07-25) — no prod migration needed.**
  **M6 (2026-07-25):** per-tenant **upload** namespacing — `generate-signed-url` + the form
  image strategy prepend the active tenant's `storagePrefix` (geyang `''` → exact no-op), so a
  future mountain's uploads land under `mountains/<id>/…`. **Scope was corrected mid-flight:**
  the first draft also namespaced baked thumbnails + a `cats.thumbnailUrl` migration, but
  inspecting prod showed cat thumbnails **and** album photos are served from live Firebase
  **Storage URLs** (not baked paths) — already tenant-scoped, so the migration was a 0-change
  no-op and was **reverted/deleted** (baking + fixtures back to flat). Gates: tsc 0 / unit +2 /
  smoke 30 / **e2e 125/13/0**. **No cutover.** Image-serving model now documented in
  [`media-and-youtube.md`](../codebase/media-and-youtube.md#image-storage--serving-strategy).
  **M7 (2026-07-25) — ✅ committed on `dev` (`48f7085`):** analytics decoupled from the
  Firebase SDK → shared **GA4** via `gtag.js` (root-layout `<Script>`, gated on
  `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `send_page_view:false`); `AnalyticsTracker` emits every
  `page_view` with `mountain_id` from `useMountain()`. `getAnalytics` + the `analytics`
  export gone from `services/firebase.ts`. 🔑 **Owner-owed (not code):** register the GA4
  property + `mountain_id` custom dimension **before any tenant-2 traffic**, and add
  `NEXT_PUBLIC_GA_MEASUREMENT_ID` to Vercel Prod+Preview.
  **M8 (2026-07-25) — ✅ committed on `dev` (`a237e8b`):** per-tenant
  **primary color** — a `primary` tailwind token → `--color-primary` CSS var, injected per
  tenant on `:root` by the `[mountain]` layout; public CTAs repointed `from-brand`→
  `from-primary`; geyang reconciled to zero-change (`#FACC15`), manisan verified sky-blue.
  Owner-chose the minimal "primary only" scope. Gates tsc 0 / smoke 30 / unit 71 / **e2e
  125/13/0**. M8 also rewrote the provisioning guide + finished the docs close-out — **the
  multi-tenant track (M0–M8) is complete**; only owner-gated GA4/DNS externalities remain. See
  the workstream section.
  Summary of the M5 sub-phases below.
  **M5.4a (2026-07-23):** `manisan` added as a `hidden: true` stub tenant in
  `mountains.json` (routable at `/manisan`, prerendered, but excluded from the public
  `MountainSelector`) + seeded in `seed-emulators.mjs` (distinct content + a manisan-only
  admin and a dual-mountain admin). **M5.4b (2026-07-23):** the two-tenant isolation e2e —
  `tests/e2e/api/tenant-isolation.spec.ts` (Host-scoped data reads + mountain-scoped API
  authz: single-mountain admin 403 cross-tenant, dual admin 200 on both) +
  `tests/e2e/public/tenant-isolation.spec.ts` (rendered content isolation, desktop+mobile).
  **Full e2e 125/13/0** (+9). The `contacts` PII read-isolation is covered by the rules
  suite, not duplicated. **M5.3 route audit DONE (2026-07-23):** walked all 21 `src/app/api/**`
  routes — every Firestore access path is either correctly tenant-scoped (cats/points/
  contact/assign-role/upload-youtube video record) or correctly central-by-design
  (users, `role_permissions/*` matrix). **No leak-by-omission.** The only residual
  cross-tenant surface is the **shared YouTube channel** (non-Firestore; already deferred
  = M5.1 note b — `getYouTubeChannelId` is per-tenant config but the OAuth credential /
  `admin_config/youtube_auth` is shared). Out-of-scope find logged as an open thread: 7
  ungated write/credential routes (pre-existing, orthogonal to tenancy). Q1–Q8 answered (management-only · B1 one-Firestore-
  `mountainId` · A1 one-Vercel + subdomains · visitor-facing selector); plan + live
  tracker:
  [`multi-mountain-refactor-plan-20260719.md`](../planning/multi-mountain-refactor-plan-20260719.md).
  M1–M3 (`8920c66`/`092d226`/`491b832`, 2026-07-19) + **M4 (`b83a112`, 2026-07-20)**
  landed the `[mountain]` segment + host-rewrite middleware, the per-tenant service
  factory, write stamps, and the **prod backfill (99 docs stamped `mountainId=
'geyang'`, triple-verified)**. See the workstream section for M1–M4 detail.
  **M5.1 (`d4a0bb2`, 2026-07-22):** every content read scoped by `mountainId`
  (collection queries + doc-by-id tenant guards + the 2 Admin-SDK server reads);
  new `firestore.indexes.json` (6 composite indexes, **hand-derived — the emulator
  auto-creates indexes and won't flag a missing one**). **M5.2 (`47d0f3d`,
  2026-07-22):** the **role model is now a map keyed by `mountainId`** —
  `users.currentRole` → `roles: Record<mountainId, UserRole>`, so one account can
  admin several mountains and the host picks which applies (§0 sub-decision 6, owner
  2026-07-22). `hasPermissionFor(uid, perm, mountainId)` everywhere; `firestore.rules`
  rewritten mountain-aware (`canWrite` gates on the doc's own `mountainId` + blocks
  cross-mountain moves; sensitive reads scoped; `users` read self-only; dead
  `analytics` block removed); `requireApiPermission` folds in **M5.3's core**.
  **M5.2a and M5.2b were inseparable at the emulator gate** (rules + seed both key on
  the role shape). Gates: tsc, smoke 30/30, unit 39/39, **rules 11/11** (new mountain
  dimension), **full e2e 116/13/0**. ✅ **The order-critical prod cutover ran successfully
  2026-07-23** in the required sequence — snapshot → migration → indexes (Enabled) → PR #8
  merge → rules deploy — so all of M5 is now **live in production**. The 6-step runbook
  ([`m5-prod-cutover-runbook`](../manuals/deployment/m5-prod-cutover-runbook.md)) stays as
  the record of how it was done + rollbacks. **M5 is DONE & DEPLOYED; the active track
  advances to M6.**
- ✅ **CI updated for M5 (2026-07-23).** A dedicated emulator-backed `rules` job was added
  to `.github/workflows/ci.yml` (Java + Firebase-emulator cache, no browser) that runs
  `npm run test:rules` — so a mountain-aware rules regression now fails CI. The M5.4
  two-tenant isolation e2e was already covered by the existing `e2e` job (`npm run
test:e2e` globs all of `tests/e2e/**`), so it needed no wiring. **The CI thread is
  resolved.**
- **NEW — data protection now exists (2026-07-20).** Prompted by M4's backfill
  running against prod with **no backup and no PITR** (safe only because it was
  additive and exactly reversible). Now in place: **PITR enabled** (7-day
  window), a **weekly** Firebase backup schedule, and `npm run backup:firestore` /
  `import-firestore.js` for local, off-Google dumps (**round-trip verified
  lossless** — prod → emulator → re-export, 16/16 files byte-identical).
  **Standing rule: snapshot before any script writes to prod data** — wired into
  the plan's M6 as a precondition. Runbook:
  [`admin-manual` §10](../manuals/admin-manual/README.md#10-backups--recovery-owner).
  ⚠️ Dumps carry a live OAuth refresh token + `contacts`/`users` PII — local only,
  `/backups/` is git-ignored. A GCS export bucket was **considered and rejected**
  (a second PII store to secure and disclose, for protection PITR already gives).
- **This Firestore is shared with a second app (owner-confirmed, benign).**
  `image_uploader` (13 docs) is the **owner's own image-upload script** (confirmed
  2026-07-22) — a one-off 2020-photo triage queue, invisible to this codebase, no
  `firestore.rules` entry (Admin-SDK only), no `mountainId`. It also shares Storage
  (`images_thumbnail/` under the same bucket). The M5.2b rules land on this shared DB
  but don't touch `image_uploader` (default-deny, untouched). No action needed unless
  that script ever promotes records into `cat_images` (then they'd need a `mountainId`
  stamp).
- ✅ **M0 rules deploy DONE (owner, 2026-07-22).** The pending pre-M5 `firestore:rules`
  (급식소 CMS + scoped `users` self-write + Tier 1 admin-write-clause removal) were
  deployed. ⚠️ **A NEW rules deploy is now owed** for M5.2b's mountain-aware rules —
  and it must be preceded by the migration (see Open threads for the exact order).
- Also owner-owed before the next `dev → main` promotion: the P5.4 scripted manual
  YouTube pass (see the complexity-retirement section).
- **Tree:** clean through **`7e3c517`** (the GA4 guide). The whole multi-tenant epic (M0–M8)
  is committed on `dev`; `main` is an ancestor of `dev` (`dev` leads by 234). M6/M7/M8 + the
  GA4 guide are on `dev` but **not yet promoted to prod** — gated on the P5.4 YouTube pass.

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

### Data protection / backups — ✅ IN PLACE (2026-07-20)

Did not exist before 2026-07-20. Prompted by M4's prod backfill running with no
snapshot and no PITR — see the M4 note below for why that was survivable.

**Three layers, each covering what the others don't:**

| Layer                          | Covers                                  | Restores by                   |
| ------------------------------ | --------------------------------------- | ----------------------------- |
| **PITR** (enabled 2026-07-20)  | Bad write / delete noticed **≤ 7 days** | Any moment in the window      |
| **Weekly backup schedule**     | Same, noticed later                     | ⚠️ Creates a **new database** |
| **`npm run backup:firestore`** | Project loss + pre-migration insurance  | `import-firestore.js`         |

- **Weekly, not daily, is deliberate** — it meshes with PITR's 7-day window, so
  every moment is covered by either PITR or a ≤7-day-old snapshot. No gap; dailies
  would add cost, not coverage.
- **GCS export bucket considered and rejected** — a second PII store to secure and
  disclose under PIPA, for protection PITR already provides. Recorded so it isn't
  silently re-proposed.
- **Scripts** (`scripts/maintenance/`): `export-firestore.js` discovers collections
  via `listCollections()` (never a hard-coded list — that's how `image_uploader`
  was found), tags Firestore-native types with `__type` so they round-trip, and
  throws rather than writing a lossy dump. `import-firestore.js` is the inverse:
  **dry-run by default** (inverted vs the backfill script — this one overwrites),
  applying needs `APPLY=true` **and** `CONFIRM_PROJECT` matching the target, and
  the banner names `EMULATOR` vs `⚠️ LIVE`. Writes are full `set()` (restore
  semantics); documents absent from the dump are **not** pruned.
- **Verified by round-trip, not inspection:** prod → emulator → re-export → diff,
  16/16 files byte-identical. That test caught two real things: timestamps must
  rebuild from `seconds`+`nanoseconds` (ISO is ms-precision and would silently
  round), and **a dry run opens no connection** — a wrong emulator port survived a
  clean-looking preview.
- ⚠️ **Dumps are credentials**: live OAuth refresh token (`admin_config`) +
  `contacts`/`users` PII. `0600` in a `0700` dir, `/backups/` git-ignored, keep
  local, delete when done.
- Runbook: [`admin-manual` §10](../manuals/admin-manual/README.md#10-backups--recovery-owner).

### Multi-tenant / multi-mountain refactor — ✅ COMPLETE (M0–M8), all committed on `dev`. ✅ M1–M5 DEPLOYED TO PROD (PR #8, 2026-07-23). ✅ M6 (`d644d1b`) + M7 (`48f7085`) + M8 (`a237e8b`) + GA4 guide (`7e3c517`) on `dev`, not yet promoted. Only owner-gated externalities remain (GA4 dimension + Vercel env var; real-mountain DNS).

**M8 (2026-07-25, committed `a237e8b`) — per-tenant theming, minimal scope.**
`config.theme` is now **live** (was dead). A `primary` tailwind token → `--color-primary` CSS
var (default `#FACC15` = geyang's shipped `brand.DEFAULT`); the `[mountain]` layout injects
`:root{--color-primary:<tenant primaryColor>}` per request (hex-validated fail-loud; on
`:root` so portaled modals inherit it). The `from-brand to-accent` CTA gradient was repointed
to `from-primary` on the **public** surfaces — shared `ui/Button`, header 입양홍보 CTA
(`Navigation`), Leaflet cluster marker, adoption + faq page CTAs. geyang's stale
`theme.primaryColor` `#ffbc00` → **`#FACC15`** (zero-change). **Owner-chosen scope: "primary
color only"** over the rejected full-ramp option — the `brand` ramp + admin-only `from-brand`
CTAs stay static (a real 2nd mountain would still read yellow there; fuller pass later).
**Browser-verified** (`/` vs `/manisan`): geyang CTA `#FACC15` (unchanged), manisan `#0ea5e9`
(sky-blue). Gates: tsc 0, smoke 30/30, unit 71/71, **e2e 125/13/0**. The **provisioning guide**
(`new-mountain-setup.md`) was rewritten as a real runbook and the **docs close-out** is done
(`multi-tenant-config.md`, `services-layer.md`, AGENTS/CLAUDE.md, admin manual §9, PROJECT_PLAN
§9, decision framework → EXECUTED). **M8 complete** — only 🔑 owner-gated externalities remain
(GA4 `mountain_id` dimension + Vercel `NEXT_PUBLIC_GA_MEASUREMENT_ID`; per-mountain DNS/console
allowlists when a real mountain #2 arrives).

**M7 (2026-07-25, committed `48f7085`) — analytics decoupling.** `firebase/analytics` →
shared **GA4** via `gtag.js`. A `next/script` `<Script>` in the **root** layout
(`src/app/layout.tsx`) loads gtag gated on `NEXT_PUBLIC_GA_MEASUREMENT_ID`, configured
`send_page_view: false`; `AnalyticsTracker` sends every `page_view` with `mountain_id` (from
`useMountain()`) so the shared property segments per tenant. `services/firebase.ts` drops the
`getAnalytics` import + browser-only `analytics` guard + export; dead `measurementId` removed
from `getFirebaseConfig`. Unset env var (dev/emulator/e2e) → no script, `AnalyticsTracker`
no-ops (= old `analytics=null`). The dead `analytics` **rules** block was already removed in
M5.2 (only the `view-analytics` permission remains). Gates: tsc 0, smoke 30/30, unit 71/71,
**e2e 125/13/0**. 🔑 **Owner-owed (not code):** GA4 property + `mountain_id` custom dimension
registered **before any tenant-2 traffic**, and `NEXT_PUBLIC_GA_MEASUREMENT_ID` set in Vercel
Prod+Preview (supersedes `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`, now unused). **No prod
migration.**

**M6 (2026-07-25, committed `d644d1b`) — per-tenant upload namespacing.** Image uploads
prepend the active tenant's `storagePrefix`: `uploadStrategies.uploadImagesToStorage(…,
storagePrefix)` (threaded via `useMountain()` in `useSimpleContentForm`) + the
`generate-signed-url` route (per-request tenant, prefixes object path + `publicUrl`). Geyang
`''` → exact no-op; a new tenant's uploads land under `mountains/<id>/…`.

⚠️ **Scope was corrected mid-flight — read this so it isn't re-litigated.** The plan assumed
thumbnails serve from **baked local paths**; that's only true in e2e fixtures. In **prod**,
cat thumbnails (`cats.thumbnailUrl`) **and** album photos (`cat_images.imageUrl`) are live
Firebase **Storage URLs** (verified against the prod dump), served via Next `<Image>` — so
they're already tenant-scoped by the object path. The drafted thumbnail-namespacing +
`cats.thumbnailUrl` migration were therefore a **0-change no-op** (the dry-run confirmed:
32/32 cats `not-baked`) and were **reverted/deleted** (`fetch-static-assets.js` + `cats.json`
back to flat; `backfill-thumbnail-namespace.js` + the M6 runbook removed). The cat-thumbnail
baking is legacy/dead-in-prod (e2e-only). Full model:
[`media-and-youtube.md → Image storage & serving strategy`](../codebase/media-and-youtube.md#image-storage--serving-strategy).
Gates: tsc 0, unit +2, smoke 30/30, **e2e 125/13/0**. **No prod migration/cutover** —
about-photos stay baked + per-mountain (already handled pre-M6).

**Read-first to resume:**
[`multi-mountain-refactor-plan-20260719.md`](../planning/multi-mountain-refactor-plan-20260719.md)
— the execution plan **and live tracker**: decisions locked (§0), target
architecture (§1), design specs (§2), phases **M0–M8** with per-phase gates and
in-place execution notes (§3), risks (§5), deferred items (§6). **Resume = its §3
`M5`**, where M5.1/M5.2/M5.3 are now checked off with execution notes and the
remaining item is **M5.4 two-tenant isolation e2e**. The
2026-07-18 decision framework
([`multi-tenant-architecture-decision-20260718.md`](../planning/multi-tenant-architecture-decision-20260718.md))
stays as the rationale record; its §9 table carries the answers. PROJECT_PLAN
**§9** is the tracker entry.

**M5.1 (`d4a0bb2`, 2026-07-22) — scoped reads + indexes.** Every content read
carries `where('mountainId','==',…)`; doc-by-id reads got a post-read tenant guard
(a known cross-tenant id reads as "not found"). `media-albums` reads take an explicit
`mountainId` (threaded from the `image-service`/`video-service` wrappers); the two
Admin-SDK server reads (`getAllCatsServer`/`getAllPointsServer`) take it too, threaded
through the pages via the layout's `resolveMountainIdOrNull`. New
`config/firebase/firestore.indexes.json` (6 composite indexes) wired into
`firebase.json` — ⚠️ **hand-derived, because the Firestore emulator auto-creates
indexes and won't surface a missing one** (and these services swallow query errors to
`[]`, so a prod-only gap would silently empty an album).

**M5.2 (`47d0f3d`, 2026-07-22) — per-mountain role model + mountain-aware rules.**
The role model is a **map keyed by `mountainId`** (§0 sub-decision 6): `roles:
Record<mountainId, UserRole>`, one account can hold roles on several mountains, the
host picks which applies. `hasPermissionFor(uid, perm, mountainId)` threaded through
permission-service / `admin.ts` / the client hooks (via `useMountain()`) / butler
pages / AdminAuth; `assign-role` deep-merges `roles[mountainId]`; the members roster
route shows each user's role on the request mountain; **new signups get `roles: {}`**
(no permissions until assigned — which also makes the self-write rule bulletproof).
`firestore.rules` rewritten mountain-aware (`hasPermissionFor` + `canWrite` gating on
the doc's own `mountainId` and blocking cross-mountain moves + sensitive-read scoping

- self-only `users` read + dead `analytics` block removed); `requireApiPermission`
  folds in **M5.3's core** (reads `roles[requestMountainId]`, returns the tenant).
  ⚠️ **M5.2a and M5.2b are inseparable at the emulator gate** — rules + seed both key
  on the role shape. Emulator **rules tests rewritten (`test:rules`, 11/11)** cover the
  mountain dimension. `scripts/migration/migrate-m5-role-and-about.js` written (dry-run
  default): Phase 1 `currentRole`→`roles[mountainId]` (⚠️ **normalizes legacy
  `'default'`→`geyang`** so the prod admin isn't stranded), Phase 2 copies
  `about_content/about`→`about_content/{mountainId}`. Gates: tsc, smoke 30/30, unit
  39/39, rules 11/11, full e2e 116/13/0. **One benign new log** — a single self-healing
  client-SDK `Listen` connection error during a member test (zero `onSnapshot` in the
  code, no test impact); noted in case it recurs.

✅ **The order-critical cutover RAN 2026-07-23 (owner) in the required sequence:**
(1) snapshot → (2) `APPLY=true` migration → (3) `firestore:indexes` deployed (6 composite,
Enabled) → (4) PR #8 `dev → main` merge (app that stamps `mountainId` + reads
`roles[mountainId]` live) → (5) `firestore:rules` deployed. All of M5 is now live in prod.
Record of the sequence + rollbacks:
[`m5-prod-cutover-runbook`](../manuals/deployment/m5-prod-cutover-runbook.md). ⏳ Only tail:
delete the legacy `currentRole` fields + `about_content/about` + the local backup dump once
the prod CMS is confirmed healthy (see Open threads).

**Executed so far (all on `dev`, 2026-07-19; every phase gated on tsc + smoke +
unit + full e2e + browser pass):**

- **M1 `8920c66` — decoupling:** `src/lib/firebase.ts` deleted (`useAboutPhoto` →
  existing `storage-service.getDownloadUrl`); `feeding-spots-admin-service` on the
  shared `@/lib/firebase-admin` init; map imagery → `map.landscapeImage/portraitImage`
  config (fail-loud).
- **M2 `092d226` — config layer:** tenant getters take a **required
  `mountainId`**; deployment secrets are env-only (Q5 — one Firebase project, no
  per-tenant secrets; `MountainSecrets` gone); `getCurrentMountainId()` →
  `getDefaultMountainId()` (fallback-only semantics); new `src/lib/tenant.ts`
  (`resolveMountainIdOrNull`, `findMountainIdByHost`, `getMountainIdForHost`,
  `getRequestMountainId`) + `MountainProvider`/`useMountain()`; API routes resolve
  tenant per-request from Host; `mountains.json` gains `domains`/`storagePrefix`,
  loses the `mountain-cats-users` scaffolding; 12 unit tests.
- **M3 `491b832` — routing:** every non-API route under `src/app/[mountain]/`;
  root layout = bare shell, tenant layout owns chrome + providers +
  `generateStaticParams` + unknown-id 404; `src/middleware.ts` host→rewrite
  (tenant-prefixed paths pass through; default-tenant fallback keeps
  localhost/preview/e2e URLs unchanged); per-mountain `/api/revalidate`;
  `MountainSelector` navigates for real (mapped host → target `domains[0]`,
  else `/{id}` path); map imagery de-module-scoped (per-tenant in-component).
  **Gate: full e2e 116/0 with zero e2e-spec rewrites** (only the smoke suite's
  structural paths moved). Dev matrix verified: `/`→200, `/geyang`→200,
  `/everest`→404, `/api/*` untouched.

⚠️ **Known dev-only caveat (accepted, plan M3 notes):** browsing a _non-default_
tenant via path prefix, in-app relative links escape back to the default tenant;
host-mapped production subdomains are unaffected. ⚠️ **Local e2e ops note:**
`npm run test:e2e` re-fetches `public/` images from the storage emulator —
run `npm run fetch:assets` before eyeballing media surfaces in dev afterwards.

**Decisions (owner, 2026-07-19):** management-only (no custody) · **B1** one
Firestore + `mountainId` on the 12 content collections · **A1** one Vercel project,
host-based selection, subdomains confirmed · selector is visitor-facing · Q5 moot
(one Firebase project serves all mountains; `mountain-cats-users` scaffolding to be
removed) · shared GA4 property + `mountain_id` dimension · preparatory only (stub
tenant + two-tenant e2e prove it; no real mountain #2 provisioned).

**Shape of the work:** M1 decoupling (retire `src/lib/firebase.ts`, path/config
hard-codings) → M2 config layer to explicit-`mountainId` getters + tenant helpers →
M3 **`[mountain]` route segment + host-rewrite middleware** (riskiest; e2e must pass
unchanged via the default-tenant fallback) → M4 stamp writes + prod backfill
(merge-only) → M5 scoped reads + mountain-aware rules/`requireApiPermission` +
two-tenant isolation e2e + rules deploy → M6 per-mountain assets/storage prefix →
M7 analytics → gtag.js with `mountain_id` → M8 stub tenant + theme wiring + real
provisioning guide + docs close-out.

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

### Complexity retirement (refactor) — ✅ COMPLETE — P0–P6 all committed (`6454d80`…`2584dcb`)

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

**✅ P6 DONE (2026-07-19, committed `2584dcb`) — follow-ups.** All ~45 native
`alert()/confirm()` prompts (both editors incl. `useYouTubeVideoMutations`, and the
four public forms via their shared form hooks) converted to a new promise-based
**`ui/useDialog`** primitive on the shared Modal — `await dialog.alert/confirm`
preserves the old blocking sequencing. The four e2e specs' native-dialog handlers
were replaced with role=dialog Modal assertions in the same change (as the P0 net
required). One non-obvious bug caught and fixed by the net: the dialog's unmount
re-render canceled the post-submit `router.push` transition — resolution is now
deferred until after the unmount commits (`DEBUG_LOG` 2026-07-19). Docs refreshed
(P6.2: PROJECT_PLAN §7 → executed, admin-platform + media-and-youtube toolkit
notes) and the close-out logged (P6.3: FEATURE_MOD_LOG entry; assessment status →
✅ EXECUTED). Final gates: full e2e **116/13/0**, tsc, smoke 29/29, unit 25/25.

**✅ P5 DONE (2026-07-19, committed `ea2fab4`) — Target A recomposed.** Both editors
rebuilt on the `src/components/admin/media/` toolkit: `tag-images` 1,715→821 lines
(controller + auto-parse hooks + full presentational set; hand-rolled Lightbox →
shared `ui/Lightbox`; dead `batchUpdateImages` deleted), `tag-videos` 2,450→1,261
lines + a colocated 570-line `useYouTubeVideoMutations` (YouTube orchestration
verbatim, page-owned, NOT genericized; playlist panel/modal page-owned). Drift
between the "twins" absorbed as toolkit knobs (`dateFilterExcludesUndated`,
stats/batch column counts, pagination `windowSize`); the videos **filter panel
keeps page-owned markup** (its layout drifted — unifying it is a product decision,
queueable with P6). Verified: full e2e **116/13/0** against the recomposed pages,
tsc, smoke 29/29, unit 25/25, plus full-page screenshot passes of both editors.
⚠️ P5.4's **scripted manual YouTube pass** (sync + playlists, real creds) stays
owner-owed before the next `dev → main` promotion.

**✅ P4 DONE (2026-07-19, committed `34c5c68`).** Shared-`CatSelectorModal` swap in
both editors (commit-on-done; dead `'youtube-batch'` context dropped) + the
toolkit skeleton + `parseCreatedDateFromFilename` → `@/utils/dateParser`
(converged with the title parser). Verified: full e2e 116/13/0 + screenshot pass
over all four selector contexts; toolkit interfaces owner-approved at P4.5. Detail: assessment §8 P4.

**✅ P3 DONE (2026-07-19, committed `1d13e09`).** What it contains (detail:
assessment §8 P3):

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

⚠️ Before the next `dev → main` promotion, the Family A media paths (YouTube
upload, signed-URL images) owe the **scripted manual pass** on Preview.

---

## Open threads / owner-owed

- ✅ **The two P5.4 YouTube bugs are FIXED (2026-07-26) — the manual pass can resume.**
  Both were surfaced by the pass's first step on Preview and neither is reachable by any
  automated test (the emulator has no YouTube credentials), so **the pass must re-run from the
  top**: the fix changes which credential every route uses.
  - **Bug 1 — split credential source.** `/api/admin/youtube-auth/callback` writes the fresh
    refresh token to **Firestore** (`admin_config/youtube_auth`), but every consuming route went
    through `getYouTubeOAuthConfig()`, which read **env only** — so a stale
    `YOUTUBE_REFRESH_TOKEN` shadowed it and re-authorizing changed nothing. Two extras found
    while fixing: `upload-youtube`'s apparent Firestore fallback was **dead code** (it needed
    the client id/secret from the very config whose absence triggered it), and the same
    all-or-nothing gate meant **`auth-url` refused to start the OAuth flow without a refresh
    token already present** — a bootstrap deadlock on a fresh deployment. Correction to the
    original write-up: **`refresh-video-metadata` was never affected** (it uses the public API
    key, not OAuth).
  - **Fix:** new `src/lib/youtube/credentials.ts` — one resolver for the single shared
    credential, splitting **client identity** (env; effectively never rotates) from **the
    refresh token** (rotates every 7–14 days). All six OAuth consumers migrated;
    `getYouTubeOAuthConfig()` deleted.
  - 🔑 **`YOUTUBE_REFRESH_TOKEN` is gone — the token lives only in Firestore** (owner's call,
    stricter than the originally-planned env → Firestore fallback, which wouldn't even have
    fixed the reported symptom: the stale env token _was_ set and would still have won). A
    fallback was rejected too — it keeps the same failure shape whenever the Firestore doc is
    missing, and earns nothing, since obtaining a token needs client identity only. Follow-ons:
    the status route reports one source instead of two (it used to show Firestore's timestamp
    against the env token); the callback page no longer prints the raw token; `scripts/auth/`
    (the command-line generate-and-paste workflow) deleted; `.env.example` updated.
    ⚠️ **Do not delete the var from Vercel _Production_ before this promotes** — `main` is
    pre-fix and env-only there, so removing it turns YouTube off. Preview can be cleared now,
    and clearing it is the sharpest version of the P5.4 test.
  - **Bug 2 — `manage-playlists` POST channel ID.** `batch_update_playlists` read
    `process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID`, set **nowhere**, so every playlist-membership
    save 500'd; the GET beside it already used `getYouTubeChannelId(authz.mountainId)`. Missed
    when M1 moved channel config out of env vars — both a live bug and a multi-tenant leak.
    Fixed with the tenant-aware getter (no env var added).
  - **Bug 3 — the admin OAuth flow asked for too few scopes** (surfaced immediately after the
    above, on the owner's retry: _"Insufficient Permission"_ on a metadata edit). That message is
    **Google's**, not our gate's ("Insufficient permissions", lowercase/plural) — the token
    lacked the **OAuth scope**. `auth-url` requested only `youtube.upload` + `youtube.readonly`,
    which cover `videos.insert` and reads but **not** `videos.update` or
    `playlistItems.insert/delete` (those need `youtube` / `youtube.force-ssl`). The retired
    `scripts/auth/generate_youtube_refresh_token.js` requested all four, so the token actually in
    use carried them — meaning **the admin panel had never once minted a token that could edit
    metadata**, and only fixing the source above put that token into play. ⚠️ **Exposed by, not
    caused by, the credential fix**: two latent bugs were stacked, the wrong source hiding the
    wrong scopes. Fixed by requesting the CLI script's four scopes. **Requires a
    re-authorization** — scopes are fixed at consent time, so an existing token can't gain them.
  - **Net:** `tests/unit/youtubeCredentials.test.ts` (9 tests) pins the precedence. Gates: tsc
    0, smoke 30/30, unit 80/80, full e2e green. Detail: `log/DEBUG_LOG.md` 2026-07-26.
  - 📌 **Operator note:** the button is **`🔄 토큰 갱신`** on 동영상 관리 — and despite the name
    it runs the **full consent flow**, not a silent refresh, which is why it's also the fix when
    a token's _scopes_ are wrong rather than expired. Click it, sign in, let the window close.
    No env edit, no redeploy, nothing else to keep in sync.
  - 📌 **Known gap, logged not fixed:** the status panel validates a token by refreshing it,
    which succeeds regardless of scope — so a scope-starved token still reports
    유효한 토큰이 있습니다. Same shape as the timestamp bug: reassuring about a credential that
    can't do the job. Detecting it means probing a write endpoint (a product call).
- ✅ **Three more `/admin/tag-videos` bugs found & FIXED 2026-07-26** (`b5f08b7`, `80ba04a`,
  `dc8391f`) — all found by **reading the page while writing its button spec**, none reported,
  none catchable by the existing suites. Full detail in `log/DEBUG_LOG.md`; per-button
  behaviour in [`tag-videos-spec.md`](../manuals/admin-manual/tag-videos-spec.md).
  - **`자동 날짜 인식` wrote Firestore, so its dates were erased.** Video data is
    YouTube-owned and `refresh-video-metadata` rebuilds Firestore from YouTube as a straight
    overwrite (`createdTime: youtubeRecordingDate ? … : null`) — so for exactly the dateless
    videos that button targets, the next sync **or any other save on that video** wrote
    `null` back over the parsed date. Now writes YouTube first, then syncs back.
  - **Batch playlist save ignored the selection.** The modal's save always acted on the video
    open in the edit form, so the batch entry point updated one video — or silently none.
    Now applies to every selected video, **set semantics** (each video ends up in exactly the
    ticked playlists), opening unticked and confirming first because that removal is
    destructive.
  - **Every sync reset 게시일 to "now".** `refresh-video-metadata` wrote
    `uploadDate: new Date()`, and since the admin grid, the **public 영상첩** and the per-cat
    lists all sort by `uploadDate` desc, any edited video jumped to the top of the public
    album with today's date. Now sourced from YouTube's `publishedAt` — so mis-stamped
    records **self-heal on their next refresh, no migration needed**. Two crossings fixed
    alongside: `uploadedBy` was forced to `'admin'` (erasing `'youtube_sync'`), and the edit
    timestamp was written as `lastMetadataRefresh` — a field nothing reads — while the field
    the UI _does_ read (`updated`) was written nowhere, leaving 메타데이터 수정 permanently
    blank. It now writes `updated`.
  - 🔑 **Principle adopted (owner, 2026-07-26): YouTube is the source of truth for videos; no
    UI path may write video data to Firestore.** Anything written there is undone by the next
    sync, so such a write is broken by construction, not merely risky. `/admin/tag-videos` now
    makes **zero** direct Firestore writes (`videoService` there is reads-only), and
    `videoService.updateVideo` has no callers left. Recorded for operators in
    [`admin-manual` §6](../manuals/admin-manual/README.md). ⚠️ The same null-overwrite applies
    to `tags`, `location`, `title`, `description` — the rule, not a code guard, is what stops
    the next occurrence.
  - ⏳ **Unverified against real YouTube** (emulator fixtures have no publish dates and no
    credentials): the 게시일 repair, 메타데이터 수정 appearing, `자동 날짜 인식`, and the batch
    playlist save. All four are stubbed in e2e — see the fresh-session box at the top.
- ✅ **Batch edits never reached Firestore — FIXED 2026-07-26 (owner-reported).** Batch tag /
  촬영일 / playlist saves applied to YouTube but the site's copy only updated after a manual
  📺 YouTube와 동기화; individual saves synced automatically. `/api/refresh-video-metadata`
  takes **YouTube video ids** (it queries the Data API, then finds the doc by
  `where('youtubeId','==',id)`), but the batch loops recorded the **Firestore doc id** from
  the selection and sent those — a 404 the caller swallowed (`if (res.ok) log(…)`, no `else`),
  so the dialog still said 완료. `saveVideoMetadata` was immune because it resolves the
  YouTube id once and reuses it. Fixed: results keyed by `youtubeVideoId`; the refresh call
  extracted into `syncToFirestore()`, which **returns** success and logs the status + body;
  on failure the dialog now says the change reached YouTube but not the site and to press
  동기화. ⚠️ **The fixtures had made this untestable** — no seeded video had a `youtubeId`, so
  `youtubeId || id` collapsed to the doc id; both now carry a distinct one
  (`yt-vid-01/02`), matching production. New regression test asserts the PUT **and** the
  refresh both carry the YouTube id.
- 📌 **New workstream started: per-page admin button spec sheets.** The first is
  [`tag-videos-spec.md`](../manuals/admin-manual/tag-videos-spec.md), organised by **what each
  button writes to** (🔴 YouTube→Firestore = public and irreversible, vs ⚪ local) — a
  distinction the UI itself doesn't show. Owner wants the same for the other CMS pages.
  ⚠️ It is **source-derived, not browser-verified** — worth a `/chrome` pass over the live
  page before cloning the format.
- ⏸️ **DEFERRED — 촬영일 is guessed from the filename when it should be read from the file.**
  Logged 2026-07-27; **the owner explicitly deferred this and does not want it picked up
  soon.** It is **not queued work** — it is recorded so that whoever wonders why 촬영일 comes
  out empty or wrong (an iPhone upload, say) finds the answer instead of re-deriving it. Do
  not start it without the owner asking. The composers derive 촬영일 by regex-matching the
  **filename** (`parseRecordingDateFromTitle`, 4 patterns: `yyyy-mm-dd hh.MM.ss`,
  `yyyymmdd_hhMMss`, `yyyy-mm-dd`, `yyyymmdd`). Nothing reads the file's own contents.
  Consequences, verified against realistic names:
  - **iPhone files never parse.** `IMG_1234.MOV` / `.HEIC` carry no date in the name, so the
    field is left empty and — unless someone types it — `createdTime` silently becomes the
    **upload** moment. Android/KakaoTalk names (`VID_20260315_101530.mp4`) parse fine, so the
    feature works for roughly half of likely sources.
  - **The last pattern is loose** — any 8 digits forming a valid date. `회원 20240101 명단.mp4`
    reads as 2024-01-01. Invalid combinations self-reject, so it is contained but can be
    confidently wrong.
  - 🔑 **The eventual fix, whenever the owner calls for it (shape agreed 2026-07-27):** read
    the **capture date from the file's metadata**,
    with timezone when the metadata carries it, and fall back to the filename only when that
    fails. Applies to **both** video and photo. Landscape: MP4/MOV `mvhd` creation_time is
    spec'd UTC but often written as local with no offset (unreliable); Apple's
    `com.apple.quicktime.creationdate` **does** carry an offset; JPEG EXIF `DateTimeOriginal`
    has no zone historically, with `OffsetTimeOriginal` added in EXIF 2.31 and unevenly
    populated. Needs a client-side binary parse (e.g. `exifr` + an MP4 box reader) before
    upload — a new dependency and a real chunk of work, hence deferred.
  - 📌 **Cheap interim option, not taken:** `File.lastModified` is already on the picked file
    for free and would beat "upload time" for the iPhone case, though it is the filesystem
    mtime rather than true capture time.
  - _Distinct from the timezone bug fixed the same day_ (`DEBUG_LOG` 2026-07-27) — that one
    was about the parsed date shifting a day; this one is about parsing the filename at all.
- 🆕 **`syncVideos()` claims the whole channel for whichever mountain runs it — must be fixed
  before a real mountain #2 (logged 2026-07-26, not urgent).** Follows from the owner's
  **single-shared-channel decision** (same day): rather than one YouTube channel per mountain,
  all mountains publish to the one channel and per-mountain attribution comes from
  `cat_videos.mountainId` (already stamped by `upload-youtube`). Rationale: a new channel would
  have to clear YouTube's monetization thresholds (1,000 subs / 4,000 watch hours) on its own
  before earning anything, and N channels means N OAuth credentials with N independently
  expiring refresh tokens — exactly the failure mode above, multiplied. `manisan`'s
  `social.youtubeChannelId` was set to geyang's channel accordingly.
  - **The consequence:** `syncVideos(mountainId)` (`src/services/media-albums.ts` ~L638)
    fetches _every_ video on the configured channel and imports anything missing from that
    mountain's Firestore set, stamping it with that `mountainId`. With one shared channel, a
    second mountain's sync would claim geyang's entire back catalogue. Inert today (manisan has
    no prod data and is `hidden: true`), so this is a **prerequisite for provisioning a real
    mountain #2**, not a live bug. Fix shape: scope the import by something channel-side that
    identifies the mountain (a per-mountain playlist is the natural handle, and doubles as the
    auditable attribution the other mountain's owner would want for a revenue split).
- ✅ **M6 — no prod cutover needed (resolved 2026-07-25).** The upload-prefix wiring is a
  no-op for geyang and only affects a future tenant; prod thumbnails/album photos already ride
  on tenant-scoped Storage URLs, so there is nothing to migrate. (The drafted thumbnail
  migration was reverted after a dry-run found 0 changes.)
- ✅ **M7 — GA4 console setup DONE by the owner 2026-07-26** (pending post-redeploy
  verification). What was done: the **Firebase-linked GA4 property is reused** (same
  measurement ID the retired `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` held — pre-M7 history and
  new gtag data stay in one property); `mountain_id` registered as a **custom dimension**
  (scope Event); `NEXT_PUBLIC_GA_MEASUREMENT_ID` set in Vercel **Production only** —
  deliberate, to keep `dev` traffic out of the data; Enhanced measurement turned **on** with
  **"Page changes based on browser history events" off** (that sub-option would emit a second,
  `mountain_id`-less `page_view` per navigation → ~2× counts). ⏳ Verify Realtime/DebugView
  after the prod redeploy. Full runbook incl. all of the above:
  [`admin-manual/google_analytics.md`](../manuals/admin-manual/google_analytics.md).
  - ✅ **Gap closed same day:** `mountain_id` was attached per-event to `page_view` only, so
    the newly-enabled Enhanced-measurement events (scroll, outbound click, file download, video
    engagement, form interaction) carried none. `AnalyticsTracker` now calls
    `gtag('set', { mountain_id })` first, making it a **default parameter on every event**.
    Residual limit: only events after hydration inherit it (the root layout sits above
    `MountainProvider`, so it can't be set in the gtag `config` call) — automatic events need
    interaction, so they land later anyway.
  - ⚠️ **Sequencing trap — production is pre-M7.** `main` still runs `getAnalytics(app)` off
    `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` and reads `NEXT_PUBLIC_GA_MEASUREMENT_ID` **nowhere**.
    On that build the new var does nothing and deleting the old one **turns analytics off**.
    Keep **both** set on Production until M7 promotes and Part B verification passes; only then
    delete the Firebase one. Recorded as step **A0** of the GA4 guide.
  - 📌 **Form interactions** (newly enabled) widens automatic collection on the 동참/content
    forms — worth checking against the 개인정보처리방침 with the compliance carry-overs.
- ✅ **M5 prod cutover — DONE 2026-07-23 (owner-run).** Ran in the required order:
  snapshot → `APPLY=true` migration (`currentRole`→`roles`, `'default'`→`geyang`) →
  `firestore:indexes` (6 composite, Enabled) → PR #8 `dev → main` merge → `firestore:rules`.
  Multi-mountain is live in prod. Runbook kept as the record:
  [`m5-prod-cutover-runbook`](../manuals/deployment/m5-prod-cutover-runbook.md).
  - ⏳ **Post-cutover cleanup (owner, low-priority, do once prod CMS is confirmed healthy
    over a few days):** the migration left the legacy fields in place for reversibility —
    delete the old `currentRole` fields on user docs + the `about_content/about` doc
    (superseded by `about_content/geyang`), and delete the local backup dump under
    `backups/firestore/` (holds an OAuth refresh token + PII).
  - 📝 The `manisan` stub is `hidden: true`, so on prod `/manisan` is routable but has no
    content and is absent from the public selector — harmless. It has no prod data (it was
    only ever seeded in the emulator).
- ✅ **CI updated for the M5 test surface — DONE 2026-07-23 (thread resolved).** All
  three pieces closed:
  1. ✅ **`npm run test:rules` wired into CI.** A dedicated emulator-backed `rules` job in
     `.github/workflows/ci.yml` (checkout → setup-node → setup-java 21 → `npm ci` →
     Firebase-emulator cache → `npm run test:rules`), gated on `needs: checks`, running in
     parallel with `e2e`. No browser install (rules tests need only the Firestore
     emulator). This was the actual gap — the default `npm test` **excludes**
     `tests/rules/**` (they need the emulator), so CI's `checks` job never ran them.
  2. ✅ **Second stub mountain (M5.4a) + isolation e2e (M5.4b).** `manisan` in
     `mountains.json` (`hidden: true`) + seeded; `tests/e2e/api|public/tenant-isolation.spec.ts`.
     The isolation e2e is covered by the existing `e2e` job (`npm run test:e2e` globs all
     of `tests/e2e/**`), so it needed no extra wiring. Full e2e **125/13/0**.
  3. ✅ **The e2e seed/gate assumes the `roles`-map shape** (M5.2) — kept in sync (the seed
     builds per-user `roles` maps).
- ✅ **7 ungated write/credential API routes — FIXED 2026-07-26 (thread resolved).** They
  had **no auth gate at all**. Six now open with `requireApiPermission`, and every in-app
  caller sends its ID token via `authHeader(user)`; the seventh was **deleted as dead code**
  (below). Permission per route **mirrors the `firestore.rules` clause already guarding the
  resource it touches**: `generate-signed-url` → **`manage-photo`** (its uploads become
  `cat_images`); `upload-youtube`, `update-youtube-video`, `refresh-video-metadata`,
  `manage-playlists` (GET+POST), `youtube-playlists` → **`manage-video`** (mirrors
  `cat_videos`). So each route is exactly as permissive as the write it enables and **no
  working flow lost access**. New net: `tests/e2e/api/media-route-authz.spec.ts` (21 tests —
  401 unauthenticated / 403 for a butler / past-the-gate for an admin, on all 7 method+route
  pairs). Gates: tsc 0, smoke 30/30, unit 71/71, **full e2e 146/13/0**. Detail +
  the status-vs-message gotcha: `log/FEATURE_MOD_LOG.md` 2026-07-26.
  - 🗑️ **`generate-youtube-signed-url` DELETED (owner-approved 2026-07-26).** No caller
    anywhere, and `git log -S` over all history showed every reference outside its own
    folder was **documentation** — it has had no code caller since the commit that created
    it (`b901359`, pages-router → app-router), superseded by `upload-youtube`. No env var
    orphaned (`getYouTubeOAuthConfig()` reads the same four).
  - 📌 **Left as-is (owner's call 2026-07-26):** the butler post pages
    (`/pages/butler_{stream,talk}/new`) gate only on `isAuthenticated` — their writes
    already fail at the `posts_butler` rule without `manage-posts` (nothing leaks), but a
    signed-in user without it only finds out on submit. Accepted.
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

## Commit state & branch position (as of this update)

**Working tree is CLEAN.** `origin/dev` is at `e948496`; **everything from `d7999e2` on is
committed locally and NOT yet pushed** (the 2026-07-27 butler/playlist session). Newest `dev`
commits:

| Commit    | What                                                                                      |
| --------- | ----------------------------------------------------------------------------------------- |
| `97b72ed` | **fix** — 촬영일 is a calendar date, not an instant (KST off-by-one)                      |
| `bd7ce23` | **feat** — 집사톡: one file per section, each with its own 제목/설명 + 취소               |
| `c2fc78f` | **feat** — per-mountain playlist filing from config (+ shared 입양홍보 playlist)          |
| `0f9190f` | **refactor** — 집사게시판 drops media upload; it is a 급식소 log                          |
| `297ca9f` | **docs** — the butler media separation + playlist plan                                    |
| `d7999e2` | **docs** — changelog entry for the batch-sync fix                                         |
| `e948496` | **docs** — corrected commit hash for the batch-sync fix                                   |
| `c94d02e` | **fix** — batch edits sync to Firestore (YouTube ids, not doc ids) + prod-shaped fixtures |
| `56110c6` | **docs** — 2026-07-26 session close-out (hand-off / plan / debug log)                     |
| `dc8391f` | **fix** — sync no longer resets 게시일; writes `updated` + the tag-videos spec sheet      |
| `80ba04a` | **fix** — batch playlist save applies to the selection, not one video                     |
| `b5f08b7` | **fix** — `자동 날짜 인식` writes YouTube, not Firestore                                  |
| `05fdbd9` | **fix** — admin OAuth flow requests the write scopes it was missing                       |
| `6b2b4f9` | **feat** — one shared YouTube channel for all mountains (decision + `manisan` config)     |
| `8a0c87d` | **fix** — one credential source: Firestore, not env (`lib/youtube/credentials.ts`)        |
| `e929c39` | **feat** — `mountain_id` on every GA4 event                                               |
| `366425c` | **PR #8 merge** — multi-mountain M1–M5 promoted to `main` (2026-07-23)                    |

**Branch position:** `main` is an **ancestor** of `dev` (`git rev-list --left-right --count
main...dev` = `0  252`). `dev` is **252 commits ahead**; M6 + M7 + M8 + the GA4 guide + the
2026-07-26 YouTube fixes + the 2026-07-27 butler/playlist work are all on `dev` and **not yet
in prod**. Promoting them (`dev → main`)
is **gated on the owner's P5.4 scripted manual YouTube pass** — which must **restart from the
top** (see the fresh-session box at the head of this doc).

**Gate status at `97b72ed`:** tsc 0 · smoke 31/31 · unit 102/102 · **full e2e 153 passed /
13 skipped / 0 failed** (+5 this session: the 집사게시판 no-upload boundary guard, two 취소
specs, the per-file media sections, and the config-driven playlist label).

⚠️ Untracked and intentionally so: `backups/firestore/2026-07-20T02-20-20-923Z/`
— a real dump holding an OAuth refresh token + PII. Git-ignored; delete when no
longer wanted.

---

## Changelog (living-doc audit trail — newest first)

- **2026-07-27 (latest)** — **The two post composers were separated, and YouTube filing
  became per-mountain.** 집사게시판 was doing two jobs — a 급식소 check-in log _and_ a second
  media composer — while 집사톡 already did the second one properly, so it **lost media upload
  entirely** (`0f9190f`); compose-time only, since legacy posts keep rendering and admins keep
  URL-based media editing. The per-file rework then landed where it belongs: 집사톡 got
  **one file per section with its own 제목/설명** (`bd7ce23`), so two videos of different cats
  no longer share a caption, and an empty description now stays empty instead of being
  replaced by an invented default. Both composers gained **취소**. Filing (`c2fc78f`) stopped
  matching the playlist _titled_ `집사게시판` — a rename on YouTube silently stopped it, and
  with one shared channel every mountain filed into the same list — and now reads
  `social.youtubePlaylistId` per mountain, plus a **`_shared`** platform block for the one
  cross-mountain 입양홍보 playlist (an 입양홍보 video joins **both**, so the mountain playlist
  stays a complete ownership record for the deferred `syncVideos` fix). ⚠️ Then a browser pass
  caught a fourth thing (`97b72ed`): 촬영일 was **a day early in KST**, because a calendar date
  was parsed as local and serialized as UTC — arithmetic that is correct at UTC and wrong
  everywhere else, so **CI could never have caught it**. Fixed by treating 촬영일 as a calendar
  date end to end and encoding it once, as UTC midnight, matching what `/admin/tag-videos`
  already writes. ⏸️ **Deferred, not queued** (owner's explicit call): 촬영일 should come from the
  **file's own metadata** with its timezone, with the filename as fallback — today iPhone files
  parse to nothing and silently take the upload time. Recorded to explain the behavior, not to
  schedule the work. 📌 Also found: `/api/youtube-playlists` now has no
  caller at all. Gates: tsc 0, smoke 31/31, unit 102/102, **e2e 153/13/0**.
- **2026-07-26** — **Batch edits never reached Firestore — the seventh bug of the
  session, and the only one reported rather than found by reading (`c94d02e`).** Batch tag /
  촬영일 / playlist saves applied to YouTube but the site's copy only updated after a manual
  📺 YouTube와 동기화, while individual saves synced themselves — the asymmetry that localized
  it. `/api/refresh-video-metadata` takes **YouTube video ids** (Data API lookup, then
  `where('youtubeId','==',id)`), but the batch loops recorded the **Firestore doc id** from the
  selection and passed those, so the route 404'd. The caller did `if (res.ok) log(…)` with no
  `else`, so the failure was invisible and the dialog still reported 완료; `saveVideoMetadata`
  was immune because it resolves the YouTube id once and reuses it. Fixed: results keyed by
  `youtubeVideoId`; the refresh extracted into `syncToFirestore()`, which returns success and
  logs the status + body; on failure the dialog now says the change reached YouTube but not the
  site. ⚠️ **The fixtures had made this untestable** — no seeded video carried a `youtubeId`, so
  `youtubeId || id` collapsed to the doc id and the two could never diverge; both fixtures now
  have a distinct one (`yt-vid-01/02`), matching production, and the four assertions that
  referenced the old ids moved with them. **Second time this session a fixture concealed a
  production-only failure mode** (the first: emulator videos have no YouTube publish dates), so
  the hand-off's fresh-session box now carries it as a standing check and the plan proposes a
  broader fixture-realism audit. New regression test asserts the PUT **and** the refresh both
  carry the YouTube id. Gates: tsc 0, smoke 30/30, unit 80/80, **e2e 148/13/0**.
- **2026-07-26** — **Three more `/admin/tag-videos` bugs fixed (`b5f08b7`,
  `80ba04a`, `dc8391f`), a source-of-truth principle adopted, and the page's button spec sheet
  written.** All three were found by **reading the page to document it**, not from reports, and
  none was reachable by the existing suites. (1) `자동 날짜 인식` wrote its parsed dates to
  Firestore, where the next sync — or any other save on that video — overwrote them with `null`,
  because `refresh-video-metadata` rebuilds Firestore from YouTube and YouTube has no recording
  date for exactly those videos. It now writes YouTube first. The rewrite also exposed a
  timezone bug in its own fix, caught by the new test: the parser returns **local-time** Dates,
  so `.toISOString()` shifted every date back a day in KST — it now sends UTC midnight of the
  calendar date, matching `saveVideoMetadata`. (2) The batch playlist save always acted on the
  video open in the edit form, so the batch entry point updated one video or silently none; it
  now applies to the whole selection with **set semantics** and a confirmation. (3) Every sync
  wrote `uploadDate: new Date()`, resetting 게시일 to the sync time — and since the **public**
  영상첩 sorts by it, edited videos jumped to the top of the public album with today's date. It
  now comes from YouTube's `publishedAt`, so mis-stamped records **self-heal** with no
  migration; `uploadedBy` is no longer clobbered, and the refresh now writes `updated` (the
  field the UI reads for 메타데이터 수정) instead of the unread `lastMetadataRefresh`. ⚠️ That
  clobber had been **masking a latent crash** — `syncVideos()` never set `uploadDate` on import
  and the album sorts call `.getTime()` on it, so the import now sets it too. 🔑 **Principle
  adopted:** YouTube is the source of truth for videos and no UI path may write video data to
  Firestore; `/admin/tag-videos` now makes zero direct Firestore writes, and the rule is in
  `admin-manual` §6. New: `docs/manuals/admin-manual/tag-videos-spec.md`, a button-by-button
  spec sheet keyed on what each button writes to — the first of a per-CMS-page series. Gates:
  tsc 0, smoke 30/30, unit 80/80, **e2e 147/13/0**.
- **2026-07-26** — **Third YouTube bug, exposed by the second: the admin OAuth flow
  requested too few scopes.** On the owner's retry after the credential fix, a metadata edit
  failed with Google's _"Insufficient Permission"_ (not our gate's "Insufficient permissions").
  `auth-url` asked for `youtube.upload` + `youtube.readonly` only — no `videos.update`, no
  playlist writes. The retired CLI token script requested all four scopes, so the token in real
  use had them; **the admin panel had never minted a token capable of editing metadata**, and
  only routing the routes to that token revealed it. Fixed by requesting the same four scopes;
  **a re-authorization is required**, since scopes are granted at consent time. Also corrected
  throughout the docs: the button is **`🔄 토큰 갱신`**, not the "재인증" label these notes had
  invented — and it runs the full consent flow despite the name, which is why it fixes scope
  problems and not just expiry. Logged as a known gap: the status panel validates by refreshing,
  which succeeds regardless of scope, so it reports healthy on a token that cannot write.
- **2026-07-26** — **Both P5.4 YouTube bugs FIXED; and the platform commits to a
  single shared YouTube channel.** (1) New `src/lib/youtube/credentials.ts` is now the only
  place the shared OAuth credential is resolved, splitting **client identity** (env, never
  rotates) from **the refresh token** (Firestore only). This is **stricter than the plan
  recorded the day before**: env → Firestore would not have fixed the reported failure at all
  (the stale env token _was_ set and would still have won), and even Firestore-first-with-env-
  fallback was rejected — a fallback keeps the same failure shape whenever the Firestore doc
  goes missing, and buys nothing, since obtaining a token needs client identity only.
  `YOUTUBE_REFRESH_TOKEN` is gone from the code, `.env.example`, and the deleted `scripts/auth/`
  workflow; the admin "re-authorize" button is now the whole procedure, with no env edit and no
  redeploy. ⚠️ Leave the var set in Vercel **Production** until this promotes — `main` is
  pre-fix and env-only. Two further defects fell out of the same
  root cause: `upload-youtube`'s Firestore fallback was **dead code** (it required client
  credentials from the very config whose absence triggered it — so _no_ route had ever
  successfully fallen back), and `auth-url` required a refresh token in order to obtain one, a
  bootstrap deadlock on a fresh deployment. 🔑 **`YOUTUBE_REFRESH_TOKEN` was then removed
  entirely** (owner's call — an env fallback preserves the same failure whenever the Firestore
  doc goes missing, and isn't needed to bootstrap); the token now lives only in Firestore. Do
  not clear the var from Vercel **Production** until this promotes — `main` is still env-only. All six OAuth consumers migrated;
  `getYouTubeOAuthConfig()` deleted; the status panel stopped lending Firestore's timestamp to
  the env token (that display is a large part of why the split went unnoticed); the OAuth
  success page stopped printing the raw token. **Correction:** `refresh-video-metadata` was
  never affected — it uses the public API key, not OAuth. (2) `manage-playlists` POST now takes
  its channel from `getYouTubeChannelId(authz.mountainId)` instead of a
  `NEXT_PUBLIC_YOUTUBE_CHANNEL_ID` env var that is set nowhere. New net:
  `tests/unit/youtubeCredentials.test.ts` (9). Gates: tsc 0, smoke 30/30, unit 80/80, full e2e
  146/13/0. (3) **Owner decision: one YouTube channel for all mountains** (per-mountain channels
  rejected — each would have to clear monetization thresholds alone, and N credentials means N
  expiring tokens); attribution rides on `cat_videos.mountainId`. `manisan` repointed at
  geyang's channel, and the resulting `syncVideos()` cross-tenant hazard logged as a
  prerequisite for a real mountain #2. Detail: `log/DEBUG_LOG.md` 2026-07-26.
- **2026-07-26** — **P5.4 manual YouTube pass STARTED on Preview and immediately
  found two pre-existing bugs; both queued for a fresh session.** (1) **Split refresh-token
  source** — the admin "re-authorize" button writes the fresh token to Firestore
  (`admin_config/youtube_auth`), but `getYouTubeOAuthConfig()` reads **env only**; only
  `upload-youtube` falls back to Firestore, so `update-youtube-video` / `manage-playlists` /
  `youtube-playlists` / `refresh-video-metadata` keep using a stale `YOUTUBE_REFRESH_TOKEN` and
  fail `invalid_grant`, while the status panel looks healthy because it checks **both** sources.
  Fix = one shared env → Firestore credential helper across all five routes. (2)
  **`manage-playlists` POST reads `process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID`** — set nowhere,
  so playlist saves 500; the GET beside it already uses `getYouTubeChannelId(mountainId)`
  (missed in M1's config move; also a multi-tenant leak). Both are **pre-existing, not
  regressions** from the same-day auth-gating pass, and **neither is reachable by automated
  tests** — the emulator has no YouTube credentials, which is exactly why P5.4 exists as a
  manual pass. Also this session: **GA4 console setup completed** by the owner (Firebase-linked
  property reused, `mountain_id` dimension registered, Enhanced measurement on with
  history-based page views **off**, env var Production-only) and the ⚠️ **pre-M7 sequencing
  trap** recorded — `main` still runs the Firebase SDK off
  `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` and reads `NEXT_PUBLIC_GA_MEASUREMENT_ID` nowhere, so
  both vars must stay set until M7 promotes. Full runbook:
  [`admin-manual/google_analytics.md`](../manuals/admin-manual/google_analytics.md).
- **2026-07-26** — **`mountain_id` is now a GA4 default parameter (`e929c39`).**
  `AnalyticsTracker` calls `gtag('set', { mountain_id })` before its `page_view`, so the
  Enhanced-measurement events enabled the same day (scroll, outbound click, download, video,
  form) carry the tenant too — previously it was attached per-event to `page_view` alone.
  Residual limit: only post-hydration events inherit it (the root layout sits above
  `MountainProvider`).
- **2026-07-26** — **The 7 ungated write/credential API routes are now gated (one
  deleted) — the open thread is resolved.** `manage-playlists` (GET+POST),
  `refresh-video-metadata`, `update-youtube-video`, `upload-youtube`, `youtube-playlists`,
  `generate-signed-url`, and `generate-youtube-signed-url` had **no auth gate at all** — an
  unauthenticated caller could mint Storage write URLs, drive the shared YouTube channel on
  the operator's OAuth credential, and write `cat_videos` via the Admin SDK (bypassing
  `firestore.rules`). Six now
  open with `requireApiPermission`; every in-app caller sends its ID token through the
  existing `authHeader(user)` helper (`uploadStrategies` takes `user` as an **injected**
  option, so the strategy module keeps no Firebase coupling; the tag-videos page +
  `useYouTubeVideoMutations` route 10 fetch sites through one `jsonAuthHeaders()`). The
  permission per route **mirrors the rules clause already guarding the resource it touches**
  (`generate-signed-url` → `manage-photo`, everything YouTube → `manage-video`), so each route
  is exactly as permissive as the write it enables and **no working flow lost access**. New
  net: `tests/e2e/api/media-route-authz.spec.ts` — 21 pure-HTTP tests covering all 7
  method+route pairs (401 unauthenticated / 403 for a butler holding neither permission /
  past-the-gate for an admin). Gates: tsc 0, smoke 30/30, unit 71/71, **full e2e 146/13/0**
  (the 125 pre-existing tests all still green). ⚠️ **Gotcha worth keeping:** status alone
  can't distinguish a gate rejection from a downstream failure — without YouTube OAuth
  credentials `update-youtube-video` answers an `invalid_grant` with **its own 401** — so the
  admin case asserts on the gate's error _messages_, not the code. **The 7th route,
  `generate-youtube-signed-url`, was DELETED rather than gated** (owner-approved): no caller
  anywhere, and `git log -S` showed every historical reference outside its own folder was
  documentation — dead since the commit that created it, superseded by `upload-youtube`; no
  env var orphaned. The butler post pages keeping only their `isAuthenticated` gate is
  **accepted** (owner, same day).
- **2026-07-25** — **Multi-mountain M8 DONE & committed on `dev` (`a237e8b`) — theme
  wiring + provisioning proof + docs close-out; the M0–M8 track is now complete.** `config.theme`
  is now
  live (was dead): a
  `primary` tailwind token resolves to a `--color-primary` CSS var (default `#FACC15` =
  geyang's shipped `brand.DEFAULT`), and the `[mountain]` layout injects
  `:root{--color-primary:<tenant primaryColor>}` per request (hex-validated, on `:root` so
  portaled modals inherit). The `from-brand to-accent` CTA gradient was repointed to
  `from-primary` on the **public** surfaces (shared `ui/Button`, header 입양홍보 CTA, Leaflet
  cluster marker, adoption + faq CTAs); geyang's stale `theme.primaryColor` `#ffbc00` →
  `#FACC15` so geyang is pixel-identical. **Owner chose "primary color only"** over the
  full-brand-ramp option — the `brand` ramp + admin-only `from-brand` CTAs stay static
  (documented as deliberately partial). Browser-verified: geyang CTA `#FACC15` (unchanged),
  manisan `#0ea5e9` (sky-blue). Gates: tsc 0, smoke 30/30, unit 71/71, **e2e 125/13/0**. M8 also
  **rewrote the provisioning guide** (`new-mountain-setup.md` → a real one-Firebase/one-Vercel
  host-routed runbook) and **finished the docs close-out** (`multi-tenant-config.md`,
  `services-layer.md`, `AGENTS.md`/`CLAUDE.md`, admin-manual §9, PROJECT_PLAN §9, decision
  framework → EXECUTED). **Multi-tenant hardening (M0–M8) is complete** — only owner-gated
  externalities remain (GA4 `mountain_id` dimension + Vercel `NEXT_PUBLIC_GA_MEASUREMENT_ID`;
  per-mountain DNS/allowlists for a real 2nd mountain). Committed as three commits: M7
  (`48f7085`), M8 theme + docs close-out (`a237e8b`), and the standalone GA4 setup guide
  (`7e3c517`). `dev` now leads `main` by these + M6; promotion to prod is gated on the P5.4
  YouTube pass.
- **2026-07-25** — **Multi-mountain M7 DONE on `dev` (committed `48f7085`) — analytics
  decoupled from Firebase → gtag.js + `mountain_id`.** `firebase/analytics` replaced by a
  shared **GA4** property loaded via `gtag.js`: a `next/script` `<Script>` in the **root**
  layout gated on `NEXT_PUBLIC_GA_MEASUREMENT_ID` and configured `send_page_view: false`, so
  `AnalyticsTracker` emits **every** `page_view` itself (on route change) carrying
  `mountain_id` from `useMountain()` — the shared property now segments per tenant, and the
  SDK's old no-`mountain_id` auto page_view no longer double-fires. `services/firebase.ts`
  drops the `getAnalytics` import + the browser-only `analytics` init guard + the export (only
  `AnalyticsTracker` used it); dead `measurementId` removed from `getFirebaseConfig`. Unset
  env var (dev / emulator / e2e / Preview) → no script, `window.gtag` undefined,
  `AnalyticsTracker` no-ops — identical to the old `analytics=null`. The dead `analytics`
  **rules** block was already removed in M5.2 (only `view-analytics` remains). Gates: tsc 0,
  smoke 30/30, unit 71/71, **full e2e 125/13/0** (no regression). **No prod migration.** 🔑
  **Owner-owed (not code):** GA4 property + `mountain_id` custom dimension registered **before
  any tenant-2 traffic** (GA4 never backfills), and `NEXT_PUBLIC_GA_MEASUREMENT_ID` set in
  Vercel Prod+Preview (supersedes the now-unused `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`).
  **Next open phase: M8** (geyang-as-one-of-many + theme wiring + provisioning guide).
- **2026-07-25** — **Multi-mountain M6 DONE on `dev` — scope corrected to
  per-tenant upload namespacing (no prod migration).** Shipped: image uploads prepend the
  active tenant's `storagePrefix` (`generate-signed-url` route + the direct-storage form
  strategy via `useMountain()`); geyang `''` → exact no-op, a new tenant's uploads isolate
  under `mountains/<id>/…`. **Correction:** the first draft also namespaced baked thumbnails +
  a `cats.thumbnailUrl` migration, but the owner's dry-run found **0 changes** — inspecting
  prod showed cat thumbnails **and** album photos serve from live Firebase **Storage URLs**,
  not baked paths, so they're already tenant-scoped. The thumbnail namespacing +
  `backfill-thumbnail-namespace.js` + the M6 cutover runbook + the e2e-fixture edits were
  **reverted/deleted**. Documented the baked-vs-Storage-URL model across
  `docs/codebase/media-and-youtube.md` (new "Image storage & serving strategy" section),
  `deployment-and-build.md`, both manuals, and the archived `IMAGE_STORAGE_EXPLAINED` (now
  flagged superseded). Gates: tsc 0, unit +2, smoke 30/30, **full e2e 125/13/0**. **No prod
  cutover.** **Next open phase: M7** (analytics → gtag.js).
- **2026-07-23** — **🎉 Multi-mountain M5 SHIPPED TO PRODUCTION (PR #8; cutover
  complete).** The `dev → main` promotion (merge commit `366425c`, 34 commits) put the full
  M1–M5 multi-tenant refactor + data protection + CI rules gate on prod. The owner ran the
  order-critical cutover in sequence: snapshot → migration (`currentRole`→`roles` map,
  `'default'`→`geyang`) → `firestore:indexes` (6 composite, Enabled) → **PR #8 merge** →
  `firestore:rules`. Production now stamps + scopes by `mountainId`, resolves
  `roles[mountainId]`, and enforces the mountain-aware rules. Only tail: delete the legacy
  `currentRole` + `about_content/about` + the local dump once the CMS is confirmed healthy.
  **The multi-tenant track advances to M6 (assets/storage namespacing).**
- **2026-07-23** — **CI wired for the M5 test surface (thread resolved).** Added
  a dedicated emulator-backed `rules` job to `.github/workflows/ci.yml` (checkout →
  setup-node → setup-java 21 → `npm ci` → Firebase-emulator cache → `npm run test:rules`),
  gated on `needs: checks`, parallel to `e2e`, no browser install. This closed the real
  gap: the default `npm test` (CI's `checks` job) **excludes `tests/rules/**`** (they need
the emulator), so the 11 mountain-aware rules tests ran nowhere in CI. The M5.4
two-tenant isolation e2e needed no wiring — the existing `e2e`job's`npm run test:e2e`already globs all of`tests/e2e/**`. YAML validated. **All M5 code + CI is now in;
  only the owner-gated rules/index prod deploy remains\*\* (owner is running the cutover).
- **2026-07-23** — **Multi-mountain M5.4b — two-tenant isolation e2e written;
  M5 now code-complete.** Two specs: `tests/e2e/api/tenant-isolation.spec.ts` (pure HTTP —
  data reads partitioned by request Host, and mountain-scoped API authz: a single-mountain
  admin is 403 on the other mountain's gated route / 200 on its own, asserted both ways,
  and a dual admin is 200 on both) + `tests/e2e/public/tenant-isolation.spec.ts` (rendered
  photo-album + 공지사항 content isolation, geyang `/pages/…` vs manisan `/manisan/pages/…`,
  desktop+mobile). Tenant targeted by overriding the request `Host` (verified Playwright
  honors it); tokens minted from the Auth-emulator REST. The `contacts` PII read-isolation
  is left to the rules suite (`users.rules.test.ts`), not duplicated. **Full e2e 125/13/0**
  (+9). Committed `6e37c6c`. **Remaining on M5: the owner-gated rules/index prod deploy
  (cutover runbook)** — CI wiring landed same day (see the next changelog entry).
- **2026-07-23** — **Multi-mountain M5.4a — stub tenant (`manisan`) added to
  config + seed.** The M5.4 isolation e2e's config prerequisite. `manisan` added to
  `config/mountains/mountains.json` with a new **`hidden: true`** flag (routable at
  `/manisan` + prerendered, but excluded from the public `MountainSelector` via the new
  `MountainConfig.hidden` + `getPublicMountains()` — routing keeps `getAllMountains()`);
  distinct branding, `storagePrefix: 'mountains/manisan/'`, reuses geyang map imagery.
  Resolves the `permissions.json` drift (it already listed `manisan`). Seed:
  `tests/e2e/fixtures/manisan.json` (distinct points/cats/cat_images/announcements/
  contacts/about + a manisan-only admin and a dual-mountain admin `dual-admin-uid`);
  `seed-emulators.mjs` refactored to stamp an explicit `mountainId` per pass + a
  `seedManisanTenant()` pass, and `seedAuthAndUsers` now takes both single-`role` and
  `roles[]` shapes. Gates: tsc, smoke 30/30, unit 39/39, **full e2e 116/13/0** (geyang
  unperturbed; build prerenders both `/geyang` and `/manisan`). Uncommitted. **Next =
  M5.4b isolation spec + wiring `test:rules` into CI.**
- **2026-07-23** — **Multi-mountain M5.3 route audit DONE (docs-only; no code
  change).** Walked all 21 `src/app/api/**` routes, checking every Firestore access path
  against the tenant model. **Verdict: no leak-by-omission** — content routes are
  tenant-scoped (cats/points/contact/assign-role/upload-youtube video record) and the
  identity/central-config routes (`users`, `role_permissions/*` matrix) are global by
  design. Only residual cross-tenant surface = the **shared YouTube channel**
  (non-Firestore; already deferred = M5.1 note b: per-tenant `getYouTubeChannelId` config
  but a single shared OAuth credential / `admin_config/youtube_auth` doc). Surfaced a
  **pre-existing, tenancy-orthogonal** gap — **7 ungated write/credential routes** — and
  logged it as an owner-owed open thread (owner chose log-not-fix). Plan §3 M5.3 checked
  off with the full per-route verdict; M5.4 two-tenant isolation e2e is the only M5
  remainder. **Next: M5.4** (blocked on the `manisan` stub in config + seed — the
  owner-flagged fresh-session CI thread). **Also prepped the M5 prod-cutover runbook and
  CORRECTED the cutover order:** the prior "migrate → deploy rules" thread was incomplete
  — the M5.2b rules deny any `mountainId`-less write, and the stamping code (M4) is only
  on `dev`, so the `dev → main` promotion must land **between** migrate and rules, and
  indexes must build before the app goes live. Open thread rewritten to the safe 6-step
  sequence with rollbacks.
- **2026-07-22** — **Multi-mountain M5.1 + M5.2 EXECUTED & COMMITTED.**
  **M5.1 (`d4a0bb2`)**: every content read scoped by `mountainId` (collection
  `where` + doc-by-id tenant guards + the 2 Admin-SDK server reads); new
  `firestore.indexes.json` (6 composite indexes, hand-derived — the emulator won't
  flag a missing one, and these services swallow query errors to `[]`). **M5.2
  (`47d0f3d`)**: role model → **map keyed by `mountainId`** (§0 sub-decision 6, owner
  2026-07-22 — one account can admin several mountains, host picks which);
  `hasPermissionFor(uid, perm, mountainId)` everywhere; `firestore.rules` rewritten
  mountain-aware (`canWrite` on the doc's own mountain + cross-mountain-move block +
  sensitive-read scoping + self-only `users` read + dead `analytics` block removed);
  `requireApiPermission` folds in M5.3's core; new signups get `roles: {}`. **M5.2a
  and M5.2b proved inseparable at the emulator gate** (rules + seed both key on the
  role shape). Migration `migrate-m5-role-and-about.js` written (dry-run default;
  normalizes legacy `'default'`→`geyang` so the prod admin isn't stranded; + about-doc
  copy). Rules tests rewritten (`test:rules` 11/11, mountain dimension). Gates: tsc,
  smoke 30/30, unit 39/39, rules 11/11, full e2e 116/13/0. 🔑 **Two owner-gated prod
  actions remain, ORDER-CRITICAL:** run the migration, THEN deploy the rules (a
  not-yet-migrated user is fail-closed → locked out). **Owner deployed the M0 rules
  bundle 2026-07-22.** Owner flagged **CI needs updating** for the new `test:rules`
  suite (+ the coming M5.4 isolation e2e) — to be designed in a fresh session.
  **Next: M5.3 route audit + M5.4 two-tenant isolation e2e.**
- **2026-07-20** — **Data protection built, after M4's backfill exposed
  that there was none.** The prod backfill ran with **no snapshot and no PITR**;
  it was survivable only because the change was additive and exactly reversible
  (one known field, one known value), not because anything protected it. A
  transforming migration would not have been. Now in place: **PITR enabled**
  (7-day window) + a **weekly** backup schedule + `export-firestore.js` /
  `import-firestore.js` (`a8d842f`, `c8829e2`) for local off-Google dumps, with
  the runbook as **admin-manual §10** (`d04c0cd`) and a snapshot-first
  precondition wired into the plan's M6. The restore is **round-trip verified**
  (prod → emulator → re-export → diff, 16/16 byte-identical) — which caught that
  timestamps must rebuild from `seconds`+`nanoseconds` rather than the
  ms-precision ISO string, and that **a dry run opens no connection** (a wrong
  emulator port survived a clean preview). Weekly-not-daily and
  no-GCS-export-bucket are both recorded with their reasoning so they aren't
  re-litigated. **Incidental find:** `image_uploader` (13 docs) is the **owner's
  separate uploader tool** sharing this Firestore — invisible to this codebase,
  no rules entry, no `mountainId`; flagged for M5 (see TL;DR).
- **2026-07-20** — **Multi-mountain M4 EXECUTED & COMMITTED
  (`b83a112`)**: data-tenancy stamping. The service factory became **per-tenant**
  (`getCatService(mountainId)` etc. via a shared `perTenant()` instance cache;
  storage/auth/permissions stay tenant-free), every create path stamps
  `mountainId`, and ~49 call sites were threaded — `useMountain()` on the client,
  `getRequestMountainId(request)` in API routes (`/api/points` and
  `/api/admin/cats` GET gained a `request` param). `media-albums`' module
  functions take an explicit `mountainId`; `syncVideos` now resolves the channel
  per-tenant. The `aboutContentService` module singleton was retired in favor of
  the factory (⚠️ its `about_content/about` **doc id stays shared** — a per-tenant
  id is an M5 decision). Backfill script
  `scripts/migration/backfill-mountain-id.js` written (dry-run mode, `merge:true`
  only per the Sheets-wipe precedent); emulator seeding stamps the tenant in
  `seed-emulators.mjs` rather than in each fixture file. Gates: tsc, smoke 30/30,
  unit 39/39, **full e2e 116/13/0**, browser pass (map, both albums, about,
  공지사항; console clean). ⚠️ One flake en route — `admin/posts.spec.ts`
  announcement-create hit the **known P6 dialog→`router.push` race**
  (`DEBUG_LOG` 2026-07-19; its `setTimeout(…,0)` fix is load-sensitive); cleared
  by 17/17 isolated re-runs + a clean full re-run. **The 🔑 prod backfill then ran
  the same day** — 99 docs stamped, triple-verified (see the workstream section).
  **Next: M5.**
- **2026-07-19** — **Multi-mountain M1–M3 EXECUTED & COMMITTED**
  (`8920c66`, `092d226`, `491b832` after docs `5672330`): decoupling → config
  layer to explicit `mountainId` + tenant helpers → the `[mountain]` route
  segment + host-rewrite middleware. M3's gate: **full e2e 116/0 with zero
  e2e-spec rewrites**. Session closed at the M4 boundary (tree clean); M4
  resume-notes (factory parameterization lands there; 64 call sites scouted)
  recorded in the plan doc. Process: the same-day auto-commit grant was
  **revoked** — every commit is owner-gated again. Incidental finds this
  session, logged in the plan: the contact-submit spec has a pre-existing
  hydration-race flake; local `test:e2e` clobbers `public/` images with
  emulator fixtures (re-run `fetch:assets`); Java for the emulators lives at
  `/usr/local/opt/openjdk/bin` (PATH-prefix it).
- **2026-07-19** — **Multi-mountain refactor PLANNED**: owner answered
  Q1–Q8 (management-only · B1 · A1+subdomains · visitor selector); wrote the
  execution plan `multi-mountain-refactor-plan-20260719.md` (M0–M8: decoupling →
  request-time config → `[mountain]` segment + middleware → stamp/backfill →
  scoped reads + mountain-aware rules + isolation e2e → assets/storage → gtag.js
  analytics → stub tenant + provisioning guide); recorded answers in the decision
  framework + PROJECT_PLAN §9. No code changed. Execution gated on explicit
  go-ahead at M1; M0 = the pending rules deploy (owner-run, must precede the
  track's rules changes).
- **2026-07-19** — **Session close**: P6 committed (`2584dcb`) — the
  complexity-retirement track is fully executed and on `dev` as seven commits.
  TL;DR re-pointed for the next session (owner-owed P5.4 manual YouTube pass /
  rules deploy / multi-tenant Q1); PROJECT_PLAN tech-debt row notes the track
  done; e2e memory baseline updated to 116/13.
- **2026-07-19** — **Complexity retirement P6 DONE — track fully
  executed**: ~45 native `alert()/confirm()` sites (editors + the four public
  forms via their shared hooks) converted to the new promise-based `ui/useDialog`
  Modal primitive; the four specs' dialog handlers rewritten to Modal assertions.
  The P0 net caught a real regression en route — the dialog unmount re-render
  canceled the post-submit `router.push`; fixed by deferring promise resolution
  past the unmount commit (`DEBUG_LOG`). Docs + logs closed out (PROJECT_PLAN §7,
  assessment → ✅ EXECUTED, FEATURE_MOD_LOG). Final full e2e **116/13/0**. Bundle
  **uncommitted**. Owner-owed: P5.4 manual YouTube pass before promotion.
- **2026-07-19** — **Complexity retirement P5 DONE (Target A complete)**:
  both editors recomposed on the toolkit (tag-images 1,715→821 + shared
  `ui/Lightbox`; tag-videos 2,450→1,261 + page-owned 570-line
  `useYouTubeVideoMutations`), twin drift absorbed as toolkit knobs, videos filter
  panel kept page-owned (drifted layout). Full e2e **116/13/0** + tsc/smoke/unit +
  full-page screenshot passes. Bundle **uncommitted**; next: commit → P6.
  ⚠️ Manual YouTube pass still owed before promotion.
- **2026-07-19** — **Complexity retirement P4 DONE** (committed `34c5c68`; P3
  committed `1d13e09` on go-ahead earlier the same session): both editors swapped
  onto the shared `CatSelectorModal` (commit-on-done; dead `'youtube-batch'`
  context dropped), toolkit skeleton landed unused under
  `src/components/admin/media/`, filename date parser moved into
  `@/utils/dateParser` (converged with the title parser). Full e2e **116/13/0**
  against the swap + screenshot browser-pass over all four selector contexts;
  P4.5 toolkit interfaces owner-approved.
- **2026-07-19** — **Complexity retirement P3 DONE**: full-gate re-run
  green — e2e **116/13/0** (locator fix held; "expect 117" was an off-by-one — the
  Family A spec adds 2 tests to the 114 P2 baseline), tsc/smoke/unit green.
  Assessment §8 P3.4/P3.5 flipped ✅.
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

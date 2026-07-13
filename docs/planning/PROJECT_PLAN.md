# 산냥이집냥이 (mohocat) — Project Plan & Progress Tracker

> **Project-wide** plan and execution tracker — the layer **above** the
> feature-specific design docs. Where the redesign plan/tasks docs track one
> workstream (the landing + app redesign), this document maps **all** workstreams
> (redesign, mobile UX, admin cleanup, codebase health, compliance, multi-tenant,
> testing) and their status in one place.
>
> **Companion docs:**
> [`docs/handoff/2026-06-21-kickoff-3.md`](../handoff/2026-06-21-kickoff-3.md)
> (orientation — read first) ·
> [`design.md`](../design/design.md) (design source-of-truth) ·
> [`mohocat-app-redesign-plan.md`](../design/mohocat-app-redesign-plan.md) +
> [`-tasks.md`](../design/mohocat-app-redesign-tasks.md) (redesign detail) ·
> token values: [`tailwind.config.js`](../../tailwind.config.js).
>
> **Status:** 🚧 **SKELETON** — workstreams below are placeholders. Each one's
> concrete specs/tasks are filled in (and spun into a companion `*-tasks.md`)
> when it's picked up with the user.

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` deferred/out of scope ·
🚧 placeholder (needs spec)

---

## 1. Snapshot (as of 2026-07-10)

| Workstream                                 | Status            | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Landing redesign (Phases 0–2)              | `[x]` done        | Brand tokens, frosted nav, Leaflet migration, mobile clustering.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| App redesign — A (Modals)                  | `[x]` done        | Shared `ui/Modal` system (commit `5892b43`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| App redesign — B (Album pages)             | `[x]` done        | Shared `components/album/*` + `useMediaFilter`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| App redesign — D (Localization)            | `[x]` done        | Auth + mypage → Korean (해요체), `strings.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| App redesign — C (other pages)             | `[x]` done        | Brand audit of about/공지/FAQ/동참/입양홍보/집사메뉴 — **DONE 2026-07-03** (butler surfaces de-gradient-ified, `border-yellow-500` dropped, English empty states → 해요체, submits → shared `<Button>`, focus rings → brand). Cross-cutting public/auth button convergence closed **2026-07-10** (§12.2). Auth-gated butler list/pagination verifications still owed under §4.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Redesign A4 (live-verification)            | `[~]` blocked     | Needs real sign-in / SMS (assistant can't enter creds).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Functional: 입양홍보 page missing**      | `[x]` done        | **§11** — built the adoptable-cats gallery (`Cat.adoptable` flag + admin tagging + `/pages/adoption`); all 404 entry points resolve. Browser-verified 2026-06-26 (gallery + CatInfo badge + admin badge/toggle).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Functional: 동참 form end-to-end**       | `[x]` done        | **§11** — Variant A shipped 2026-06-28: `POST /api/contact` (ID-token verify → Admin SDK write → SMTP email to `adminEmail`); form repointed at the route; `contacts` rule tightened to `create: if false` + deployed; Gmail SMTP vars in `.env` + Vercel. Local end-to-end verified (Firestore write + admin tab + email).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Deployment-target cleanup**              | `[x]` done        | **§7** — Vercel-only (IaC: `infra/terraform/`). **Phase 1+2** removed Cloud Run / home-server / Firebase-Hosting / Docker / static-export / functions; trimmed `firebase.json`; aligned `build`; dropped `/api/health` + Firebase `staging` alias. **Phase 3** (2026-06-27) removed dead permission routes + `MIGRATION_EXAMPLE.ts` + the Cloud Storage static-data push path, refreshed stale comments/docs. Static-data Half B parked for §7a. ([`phase3-cleanup-plan.md`](./phase3-cleanup-plan.md))                                                                                                                                                                                                                                                                                                                        |
| **Perf: bake the data layer**              | `[x]` done        | **§7a** — cats now read server-side via the Admin SDK + baked into the home & adoption Server Components (ISR `revalidate=3600`, single-sourced); on-demand `revalidatePath` on admin cat-edits. Landing avatars + galleries have **zero client Firestore queries** (browser-verified; ISR confirmed via `next build`). Follow-up **done 2026-06-30**: dead static-data export seam removed (`saveStaticDataJson` + `update:*` scripts + exporters + JSON artifacts; `fetch:assets` re-verified green) — tasks-doc §6. **§7a fully closed.**                                                                                                                                                                                                                                                                                   |
| **Mobile UX optimization**                 | `[~]` in progress | §4 — public-facing mobile pass. **Pass 1 (2026-07-04):** verification tooling settled; nav/modals/albums/forms/content audited. **Pass 2 (2026-07-05):** S22 map bugs, portrait-only map, static clustering. **Off-plan (2026-07-08):** lightbox pinch-to-zoom, back-button/swipe-back modal fix, page-wide UI scale reduction. **Device-verified (S22, 2026-07-10):** map zoom/scroll/quirks + touch-target sweep closed. **Off-plan (2026-07-10):** hamburger closes on route/sign-in, mobile logout modal actually logs out, mypage edit-button layout, login/logout menu-pill centering, landscape rotate-notice GIF fix. **Device-verified (S22, 2026-07-11):** map re-fit on resize. **Remaining:** mobile perf not started; sign-in-gated surfaces partially touched (login/logout/mypage fixed) but not fully audited. |
| **Firebase Storage → Seoul bucket**        | `[x]` done        | Migrated from `us-central1` to `asia-northeast3` (Seoul) to cut image latency for Korean users. New bucket `mountaincats-61543`; files transferred via gsutil; Firestore URL rewrite script run against all 6 collections; `fetch-static-assets.js` reads bucket from env var; `generate-signed-url` hardcoded fallback removed. See `scripts/migration/README_korea_bucket_migration.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Admin desktop cleanup**                  | `[~]` in progress | §5 — admin UI/UX consistency. **Done:** spreadsheet-grid cat editor + filter/sort/bulk-edit ([handoff-14](../handoff/2026-06-29-handoff-14.md)); dead-route/example cleanup (Phase 3A); **react-admin subsystem removed** (6 files + 8 deps); **AdminAuth hardened** — emergency-bypass buttons removed + listener consolidated onto `useAuth()` (10s init-timeout gone); **dead `/admin/create-user` route/bypass removed** (all 2026-06-29→30). **Deferred (owner):** visual/UX consistency (utilitarian Tailwind cleanup, no brand re-skin) + admin Korean-string consistency. **Remaining:** those two deferred items + the disabled-link feature stubs.                                                                                                                                                                   |
| **Admin mobile optimization**              | 🚧 placeholder    | §6 — admin usable on phones.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Codebase health / tech-debt                | `[~]` in progress | §7 — **permissions + admin-API auth: DONE 2026-06-28** (fixed the never-working `hasPermission` rule; gated every `/api/admin/*` route; closed a YouTube refresh-token leak). **Admin CMS `write:if false` collections: DONE 2026-06-29** — gated `about_content`/`cat_images`/`cat_videos`/`posts_announcements` writes (`points` left locked, no writer); all browser-verified. See [handoff-12](../handoff/2026-06-29-handoff-12.md). Remaining: error handling, structured logging, `ignoreUndefinedProperties`, request validation.                                                                                                                                                                                                                                                                                       |
| Compliance / legal                         | `[x]` done        | §8 — **CLOSED 2026-07-10: privacy policy + terms shipped** (`/pages/privacy` + `/pages/terms`, KISA/PIPC-structured, footer links live; CPO 산냥이집냥이 운영자 · `rescuezoro@gmail.com`; under-14 w/ guardian consent; retention 탈퇴 시 즉시 삭제; **국외 이전** disclosure §6, disclosure-based not consent per Art. 28-8). **Email-signup consent capture** + **member self-service 탈퇴/deletion** (`/api/account/delete`, Admin SDK hard-delete) **done**. **Deferred/owner-owed (accepted, out of workstream):** professional legal review before scaling; phone/Kakao signup consent; security audit; Kakao scope verification.                                                                                                                                                                                        |
| Multi-tenant hardening                     | 🚧 placeholder    | §9 — make the 2nd-mountain path real.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Testing & quality gates                    | 🚧 building       | §10 — Vitest (40) + **Playwright e2e** (emulator-backed): harness/CI + Phase 2 `public/` + Phase 6 `api/` **done & green**; intermittent build-hang fixed (2026-07-13). Next: Phases 3–5 (signed-in), gated on the §5 non-admin-login decision.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **입양홍보 posts + adoption/modal polish** | `[x]` done        | **Not a numbered §** — feature workstream (handoff-21). Admin-authored **입양홍보 post type** (`posts_adoption`, public feed + admin tab + create/edit), **admin post editing** across all types, adoption-page polish (accordion + search), **cat-modal redesign** + `작명 사유` field, and **inline `[img]`/`[video]` links** → in-app Lightbox/VideoPlayer. Gates green; browser-verified except admin-gated flows. See [`handoff-21`](../handoff/2026-07-03-handoff-21.md).                                                                                                                                                                                                                                                                                                                                                |
| **Admin manual / operator docs**           | `[x]` started     | **Not a numbered §** — `docs/manuals/admin-manual/` (operator how-to: content link tokens, cat/post fields, config & ops) + `docs/manuals/deployment/new-mountain-setup.md` (🚧 provisioning placeholder).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

---

## 2. Work done so far (brief)

The full narrative is in the hand-offs; the short version:

- **Landing page redesigned (Phases 0–2).** Brand design tokens locked in
  `tailwind.config.js`; grouped frosted nav with the `입양홍보` CTA; restyled
  cat-markers; `IntroCard` + `Footer`; the map migrated to **Leaflet**
  (`CRS.Simple` + image overlay, `divIcon` markers, mobile clustering/spiderfy,
  90°-CW portrait rotation for phones).
- **App-wide redesign Phases A, B, D shipped.** A: one shared modal
  system (`src/components/ui/`); B: album pages rebuilt on shared
  `src/components/album/*` building blocks; D: the auth flow + mypage fully
  localized to Korean (해요체) through a centralized `src/constants/strings.ts`,
  with "My Page" → "내 집사 정보".
- **Design system documented.** `design.md` captures intent/usage (colors,
  typography, language & voice, modal, album, marker specs); values stay single-
  sourced in Tailwind config.

What is **not** done: live-verification of several auth/mypage
states (A4), the functional gaps in §11, and every workstream in §4–§10 below —
those are the forward plan.

- **App-wide redesign Phase C shipped.** C: 집사메뉴/butler surfaces (`ButlerStreamClient`,
  `ButlerTalkClient`, `PostList`, `NewPostForm`, `NewButlerTalkForm`) de-gradient-ified,
  `border-yellow-500` dropped, English empty states → 해요체 brand cards, submit buttons →
  shared `<Button variant="primary">`, login-required notices → brand-tinted cards, all
  `focus:ring-blue-500` → `ring-brand-300`, dead `data-oid` stripped. Done 2026-07-03.

---

## 3. How this tracker works

- Each numbered workstream below is a **placeholder** until picked up. Picking one
  up means: (1) confirm scope/specs with the user, (2) write them into that
  section, (3) spin a companion `docs/planning/<workstream>-tasks.md` mirroring
  the rigor of the redesign tasks doc, (4) implement in small, browser-verified
  chunks, (5) update the §1 snapshot.
- **Sequencing is not yet decided** — see §12. Mobile UX and admin cleanup are
  called out by the user as priorities; ordering among them and the debt items is
  open.

---

## 4. 🚧 Mobile UX optimization (public-facing)

> **Goal:** make the entire **public** experience first-class on phones, not just
> the landing map. The map already has a mobile path (clustering + portrait
> rotation); the rest of the user-facing app is now **audited at mobile widths**
> (2026-07-04 pass — see below).

> **Verification tooling — SETTLED (2026-07-04).** `resize_window` is broken (resizes
> window chrome but does **not** reflow the content viewport → stays desktop-width). The
> working method is an **iframe sized to phone width**, which genuinely reflows (validated:
> a 390px frame reports `innerWidth 390` + Tailwind `md:` query `false`). Prove reflow
> before trusting the harness; it's sound for layout/CSS media queries but does **not**
> emulate touch / orientation / device-pixel-ratio — those remain device-owed.

**Pass 1 audit — 2026-07-04 (verified in the iframe harness at 390, nav also at 360×560):**

- [x] Mobile audit pass of the public pages at ≈360 / 390 / 414 px: home/map, about,
      공지/announcements, FAQ, 동참/contact, 입양홍보, photo-album, video-album,
      login/signup. _(Remaining: butler_talk, butler_stream, mypage — behind sign-in.)_
- [x] **Navigation on mobile** — frosted grouped nav + hamburger dropdown audited. **Fixed:**
      mislabeled first section header 동참 → 소개 (+ item 소개 → 산냥이와 집냥이 to mirror
      desktop); menu pinned in the sticky header with no height cap could clip the logout row
      on short viewports → added `max-h-[calc(100dvh-4rem)] overflow-y-auto`. (FEATURE_MOD_LOG
      2026-07-04.) z-index over Leaflet OK; tap targets OK.
- [x] **Modals on mobile** — shared `ui/Modal` verified: Lightbox (full-screen, sized image,
      clear close/next, readable caption) + 고양이 선택 cat-picker (centered, margins, 2-col
      tappable checklist, sticky footer). No fixes needed.
- [x] **Album grids on mobile** — `grid-cols-2` density + tile captions/chips legible;
      filter-bar reduction (§3, previously code-only) now mobile-verified. No fixes needed.
      _(Lightbox/VideoPlayer swipe gestures = deferred feature decision, not a fix.)_
- [x] **Forms on mobile** — login + contact verified: all inputs computed `16px` (no iOS
      auto-zoom), `type=tel`/`type=email` correct, single-column full-width, no overflow;
      SignupForm matches in code. No fixes needed. _(Phone-OTP SMS send/verify still needs a
      real device+number.)_
- [x] **Content pages** — about / 공지 / FAQ / 입양홍보 / 동참: zero horizontal overflow, good
      typography/spacing at 390. No fixes needed.
- [x] **Map zoom / orientation / scroll — Pass 2 (2026-07-04).** Fixed three owner-reported
      S22 bugs (DEBUG*LOG 2026-07-04): (1) zoom-out past fill exposed grey → `minZoom` now
      clamped to the fill zoom; (2) landscape rotation crammed the portrait map sideways →
      *(originally: image chosen by orientation via `useIsPortrait`; **superseded** by Pass 3 —
      the map is now portrait-only on phones, so the landscape-map path is gone entirely)\_;
      (3) map ate page scroll → on mobile, one-finger swipe scrolls the page (drag disabled at
      fill) and map-drag engages only when zoomed in. ✅ S22-verified by owner 2026-07-10.
- [x] **Map pinch-bounce pin loss — S22 (2026-07-05, DEBUG_LOG).** ✅ S22-verified by owner.
      `bounceAtZoomLimits={false}` hard-stops a pinch at fill instead of overshooting +
      bouncing back; the transient sub-fill excursion (which merged the thumbnail pins into
      clusters, with an intermittently-failing re-split on the S22) is gone.
- [x] **Portrait-only mobile map + one-line landscape nav (2026-07-05, FEATURE_MOD_LOG).**
      A phone in landscape gets a scoped 해요체 rotate-notice (지도는 세로 모드에서만…) instead of
      a sideways map; the nav breakpoint moved `md`→`lg` so the header stays one line in
      landscape. This **removed** the map's orientation machinery (`useIsPortrait`, the
      `portrait` prop, image/coord swap, and the `key={portrait}` remount) — device and
      orientation now coincide behind a single `isMobile` flag. Harness-verified; real-device
      rotation _feel_ still device-owed.
- [x] **Static clustering — durable fix for the recurring pin loss (2026-07-05, DEBUG_LOG).**
      Replaced `leaflet.markercluster` on mobile with our own **zoom-independent** proximity
      clustering (`utils/mapClustering.ts`) + tap-to-spiderfy. Root cause of the recurring
      S22-only breakage (pins vanishing / drawn outside the map / stuck pan): markercluster's
      integer cluster grid fought our fractional/mutated `CRS.Simple` min-zoom clamp, and which
      device tripped it depended on where `fillZoom` landed vs the grid — so every prior shim
      (floor-vs-exact, temp-lower-minZoom, `bounceAtZoomLimits`) kept reopening it. Static grouping
      is computed once → no grid → device-independent by construction. Harness-verified (render,
      spiderfy, collapse-on-tap/zoom, member→gallery) + 8 unit tests; **real-S22 pinch owed.**
  - [x] **Cleanup: `npm uninstall leaflet.markercluster`** (2026-07-05) — dead dependency
        removed (`leaflet.markercluster` + `@types/leaflet.markercluster`); only explanatory
        comments remain in source. Gates green (tsc, smoke 25/25, full 39/39).
- [x] **Per-Point title-label side override (`labelSide`) — 2026-07-05, FEATURE_MOD_LOG.**
      Added `Point.labelSide?: { mobile?, desktop?: 'above'|'below' }` (Firestore-authored, ISR-
      fresh — the `points` collection has no CMS UI). An explicit value for the active layout
      overrides the automatic bottom-edge flip so an operator can move a label that overlaps an
      adjacent pin; an unset side keeps today's auto behavior. Decision logic extracted to a pure,
      unit-tested helper (`utils/mapLabels.ts`, `resolveLabelAbove`, 6 tests). Harness-verified
      no-regression (desktop map renders, no console errors); **authoring an actual override is
      device-owed** (collision layout is width/DPI-dependent — author against a real device).
      _(Lands together with the 급식소 admin CMS below.)_
- [x] **급식소 관리 (feeding-station points) admin CMS — 2026-07-05, FEATURE_MOD_LOG,
      [plan](./feeding-station-points-admin-cms-plan.md).** Built the `/admin/points` editor
      (create/edit/delete pins incl. the `labelSide` override) behind `manage-canteen`; Leaflet-free
      visual map picker for x/y; delete blocked while cats reference the point (lists them). Reuses
      `PointService` CRUD + `/api/revalidate`. Gates green; browser-verified (list, picker, delete-
      guard). Unblocks authoring the `labelSide` override above (lands with it). **⚠️ Owner-owed:**
      `firebase deploy --only firestore:rules` (points write opened to `manage-canteen`), and an
      actual save is only testable post-deploy.
- [x] **Mobile lightbox pinch-to-zoom (2026-07-08, off-plan).** `react-zoom-pan-pinch` (v4.0.3)
      wraps the lightbox image on mobile only (`useIsMobile`): pinch 1–4×, drag-to-pan while
      zoomed, double-tap toggle, reset on image navigation. `touch-action` flips between `pan-y`
      (un-zoomed) and `none` (zoomed) to avoid scroll/zoom conflict. Desktop unchanged. rAF
      throttling in backgrounded tabs means zoom animation must be verified on a real device.
- [x] **Back button / swipe-back closes modals (2026-07-08, off-plan).** `useModalLayer` now
      pushes a `history.pushState({ mohocat_modal: id })` entry on open. A module-level `popstate`
      listener closes the topmost overlay on back-gesture. Normal close pops the entry via
      `history.back()` with a `suppressNextPopState` guard to avoid cascade. All three overlay
      types (Modal, Lightbox, VideoPlayer) covered.
- [x] **Page-wide UI scale reduction (2026-07-08–09, off-plan).** All public page headers
      (`text-3xl font-bold` → `text-xl font-semibold`, hairline divider, muted description);
      about page title `text-4xl` → `text-xl`, body `text-lg` → `text-base`; adoption section
      header + post card titles + search input scaled down; contact form labels/inputs/button
      tightened. Browser-verified across all pages.
- [x] **Map mobile quirks — DEVICE-OWED (remaining).** Clustering aggressiveness
      (`maxClusterRadius`) tuning, edge-clipping, spiderfy ergonomics. ✅ S22-verified by owner 2026-07-10.
- [x] **Map re-fit on resize — mobile.** The fit-on-resize fix (2026-07-02,
      `MapViewController`) re-fits + re-clamps min-zoom on resize. _(The old
      landscape↔portrait `key={portrait}` remount is gone — the map is portrait-only on phones;
      landscape shows the rotate-notice.)_ ✅ Device-verified by owner 2026-07-11.
- [x] Touch-target sizing, hit areas, and hover-only affordances that don't exist on touch
      (replace hover-reveal with always-visible or tap states). ✅ S22-verified by owner 2026-07-10.
- [x] **Mobile nav + auth-flow fixes (2026-07-10, off-plan — DEBUG_LOG ×2, FEATURE_MOD_LOG).**
      (1) **Hamburger menu** now resets on `pathname`/`isAuthenticated` change — it no longer
      lingers over the login page or after sign-in (`Navigation.tsx`). (2) **Mobile logout** now
      works: the menu's `pointerdown` outside-click handler was closing the menu — and unmounting
      the portaled `LogoutModal` (its child) — before the confirm button's `click` fired; it now
      ignores taps inside `[role="dialog"]`. (3) **Mypage inline edit rows** (닉네임/이메일/전화)
      restacked to a full-width input + right-aligned button row (no more squished 취소). (4)
      **Login/logout menu pills** made full-width + centered (`mobile` prop) — no dead space on
      the right. (5) **Landscape rotate-notice GIF** filename fix (`chubby-cat` → `chubby_cat`).
      Login pill + hamburger-close browser-verified at 390px; logged-in legs (logout flow, pill,
      mypage rows) share verified mechanisms but are credential/device-owed.
- [ ] Performance on mobile networks — image sizes, above-the-fold, the thumbnail
      preloader's eagerness on cellular. _(Not started.)_
- [~] Sign-in-gated surfaces at mobile widths: butler*talk, butler_stream, mypage. *(mypage +
  the login/logout menu affordances fixed 2026-07-10; butler*talk/butler_stream still owed
  a full mobile audit — carry over.)*

_(Out of scope here: admin mobile — that's §6.)_

---

## 5. 🚧 Admin interface cleanup (desktop)

> **Goal (placeholder):** bring the `/admin` CMS up to a consistent, maintainable
> desktop standard. Admin was **explicitly out of scope** for the design
> redesign; this workstream brings it _into_ scope as a cleanup (not necessarily
> a full re-skin to the public brand — **confirm the target look**).

**Candidate scope — _confirm with user_:**

- [x] **✅ Spreadsheet-grid cat editor (shipped 2026-06-29 — see
      [handoff-14](../handoff/2026-06-29-handoff-14.md); built per
      [handoff-13](../handoff/2026-06-29-handoff-13.md)).** Cell-editable `react-datasheet-grid` (MIT)
      grid for `cats` as a second tab (스프레드시트) beside the card editor in `/admin/cats` (both
      kept). Typed columns; batch **전체 저장** via `catService.batchUpdateCats` (one Firestore
      `writeBatch` of per-field `update()`s → partial, non-destructive — `adoptable` etc. never
      wiped); `triggerCatRevalidate` on save; `isNeutered`/`date_of_birth` **mandatory** (validated on
      dirty-clear) with inline red-cell highlight **+** summary banner + block-save.
      **Filter / sort / select / bulk-edit** added: filter+sort logic extracted to the shared pure
      util `src/utils/cat-filters.ts` (used by **both** card and grid views); sortable headers;
      checkbox selection (+ select-all); bulk-edit toolbar for the 8 categorical + year fields.
      Browser-verified incl. a real persisted save. **Cleanup-on-success DONE:** the two CMS "Migrate"
      buttons, `scripts/maintenance/data_updater.js` (+ `_data_updater.py`) and
      `src/utils/cat-migration-helper.ts` removed; `cat-data-bulk-update-runbook.md` deleted and
      `pre-deployment-checklist.md` §4 reframed (Sheets bulk path retired). **Carry-over:** the grid's
      client-SDK writes join the Admin-SDK-writer migration list (§7 / handoff-11) — target is
      API-route writes + restore `write:if false`. _Stale importer/runbook doc refs in
      `scripts/README.md` + `docs/codebase/deployment-and-build.md` **swept 2026-06-29**
      (commit `089bfee`); handoff-13 left intact as a historical record._
- [~] **Visual/UX consistency — Core done 2026-06-30; folds into the new cross-cutting
  design system (handoff-16 §4).** **Core pass shipped** ([handoff-16](../handoff/2026-06-30-handoff-16.md)
  §3): built `src/components/admin/ui/` (`Button`/`Card`/`Alert`) and converged the 5
  inline-style files (`admin/layout.tsx`, `AdminAuth.tsx`, `admin/page.tsx`,
  `app-management/page.tsx`, `YouTubeAuthPanelNew.tsx`) → lean Tailwind + primitives; folded
  in Korean (해요체); stripped `data-oid`; fixed the broken cat-emoji. tsc + smoke green;
  browser-verified in a live admin session.
  **⚠️ Direction changed (owner, 2026-06-30):** the prior "keep admin deliberately
  utilitarian, no brand re-skin" target is **RETIRED.** The job is now **two parts** —
  (1) a reusable **shared primitive set** + consistent styling mechanism across **public +
  admin**, and (2) **actual branding of admin** (re-skin to the public brand). So the Core
  primitives are a **throwaway template**: to be merged into ONE shared, token-driven set and
  re-branded (drop the gray). Restarts as a unified **design + Korean** workstream in a new
  session (see [handoff-16](../handoff/2026-06-30-handoff-16.md) §4). Still the foundation to
  land **before** §6 admin-mobile.
- [x] **✅ `AdminAuth` hardening (UX side) — DONE (2026-06-29 → 2026-06-30).**
  - [x] **Emergency-bypass buttons removed (commit `0cd9c2c`).** The "🚨 Emergency Bypass" /
        "Emergency Bypass (Dev Mode)" buttons were **removed** (not just gated to dev): they
        never granted access — only cleared the error/loading flags before falling back
        through the real `!user || !isAdmin` gate — so they were dead + misleading. Dropped
        three unused `useAuth()` bindings (`isAuthenticated`/`providerData`/`linkedProviders`).
  - [x] **10s init-timeout removed (commit `dc1d748`).** Diagnosed as a vestigial guard for
        the long-fixed ~48s `indexedDBLocalPersistence` hang (now `browserLocalPersistence`);
        it could only mis-fire mid-login via the effect's `[loading]` dependency. The
        AdminAuth-onto-useAuth consolidation (below) deleted the whole self-owned listener +
        timeout, so this is gone — no re-scope needed.
- [x] **Dead/duplicate cleanup (routes + example)** — ✅ removed in Phase 3A: the 8
      unreferenced `get-all-user-permissions-*`/`get-all-users` routes and
      `MIGRATION_EXAMPLE.ts`. **`role-assignment-service.ts` is NOT dead** — it's used by
      `RoleManagement.tsx` + `PermissionDebug.tsx` (kept). **`/admin/create-user` resolved
      (commit `dc1d748`):** the page **does not exist** (browser-confirmed 404), so the
      `admin/layout.tsx` auth-bypass for it and the two `AdminAuth` links to it were dead —
      all removed (no more unguarded admin route). _Still open:_ disabled-link placeholders
      (`급식소 관리`, `겨울집 관리`) — intentional stubs for unbuilt features; leave until
      those features land.
- [x] **✅ react-admin decision — REMOVED (2026-06-29).** Investigation showed the
      whole react-admin subsystem was dead: `src/lib/admin/dataProvider.ts` +
      `sampleData.ts` were imported by nothing, and the four react-admin components
      (`ImageList`/`ImageEdit`/`VideoList`/`VideoEdit`) were rendered by nothing (no
      `<Admin>`/`<Resource>` host context exists). Deleted all six files and the 8 deps
      that existed solely for them — `react-admin`, `ra-data-fakerest`,
      `ra-data-firebase-client`, `ra-ui-materialui`, `@mui/material`,
      `@mui/icons-material`, `@emotion/react`, `@emotion/styled` (npm pruned 85 packages).
      `tsc` clean + smoke 25/25. The real tag-images/tag-videos admin UIs are hand-built
      and were never react-admin.
- [~] **Unified branded design + admin Korean — IN PROGRESS (2026-06-30, handoffs 17–18).**
  Picks up the retired "utilitarian, no re-skin" target as ONE token-driven primitive set
  across public + admin, admin re-skinned to the brand, admin Korean (해요체) folded into the
  same pass via a centralized **`src/constants/adminStrings.ts`** (mirrors the public
  `strings.ts`). **Done:** Phase 1 shared primitives + admin-silo reconcile (`8e065fb`);
  Phase 3 chunk 1 nav/CMS-core (`c8aba2d`), chunk 2 members/roles (`17a2509`); **chunk 3
  media-tagging** (`tag-images`, `tag-videos`, `cat-grid`) + **chunk 4 content**
  (`ContactManagement`, `AboutContentEditor`) — _this session (handoff-18)_: ~600 strings
  centralized, `bg-blue/purple → <Button>`/brand, brand focus rings, `accent-brand-500`
  checkboxes; YouTube-red vendor color kept. tsc + smoke 25/25 green after each.
  **Remaining:** AdminAuth login/access-denied live-verify; ~~the deferred public
  hand-rolled-button sweep~~ **✅ DONE 2026-07-03** (public filled CTAs → shared `<Button>`
  primitive; `text-blue-*` links/nav-hovers/tab-indicator/spinners → brand; input focus
  rings aligned to the canonical `focus:ring-2 focus:ring-brand-300`; Kakao vendor +
  semantic success/warning states preserved; admin/dead/test components out of scope — see
  `FEATURE_MOD_LOG` 2026-07-03); then §6 admin-mobile. **Dead-code candidates — DELETED
  (2026-06-30):** the 4 grep-verified-unreachable items from handoff-18 §5 removed (767
  lines): `RoleManagementDirect.tsx`, `PermissionManager.tsx`, and the unused
  `batchUpdateVideos`/`batchUpdatePlaylists` fns in `tag-videos/page.tsx` (which leaves that
  page free of user-facing English). tsc clean, smoke 25/25.
- [x] **✅ Two auth listeners — CONSOLIDATED (commit `dc1d748`).** `AdminAuth` no longer runs
      its own `onAuthStateChanged` subscription; it now derives `user` + `loading` from the
      single app-wide `AuthProvider` via `useAuth()`, keeping only its own admin-privilege
      check (made cancellation-safe). Render split into mutually-exclusive states
      (loading / login / access-denied / shell). Browser-verified: `/admin` login screen
      renders, no console errors; `tsc` + smoke 25/25 + `next build` green. (This is also
      what eliminated the 10s init-timeout above.)

_(Security/route-auth hardening overlaps §7 — coordinate so it's done once.)_

---

## 6. 🚧 Admin page optimization (mobile)

> **Goal (placeholder):** make the admin CMS usable on phones. Admin is
> desktop-only today (inline-styled layout, wide tables, batch-tagging grids).
> Volunteers may need to do light admin (approve, tag, post an announcement) from
> a phone. **Confirm which admin tasks must work on mobile** — full parity is
> likely overkill.

**Candidate scope — _confirm with user_:**

- [ ] Decide the **mobile-supported admin task set** (e.g. announcements,
      light moderation, member approval) vs desktop-only heavy tasks (bulk
      photo/video tagging, role-matrix config).
- [ ] **Admin nav on mobile** — the top nav (대쉬보드/앱관리/고양이/사진/동영상/
      게시물/사용자) needs a responsive pattern (drawer/hamburger).
- [ ] **Tables → cards** — list views (posts, members, images, videos) reflow to
      stacked cards or horizontally-scrollable tables on narrow screens.
- [ ] **Batch-tagging UIs** (`tag-images` / `tag-videos`) — the grid + multi-select + `CatSelectorModal` flow on touch; or explicitly mark desktop-only.
- [ ] **Forms** — cat add/edit, announcement create, about-content editor: input
      sizing and modal fit on mobile.
- [ ] Inline-style layout makes responsive work harder — coordinate with §5's
      convention decision so this is built on the cleaned-up base, not before it.

---

## 7. 🚧 Codebase health / tech-debt

> **Goal (placeholder):** pay down the recurring issues the codebase deep-dives
> flagged. Tracked here so they're visible even though they're not user-facing.

**Candidate scope — _confirm & prioritize_:**

- [x] **✅ SECURITY (FIXED 2026-06-28): the permission-matrix API route is gated.**
      `GET`/`POST /api/admin/role-permissions` read/rewrite `role_permissions/role-config` via the
      **Admin SDK** (bypasses Firestore rules). Once `firestore.rules` `hasPermission` started
      resolving against that doc, the previously-ungated **POST** became a live escalation vector
      — an unauthenticated caller could add `manage-*` to `viewer` and instantly grant every
      viewer write access across `users` / `cats` / `posts_*`. **Fixed:** new server-side gate
      `src/lib/auth/requireApiPermission.ts` (verify Firebase ID token → resolve role via
      `users/{uid}` → require the permission in `role-config`, mirroring the rule but server-side);
      both route methods now require `manage-users`, and `RolePermissionConfig.tsx` attaches the
      caller's ID token. **Verified:** unauthenticated/invalid → 401; admin → matrix loads + saves.
- [x] **✅ SECURITY (FIXED 2026-06-28): gated the remaining `/api/admin/*` routes.**
      Applied `requireApiPermission` across the admin API surface (client callers updated to send
      the ID token via the new `src/lib/auth/authHeader.ts` helper). **All browser- + curl-verified
      (unauth → 401; admin paths still work).**
  - `get-all-user-permissions-client` GET → **manage-users** (returns every user's email + role).
  - `resource-permissions` **POST** → **manage-users** (writes the page→permission map). _GET left
    open by design_ — the **public** Navigation (`useResourceAccess`) needs the map for anonymous
    visitors; it's non-sensitive config.
  - `youtube-auth/status` GET → **manage-video**. ⚠️ This one was **leaking the YouTube OAuth
    refresh token** (a secret) to any unauthenticated caller — now 401.
  - `youtube-auth/auth-url` GET → **manage-video** (initiates the OAuth flow).
  - `cats` POST → **manage-cat**; `posts-collections` POST → **manage-posts** (mutation endpoints;
    currently stubs, gated ahead of implementation). Their GETs return public/stub data — left open.
  - `youtube-auth/callback` — **not gated** (Google OAuth redirect; no Authorization header to
    verify). Acts only on a valid Google `code`.
  - **Token-leak follow-up DONE (2026-06-28):** `youtube-auth/status` no longer returns the raw
    refresh token in its response body — redacted server-side to source/validity/expiry; verified
    the authenticated response omits it. **Remaining (not a blocker):** `youtube-auth/callback`
    has no OAuth `state`/PKCE CSRF protection.
- [x] **✅ Admin CMS writes un-blocked (DONE 2026-06-29; deployed + browser-verified).**
      The deployed `firestore.rules` had locked `cats`, `about_content`, `cat_images`,
      `cat_videos`, `posts_announcements` (and `points`) to `allow write: if false`, but the
      admin CMS writes through the **client SDK** → permission-denied (UI: "Failed to update
      cat with id: …"). The lock went live with the 동참 rules deploy (`f84f3c1`); **not** §7a.
      **Fix:** applied the proven `hasPermission(uid, 'manage-X')` pattern (mirroring the
      `cats` / `posts_*` rules) to each collection that has a live **client-SDK** write path:
      `about_content`→`manage-app`, `cat_images`→`manage-photo`, `cat_videos`→`manage-video`,
      `posts_announcements`→`manage-posts`. **`points` left `write: if false`** — it has no
      live admin writer (the 급식소/겨울집 pages are disabled placeholders;
      `PointService.create/update/deletePoint` are never called). Deployed by owner; matrix
      confirmed admin grants all four permissions.
      **Browser-verified 2026-06-29** (each write persisted to live Firestore, then reverted):
      cats (alt-name edit), `posts_announcements` (modal toggle), `about_content` (subtitle
      edit), `cat_images` (description edit, confirmed via Admin SDK), `cat_videos` (client-SDK
      "Automatic Date Parsing" write, confirmed via Admin SDK). Closes handoff-10.
      _Note: tag-videos' per-video metadata edit + batch update go through **Admin SDK** API
      routes (`/api/update-youtube-video` → `/api/refresh-video-metadata`) and bypass rules;
      the only client-SDK `cat_videos` writer is the date-parser path (and `syncWithYouTube`)._
      _Secondary, latent (revisit next):_ `db` has no `ignoreUndefinedProperties`, so writes
      with unset `isNeutered`/`date_of_birth` may still throw on `undefined`; the two CMS
      "Migrate …" buttons that exercise these are likely no longer needed (owner to confirm).
  - _**Admin-SDK migration — analyzed & re-scoped (2026-06-30).** Full Client-vs-Admin SDK
    inventory + analysis in
    [`firebase-sdk-usage-inventory.md`](./firebase-sdk-usage-inventory.md). \*\*The old blanket
    target — "Admin SDK is the eventual writer for \_all_ writes" — is retired.** Bundle size is
    **not** a reason to migrate (auth + community writes keep Firebase in the browser regardless),
    and latency/offline is **not\*\* a reason to stay (admin CMS, handful of users). The decision
    turns on security/validation/auditability vs. migration cost, which weighs differently per
    collection — so the Client-SDK writes split three ways:\_
    - _**Tier 1 — `users` + `permission_logs` (role-assignment / permission services): MIGRATE
      (strong yes, not yet scheduled).** Audit integrity is structurally impossible client-side
      (`permission_logs` is `write:if false` → role-change audit writes are currently denied &
      **swallowed**, so every role change loses its audit entry; a client-writable audit log
      would be forgeable anyway). Roles are the escalation-sensitive crown jewels; `users` was
      designed Admin-SDK-only; the `ensureUserExists` self-provision gap also resolves
      server-side. Low effort/low volume; `get-all-user-permissions-client` already proves the
      pattern. Plan: 1–2 routes behind `requireApiPermission` → repoint role/provision/audit
      writes → restore the audit log → relock `users` to `write:if false`._
    - _**Tier 2 — `cats` / `cat_images` / `cat_videos` / `about_content` / `posts_announcements`:
      DEFER.** Authz is adequately handled by the (now-fixed) `hasPermission` rules; worst case
      is recoverable data-quality, not privilege. The real upside is server-side payload
      validation (the `ignoreUndefinedProperties`/string-typing + Sheets-import standardization),
      which is "nice to have," not "must." Cost/risk is real (~5 services, many write sites incl.
      `media-albums` batches). **Migrate a collection only when already touching it for
      validation reasons — no purity-driven sweep.** (Gated stubs `/api/admin/cats`,
      `/api/admin/posts-collections` already exist if/when needed.)_
    - _**Not a migration target:** community/user-as-owner writes (`post-service`,
      `butler-talk-service`, feeding check-ins, `auth-service`) — legitimate Client SDK.
      Dead/superseded paths (`contact-service.addContact`, `point-service` writes) — cleanup,
      independent of this decision._
    - _Truly dropping the Firebase SDK from public bundles is a **separate** effort (also needs
      `AuthProvider` to stop eagerly importing `firebase/auth`) and is **not** implied by Tier 1._
- [x] **✅ `users` / role-assignment — FIXED & browser-verified (members page). Interim
      client-SDK approach; Admin-SDK API route still deferred.**
      Symptom: `/admin/members` showed **no users in any role group**, and assigning a role didn't
      persist. Root cause was a chain of four bugs, each uncovered by the next. All fixed and
      **browser-verified 2026-06-28** against live Firestore (assigned guest viewer→butler-internet:
      persisted with admin-stamped `assignedBy` + a `roleHistory` entry, then reverted to viewer).
      **Decision: permission-gate the client write** (same interim path as cats) rather than block
      on the Admin-SDK migration.
  - **Bug 0 — read path (list route).** `GET /api/admin/get-all-user-permissions-client` queried
    the legacy, now-empty `user_permissions` collection → every group rendered 0 users. Repointed
    to `users`. _(committed `5c096a9`)_
  - **Bug 1 — empty per-user array.** Every user doc has `currentRole.permissions = []`
    (permissions are derived from the role at runtime, never snapshotted per user); the old helper
    read that empty array → always false. Fixed by resolving role → permissions from
    `role_permissions/role-config` (the single source of truth behind the **Permission Matrix**
    UI). No per-user backfill; editing the matrix updates enforcement.
  - **Bug 2 — 🔴 helper scope (the real blocker).** `hasPermission` was defined **outside** the
    `match /databases/{database}/documents { … }` block, so `$(database)` was unbound, paths
    resolved to `/databases//documents/…`, `exists()` returned false, and **every**
    `hasPermission`-gated rule **silently denied everyone, admins included**. → `hasPermission`
    had _never_ worked, so `cats` (handoff-10), `posts_feeding/butler`, and `contacts` were all
    latently broken by it. Fix: move the function **inside** the match block. One fix repairs all
    of them. (Confirmed via the Rules REST API that the live ruleset matched the file, and via
    the Contact Management read going green after deploy.)
  - **Bug 3 — `users` read rule too narrow.** `assignSpecificRole` does `getDoc(users/{target})`
    **before** writing; the read rule was self-read only (`request.auth.uid == userId`), so the
    admin couldn't read the target doc → denied before the (working) write. Extended to also
    allow `hasPermission(uid, 'manage-users')`.
  - **Service:** `role-assignment-service.ts` repointed from `user_permissions` → `users`
    (4 refs) so its client reads/writes hit the collection the rule + `hasPermission` + list route
    all use.
  - **Deployed + verified.** Rules deployed via `firebase deploy --only firestore:rules` (owner).
    End-to-end role assignment confirmed persisting in `/admin/members`; Contact Management loads.
    Cats / posts writes are repaired by the same `hasPermission` fix (not separately re-tested).
  - **Known gaps (not fixed):**
    - `ensureUserExists` (`permission-service.ts`) self-creates a new user's own `users/{uid}`
      doc via client SDK; the `manage-users` gate still blocks brand-new non-admin users from
      self-provisioning. Separate flow — revisit with the API-route work.
    - **Audit log not persisted via client.** `assignSpecificRole` → `logRoleChange` writes
      `permission_logs` (`allow write: if false`); the client write is denied but **swallowed**
      (try/catch, no rethrow), so the assignment still succeeds — only the audit entry is lost.
      Will be restored when role writes move behind the Admin SDK API route.
  - **Still the eventual target:** migrate these writes behind an **Admin SDK API route** and
    restore `write: if false` (the "Future consideration" above). `users` was originally
    designed Admin-SDK-only (grouped with `permission_logs` / `admin_data`), so it's a strong
    candidate — deferred, not dropped.

  _Separately — and **not** a rules issue — a **read** bug was fixed this session:_ the members
  list route (`/api/admin/get-all-user-permissions-client`) queried the now-empty legacy
  `user_permissions` collection → every role group rendered 0 users despite 3 users existing in
  `users`; the route now reads `users`. (Verified against Firestore: 3 docs in `users`, 0 in
  `user_permissions`.)

- [x] **✅ Deployment-target cleanup (DONE)** — **Vercel is the deployment target.**
      **Phase 1+2** (`f62816b`…`2e6fd4d`) removed the dead Cloud Run / home-server /
      Firebase-Hosting / Docker / static-export / `functions/` paths, trimmed
      `firebase.json` to `{ firestore: { rules } }`, aligned `build` with `vercel-build`,
      and dropped `/api/health` + the Firebase `staging` alias. **Phase 3** (`e0763b1`…,
      2026-06-27) removed the dead permission routes + `MIGRATION_EXAMPLE.ts` and the
      Cloud Storage static-data push path (preserved on `archive/static-data-cloud-export`),
      and corrected stale comments/docs. Plans:
      [`deployment-cleanup-plan.md`](./deployment-cleanup-plan.md) +
      [`phase3-cleanup-plan.md`](./phase3-cleanup-plan.md). Static-data Half B (local
      `src/lib/*.json` export) intentionally left for §7a.
- [ ] **Error handling** — read-paths swallow errors → `[]`/`null` (silent
      degradation). Align with the fail-loud convention; surface visible error
      states for critical reads (e.g. the home points fetch).
- [ ] **Structured logging** — replace ad-hoc `console.*` with per-module loggers
      (`logger.exception` on errors); never log secrets (the Kakao flow logs are
      verbose).
- [ ] **API route auth** — admin `/api/admin/*` routes don't consistently verify a
      Firebase ID token; `generate-signed-url` hands out write URLs without auth.
      Add bearer-token verification at the boundary. _(Overlaps §5.)_
- [ ] **RBAC collection drift** — `firestore.rules` reads `user_permissions/{uid}`
      while code writes `users/{uid}`; reconcile before relying on rule-level
      enforcement.
- [x] **Dead code** — ✅ route variants + `MIGRATION_EXAMPLE.ts` removed (Phase 3A).
      `role-assignment-service.ts` is **live** (used by `RoleManagement` +
      `PermissionDebug`) — not dead. _(Overlaps §5.)_
- [x] **Build pipeline** — ✅ `build` no longer exports to GCS (Phase 2 aligned it to
      `fetch-static-assets.js && next build`); the GCS exporter + admin push path were
      removed in Phase 3B Half A.
- [ ] **Request validation** — no zod/schema at API boundaries.
- [ ] **Upload-on-edit for posts (shared media-upload util).** The shared post editor
      (`components/EditPostForm.tsx`, added with the 입양홍보 work — see the adoption-promotion
      hand-off) deliberately edits **text + media _links_ only** (title, 내용, image/video
      URLs), not new media **file** uploads. Reason: the four create forms upload files
      **three different ways** — `posts_feeding`/`posts_butler` use `uploadImagesWithSignedUrls`
      (signed-URL flow), `posts_announcements`/`posts_adoption` use
      `storageService.uploadFile(file, '<type>/images/…')` (direct Storage, per-type path), and
      all four POST video files to `/api/upload-youtube`. Duplicating those branches into the
      single shared edit form (keyed on `postType`) would re-implement three upload paths and
      silently drift from the create forms. **Clean fix (do this first):** extract each upload
      mechanism into a shared hook/util the create forms **and** the edit form both consume,
      then add file-upload to the edit form on top of it. That's a refactor touching the working
      create forms — the adoption plan deliberately made a _dedicated_ copy to avoid risking the
      working 공지 flow, so treat this as its own scoped change. _Until then, adding a brand-new
      media file stays in the create flow; edit covers typos + broken/removable links (the actual
      pain point)._

---

## 7a. ✅ Perceived latency — bake the data layer (DONE 2026-06-28; cleanup carried)

> **Surfaced 2026-06-26**, picked up with the user **2026-06-28** and implemented the same
> session. Full task log + locked design decisions:
> [`7a-bake-data-layer-tasks.md`](./7a-bake-data-layer-tasks.md). The client cat-query
> waterfall is gone on both baked surfaces. **One follow-up remains:** the mechanical removal
> of the now-dead static-data export seam (§6 of the tasks doc) — see handoff-9.

**Problem.** The app reads Firestore **live from the browser** on key surfaces. Each such
read gates content on a serial client-side waterfall — _hydration → Firebase Web SDK init
→ cold Firestore connection → query_ — and pulls the heavy `firebase/app + firestore +
auth + analytics` SDK into the client bundle (`src/services/firebase.ts`, which carries
scars of a past "48s" auth/persistence delay). Realistic worst case (first visit, mobile,
possibly-distant Firestore region): **~0.6–1.5 s+** of spinner / late-arriving content.

**Concrete hotspots found:**

- **Landing map cat avatars** — `src/components/LeafletMountainMap.tsx` (`usePointMarkers`,
  ~L63–99) resolves each marker's photo in a post-hydration `useEffect` via **N parallel
  `getCatsByPointId` queries** (`Promise.all`, one per point). Map/points appear fast
  (points are baked), but **cat faces pop in late**.
- **Galleries** — `CatGallery` and the new `/pages/adoption` call `getAllCats()`
  client-side → spinner-gated.

**Baseline that already does it right (extend this):** `src/app/page.tsx` is an async
Server Component that `await`s `getPointService().getAllPoints()` with **no
`dynamic`/`revalidate`**, so Next statically renders it and **points/marker positions are
baked at build**. The thumbnail _image files_ are likewise build-fetched
(`scripts/maintenance/fetch-static-assets.js`). The fix extends "bake occasional-change
reads" from points/images to cat **metadata**.

**What shipped (hybrid freshness: on-demand revalidation + 1h ISR backstop):**

- [x] Cats moved to **build/server reads via the Admin SDK** (`src/lib/server/cat-reads.ts`),
      baked into the home + adoption Server Components with **ISR** (`revalidate = 3600`,
      single-sourced in `src/lib/cache-config.ts`; confirmed via `next build` →
      `initialRevalidateSeconds: 3600`).
- [x] The marker `{ pointId → cats }` map is baked in `page.tsx` and threaded to the map +
      `CatGallery` → **zero client Firestore queries** for avatars (browser-verified); the
      adoption gallery is server-rendered too. The old client `getCatsByPointId` /
      `getAllCats()` waterfalls + the duplicate `preloadThumbnailsForPoints` are removed.
- [x] **On-demand path:** `POST /api/revalidate` (ID-token auth) wired to every admin
      cat-write in `src/app/admin/cats/page.tsx`, so edits reflect without a redeploy
      (end-to-end check pending a preview deploy — dev can't exercise ISR).
- [x] Resolved the **`page.tsx` client-Web-SDK-on-server** tech-debt (now Admin SDK).
- [~] Timing: qualitative win proven (zero client cat reads); no ms figure captured.
- [ ] **Carried follow-up:** remove the dead static-data export seam (tasks-doc §6).
      _Re-verified 2026-06-29 (independent trace, during the §5 admin-cleanup work):_ a
      whole-repo grep finds **zero** references to `cats-static-data.json` /
      `points-static-data.json` / `feeding-spots-static-data.json` in `src/` — the runtime
      cat path is `src/app/page.tsx` → `getAllCatsServer()` (`src/lib/server/cat-reads.ts`,
      Admin SDK → Firestore), never the JSON. All readers/writers are in `scripts/` only.
      Confirmed **firsthand** that the file is dead build output: a `npm run build` (run to
      gate the react-admin removal) rewrote `src/lib/cats-static-data.json` from live
      Firestore, yet nothing consumes it — the churn was reverted, harmless. So in **both**
      prod build and dev server the JSON is never `import`ed/read; webpack never bundles it.
      Strengthens the REMOVE decision — no new blockers found. Keep the removal in this §7a
      pass (it untangles `saveStaticDataJson` from the still-needed asset fetcher and wants
      its own `next build` gate), not in unrelated cleanup branches.

**Inherited from Phase 3B (don't re-investigate from scratch):**

- **Half B — local static-data export, left intact for this workstream.** The
  `update:*` npm scripts + `export_{cats,points,feeding_spots}_to_static.js` +
  `update_all_static_data.js` write `src/lib/{cats,feeding-spots}-static-data.json`.
  **The app does not read these at runtime.** `cats-static-data.json` is **entangled
  with the kept asset pipeline**: it's also written every build by
  `scripts/maintenance/fetch-static-assets.js` (`saveStaticDataJson`) and read by the
  legacy one-off `migrate-cats-to-firestore.js`. This is the half-built "baking" seam —
  §7a should decide its fate holistically (revive, replace, or remove) rather than
  ripping it out piecemeal.
- **Half A — Cloud Storage "push" path, REMOVED in Phase 3B (preserved, not lost).**
  What it was: an admin **"Static Data 관리" tab** (in `admin/app-management/page.tsx`)
  → `POST /api/admin/update-static-data` → `scripts/migration/export_all_to_cloud_storage.js`
  → wrote `static-data/*.json` to Google Cloud Storage. Removed because the app reads
  Firestore live and nothing consumed that GCS output, and because §7a's chosen
  direction (Server Components + SSG/ISR + Admin SDK) is **not** an admin-triggered GCS
  push. **To revive:** the full code is on branch `archive/static-data-cloud-export`
  (or `git show 646ef7a~1:<path>` for individual files). Reconsider only if §7a actually
  wants an admin-button-driven re-export rather than build/server baking.

_Risk/size: architectural, touches the services seam and several pages — hence deferred._

---

## 8. ✅ Compliance / legal — CLOSED (2026-07-10)

> **Closed** as a workstream: 개인정보처리방침 + 이용약관 published and footer-linked,
> 국외 이전 disclosed (Art. 28-8, disclosure-based), and email-signup consent capture
> shipped. The items below under **"Deferred / owner-owed"** are consciously accepted
> as out of this workstream — reopen if/when membership scales.

**Done:**

- [x] Privacy policy + terms content (Korean; PIPA). **Done (2026-07-10):**
      `src/app/pages/privacy/page.tsx` + `src/app/pages/terms/page.tsx`, adapted
      from the KISA/PIPC standard 처리방침 structure and grounded in the app's
      actual collection (email/phone/닉네임/Kakao + 동참 form). Decisions:
      CPO 산냥이집냥이 운영자 (`rescuezoro@gmail.com`); under-14 allowed w/ guardian
      consent; retention = 탈퇴 시 즉시 삭제 (no grace). Includes **국외 이전** disclosure
      (§6, PIPA Art. 28-8): Google LLC + Vercel Inc. (US) — relies on the
      contract-necessity + 처리방침-disclosure basis, **not** consent. ⚠️ **Owner-owed:** get
      a legal/professional review before scaling membership.
- [x] Data-subject rights: account withdrawal/deletion (탈퇴). **Done (2026-07-10):**
      mypage → confirm modal → `POST /api/account/delete` (verify ID token →
      Admin SDK `auth.deleteUser` + `users/{uid}` doc delete) → sign out. Immediate
      hard-delete; authored posts intentionally retained (content, not account PII).
- [x] Wire the footer legal links to real pages/routes. **Done (2026-07-10):**
      `Footer.tsx` greyed placeholders → live `<Link>`s to `/pages/privacy` and
      `/pages/terms`.
- [x] Consent touchpoints at signup (email path). **Done (2026-07-10):**
      `SignupForm.tsx` gained two required checkboxes (이용약관 + 개인정보 수집·이용,
      each linking the full text); 인증번호 받기 submit gated until both checked.
      (국외 이전 is disclosure-based per §6, so it's not in the consent.)

**Deferred / owner-owed (accepted, out of workstream):**

- [ ] Professional/legal review of the policy text + consent flows before scaling.
- [ ] Consent capture for the phone-login-as-signup and Kakao social sign-up paths.
- [ ] Security audit vs the PIPA safety-measures standard (compliance-plan task 7).
- [ ] Verify Kakao scopes + document received fields (compliance-plan task 8).
- [x] Stub `docs/compliance/` exists (`compliance-plan.md`).

---

## 9. 🚧 Multi-tenant hardening

> **Goal (placeholder):** make the "add a second mountain by editing JSON" promise
> actually true. Today several paths are single-mountain hard-coded.

**Candidate scope — _confirm with user; may be far-future_:**

- [ ] `?mountain=` switch is a no-op — `MountainSelector` sets the query but
      `getCurrentMountainId()` only reads env. Implement cookie/query/host-based
      selection or remove the selector.
- [~] Hard-coded service-account path + bucket fallbacks. **Partially done (2026-07-10):**
  `generate-signed-url` hardcoded fallback replaced with hard-fail; `fetch-static-assets.js`
  reads `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` from env. **Remaining:** `feeding-spots-admin-service.ts`
  still hardcodes the service-account path.
- [ ] Hard-coded map image path in the map host; source it from mountain config.
- [ ] `mountains.json` vs `permissions.json` inconsistency (`manisan` exists in
      one, not the other).
- [ ] Theme not wired through — `config.theme` colors are read by nothing (the unused
      `getMountainTheme()` accessor was removed in the 2026-07-11 dead-code cleanup).
- [ ] Per-mountain DB isolation at the service-factory seam (the seam exists; the
      isolation doesn't).

---

## 10. 🚧 Testing & quality gates — **ACTIVE (2026-07-11)**

> **Goal:** coverage was **zero**; now Vitest (40 tests) + an emulator-backed
> **Playwright e2e harness with GitHub Actions CI** are in place (harness landed
> 2026-07-11). Next: build out the e2e spec suites (main-plan Phases 2–6).

**Done:**

- [x] **Test stack bootstrapped (Vitest)** — `npm test` / `npm run test:smoke`;
      first suite `tests/smoke/smoke.test.ts` (2026-06-27, 24 tests, <1s, no
      server/env). Structural smoke: referenced `/api/*` routes resolve to handlers,
      deploy-config keepers survive, critical public pages exist. Added as the
      regression net for the deployment cleanup
      ([`deployment-cleanup-plan.md`](./deployment-cleanup-plan.md)).

- [x] **Playwright e2e harness + CI foundation landed (2026-07-11)** — the
      prerequisite plan is **executed**: a hermetic Firebase Emulator Suite
      (Auth+Firestore+Storage) seeded with hand-authored fixtures drives the real
      prod build (`next build` → `next start`) under Playwright, wired into a
      greenfield `.github/workflows/ci.yml` (checks + emulator-backed e2e, no
      secrets). All env-gated `src/` touches (WP2/WP3/WP4/WP7) are off in prod;
      prod build verified untouched. Trivial spec green locally (desktop + mobile
      landing map + admin `storageState`, ~6s). See
      [`playwright-ci-prerequisite-plan.md`](./playwright-ci-prerequisite-plan.md)
      §7 and the 2026-07-11 `FEATURE_MOD_LOG` entry. **Owner follow-ups:** push/PR
      to confirm CI 3× green + branch protection; decide the non-admin
      `users`-write rule question that blocks non-admin login (2026-07-11
      `DEBUG_LOG`).

**Plans drafted (2026-07-11):**

- [`playwright-ci-plan.md`](./playwright-ci-plan.md) — the Playwright E2E suite
  (public / auth / member / admin / API-security) against the **Firebase Emulator
  Suite** with seeded fixtures, run in a greenfield GitHub Actions CI. **Phase 0+1
  (harness), Phase 2 `public/` (~60 tests), and Phase 6 `api/` are DONE + green**;
  the intermittent "markerless bake" build hang is **fixed** (2026-07-13, DEBUG_LOG).
  **Remaining: Phases 3–5** (`auth`/`member`/`admin`, ~10 spec files) — the UI login
  flows wait on the non-admin-login (§5) decision; then Phase 7 (flake audit + docs).
- [`playwright-ci-prerequisite-plan.md`](./playwright-ci-prerequisite-plan.md) —
  the enabler plan that must land first: adopts the main plan's recommendations
  as decisions (D1–D7), resolves its flags (F1–F12) via 4 spikes + 8 work
  packages (emulator wiring, asset-script compat, fixtures/seed, harness, CI).
  ✅ **EXECUTED.**

**Candidate scope — _confirm with user_:**

- [ ] Decide the broader test stack (unit / integration / UI) and what to cover first
      (permissions resolution, service layer, auth flows are high-value).
- [ ] Runtime HTTP smoke (boot the app, key routes return 200) — deferred; needs
      Firebase env, slower/non-deterministic. Today's structural smoke + `vercel-build` + a Vercel preview deploy cover this for now.
- [ ] Add mock service implementations behind the existing interfaces to unblock
      component/unit tests.
- [ ] Smoke/UI tests for the critical public paths (map loads, gallery opens,
      login renders).
- [x] CI wiring beyond `tsc`/lint — `.github/workflows/ci.yml` (checks +
      emulator-backed Playwright e2e) landed 2026-07-11.

---

## 11. 🔴 Functional gaps — broken / missing nav destinations

> **Functional, not design** (flagged by the user). The nav menu links to
> destinations that 404 or aren't confirmed working — a visitor who clicks hits a
> dead end or a form that may do nothing. Tracked here as functionality, separate
> from the Phase C design restyle. Both also surface in the redesign tasks doc, but
> the _functional_ fix is the point here.

- [x] **입양홍보 (`/pages/adoption`)** — **built 2026-06-26** as an **입양 가능 냥이
      갤러리** (adoptable-cats gallery): `Cat.adoptable?` flag (`src/types/index.ts`),
      admin tagging (checkbox in the cat edit form + table badge,
      `src/app/admin/cats/page.tsx`), and the public page
      (`src/app/pages/adoption/page.tsx`) rendering adoptable cats on the shared
      `CatCircleGrid` (extracted from `CatGallery`) → `CatInfo` on tap, with a friendly
      해요체 empty state + 동참 CTA. All three 404 entry points now resolve (route 200,
      `tsc` clean). _Remaining: browser/admin-session visual verification._
- [x] **동참 (`/pages/contact`) — end-to-end, DONE 2026-06-28** (Variant A). A
      submission now records in Firestore **and** emails the admin, all on Vercel (no
      Firebase compute). Decisions/history in
      [`handoff-5`](../handoff/2026-06-27-handoff-5.md) +
      [`handoff-7`](../handoff/2026-06-27-handoff-7.md):
  - **Diagnosed (earlier):** read path was dead (no `getAllContacts`, dashboard count
    hard-coded `0`, admin "Contact Management" tab disabled) and `contacts` had no
    Firestore rule. Submissions were invisible — the real gap.
  - **Built (keepers):** `getAllContacts()` + `Contact` type + dashboard count + the
    admin **Contact Management** tab (`src/components/admin/ContactManagement.tsx`).
  - **Variant A route (this session):** `POST /api/contact`
    (`src/app/api/contact/route.ts`) — verifies the Firebase **ID token**, writes the
    contact via the **Admin SDK** (bypasses client rules), then emails `adminEmail`
    (`config/mountains/mountains.json`) over **SMTP/nodemailer**. Body validated +
    length-capped; email failure logs + returns `{ success, emailDelivered:false }`
    so a notification miss never loses the recorded submission.
  - **Form repointed:** `pages/contact/page.tsx` `handleSubmit` now `fetch`es the
    route with `Authorization: Bearer <idToken>` (was a direct client write).
  - **Rule tightened:** `contacts` `create → if false` (Admin SDK is the only writer);
    deployed via `firebase deploy --only firestore:rules`.
  - **SMTP:** Gmail SMTP (`SMTP_HOST/PORT/USER/PASSWORD/FROM`), set in local `.env`
    **and** the Vercel dashboard (Production + Preview). Terraform plumbing for these
    exists but is parked (`_infra/_terraform/`) — env vars are dashboard-managed; see
    [`../deployment/README.md`](../deployment/README.md).
  - **Verified:** local end-to-end — submission writes Firestore, admin sees it in
    Contact Management, and the notification email arrives (`emailDelivered: true`).

---

## 12. Open decisions / sequencing

- **✅ SETTLED (owner, 2026-07-03): finalize the shared surface on desktop before the
  §4 mobile pass.** Rationale: shared code paths (markup, brand tokens, shared primitives,
  copy) render identically on both surfaces, so anything un-finalized there gets restyled by
  the mobile pass **and** rewritten by the desktop work → double work. Pure responsive-
  breakpoint tuning is inherently per-surface and correctly belongs to §4. **The
  finalize-before-mobile set (do first):**
  1. **✅ Phase C — 집사메뉴 / butler restyle** — DONE 2026-07-03. All components
     brand-clean; cross-cutting `globals.css` dead `.btn` block removed; nav blue hovers
     fixed. Auth-gated verifications (list/pagination, "새글 작성" button while signed in)
     still owed and carried in §4 sign-in-gated mobile audit.
  2. **✅ Cross-cutting button/color convergence** — DONE 2026-07-10. globals.css `.btn` block
     and nav hovers done (see #1); the **public + auth hand-rolled-button sweep → shared
     `<Button>` primitive** shipped (`256bc53`, FEATURE_MOD_LOG): announcements-detail, contact
     submit, announcement/cat-selector modals, email/phone login submits, 4 auth modals; stray
     non-brand accents normalized to brand tokens. Grep-clean of hand-rolled gradient `<button>`s
     in public/auth code (only 2 intentional `<Link>` CTAs remain).
  - _Deferred to §4 (genuinely per-surface, no double-work):_ map re-fit on mobile, modal/
    album/form mobile sizing, mobile nav drawer.
  - _Deferred, non-UI (render-invariant):_ structured logging, request validation, RBAC
    drift, Tier-1 Admin-SDK migration, upload-on-edit util. _Judgment calls (shared but not
    redesign):_ branded error-states (§7), link-token rendering in 공지/급식/집사톡.
- **Priority order** among Mobile UX (§4), Admin desktop cleanup (§5), Admin
  mobile (§6), cross-cutting button sweep (§12.2), and A4 — **to be set with the user.**
  Note the dependency: §6 (admin mobile) is best built **after** §5 (admin
  cleanup) so it's not built twice.
- **Admin visual target** — ✅ **SETTLED (owner, 2026-06-30): admin adopts the public
  brand.** The "deliberately utilitarian" option is retired; admin re-skins to the brand as
  part of the cross-cutting design system (handoff-16 §4).
- **Mobile verification tooling** — real device vs un-maximized Chrome vs DevTools
  (the `resize_window` tool was flaky).
- Whether the §7–§10 debt workstreams are scheduled now or parked until the
  user-facing work lands.

---

## 13. How to resume

1. Read the latest hand-off
   [`docs/handoff/2026-07-10-handoff-27.md`](../handoff/2026-07-10-handoff-27.md)
   (then `kickoff-3` for the broader debt map). **Off-plan session (handoff-27):** public/auth
   button convergence onto shared `<Button>`, S22 mobile items closed, and a batch of mobile
   nav/auth-flow fixes (hamburger-close, logout modal, mypage edit layout, menu-pill centering,
   rotate-notice GIF). All pushed to `origin/dev`. No active workstream — next pick is open.
2. With the user, pick the next workstream from §1 and fill in its section's
   concrete specs.
3. Spin a companion `docs/planning/<workstream>-tasks.md` (mirror the redesign
   tasks doc's rigor).
4. Implement in small, browser-verified chunks; keep `tsc` clean; update the §1
   snapshot and `design.md` as you go.

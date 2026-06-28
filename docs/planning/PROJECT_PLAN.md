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

## 1. Snapshot (as of 2026-06-28)

| Workstream                            | Status            | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing redesign (Phases 0–2)         | `[x]` done        | Brand tokens, frosted nav, Leaflet migration, mobile clustering.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| App redesign — A (Modals)             | `[x]` done        | Shared `ui/Modal` system (commit `5892b43`).                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| App redesign — B (Album pages)        | `[x]` done        | Shared `components/album/*` + `useMediaFilter`.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| App redesign — D (Localization)       | `[x]` done        | Auth + mypage → Korean (해요체), `strings.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| App redesign — C (other pages)        | `[ ]` not started | Brand audit of about/공지/FAQ/동참/입양홍보/집사메뉴. **Prereqs now met** (입양홍보 built + 동참 activated) — unblocked, ready to pick up (see redesign tasks **C0**).                                                                                                                                                                                                                                                                                                                                  |
| Redesign A4 (live-verification)       | `[~]` blocked     | Needs real sign-in / SMS (assistant can't enter creds).                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Functional: 입양홍보 page missing** | `[x]` done        | **§11** — built the adoptable-cats gallery (`Cat.adoptable` flag + admin tagging + `/pages/adoption`); all 404 entry points resolve. Browser-verified 2026-06-26 (gallery + CatInfo badge + admin badge/toggle).                                                                                                                                                                                                                                                                                        |
| **Functional: 동참 form end-to-end**  | `[x]` done        | **§11** — Variant A shipped 2026-06-28: `POST /api/contact` (ID-token verify → Admin SDK write → SMTP email to `adminEmail`); form repointed at the route; `contacts` rule tightened to `create: if false` + deployed; Gmail SMTP vars in `.env` + Vercel. Local end-to-end verified (Firestore write + admin tab + email).                                                                                                                                                                             |
| **Deployment-target cleanup**         | `[x]` done        | **§7** — Vercel-only (IaC: `infra/terraform/`). **Phase 1+2** removed Cloud Run / home-server / Firebase-Hosting / Docker / static-export / functions; trimmed `firebase.json`; aligned `build`; dropped `/api/health` + Firebase `staging` alias. **Phase 3** (2026-06-27) removed dead permission routes + `MIGRATION_EXAMPLE.ts` + the Cloud Storage static-data push path, refreshed stale comments/docs. Static-data Half B parked for §7a. ([`phase3-cleanup-plan.md`](./phase3-cleanup-plan.md)) |
| **Perf: bake the data layer**         | `[x]` done        | **§7a** — cats now read server-side via the Admin SDK + baked into the home & adoption Server Components (ISR `revalidate=3600`, single-sourced); on-demand `revalidatePath` on admin cat-edits. Landing avatars + galleries have **zero client Firestore queries** (browser-verified; ISR confirmed via `next build`). One follow-up: remove the dead static-data export seam (tasks-doc §6).                                                                                                          |
| **Mobile UX optimization**            | 🚧 placeholder    | §4 — public-facing mobile pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Admin desktop cleanup**             | 🚧 placeholder    | §5 — admin UI/UX consistency.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Admin mobile optimization**         | 🚧 placeholder    | §6 — admin usable on phones.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Codebase health / tech-debt           | 🚧 placeholder    | §7 — error handling, dead code, route auth.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Compliance / legal                    | 🚧 placeholder    | §8 — privacy policy, terms.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Multi-tenant hardening                | 🚧 placeholder    | §9 — make the 2nd-mountain path real.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Testing & quality gates               | 🚧 placeholder    | §10 — no automated coverage today.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

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

What is **not** done: redesign Phase C, live-verification of several auth/mypage
states (A4), the functional gaps in §11, and every workstream in §4–§10 below —
those are the forward plan.

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

> **Goal (placeholder):** make the entire **public** experience first-class on
> phones, not just the landing map. The map already has a mobile path
> (clustering + portrait rotation); the rest of the user-facing app has **not**
> been audited at mobile widths.

**Candidate scope — _confirm with user_:**

- [ ] Mobile audit pass of every public page at common breakpoints (≈360 / 390 /
      414 px): home/map, about, 공지/announcements, FAQ, 동참/contact, 입양홍보,
      photo-album, video-album, butler_talk, butler_stream, login/signup, mypage.
- [ ] **Navigation on mobile** — the frosted grouped nav + dropdowns; the ghost
      hamburger; login-gated 집사메뉴; ensure tap targets, dropdown reachability,
      and overlay z-index over the Leaflet map.
- [ ] **Map mobile quirks** — the "minor quirks left for now" from the landing
      work; clustering aggressiveness (`maxClusterRadius`) tuning; edge-clipping;
      spiderfy ergonomics.
- [ ] **Modals on mobile** — verify the shared `ui/Modal` sizing/scroll/safe-area
      on small screens (sizes were tuned for desktop "narrow over the map").
- [ ] **Album grids on mobile** — `grid-cols-2` density, tile caption legibility,
      Lightbox/VideoPlayer touch controls (swipe? — decide), filter-bar stacking.
- [ ] **Forms on mobile** — login/signup/phone-OTP/contact: input sizing,
      keyboard types (`inputmode`/`type=tel`), error placement, no-zoom font-size.
- [ ] Touch-target sizing, hit areas, and hover-only affordances that don't exist
      on touch (replace hover-reveal with always-visible or tap states).
- [ ] Performance on mobile networks — image sizes, above-the-fold, the
      thumbnail preloader's eagerness on cellular.
- [ ] Tooling note: the `resize_window` browser tool was flaky last session;
      decide how mobile is verified (real device / un-maximized Chrome / DevTools).

_(Out of scope here: admin mobile — that's §6.)_

---

## 5. 🚧 Admin interface cleanup (desktop)

> **Goal (placeholder):** bring the `/admin` CMS up to a consistent, maintainable
> desktop standard. Admin was **explicitly out of scope** for the design
> redesign; this workstream brings it _into_ scope as a cleanup (not necessarily
> a full re-skin to the public brand — **confirm the target look**).

**Candidate scope — _confirm with user_:**

- [ ] **Visual/UX consistency** — the admin layout mixes inline styles + Tailwind;
      decide one convention and a baseline component set (buttons, tables, forms,
      modals). Decide whether admin adopts the public brand tokens or keeps a
      deliberately utilitarian look.
- [ ] **`AdminAuth` hardening (UX side)** — the 10s loading timeout flaps to
      "Authentication timeout" on slow logins; the "🚨 Emergency Bypass (Dev
      Mode)" buttons ship in prod and should be gated to `NODE_ENV !== 'production'`.
- [x] **Dead/duplicate cleanup (routes + example)** — ✅ removed in Phase 3A: the 8
      unreferenced `get-all-user-permissions-*`/`get-all-users` routes and
      `MIGRATION_EXAMPLE.ts`. **`role-assignment-service.ts` is NOT dead** — it's used by
      `RoleManagement.tsx` + `PermissionDebug.tsx` (kept). Still open: disabled-link
      placeholders (`급식소 관리`, `겨울집 관리`); `/admin/create-user` unauthenticated
      bypass (verify the page exists).
- [ ] **react-admin decision** — `src/lib/admin/dataProvider.ts` is partially
      used; either commit to it or remove it. Don't extend without confirming usage.
- [ ] **Consistency of admin Korean strings** + consider centralizing (mirrors the
      `strings.ts` pattern) if this workstream grows.
- [ ] **Two auth listeners** — `AdminAuth` subscribes to `onAuthStateChanged`
      directly instead of `useAuth()`; consolidate.

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

- [~] **🔴 Admin CMS writes blocked by `write: if false` (cats fix staged; others pending).**
  The deployed `firestore.rules` lock `cats` — and also `points`, `about_content`,
  `cat_images`, `cat_videos`, `posts_announcements` — to `allow write: if false`, but the
  admin CMS writes through the **client SDK** → permission-denied (UI: "Failed to update
  cat with id: …"). The lock went **live** when the 동참 rules deploy (`f84f3c1`,
  `firebase deploy --only firestore:rules`) shipped; **not** caused by §7a. **Fix staged for
  `cats`** (permission-gated `manage-cat`, mirroring `posts_*`) — **not yet deployed**, and
  the other five collections still need the same treatment + per-page verification. Resume
  brief: [handoff-10](../handoff/2026-06-28-handoff-10.md). _Secondary, latent:_ `db` has no
  `ignoreUndefinedProperties`, so writes with unset `isNeutered`/`date_of_birth` may still
  throw on `undefined` even after the rule fix. - _**Future consideration (not a scheduled task):** migrate admin writes to **Admin SDK
  API routes** (verify ID token + permission → server write), restoring
  `write: if false` and **eliminating client-SDK write reliance** — the "Admin SDK is the
  only writer" direction the 동참 work started. Effort/risk not yet assessed; truly
  dropping the Firebase SDK from public bundles would \*also_ require `AuthProvider` to stop
  eagerly importing `firebase/auth`. Decide later, not committed.\_
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

## 8. 🚧 Compliance / legal

> **Goal (placeholder):** the deferred compliance workstream. Footer
> `개인정보처리방침` (privacy policy) and `이용약관` (terms) are inert placeholders.

**Candidate scope — _confirm with user_:**

- [ ] Privacy policy + terms content (Korean; PIPA considerations for a KR
      non-profit collecting accounts/phone numbers).
- [ ] Wire the footer legal links to real pages/routes.
- [ ] Consent touchpoints at signup (if required).
- [ ] (Stub `docs/compliance/` referenced by prior docs — confirm it exists / owner.)

---

## 9. 🚧 Multi-tenant hardening

> **Goal (placeholder):** make the "add a second mountain by editing JSON" promise
> actually true. Today several paths are single-mountain hard-coded.

**Candidate scope — _confirm with user; may be far-future_:**

- [ ] `?mountain=` switch is a no-op — `MountainSelector` sets the query but
      `getCurrentMountainId()` only reads env. Implement cookie/query/host-based
      selection or remove the selector.
- [ ] Hard-coded service-account path + bucket fallbacks
      (`feeding-spots-admin-service.ts`, `generate-signed-url`, fetch-assets).
- [ ] Hard-coded map image path in the map host; source it from mountain config.
- [ ] `mountains.json` vs `permissions.json` inconsistency (`manisan` exists in
      one, not the other).
- [ ] Theme not wired through — `getMountainTheme()` returns colors nothing reads.
- [ ] Per-mountain DB isolation at the service-factory seam (the seam exists; the
      isolation doesn't).

---

## 10. 🚧 Testing & quality gates

> **Goal (placeholder):** coverage was **zero**; a first structural baseline now
> exists. Build it out from there.

**Done:**

- [x] **Test stack bootstrapped (Vitest)** — `npm test` / `npm run test:smoke`;
      first suite `tests/smoke/smoke.test.ts` (2026-06-27, 24 tests, <1s, no
      server/env). Structural smoke: referenced `/api/*` routes resolve to handlers,
      deploy-config keepers survive, critical public pages exist. Added as the
      regression net for the deployment cleanup
      ([`deployment-cleanup-plan.md`](./deployment-cleanup-plan.md)).

**Candidate scope — _confirm with user_:**

- [ ] Decide the broader test stack (unit / integration / UI) and what to cover first
      (permissions resolution, service layer, auth flows are high-value).
- [ ] Runtime HTTP smoke (boot the app, key routes return 200) — deferred; needs
      Firebase env, slower/non-deterministic. Today's structural smoke + `vercel-build` + a Vercel preview deploy cover this for now.
- [ ] Add mock service implementations behind the existing interfaces to unblock
      component/unit tests.
- [ ] Smoke/UI tests for the critical public paths (map loads, gallery opens,
      login renders).
- [ ] CI wiring beyond `tsc`/lint.

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

- **Priority order** among Mobile UX (§4), Admin desktop cleanup (§5), Admin
  mobile (§6), and finishing redesign Phase C / A4 — **to be set with the user.**
  Note the dependency: §6 (admin mobile) is best built **after** §5 (admin
  cleanup) so it's not built twice.
- **Admin visual target** — does admin adopt the public brand, or stay
  deliberately utilitarian? (Drives §5 and §6.)
- **Mobile verification tooling** — real device vs un-maximized Chrome vs DevTools
  (the `resize_window` tool was flaky).
- Whether the §7–§10 debt workstreams are scheduled now or parked until the
  user-facing work lands.

---

## 13. How to resume

1. Read the latest hand-off
   [`docs/handoff/2026-06-27-handoff-7.md`](../handoff/2026-06-27-handoff-7.md)
   (then `kickoff-3` for the broader debt map). **Both functional gaps in §11
   (입양홍보, 동참) and the deployment-target cleanup (§7) are now done.** Next
   workstream is undecided — strongest candidates: §7a "bake the data layer" (perf 🔴)
   or redesign Phase C (now unblocked by 입양홍보 + 동참).
2. With the user, pick the next workstream from §1 and fill in its section's
   concrete specs.
3. Spin a companion `docs/planning/<workstream>-tasks.md` (mirror the redesign
   tasks doc's rigor).
4. Implement in small, browser-verified chunks; keep `tsc` clean; update the §1
   snapshot and `design.md` as you go.

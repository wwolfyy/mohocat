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

## 1. Snapshot (as of 2026-06-21)

| Workstream                            | Status            | Notes                                                                                                                                           |
| ------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing redesign (Phases 0–2)         | `[x]` done        | Brand tokens, frosted nav, Leaflet migration, mobile clustering.                                                                                |
| App redesign — A (Modals)             | `[x]` done        | Shared `ui/Modal` system (commit `5892b43`).                                                                                                    |
| App redesign — B (Album pages)        | `[x]` done        | Shared `components/album/*` + `useMediaFilter`.                                                                                                 |
| App redesign — D (Localization)       | `[x]` done        | Auth + mypage → Korean (해요체), `strings.ts`.                                                                                                  |
| App redesign — C (other pages)        | `[ ]` not started | Brand audit of about/공지/FAQ/동참/입양홍보/집사메뉴. **Blocked on prereqs:** create 입양홍보 page + activate 동참 (see redesign tasks **C0**). |
| Redesign A4 (live-verification)       | `[~]` blocked     | Needs real sign-in / SMS (assistant can't enter creds).                                                                                         |
| **Functional: 입양홍보 page missing** | `[ ]` todo        | **§11** — nav links + CTA 404; no `/pages/adoption` route exists.                                                                               |
| **Functional: 동참 form end-to-end**  | `[ ]` todo        | **§11** — UI active; verify submission writes + actually reaches staff.                                                                         |
| **Mobile UX optimization**            | 🚧 placeholder    | §4 — public-facing mobile pass.                                                                                                                 |
| **Admin desktop cleanup**             | 🚧 placeholder    | §5 — admin UI/UX consistency.                                                                                                                   |
| **Admin mobile optimization**         | 🚧 placeholder    | §6 — admin usable on phones.                                                                                                                    |
| Codebase health / tech-debt           | 🚧 placeholder    | §7 — error handling, dead code, route auth.                                                                                                     |
| Compliance / legal                    | 🚧 placeholder    | §8 — privacy policy, terms.                                                                                                                     |
| Multi-tenant hardening                | 🚧 placeholder    | §9 — make the 2nd-mountain path real.                                                                                                           |
| Testing & quality gates               | 🚧 placeholder    | §10 — no automated coverage today.                                                                                                              |

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
- [ ] **Dead/duplicate cleanup** — the 8 `get-all-user-permissions-*` route
      variants; `MIGRATION_EXAMPLE.ts`; `role-assignment-service.ts` (not in the
      factory); disabled-link placeholders (`급식소 관리`, `겨울집 관리`);
      `/admin/create-user` unauthenticated bypass (verify the page exists).
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
- [ ] **Dead code** — the route variants, `MIGRATION_EXAMPLE.ts`,
      `role-assignment-service.ts`. _(Overlaps §5.)_
- [ ] **Build pipeline** — `build` re-exports to GCS on every run; review.
- [ ] **Request validation** — no zod/schema at API boundaries.

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

> **Goal (placeholder):** there is **no automated test coverage** today; the
> service interfaces have no mocks. Establish a baseline.

**Candidate scope — _confirm with user_:**

- [ ] Decide the test stack (unit / integration / UI) and what to cover first
      (permissions resolution, service layer, auth flows are high-value).
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

- [ ] **입양홍보 (`/pages/adoption`) does not exist** — the 소식 dropdown link, both
      mobile entries, and the standalone brand **CTA** all point at a route that
      isn't there → every entry point 404s. Decided direction: build it as an
      **입양 가능 냥이 갤러리** (adoptable-cats gallery) — needs a `Cat.adoptable`
      flag + admin tagging + the public gallery page (redesign tasks **C0**). _Interim
      option if it won't be built soon: hide the link + CTA so visitors don't 404._
- [ ] **동참 (`/pages/contact`) — confirm the form works end-to-end.** The UI is now
      active (design chunk done) and wired to `getContactService().createContact()`
      → Firestore `contacts` (the admin dashboard reads `getAllContacts()`), so the
      pipeline _looks_ present — but it has **not been verified** to actually submit
      and reach a human. Verify: a real submission writes the doc, an admin can see
      it, and someone reviews/gets notified. If submissions land where nobody looks,
      that's the functional gap to close.
  - _Update:_ submission is now **members-only at the UI** (보내기 disabled +
    `handleSubmit` guard when logged out, with a 집사등록 prompt). **Server-side
    enforcement is still open** — `contacts` Firestore rules don't require
    `request.auth`, so this is UI gating only, not a security control. Decide
    whether contact submissions must be truly auth-gated; if so, add the rule.

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

1. Read [`docs/handoff/2026-06-21-kickoff-3.md`](../handoff/2026-06-21-kickoff-3.md).
2. With the user, pick the next workstream from §1 and fill in its section's
   concrete specs.
3. Spin a companion `docs/planning/<workstream>-tasks.md` (mirror the redesign
   tasks doc's rigor).
4. Implement in small, browser-verified chunks; keep `tsc` clean; update the §1
   snapshot and `design.md` as you go.

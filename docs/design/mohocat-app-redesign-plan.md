# 산냥이집냥이 — App-Wide Redesign Plan

> Design fine-tuning **beyond the landing page**, carrying the brand language
> locked during the landing redesign into the rest of the user-facing app.
>
> Companion docs:
> [`design.md`](./design.md) (design source-of-truth — intent + usage) ·
> [`mohocat-app-redesign-tasks.md`](./mohocat-app-redesign-tasks.md) (this plan's
> task checklist) ·
> [`mohocat-landing-redesign-plan.md`](./mohocat-landing-redesign-plan.md) +
> [`mohocat-landing-redesign-tasks.md`](./mohocat-landing-redesign-tasks.md) (the
> completed landing/Leaflet work — the precedent for structure & rigor).

---

## Status (as of 2026-06-21)

**Done & verified — landing page (separate plan):** Phases 0–2 complete — brand
tokens, desktop landing (grouped frosted nav, `입양홍보` CTA, restyled markers,
`IntroCard`, `Footer`), and the Leaflet map migration (`CRS.Simple` + image
overlay, divIcon markers, mobile clustering/spiderfy, 90°-CW portrait rotation).
See [`mohocat-landing-redesign-tasks.md`](./mohocat-landing-redesign-tasks.md).

**Done & verified — this plan:**

- **Phase A — Modal design-system unification** ✅ (commit `5892b43`). Every
  user-facing modal now shares one shell/behavior — "a warm card floating over
  the map." New shared building blocks in `src/components/ui/`
  (`Modal`, `useModalLayer`, `Lightbox`, `VideoPlayer`); cat-selector
  consolidated 3 copies → one `CatSelectorModal`; `parse-date.ts` extracted.
  Codified in `design.md` (`### Modal`, `### Media viewer`). Details +
  verification status in
  [`docs/handoff/2026-06-21-handoff.md`](../handoff/2026-06-21-handoff.md).

**In progress / not yet started — this plan:** Phases B and C below.

---

## Known open items / quirks (deferred)

- **A few modals refactored but not yet driven live** (tsc/lint-clean, share the
  verified `Modal`+portal): the 4 non-Logout auth modals (`PasswordReset`,
  `UserNotFound`, `EmailVerification`, `KakaoLoginGuidance`), `AnnouncementModal`,
  and the lightbox-over-album-modal stack. Tracked in the tasks doc (Phase A
  verification). To exercise: log out for the auth flow; a cat with media on the
  map is tagged 예쁜이 / 찰리 / 팥붕이.
- **`VideoAlbum` "no videos" shows as a red error** (pre-existing logic treating
  empty as error), not the neutral empty state `PhotoAlbum` uses — behavior, not
  styling; revisit under Phase B.
- **Footer legal links** (`개인정보처리방침`/`이용약관`) pending the compliance
  workstream (`docs/compliance/`), not design.
- Mobile map has minor "quirks" the user chose to leave for now (unspecified —
  revisit). Clustering aggressiveness (`maxClusterRadius=50`) is a taste knob.
- `build` script runs `export_all_to_cloud_storage.js` on every build (writes TO
  storage) — questionable; review if touching the build.

---

## Scope of this plan

Design fine-tuning beyond the landing page. Confirm & prioritize each area's
specifics with the user before implementing — the phases below are the agreed
**areas**; the per-area design decisions are filled in as each is picked up.

### Phase A — Modals ✅ DONE

Consistent shell, sizing/spacing, close affordance, mobile fit, scroll behavior,
and brand-consistent styling across `CatGallery`, `CatInfo`, the about-page cat
modal, `PhotoAlbum`/`VideoAlbum` (+ their lightbox/player), `AnnouncementModal`,
`CatSelectorModal`, and the 5 auth modals. Specs live in `design.md`.

### Phase B — Photo / video album page layout

The album **pages** themselves (`src/app/pages/photo-album/page.tsx` &
`video-album/page.tsx`), not their modals (done in Phase A). The two pages are
near-identical in structure today. **Decided direction (2026-06-21):** a _fuller
layout redesign_ — restyled header/hero + richer tiles + brand cleanup — while
**keeping the uniform square grid** (photos cropped to square cells; videos stay
16:9). Captions stay **always-visible** but drop the "설명 없음" filler when a
description is absent.

**Locked decisions:**

- **Brand cleanup (the core gap).** The pages are full of blue that `design.md`
  reserves for secondary links/focus only: search/filter focus rings
  (`ring-blue-500`), the "🐱 고양이 선택" link (`text-blue-500`), selected-cat
  chips (`bg-blue-100 text-blue-800`), and the video **"Storage" badge**
  (`bg-blue-600`). Recolor to **brand/accent + neutral** per `design.md`. Vendor
  YouTube red on the video badge stays.
- **Header / hero.** Replace the plain white title bar + empty subtitle with a
  warm, restrained hero: page title with a short **brand-yellow underline
  accent** (the modal section-label pattern), a small brand-gradient icon chip
  (e.g. `FaPaw` / camera / film), and a real one-line subtitle. Surface stays
  neutral; brand used as accent only.
- **Filter bar.** Consolidate the **redundant** selected-cat display (currently
  rendered twice) into one place; recolor chips + affordances to brand/neutral;
  search + selector focus rings → brand. Removing a filter chip is **not**
  destructive → neutral ×, not red.
- **Grid (kept).** Uniform square photo cells, 16:9 video cells; responsive
  `grid-cols-2 … xl:grid-cols-6`. Tiles get the richer treatment: `rounded-xl`
  to match the modal language, brand-consistent hover (keep image `scale-105`),
  brand-tinted hover affordance, always-on caption minus the empty-filler.
- **States.** Warm, branded **loading / empty / error** (paw or camera accent +
  friendly Korean copy) instead of bare gray/red text.
- **Shared chrome (maintainability).** The two pages duplicate the hero, filter
  bar, state blocks, and filter logic verbatim. Extract the shared pieces (e.g.
  `AlbumHero`, `AlbumFilterBar`, album state blocks, a `useMediaFilter` hook) so
  the redesign is authored once, not twice. Tile rendering can stay per-media
  (square photo vs 16:9 video) or behind a thin generic grid. _(Refactor in
  service of the redesign — keep it measured, no behavior change.)_

**Out of scope here:** the `VideoAlbum.tsx` **component** red-empty-state quirk
(used in the CatInfo modal, not these pages) — track under Phase A follow-ups.

### Phase C — Other non-landing pages — TBD

Brand-consistency audit of 소개(about), 공지(announcements), FAQ, 동참(contact),
입양홍보(adoption), 집사메뉴 pages. Candidate goals — **confirm specifics**:

- Apply the design-token language (brand/accent/ink, rounded shapes, restrained
  yellow, neutral surfaces) consistently.
- Reconcile the legacy blue `.btn-primary` in `globals.css` with the brand CTA
  direction (carried over as deferred from the landing work).
- Typography/spacing consistency with `design.md`.

### Phase D — Localization: auth flow + 집사메뉴(mypage)

The app is Korean, but the **auth surfaces and the mypage are still in English** —
a jarring inconsistency right at the moment we ask a visitor to commit (sign
up / log in). For a volunteer-driven non-profit, a fully-Korean, low-friction
sign-up path **directly serves the cause**: it's where new 집사 (caretakers) join.

**Baseline goal:** translate every user-facing English string to Korean across
the auth flow and mypage. Surfaces with English copy (from a source scan):

- **Auth modals (5):** `EmailVerificationModal` ("Verify your Email"),
  `LogoutModal` ("Sign Out", "Are you sure you want to sign out?"),
  `UserNotFoundModal` ("Account Not Found", "Otherwise, would you like to create
  a new account?"), `PasswordResetModal` ("Reset Password", "Enter your email"),
  `KakaoLoginGuidanceModal` ("Login Requirement", "Account Check", "How to Link
  Account", "Settings > Account").
- **Auth forms / nav:** `PhoneLoginForm` ("Phone Number", …),
  `NavigationBarLogin` ("Log In"), `NavigationBarLogout` ("My Page", "Sign Out").
- **Login page(s):** `app/pages/login`, `app/login` ("Loading…").
- **mypage:** `app/mypage` — "My Page", "Profile", "Nickname", "Email",
  "Password", "Phone Number", "Linked Accounts", "Please enter your password to
  continue.", "Verification email sent!", and the input **placeholders**
  ("Current Password", "New Email Address", "New Phone Number", "Verification
  Code").

Translate **visible text, `placeholder`s, `title`/tooltip, and `aria-label`s** —
not just the obvious labels. Vendor brand **colors** stay (Kakao `#FEE500`); use
the Korean vendor **name** "카카오톡" rather than "KakaoTalk"/"TALK".

**Decided enhancements (beyond literal translation):**

- **"My Page" → "내 집사 정보" (decided).** Render mypage/nav with the 집사
  metaphor the app already uses (집사메뉴, 집사톡) rather than a literal
  "마이페이지" — reinforces community identity and the cause, a UX+brand win, not
  just l10n. Apply the same caretaker voice consistently across the auth flow.
- **Centralize the strings (decided).** These surfaces have no shared copy
  module and the project uses no i18n lib. Introduce a **lightweight per-area
  constants module** (e.g. colocated `*.strings.ts`, or one shared copy module)
  so tone stays consistent and future copy edits are one place — separation of
  concerns. Translate via these constants, not inline literals.

**Suggested enhancements (still confirm before doing):**

- **Match the app's warm voice (해요체).** Don't translate word-for-word into
  terse formal Korean; mirror the friendly-polite tone of the landing/intro copy
  so auth doesn't feel like a different, colder app. (e.g. "로그아웃 할까요?"
  over a clipped "로그아웃".)
- **Make Kakao guidance actually followable in Korean.** "Settings > Account"
  should reference the real Korean Kakao labels (e.g. 설정 > 카카오계정) so users
  can actually complete the step — this is functional, not cosmetic.
- **Reassuring, action-guiding error copy.** Auth errors (UserNotFound, reset,
  verification) are the highest-friction moments; Korean copy that explains what
  happened and the next step reduces sign-up drop-off. Keep destructive/red
  affordances per `design.md`.
- **Add a short "Language & voice" note to `design.md`** so "user-facing copy is
  Korean, 해요체, 집사 terminology" becomes a recorded design decision, not tribal
  knowledge — preventing the next English string from creeping back in.

Phase D is **concrete and independent** — it can proceed before/around B and C.

---

## Conventions (carry over from the landing work)

- **Design tokens are the source of truth** — `tailwind.config.js`
  (`brand`/`accent`/`ink`); keep classes literal so Tailwind JIT generates them.
  `design.md` documents intent/usage and is updated as part of each phase.
- **Verify in a real browser**, not compile/lint alone (`localhost:3000` via the
  Chrome extension). Work in **small, browser-verified chunks**, one at a time.
- **All public modals use the shared `src/components/ui/Modal`** — never
  hand-roll a `fixed inset-0` shell (the portal-to-`<body>` avoids the
  `backdrop-blur` containing-block trap; see `design.md` → Modal).
- **Content is live from Firebase** (shared dev/prod project) — admin/console
  text edits hit production instantly; only _code_ needs build+deploy. Media
  (thumbnails/about-photos) is build-fetched (`npm run fetch:assets`), not in git.
- `npx tsc --noEmit` stays clean (quick gate); `npm run lint` has only
  pre-existing warnings (`<img>` on Firebase media, a few exhaustive-deps).
- Mirror the **plan + tasks-checklist** structure of the landing redesign docs.

## How to resume

1. With the user, pick the next area (B or C) and fill in its concrete specs above.
2. Add/refine its tasks in
   [`mohocat-app-redesign-tasks.md`](./mohocat-app-redesign-tasks.md).
3. Implement in small, browser-verified chunks; keep `tsc` clean; update
   `design.md` + these docs as you go.

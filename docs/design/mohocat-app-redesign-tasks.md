# 산냥이집냥이 — App-Wide Redesign Task List

Companion to [`mohocat-app-redesign-plan.md`](./mohocat-app-redesign-plan.md).
Section references (§) point back to that plan. Design decisions live in
[`design.md`](./design.md); token values live in
[`tailwind.config.js`](../../tailwind.config.js). Structured after
[`mohocat-landing-redesign-tasks.md`](./mohocat-landing-redesign-tasks.md) — the
completed landing work, the precedent for rigor.

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` deferred/out of scope

---

## Phase A — Modal design-system unification (§ Phase A)

> **Complete & committed (`5892b43`).** Goal: every user-facing modal shares one
> shell/behavior — "a warm card floating over the map." Theme established from
> `CatGallery` + `CatInfo`, codified in `design.md` (`### Modal`, `### Media
viewer`), then propagated. Full narrative + theme spec in
> [`docs/handoff/2026-06-21-handoff.md`](../handoff/2026-06-21-handoff.md).

### A1. Shared building blocks — `src/components/ui/`

- [x] `Modal.tsx` — the shell: backdrop + white card + centered `title` +
      `ModalCloseButton`; props `isOpen?`/`onClose`/`title?`/`size (sm/md/lg/xl)`/
      `zIndexClassName`/`className`/`hideCloseButton`/`ariaLabel`; body scroll-lock.
- [x] Render through **`createPortal(document.body)`** — fixes the `backdrop-blur`
      containing-block trap (the `LogoutModal` rendered from inside the frosted
      header was clipped without it). _(browser-verified incl. the portal fix.)_
- [x] `useModalLayer.ts` — shared layer stack; Esc closes / ←→ navigate **only
      the topmost** overlay. Used by `Modal`, `Lightbox`, `VideoPlayer`. Replaced an
      earlier `closeOnEscape` hack. _(nested-modal ESC ordering verified.)_
- [x] `Lightbox.tsx` — full-bleed dark image viewer (circular-ghost close +
      prev/next); native `<img>` on purpose (dev image optimizer stalls on full-size
      Firebase URLs). _(browser-verified: open / ←→ / Esc.)_
- [x] `VideoPlayer.tsx` — full-bleed dark video viewer (YouTube iframe / HTML5),
      same dark language.
- [x] Size scale: `sm/md/lg/xl` = `max-w-sm/md/lg/2xl`; gallery/info at `xl`,
      auth/confirm at `sm`.
- [x] Animations in `globals.css` — `animate-modal-backdrop` /
      `animate-modal-panel` (+ keyframes).
- [x] Extract `src/utils/parse-date.ts` (was copy-pasted 4×).

### A2. Migrate every user-facing modal onto the shared system

- [x] Reference: `CatGallery`, `CatInfo`, about-page cat modal
      (`app/pages/about/page.tsx`). _(browser-verified, incl. CatGallery→CatInfo
      nesting.)_
- [x] Content: `PhotoAlbum`, `VideoAlbum` (+ their lightbox/player),
      `AnnouncementModal`. _(album shells browser-verified.)_
- [x] Cat selector: consolidate **3 near-identical copies → one
      `CatSelectorModal`** — used by `NewPostForm`, `NewButlerTalkForm`, and both
      `photo-album`/`video-album` pages (inline filter copies deleted). API:
      `selectedTags: string[]` / `onTagsChange(names)`; commits on **완료**; includes
      an "이름 없음" (untagged) option. _(both gallery-page filters browser-verified
      incl. select→완료→filter→reopen.)_
- [x] Auth (5): `EmailVerificationModal`, `LogoutModal`, `UserNotFoundModal`,
      `PasswordResetModal`, `KakaoLoginGuidanceModal`. Vendor Kakao `#FEE500`
      preserved; destructive logout stays red. _(LogoutModal browser-verified.)_

### A3. Theme conventions (codified in `design.md`)

- [x] Frosted dark backdrop + fade-in; white `rounded-xl shadow-xl` card + scale/
      fade pop-in.
- [x] Neutral **circular ghost** close (top-right); old red-square close removed
      everywhere (red reserved for destructive).
- [x] Restrained brand-yellow accents (avatar rings, section underlines, status
      pill, action chips); surfaces neutral.
- [x] Primary action = brand→accent gradient `text-ink`; secondary = `bg-gray-100`;
      destructive confirm red; vendor buttons never re-themed.
- [x] Deliberately narrow sizes so the map shows around the card.

### A4. Live-verification of refactored-but-not-yet-driven modals

> All share the verified `Modal`+portal and are `tsc`/lint-clean; need a
> logged-out / mid-login state or a cat with media to drive. To reach them: log
> out for the auth flow; a cat with photos/videos is tagged 예쁜이 / 찰리 / 팥붕이.

- [ ] `PasswordResetModal` (login page forgot-password, or `/mypage` → 집사메뉴)
- [ ] `UserNotFoundModal`
- [ ] `EmailVerificationModal`
- [ ] `KakaoLoginGuidanceModal`
- [ ] `AnnouncementModal` (needs an active announcement; suppressed by
      `sessionStorage 'hasSeenAnnouncementModal'`)
- [ ] Lightbox/VideoPlayer **over** an album modal (CatInfo → 사진/동영상 보기 →
      open a media item → Esc closes only the viewer) — same `useModalLayer` stack
      verified for nested modals.

---

## Phase B — Photo / video album page layout (§ Phase B)

> The album **pages** (`src/app/pages/photo-album/page.tsx` &
> `video-album/page.tsx`), not their modals (done in Phase A). **Decided
> (2026-06-21):** _fuller layout redesign_ — restyled hero + richer tiles + brand
> cleanup — but **keep the uniform square grid** (videos stay 16:9); captions
> **always-visible** minus the "설명 없음" filler. The two pages are near-identical;
> author the redesign once via shared pieces. Do shared extraction (B0) first so
> B2–B5 are styled in one place.

> **✅ Done & browser-verified (2026-06-21).** New shared pieces in
> `src/components/album/` (`AlbumHero`, `AlbumFilterBar`, `MediaTile`,
> `AlbumStates` = `AlbumLoading`/`AlbumMessage`/`ResultCount`) + a `useMediaFilter`
> hook (`src/hooks/`); both pages rewritten as thin hosts. `tsc`/lint clean.

### B0. Shared chrome extraction (do first — maintainability)

- [x] Extract `AlbumHero` (title + brand underline + icon chip + subtitle)
- [x] Extract `AlbumFilterBar` (search + cat-selector trigger + chips + clear) —
      owns the `CatSelectorModal`; single source for both pages
- [x] Extract shared state blocks — `AlbumLoading` / `AlbumMessage` /
      `ResultCount` (`AlbumStates.tsx`)
- [x] Extract `useMediaFilter<T>` hook (generic over `{description?, tags[]}`) —
      was duplicated verbatim in both pages
- [x] Pages thin: data fetch + tile rendering + shared pieces. No behavior change
      from extraction (verified filter / lightbox / player still work)

### B1. Brand cleanup (recolor blue → brand/neutral per `design.md`)

- [x] Search + cat-selector **focus rings** `ring-blue-500` → `ring-brand-300`
- [x] "🐱 고양이 선택" link `text-blue-500` → `text-brand-600` (now `FaCat`)
- [x] Selected-cat chips `bg-blue-100 text-blue-800` → `bg-brand-50 text-ink
ring-brand-200`
- [x] Video badge `bg-blue-600 "Storage"` → neutral `bg-gray-700/90 "직접 업로드"`;
      YouTube red kept (vendor) _(current data is all YouTube; storage code in place)_
- [x] Filter chip removal × + "모두 지우기" stay **neutral** (not destructive)

### B2. Header / hero — `AlbumHero`

- [x] Plain white title bar → warm hero: title + **brand-yellow underline accent**
- [x] Brand-gradient icon chip (`FaCamera` photo / `FaVideo` video)
- [x] Real subtitle (photo: 산냥이 집냥이들의 소중한 순간들; video: …생생한 순간들)

### B3. Filter bar — `AlbumFilterBar`

- [x] Consolidated the redundant selected-cat display (was twice) → one chip row
- [x] Restyled search input + selector trigger to brand/neutral
- [x] Phase A commit-on-완료 `CatSelectorModal` wiring intact _(verified
      search→select→완료→filter→count round-trip)_

### B4. Tiles (richer; grid kept) — `MediaTile`

- [x] Uniform **square** photo / **16:9** video cells; `grid-cols-2 … xl:6` kept
- [x] `rounded-xl`; hover lift + image `scale-105`; hover overlay affordance
      (`FaSearchPlus` / `FaPlay`)
- [x] Caption always-on but **"설명 없음" dropped** when empty (date-only)
- [x] Video duration + type badge preserved (recolored per B1)

### B5. States — warm + branded — `AlbumStates`

- [x] Loading: brand-colored spinner + label
- [x] Empty + no-results: brand accent-chip icon + friendly Korean ("아직 등록된
      사진/동영상이 없어요")
- [x] Error: `AlbumMessage tone="error"` (restrained red)

### B6. Verify

- [x] Browser-verified **desktop** (1440): both pages — hero, filter
      (search→select→완료→chip→count), grid/tiles, hover, lightbox + video player,
      captions; **no blue** where brand belongs; console + `tsc` clean
- [~] Mobile width: responsive classes unchanged from the previously-working
  layout (`grid-cols-2`, `md:grid-cols-2` filter stacks); not re-screenshotted
  (resize-capture tooling quirk) — low risk, spot-check if revisiting
- [x] `design.md` updated with the album hero + tile patterns

---

## Phase C — Other non-landing pages (§ Phase C) — TBD

> Brand-consistency audit of 소개(about), 공지(announcements), FAQ, 동참(contact),
> 입양홍보(adoption), 집사메뉴 pages. **Specifics to be confirmed with the user.**

### C0. Prerequisites (blocking — do **before** the audit)

> Two Phase C target surfaces aren't reachable today; the audit can't restyle what
> isn't there. See the plan's **Prerequisites** block for full detail.

- [ ] **Create the 입양홍보 page** — `src/app/pages/adoption/page.tsx` does **not
      exist**; the 소개/소식 dropdown links **and** the standalone brand CTA in
      `Navigation.tsx` all 404. **Decided scope (user, 2026-06-21): an 입양 가능
      냥이 갤러리** (adoptable-cats gallery) — _not_ just an info page, so it's a
      small **feature**, scheduled as a later Phase C chunk (after the existing-page
      restyles). Sub-work:
  - [ ] Add an **`adoptable` flag** to the `Cat` model/type (the four existing
        statuses 산냥이/집냥이/별냥이/행방불명 don't express "adoptable").
  - [ ] **Admin tagging** — let an admin mark a cat adoptable (cats CMS / a new
        toggle); include in static-data export if the gallery reads static JSON.
  - [ ] **Public gallery page** — filter cats by `adoptable`, render on the shared
        album/cat-grid building blocks (`components/album/*`), open `CatInfo` on
        tap. Brand tokens + Korean 해요체 from the start.
  - [ ] Wire it so the existing `/pages/adoption` links + CTA resolve (no 404).
- [x] **Activate 동참** — 동참 → `/pages/contact`. Was greyed by a hardcoded
      `준비 중입니다` overlay + a `filter grayscale opacity-50 pointer-events-none`
      wrapper (not permissions — verified live: `contact`/`adoption` are `[]` =
      public). User commented out the overlay + dev-reminder; assistant removed the
      greying wrapper classes and branded the form focus rings
      (`focus:ring-yellow-400` → `focus:ring-brand-300`, ×4). _Browser-verified:
      form full-color/clickable, 보내기 = brand→accent gradient; `tsc` clean._
- [ ] **Verify** in the browser: 동참 page shows the live form (no overlay/grey),
      and 입양홍보 routes to a real page (no 404) from both the dropdowns and CTA.

### C1. Audit & restyle — per-page progress

Small browser-verified chunks, one page at a time. Sequence:
동참 → FAQ → 공지 → 소개 → 집사메뉴 → 입양홍보(feature) → cross-cutting.

- [x] **동참 / contact** — activated (see C0) + focus rings → brand; intro now
      links **"집사등록"** → `/login?tab=signup` (brand-700 bold underline link).
      **보내기 is now members-only:** disabled via `useAuth().isAuthenticated`
      (auth-loading window treated as "checking" to avoid a flash; `handleSubmit`
      also guards), with a logged-out prompt "메시지를 보내려면 먼저 집사등록이
      필요해요." linking to signup. Fields stay editable. _Browser-verified logged-out
      (button faded/disabled + prompt); enabled state needs a sign-in → A4. `tsc`
      clean._ ⚠️ UI gate only — not server-enforced (see PROJECT_PLAN §11).
- [x] **FAQ** (`faq/page.tsx`, `FAQ.tsx`) — accordion headers no longer use the
      CTA gradient on every item (now neutral white; open = `bg-brand-50` +
      `border-brand-200` + brand-600 chevron + `text-ink` question); title gained a
      brand underline accent; the `bg-blue-50 / "TBD."` box → brand-tinted card
      (`bg-brand-50 ring-brand-100`) with 해요체 copy + a "문의하러 가기" gradient CTA
      to `/pages/contact`. _Browser-verified open+closed; `tsc` clean._
- [x] **FAQ nav move** (`Navigation.tsx`) — FAQ is **butler-facing, not for
      visitors**, so it moved from the **소식** dropdown to **집사메뉴**
      (login-gated), in both the desktop dropdowns and the mobile menu (incl. the
      logged-out greyed label → "급식현황 · 집사톡 · FAQ"). _소식-removal browser-
      verified (logged out); the 집사메뉴 entry needs a signed-in session to view
      live (login-gated) — carry in A4. `tsc` clean._
      ⚠️ Follow-up (optional): the `faq` **resource** is still public, so `/pages/faq`
      is reachable by direct URL when logged out. If FAQ should be truly
      butler-only, gate the `faq` resource (e.g. require `view-post-butler`) and
      redirect logged-out visitors — **confirm with user**.
- [x] **공지 / announcements** (`announcements/page.tsx`, `[id]/page.tsx`,
      `AnnouncementClient.tsx`) — pagination de-gradient-ified (current page =
      solid `bg-brand`, dropped `border-yellow-500`; prev/next = neutral secondary,
      "previous"/"next" → 이전/다음); empty state "No announcements yet." → Korean
      neutral card; list cards → `rounded-lg border-gray-200 hover:shadow-sm`; list
      title got a brand underline accent; detail back-button → secondary token; the
      `yellow-50/200/400/800` notice box → brand-tinted card (`bg-brand-50
    ring-brand-100`, brand-600 icon, gray-700 text). _Browser-verified list +
      detail; `tsc` clean._ ⚠️ Noted (out of scope): list vs detail show a
      different date (list uses `formatKoreaDateTime` +9h, detail prints raw
      `date time`) — pre-existing date-format drift, track under tech-debt.
- [x] **소개 / about** (`about/page.tsx`) — localized residual English (사진을
      불러오는 중… / 사진을 불러올 수 없어요 / 소개 / 내용을 불러올 수 없어요); replaced the
      h1 inline `style={{color: theme.primaryColor}}` (a low-contrast yellow title)
      with a neutral `text-gray-900` title + brand underline accent (family motif);
      removed the dead commented subtitle + dynamic-sections blocks and the now-unused
      `theme`/`getMountainTheme`. _Browser-verified (title + underline + photo +
      content); `tsc` clean._
- [ ] **집사메뉴 / butler** (`butler_stream`, `butler_talk` + `new/`,
      `ButlerStreamClient`, `ButlerTalkClient`, `PostList`) — `border-yellow-500`
      selected state + form/list audit _(larger chunk)_
- [ ] **입양홍보 / adoption** — build the adoptable-cats gallery feature (see C0)
- [ ] **Cross-cutting** — reconcile legacy blue `.btn-primary` (`globals.css`) +
      nav `hover:text-blue-600` with the brand direction
      _(carried over as deferred from the landing work)_

---

## Phase D — Localization: auth flow + 집사메뉴(mypage) (§ Phase D)

> The app is Korean but the auth surfaces + mypage are still English — a jarring
> break right where we ask a visitor to commit. Fully-Korean, low-friction
> sign-up directly serves a volunteer-driven non-profit (this is where new 집사
> join). **Baseline = translate all user-facing English → Korean.** Translate
> visible text, `placeholder`s, `title`/tooltips, and `aria-label`s — not just
> labels. Vendor **colors** stay (Kakao `#FEE500`); use the Korean vendor name
> "카카오톡".
>
> **Decided (D5):** all copy goes through a **centralized constants module** (not
> inline literals), and **"My Page" → "내 집사 정보"** (집사 metaphor, not literal
> "마이페이지") with the caretaker voice across these surfaces. Build the strings
> module **first** so D1–D4 translate into it rather than into inline literals.

### D1. Auth modals (5) — `src/components/auth/` ✅

> All wired to `strings.auth.*` (해요체); `tsc`/lint clean. `LogoutModal`
> **browser-verified** in Korean (title/body/계정/취소/로그아웃). The other four
> share the identical strings-module pattern but need a logged-out / mid-login
> state to drive live — tracked in **A4** for the dedicated logged-out pass.

- [x] `EmailVerificationModal` → `strings.auth.emailVerification` (이메일 인증)
- [x] `LogoutModal` → `strings.auth.logout` (로그아웃; alert too) _(browser-verified)_
- [x] `UserNotFoundModal` → `strings.auth.userNotFound` (계정을 찾을 수 없어요;
      account-link guidance now points to 「내 집사 정보」)
- [x] `PasswordResetModal` → `strings.auth.passwordReset` (비밀번호 재설정; incl.
      sent/success + invalid-email/masked-sent/generic error copy)
- [x] `KakaoLoginGuidanceModal` → `strings.auth.kakao` (3 steps; KakaoTalk→카카오톡;
      guidance points to 「내 집사 정보」의 연결된 계정 — the real in-app location)

### D0. Centralized strings module (decided — do first)

- [x] Stand up a lightweight copy/constants module — `src/constants/strings.ts`,
      one shared module, `strings.<area>.<key>` (areas: common/auth/login/mypage);
      no i18n lib. `common` seeded (확인/취소/닫기/불러오는 중); per-area sections
      populated in D1–D4. `tsc` clean. _(structural — nothing renders yet.)_

### D2. Auth forms / nav — `src/components/auth/` ✅

> Wired to `strings.auth.nav` + `strings.auth.phoneLogin`; `tsc`/lint clean.
> `NavigationBarLogout` **browser-verified** (a11y tree: link "내 집사 정보" →
> /mypage, button "로그아웃"). `NavigationBarLogin` + `PhoneLoginForm` need a
> logged-out state → **A4**.

- [x] `PhoneLoginForm` → `strings.auth.phoneLogin` (전화번호/인증번호 labels,
      buttons, all error messages; numeric format placeholders left as-is)
- [x] `NavigationBarLogin` → `strings.auth.nav.logIn` ("Log In" → 로그인)
- [x] `NavigationBarLogout` → `strings.auth.nav` ("My Page" → **"내 집사 정보"**
      title; "Sign Out" → 로그아웃 title+aria) _(browser-verified)_
- _Note:_ blue hover (`hover:text-blue-600`) in the nav left as-is — brand
  cleanup, not localization (defer to Phase C audit)

### D3. Login page(s) ✅ (wrappers)

> Wired to `strings.login` + `strings.common.loading`; `tsc`/lint clean. Need a
> logged-out state to drive live → **A4**.

- [x] `app/login/page.tsx` — "Sign in to your account"/"Create a new account"
      headings, "Log In"/"Sign Up" tabs, "Loading…" → `strings.login` / common
- [x] `app/pages/login/page.tsx` — "Login" heading + "Loading…"

### D3a. Login / signup forms (scope add — user approved) ✅

> The actual login/signup UI rendered by the pages; were not in the original
> inventory. Wired to `strings.login.form` (LoginForm) + `strings.login.signup`
> (SignupForm); `tsc` clean, lint clean (one **pre-existing** exhaustive-deps
> warning), residual-English scan clean (only `name@example.com` example left
> inline). Live-verify in the **A4** logged-out pass (extension was offline).

- [x] `LoginForm.tsx` → `strings.login.form` (social/email/phone section titles,
      labels + placeholders, forgot-password, submit/loading, help text, kakao
      success, all login error messages, verification-sent alert)
- [x] `SignupForm.tsx` → `strings.login.signup` (details + verify steps:
      nickname/email/password/phone labels + placeholders, hint, buttons, summary
      rows, "Account Created!" success, all validation/Firebase error messages incl.
      phone-linked-to-other-account)
- [x] `SocialLoginButton.tsx` → `strings.login.social` ("Continue with
      Kakaotalk"/Google button text, signing-in loading, sr-only descriptions;
      Kakaotalk→카카오톡) _(the "continue with KakaoTalk" button)_

### D4. mypage — `src/app/mypage/` ✅

> Wired to `strings.mypage.*` + `strings.common`; `tsc`/lint clean, residual-
> English scan clean. Needs a logged-in mypage visit to drive live → **A4**.

- [x] `layout.tsx` ("My Page" → **"내 집사 정보"**)
- [x] `page.tsx` visible labels: 프로필/닉네임/이메일/비밀번호/전화번호/연결된 계정,
      reauth prompt, "Verification email sent!", edit/change/save/cancel/close,
      no-value fallbacks, "KakaoTalk" → **카카오톡** (the "TALK" logo glyph left as
      vendor mark)
- [x] `page.tsx` **placeholders**: 현재 비밀번호 / 새 이메일 주소 / 새 전화번호 /
      인증번호
- [x] `page.tsx` **all `alert`/`confirm` messages** (nickname/email/phone update +
      reauth + kakao link/unlink) translated via `strings.mypage` functions

### D5. Enhancements ✅ (all confirmed + applied)

- [x] Centralize strings in a constants module _(D0 — `src/constants/strings.ts`)_
- [x] "My Page" → **"내 집사 정보"** _(threaded through D2/D4)_
- [x] Warm **해요체** voice applied across all Phase D copy (not terse formal)
- [x] Kakao/account-link guidance points to the **real in-app location**
      (「내 집사 정보」의 연결된 계정), so the steps are actually followable
- [x] Reassuring, next-step error copy at the high-friction auth moments
      (login/reset/verification/phone/signup)
- [x] Added **"Language & Voice"** section to `design.md` (Korean / 해요체 / 집사
      terminology / strings.ts source-of-truth) so English doesn't creep back

### D6. Verify ✅ (logged-out pass; a few states need a real sign-in)

> Browser-verified logged-out at localhost:3000; console clean, `tsc`/lint clean,
> residual-English scans clean. Assistant cannot enter credentials, so states
> gated behind an actual sign-in are left for the user / carried in A4.

- [x] **Login page** (`/login`): title 로그인, tabs 로그인/회원가입 — verified
- [x] **LoginForm**: 소셜 계정으로 로그인 / 원하는 방법을 선택해 주세요, 또는,
      이메일로 로그인 (labels + placeholders), 비밀번호를 잊으셨나요?, 이메일로 로그인,
      전화번호로 로그인, 로그인에 문제가 있나요?… help text — verified
- [x] **SocialLoginButton**: "카카오톡으로 로그인" — verified
- [x] **PhoneLoginForm**: 전화번호 label + test hint + 인증번호 받기 — verified
- [x] **SignupForm** (details step): 회원가입, 닉네임/이메일/비밀번호/비밀번호 확인/
      전화번호 + placeholders + hint + 전화번호 인증하고 계속하기 — verified
- [x] **PasswordResetModal**: 비밀번호 재설정 + description + 이메일 주소 +
      재설정 링크 보내기 — verified
- [x] **KakaoLoginGuidanceModal**: all 3 steps (안내 → 계정 확인 → 계정 연결 방법,
      pointing to 「내 집사 정보」의 연결된 계정) — verified
- [x] **NavigationBarLogin** ("로그인") — verified; (NavigationBarLogout +
      LogoutModal verified earlier in D1/D2)
- [ ] **mypage (D4)** live — now gated (logged out → redirects to /login); verify
      on next logged-in session
- [ ] **EmailVerificationModal**, **UserNotFoundModal** — post-sign-in / social-
      no-account states; need the user to sign in to trigger
- [ ] SignupForm verify-step + PhoneLogin success — need a real SMS round-trip

---

## Scope notes

- [-] **Admin (`react-admin`) screens** — out of scope entirely.
- [-] **Footer legal links** (`개인정보처리방침`/`이용약관`) — compliance
  workstream (`docs/compliance/`), not design.

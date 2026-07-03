# 산냥이집냥이 — Feature Modification Log

> A running log of **intentional product changes** — feature **enhancements**,
> small **fixes**, and **removals** — newest first. These are changes made by
> choice, not bug investigations. Each entry captures **what changed**, the
> **rationale**, and how it was **verified**.
>
> Sibling log: [`DEBUG_LOG.md`](./DEBUG_LOG.md) — for **bugs** whose root cause
> was non-obvious (symptom → root cause → fix → verified). If a change is
> "we decided to add/change/remove X," it goes here; if it's "X was broken and
> here's why," it goes in the debug log.
>
> These entries don't need to be tracked in `docs/handoff/` or
> `docs/planning/` unless they change planned scope.

---

## 2026-07-03 — New public page: 냥이들 (browse-all-cats)

**Area:** new public route `/pages/cats` + 소개 nav · **Type:** enhancement (feature) ·
**Branch:** `dev`

### Change

Added a public-facing "browse all cats" page — previously the only way to find a specific
cat was to open the map and click through the thumbnail pins. New files:

- **`src/app/pages/cats/page.tsx`** — server component (mirrors the 입양홍보 pattern:
  `export const revalidate = REVALIDATE_SECONDS`, reads via `getAllCatsServer()` +
  `getPointService().getAllPoints()`). Builds a `dwelling`-id → point-`title` map so the
  page shows human-readable location names (e.g. "헬기장" instead of the raw point id
  "계양산(헬기장)"). Friendly empty / error states so the nav link never 404s.
- **`src/app/pages/cats/CatsBrowser.tsx`** — client island owning the interactive layer:
  search + collapsible filter panel (성별 / 출생연도 / 중성화 / 현재 거주지 / 입양), a
  "별냥이·행방불명 냥이도 보기" toggle (those statuses hidden by default), a **responsive
  hybrid** render (2-col photo-card grid on mobile via `md:hidden`, sortable data table on
  desktop via `hidden md:block`), and the shared `CatInfo` detail modal on card/row click.
  Filtering / sorting reuse `@/utils/cat-filters` verbatim, so the predicate matches the
  admin Cat Management view. Photo-less cats get a 🐾 brand-tinted placeholder tile.
- **`src/components/Navigation.tsx`** — added `냥이들` (`/pages/cats`, `resourceId="cats"`)
  under the 소개 dropdown (desktop) and the 소개 mobile section. Unknown `resourceId` →
  no required permissions → public, so the link is visible to everyone.

Columns/fields shown: 사진 · 이름 · 성별 · 출생연도 · 중성화 · 현재 거주지 · 입양가능 · 건강상태
(`sickness`).

### Rationale / scope

Owner-requested feature (veered from the finalize-before-mobile task queue). Reuses the
existing server-read data path, filter util, and detail modal rather than adding new data
plumbing. The desktop table doubles as the "spreadsheet-like" scan view; the mobile card
grid is the "card view" the owner preferred — one filter bar + data source drives both.

### Verified

`npx tsc --noEmit` clean; `npm run test:smoke` 25/25. Browser-verified on desktop
(`localhost:3000/pages/cats`): live data (21 present cats + 11 별냥이/행방불명 behind the
toggle), all 8 columns, sortable headers, thumbnails, dwelling→title resolution, the filter
panel, and the `CatInfo` modal opening on row click. **Mobile card layout is markup-in-place
but visually unverified** — `resize_window` was flaky (the §4 mobile-tooling decision), so
the 2-col card render awaits that pass.

## 2026-07-03 — Public hand-rolled-button sweep (→ shared `<Button>` primitive)

**Area:** public user-facing components (replies, signup/login, mypage, video album,
nav, mountain selector, feeding-spots) · **Type:** enhancement (design) · **Branch:** `dev`

### Change

Continuation of the Phase C cross-cutting item (PROJECT_PLAN §5 "deferred public
hand-rolled-button sweep"). Converged off-brand hand-rolled buttons/links onto the shared
`<Button>` primitive + brand tokens across the **live public** surface:

- **Filled CTAs → `<Button variant="primary">`:** `ReplyForm` (댓글 작성 + 취소→secondary),
  `SignupForm` (both `bg-yellow-500` / `bg-green-500` submits), `mypage` (5 buttons:
  nickname save, email reauth/verify, phone SMS/verify — `bg-blue-500`/`bg-green-500`).
- **Brand color swaps (not buttons):** `login/page.tsx` active-tab indicator
  (`border-blue-500 text-blue-600` → brand); reply/nav/mypage text-links `text-blue-*` →
  `text-brand-700`; `ReplyButton` blue hover → brand; `MountainSelector` selected-state +
  chevron; `VideoAlbum` "파일" badge `bg-blue-600` → neutral `bg-gray-700` (next to the
  YouTube-red vendor badge); spinners (`mypage`, `FeedingSpotsList`) blue/yellow → brand.
- **Input focus rings** aligned to the canonical `focus:outline-none focus:ring-2
focus:ring-brand-300` pattern (from `ui/Input` + the shipped 동참 form) in `SignupForm`
  - the two butler forms — replaces the native blue focus outline with a brand ring.
- `ReplyForm` login notice `bg-yellow-50` → brand-tinted card + 해요체.

### Rationale / scope

Same fix-once logic as the butler pass: shared components render on both surfaces, and
tap-target sizing / focus rings now live in the `<Button>` primitive, so the §4 mobile
pass inherits them centrally. **Deliberately left as-is:** admin forms (§5 admin
workstream), `SocialLoginButton`'s Kakao `#FEE500` vendor color, semantic success/warning
states (green "sent" boxes, `⚠️` note cards, `ui/Alert` variants), and dead/test-only
components (`PostItem`, `auth-test`, `*Demo`, `*Debug`, `ProviderManagement`).

### Verified

`npx tsc --noEmit` clean; `npm run test:smoke` 25/25 (after each chunk). Browser-verified
the public `/login?tab=signup`: brand-amber active-tab indicator (was blue), brand-gradient
submit button (was flat yellow), and the native-blue focus outline replaced by the brand
ring. Reply/mypage authenticated states are login-gated (owed to the standing verification
list). _Note: Next dev HMR corrupted the `/login` route into transient 404s after rapid
edits — cleared by a clean dev restart; not a code issue (tsc/smoke green, curl 200 on a
fresh server)._

---

## 2026-07-03 — Phase C: 집사메뉴/butler brand restyle + cross-cutting button cleanup

**Area:** public 집사메뉴 (`butler_talk` / `butler_stream` + `new/`), `PostList`,
`NewPostForm`, `NewButlerTalkForm`, `globals.css` · **Type:** enhancement (design) ·
**Branch:** `dev`

### Change

Closed the last two `[ ]` items of redesign **Phase C** (per the "finalize shared surface
on desktop before the §4 mobile pass" sequencing decision — PROJECT_PLAN §12):

- **Butler pages restyled** (the one un-brand-audited public surface): `PostList`
  pagination de-gradient-ified to match the 공지 pattern (current page = solid `bg-brand`,
  dropped `border-yellow-500`; prev/next = neutral secondary + `이전`/`다음`), English
  "No posts yet." → 해요체 brand card. Both clients' "새글 작성" hand-rolled brand→accent
  gradients and both forms' submit buttons → shared `<Button variant="primary" size="lg">`.
  The two forms' `bg-yellow` "login required" notices → brand-tinted cards (`bg-brand-50
ring-brand-100`) + 해요체. All input `focus:ring-blue-500` rings → `ring-brand-300`, the
  `bg-blue-100` "모두 선택" chip → brand, the `text-blue-600` checkbox → `accent-brand-500`.
  Stripped stale `data-oid` across the 5 components + 4 butler page wrappers.
- **Cross-cutting:** removed the **dead** `@layer components` btn block (`.btn` /
  `.btn-primary { bg-blue-600 }` / `.btn-secondary`) from `globals.css` — grep-verified
  referenced by no JSX; deleting it eliminates the last legacy blue from the codebase.
  `Navigation.tsx` was already brand-clean.

### Rationale / scope

These are shared code paths that render identically on desktop + mobile; finalizing the
brand/copy/primitive here now means the §4 mobile pass only tunes responsive layout instead
of re-doing the restyle. Converting buttons to the shared `<Button>` primitive means mobile
inherits correct tap-target sizing / focus rings centrally rather than per hand-rolled button.

### Verified

`npx tsc --noEmit` clean; `npm run test:smoke` 25/25. Browser-verified the logged-out
login-notice brand card on `/pages/butler_talk/new` (brand-50 card, brand-700 heading,
해요체 body). Auth-gated states (list/pagination, authenticated form + submit, the "새글
작성" list button) not driven — no sign-in in automation; owed to the standing auth-gated
verification list.

---

## 2026-07-02 — Admin post editing (all post types)

**Area:** admin posts (`/admin/posts`, `AdminPostList`) · **Type:** enhancement ·
**Branch:** `dev`

### Change

`AdminPostList.handleEdit` was a stub (`alert('Edit functionality coming soon!')`) —
admins could only create + delete, so fixing a typo meant delete-and-recreate. Added a
real edit flow shared across all four post types (급식현황 / 집사톡 / 공지사항 / 입양홍보):

- `updatePost(postId, postData)` added to the `IPostService` interface and implemented in
  the three services that lacked it (`post-service`, `butler-talk-service`,
  `adoption-service`; `announcement-service` already had one). All use `updateDoc` +
  `updatedAt`, so the merge **preserves** untouched fields (tags, `showInModal`, username,
  date, replyCount, …).
- New shared `components/EditPostForm.tsx` (loads the post via the matching service's
  `getPostById`, edits **title / 내용 / image URLs / video URLs**, recomputes
  `thumbnailUrl`+`mediaType` on save) + route
  `app/admin/posts/edit/[postType]/[postId]/page.tsx` (gated by the `/admin` `AdminAuth`
  layout). The Edit button now routes here (`serviceFor(postType)` picks the collection).

### Rationale / scope

Top follow-up from the adoption-promotion hand-off (§5 #1). Scope is deliberately
**text + media links**, not new media _file_ uploads: the per-type create forms upload
differently (signed URLs for feeding, direct Storage for announcements/adoption, YouTube
for video), so unifying uploads in one edit form would be fragile. Adding a brand-new
media file stays in the create flow; the edit form covers the actual pain point (typos and
broken/removable media links) and works uniformly for every type.

### Verified

`npx tsc --noEmit` clean · `npm run test:smoke` 25/25. Browser verification of the live
edit round-trip is pending (admin-gated).

---

## 2026-07-02 — 입양홍보 posts + per-cat 입양정보

**Area:** adoption promotion (`/pages/adoption`, `/admin/posts`) + cat detail/management ·
**Type:** enhancement · **Branch:** `dev` ·
**Plan:** `docs/planning/adoption-promotion-and-cat-adoption-info-plan.md`

### Change

Two related pieces, both modeled on the existing **announcements** feature:

**(A) 입양홍보 posts** — a new admin-authored / publicly-read post type (collection
`posts_adoption`).

- New `FirebaseAdoptionService` (`services/adoption-service.ts`) + `getAdoptionService()`;
  new `posts_adoption` Firestore rule (read:true / write:`manage-posts`) — ⚠️ **owner must
  deploy rules**.
- Admin `/admin/posts` **입양홍보 tab is now functional** (was a "준비 중" placeholder):
  `AdminPostList` extended with the `adoption_promotion` type (via a new `serviceFor()`
  helper replacing 3 repeated service ternaries; no reply UI), plus a "새 입양홍보 작성"
  button → `/admin/adoption/new` (`NewAdoptionForm`, a copy of the announcement composer
  minus the 팝업 toggle).
- Public: a "새로운 입양 소식" section on `/pages/adoption` (`AdoptionPromotionClient`),
  live-fetched, no auth gate.

**(B) per-cat 입양정보** — new optional `Cat.adoption_info`. Shown as an 입양정보 block in
the `CatInfo` detail modal when non-empty (so it appears in the adoption gallery + map
flows), and editable via a new textarea in the individual cat management form
(`/admin/cats`), next to the 입양 가능 toggle.

### Rationale

Owner request — publish "new cat available for adoption" news and record adoption-specific
info per cat. Reused the announcements pattern end-to-end. **Deviation:** the public feed
does **not** reuse `PostList` (its detail link is hardcoded to `/pages/posts/:id`, which
resolves only the feeding collection → would 404 for adoption posts); instead it uses
self-contained inline cards like `AnnouncementClient`, with video thumbnails opening
YouTube directly. (See the plan doc's "Deviation" note.)

### Verified

- `npx tsc --noEmit` clean · smoke 25/25.
- Browser + write paths **pending**: writing posts needs the new Firestore rule deployed;
  `/admin/posts` and `/admin/cats` are admin-gated. To verify: deploy the rule, then in a
  browser create a 입양홍보 post (admin) → confirm it shows on `/pages/adoption`; set a cat's
  입양정보 → confirm the 입양정보 block in that cat's modal.

**Area:** cat status (`CatGrid.tsx`, `/admin/cats/page.tsx`, `CatInfo.tsx`) ·
**Type:** enhancement · **Branch:** `dev`

### Change

Added a new cat `status` value **쉼터냥이** for cats in temporary shelter/foster
care waiting for adoption — the transitional state between 산냥이 (mountain) and
집냥이 (home). Name follows the existing `[state]냥이` convention (쉼터 = shelter).
Inserted in journey order (산냥이 → **쉼터냥이** → 집냥이 → 별냥이 → 행방불명) at every
place statuses are enumerated:

- `CatGrid` `STATUS_OPTIONS` — selectable in the spreadsheet status column.
- `/admin/cats` legacy add/edit form `<select>`.
- `/admin/cats` status badge — **amber** chip (`bg-amber-100 text-amber-800`),
  distinct from the other statuses and from the brand "adoptable" badge.
- `CatInfo` status-emoji map — **🫶** (heart-hands / "adopt with love").

Filters pick it up automatically (`getUniqueStatuses` derives statuses from
data). No stats tile added (the `/admin/cats` stat row is a fixed 3-tile layout).

### Rationale

Owner request — a status for cats staying in shelters awaiting adoption. `status`
is stored as the literal Korean string, so existing records are unaffected (new
value only). The `쉼터냥이` name and 🫶 icon were the owner's choices.

### Verified

- `npx tsc --noEmit` clean · smoke 25/25.
- Browser check pending (admin-gated).

---

## 2026-07-02 — Redesign video-album tiles (caption footer + cat-name tags)

**Area:** album tiles (`src/components/album/MediaTile.tsx`,
`src/app/pages/video-album/page.tsx`) · **Type:** enhancement · **Branch:** `dev`

### Change

Reworked the video-album (`/pages/video-album`) tile layout, which felt clunky —
a dense grid of thumbnails with description + date/duration crammed into an
overlay on the image.

- **`MediaTile` gained an opt-in `layout` prop** (`'overlay'` default | `'below'`)
  plus `tags?: string[]`. The shared image / hover / corner-badge markup was
  refactored into one `media` fragment reused by both layouts (no duplication);
  the default overlay layout — and the **photo album** that uses it — is
  unchanged.
- **`layout="below"`** puts the caption on a **white footer shelf** under a clean
  16:9 thumbnail: up to **two** cat-name chips (brand-gold `bg-brand-100`) from
  `tags`, then a gray **`+N`** chip for the remainder (`tags.length - 2`), then
  date + duration in muted gray.
- **Video page** switched to `layout="below"` with `tags={video.tags}` and a
  roomier grid (`gap-x-4 gap-y-6`). The on-tile **description was dropped** (still
  shown in the video player) to keep the card clean.

### Rationale

Owner request — the overlay-on-image tiles read as a busy wall with no bottom
breathing room. Moving the caption to a footer declutters the thumbnail, gives a
natural shelf (the requested "margin below each tile"), and provides a clean home
for the cat-name tags. Kept as an opt-in `MediaTile` mode so the photo album is
untouched. Two-name display (owner's call — there's room for two + the `+N`).

### Verified

- `npx tsc --noEmit` clean · smoke 25/25.
- Browser check pending (Chrome extension was disconnected; note the local
  dataset has empty albums, so `localhost` may show the empty state — best seen
  against real data).

---

## 2026-07-02 — Enhance the cat-management grid header (color + sort affordance)

**Area:** admin cat grid (`src/components/admin/cat-grid/CatGrid.tsx`,
`src/constants/adminStrings.ts`) · **Type:** enhancement · **Branch:** `dev`

### Change

Two visual improvements to the `react-datasheet-grid` spreadsheet on the cat
management page (`/admin/cats`):

- **Header row color.** Tinted the whole header row **brand-100 gold**
  (`#fef9c3`) with a **2px brand-300 bottom border** (`#fde047`), via a
  `.dsg-cell-header` override in the component's existing `<style jsx global>`
  block. Reads clearly as a header (gutter included).
- **Sort affordance.** Every sortable column header now shows a persistent sort
  glyph (`react-icons/fa`): a faded gray `FaSort` (double arrows) when unsorted —
  signalling the column is clickable/sortable — and a solid brand-gold
  `FaSortUp`/`FaSortDown` on the active column showing direction. Added a
  `클릭해서 정렬` tooltip + `aria-label` per header; the label truncates so the
  right-aligned icon stays put. (Previously only the _active_ column showed an
  icon, so unsorted columns gave no hint they were sortable — replaced the old
  `FiChevronUp`/`FiChevronDown` indicator.)

New string: `adminStrings.catGrid.sortHint = '클릭해서 정렬'`.

### Rationale

Owner request — make the header legible and make the click-to-sort affordance
discoverable. Purely presentational; sort logic (`handleSort`/`sortCats`) is
unchanged.

### Verified

- `npx tsc --noEmit` clean · smoke 25/25.
- Browser check pending (page is admin-gated; owner to eyeball `/admin/cats`).

---

## 2026-07-02 — Harden auth so a failed Firestore read no longer signs users out

**Area:** auth (`permission-service.ts`, `lib/auth/admin.ts`, `LoginForm.tsx`,
`AdminAuth.tsx`, `strings.ts`) · **Type:** enhancement (defensive) · **Branch:** `dev`

### Change

`checkUserExists` and `isAdmin` used to `catch` a Firestore read error and return
`false`, making a _blocked/denied/offline_ read indistinguishable from a
_definitively absent_ user/permission. Both now **log and re-throw**. Callers
updated:

- `LoginForm.handleCheckUser` — only signs out on a definitive `false` (read
  succeeded, no user doc). A thrown read now keeps the session and shows a
  retryable error (`errors.verifyFailed`) instead of the old blanket
  "let-them-in" or a spurious sign-out.
- `AdminAuth` — a thrown admin check renders a new "권한을 확인하지 못했어요" screen
  with a 다시 시도 (retry) button, distinct from the "접근 권한이 없어요" access-denied
  (which now means the check actually ran and said no).

`butler_stream` / `butler_talk` already catch → `false`, so their behavior is
unchanged.

### Rationale

Surfaced while investigating a force-logout (see DEBUG*LOG — the \_actual* cause
was cross-tab sign-out, not this). This path was **not** the cause, but it is a
real latent fragility: a genuinely blocked/denied `users/{uid}` read on first
login could otherwise sign a valid user out. Kept as hardening (owner's call) and
aligns with the repo's log-and-reraise convention (no silent swallow).

### Verified

- `tsc --noEmit` clean · smoke 25/25.
- The blocked-read paths are environmental (extension) and not reproducible in
  automation; the change is logic-level. Happy-path login/admin unaffected.

---

## 2026-07-02 — Add idle session timeout to the admin CMS (2 hours)

**Area:** admin auth (`src/components/admin/AdminAuth.tsx`, new
`src/hooks/useIdleTimeout.ts`) · **Type:** enhancement · **Branch:** `dev`

### Change

Added an **idle** session timeout to the `/admin` CMS: after **2 hours** of no
interaction, an authenticated admin is signed out and returned to the admin login
screen with a Korean notice ("2시간 동안 활동이 없어 자동으로 로그아웃되었어요. 다시
로그인해 주세요."). Introduced a reusable `useIdleTimeout({ timeoutMs, onTimeout,
enabled })` hook that records activity via a throttled timestamp and polls once a
minute (rather than resetting a timer on every mousemove/scroll); fires at most
once per idle window and re-arms on activity.

### Rationale

Firebase Auth has no built-in session timeout — the refresh token persists
indefinitely under the default local persistence — so a walk-away admin stays
signed in forever. The admin CMS (write access to cats/media/posts + member/role
management) is the real risk surface, so the timeout is **admin-scoped** via the
hook's `enabled: !!user && isAdmin` flag — regular members and the public site are
untouched. **Idle (not absolute)** and the **2-hour** threshold were the owner's
choices (covers walk-aways without nagging active editing). Sign-out failures in
the background timer log without rethrowing, matching this file's existing
fire-and-forget `handleLogout`.

### Verified

- `npx tsc --noEmit` clean · smoke 25/25.
- **Browser (owner-assisted):** with the timeout temporarily set to 8s (and the
  hook's check interval to 1s), the owner logged into `/admin` and stayed idle;
  the CMS auto-signed them out to the login screen and rendered the timeout
  notice. Temp values restored to 2h / 60s afterward (no temp markers remain).

---

## 2026-07-02 — Add show/hide password toggle to the login modal

**Area:** `LoginForm` (`src/components/LoginForm.tsx`, `src/constants/strings.ts`) ·
**Type:** enhancement · **Branch:** `dev`

### Change

Added a show/hide toggle to the email/password field in the login modal. An eye
icon (`EyeIcon`/`EyeSlashIcon` from `@heroicons/react/24/outline`) sits inside the
input on the right; clicking it flips the input `type` between `password` and
`text` via a new `showPassword` state. The button carries Korean aria-labels
(`비밀번호 표시` / `비밀번호 숨기기`, added to `strings.login.form`) and `aria-pressed`
for accessibility. The input got `pr-10` padding so text doesn't run under the
icon. Scoped to the login modal only — `SignupForm` / `AdminAuth` / `mypage`
password fields were left unchanged.

### Rationale

Owner request; lets users confirm what they typed before submitting. Reused the
existing `@heroicons/react` dependency and the `strings` i18n table rather than
hardcoding text.

### Verified

- `npm run typecheck` (`tsc --noEmit`) clean.
- Browser verification of the toggle pending.

---

## 2026-07-02 — Change site (browser-tab) title to 산냥이집냥이

**Area:** root layout (`src/app/layout.tsx`) · **Type:** enhancement · **Branch:** `dev`

### Change

Changed `metadata.title` from the English `'Mountain Cats'` to `'산냥이집냥이'`, so
the browser-tab / SEO `<title>` matches the Korean-first brand. The header `<h1>`
already read 산냥이집냥이; this aligns the tab title with it. The `description`
metadata and `<html lang>` were left untouched (out of scope). The remaining
"Mountain Cats" strings elsewhere are YouTube channel-title / upload-description
values, not the site title, so they were left alone.

### Rationale

Korean-first platform — the tab/SEO title should not be English. Owner request.

### Verified

- `npm run typecheck` (`tsc --noEmit`) clean.

---

## 2026-07-02 — Add `tsc --noEmit` type-check to the pre-commit hook

**Area:** tooling (`.husky/pre-commit`, `package.json`) · **Type:** enhancement · **Branch:** `dev`

### Change

Added a project-wide type-check to the pre-commit gate. Previously pre-commit ran
only TruffleHog (secret scan) + `lint-staged` (ESLint `--fix` + Prettier) — no
type checking. Added a reusable `typecheck` script (`tsc --noEmit`) to
`package.json` and a final pre-commit step (`npm run typecheck`) after
`lint-staged`.

### Rationale

Type errors were only caught by the manual `npx tsc --noEmit` gate, not enforced
on commit. Run as its **own** hook step (not through `lint-staged`) because
`tsc --noEmit` needs the whole project graph — a change in one file can break
another's types, so a per-staged-file scope would give false passes. Placed
**after** `lint-staged` so formatting fixes apply first and the type-check is the
final gate.

### Verified

- `npm run typecheck` runs clean (no type errors), ~10s wall time.
- `npx tsc --noEmit` clean · smoke 25/25.

---

## 2026-07-02 — Emphasize capital letters in the About subtitle (MOHOCATS wordplay)

**Area:** `about` page (`/pages/about`) · **Type:** enhancement · **Branch:** `dev`

### Change

The 부제 embeds a wordplay — **MO**untain **HO**use **CATS** → MOHOCATS. Added a
render-time helper (`emphasizeCapitals`) that wraps runs of uppercase Latin
letters in `font-semibold text-brand-600` (brand gold), leaving lowercase/Korean
untouched, so the acronym pops. Content-agnostic: it emphasizes whatever capitals
the admin subtitle contains.

### Rationale

Owner request; makes the intentional MOHOCATS wordplay legible. Purely
presentational — splits on `[A-Z]+` runs so consecutive capitals share one span.

### Verified

- `npx tsc --noEmit` clean · smoke 25/25.
- Browser (`/pages/about`): capitals render gold + semibold ("MOuntain cats,
  HOuse CATS (MOHOCATS)"), lowercase stays muted gray.

---

## 2026-07-02 — Display the 부제 (subtitle) on the About/intro page

**Area:** `about` page (`/pages/about`) · **Type:** fix/enhancement · **Branch:** `dev`

### Change

The About page rendered only `aboutData.title`; the `subtitle` (부제) — loaded into
`aboutData` and editable in the admin About-content editor — was never displayed.
Added a subtitle `<p>` between the title and the brand accent bar, rendered only
when `aboutData.subtitle` is set (`text-lg text-gray-600`).

### Rationale

The field was already fully wired (admin editor → Firestore/JSON → `aboutData`),
so it was owner-managed content that simply had no render site. This just surfaces
existing content; no data/model change.

### Verified

- `npx tsc --noEmit` clean · smoke 25/25.
- Browser (`/pages/about`): subtitle now renders under the title, above the accent
  bar. (The subtitle text is admin-managed content, editable in the About editor.)

---

## 2026-07-02 — Remove 문의 (contact) link from the footer

**Area:** `Footer` · **Type:** removal · **Branch:** `dev`

### Change

Removed the **문의** link (→ `/pages/contact`) from the site footer at the owner's
request, along with the now-unused `next/link` import. The `/pages/contact` page
itself is untouched (still reachable elsewhere) — only the footer nav item was
removed.

### Rationale (incl. compliance check)

The only compliance-relevant "contact" is the **privacy officer (CPO) public
contact**, which belongs **inside the 개인정보처리방침 page**, not the footer 문의
link (`docs/compliance/compliance-plan.md` §CPO). So the footer 문의 is **not** a
compliance requirement and was safe to drop. The footer's two remaining items
(개인정보처리방침 / 이용약관) are still disabled placeholders pending the compliance
workstream.

### Verified

- `npx tsc --noEmit` clean · smoke 25/25.
- Browser: footer now reads "산냥이집냥이 · 비영리 커뮤니티 · 개인정보처리방침 ·
  이용약관 · © 2026" — no 문의, no `/pages/contact` link.

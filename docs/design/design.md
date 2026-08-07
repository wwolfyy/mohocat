# 산냥이집냥이 — Design Reference

> **About this document.** The format is borrowed from the
> [`design.md` standard](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md)
> — a single, plain-text reference that keeps design decisions consistent across
> sessions, people, and tools. **We are _not_ adopting the standard itself.** In
> particular we deliberately omit its machine-readable YAML token frontmatter.
>
> **Single source of truth for token _values_ is [`tailwind.config.js`](../../tailwind.config.js).**
> This document explains _intent and usage_ and refers to tokens by their
> Tailwind names (`brand`, `accent`, `ink`, plus Tailwind's built-in scales). It
> defines **no color/spacing values of its own** — that would create a second
> source of truth that drifts. If you need an exact hex, read the config.
>
> **Scope:** the whole product — the user-facing landing experience (see
> [`mohocat-landing-redesign-plan.md`](./mohocat-landing-redesign-plan.md)) **and** the
> `/admin` CMS. _(Corrected 2026-08-05, owner. This line previously read "Admin
> (`react-admin`) screens are out of scope" — it outlived what it described: the
> react-admin subsystem was deleted in `d963d30`, 2026-06-29, and the CMS has been
> custom-built since. The design workstream has since taken unified public + admin
> primitives as its direction.)_

---

## Overview

산냥이집냥이 (Mountain Cats) maps neighborhood feeding points as cat-pins over a
hand-framed satellite image. The brand personality is **warm, playful, and
cat-focused, but refined** — friendliness comes from a sunny yellow identity,
rounded shapes, and small micro-interactions, not from clutter.

Two guiding rules for anyone touching the UI:

- **Amplify the map.** The satellite-map-with-cat-pins is the product's strongest
  asset. Styling should elevate it, never compete with it.
- **Warm but restrained.** Brand yellow is a highlight color for actions and
  markers — surfaces stay neutral so the map and the cats carry the color.

---

## Colors

All values live in `tailwind.config.js`. Use the **token name**, not a raw hex,
in components.

> ⚠️ **The palette is GLOBAL — a mountain may not differ in colour** (owner
> decision, 2026-08-05). Every tenant renders the same brand yellow, and there is
> **no per-tenant colour knob**: `mountains.json` has no `theme` block, and the
> `MountainTheme` component that injected one is deleted. This **withdraws M8**
> (per-tenant theming) rather than deferring it — do not propose per-mountain
> palettes, a `theme` block, or a runtime colour override without re-deciding
> this with the owner first.
>
> 📌 `globals.css` declares `--color-primary: theme('colors.brand.DEFAULT')`,
> which resolves at **build** time. That variable is **not** a second definition —
> it exists so CSS that Tailwind utilities cannot reach (`<style jsx global>`,
> third-party `.dsg-*` and Leaflet rules) can consume the same value. Never inline
> a brand hex in a component, in `globals.css`, or as a `var()` fallback.

### Brand & accent (defined in `tailwind.config.js → theme.extend.colors`)

| Token                     | Role                                                                            |
| ------------------------- | ------------------------------------------------------------------------------- |
| `brand` (= `brand-400`)   | Core brand yellow. Primary CTAs, map markers, key highlights.                   |
| `brand-50…900`            | Tints/shades of brand yellow (hover, borders, soft backgrounds).                |
| `accent` (= `accent-300`) | Orange. Second stop of the CTA gradient; warm emphasis.                         |
| `accent-400 / 500`        | Deeper orange for hover / pressed states on accented surfaces.                  |
| `ink`                     | Warm near-black for text **on** brand-yellow surfaces (softer than pure black). |
| `ink-soft`                | Warm brown for muted/secondary text on brand surfaces.                          |

The signature primary action is the **brand→accent gradient with dark text**:

```
bg-gradient-to-r from-brand to-accent text-ink   (or text-black)
```

This matches the CTA gradient already shipping in production
(`from-yellow-400 to-orange-300`), so migrating existing buttons to the tokens is
a rename, not a redesign.

### Neutrals, interactive & status (Tailwind built-ins — already in use)

These are intentionally **not** re-aliased as custom tokens; re-encoding
Tailwind's own palette would be a second source of truth. Use Tailwind's scales
directly, consistent with current code:

| Purpose                 | Use                               | Notes                                                                             |
| ----------------------- | --------------------------------- | --------------------------------------------------------------------------------- |
| Surfaces / neutrals     | `gray-50 … gray-900`              | Backgrounds, body text, borders, dividers.                                        |
| Interactive (secondary) | `blue-600` text / `blue-500` ring | Text links and focus rings. **Not** for primary CTAs — those are brand-yellow.    |
| Success                 | `green-600` / `green-50`          | Confirmations, positive status.                                                   |
| Danger / destructive    | `red-600` / `red-50`              | Errors, destructive actions.                                                      |
| Warning                 | `yellow-600` / `yellow-50`        | Cautions. (Distinct from `brand` — warning is informational, not a brand action.) |

### Vendor colors (do not change, do not reuse as brand)

Third-party login uses each provider's mandated brand colors — keep them exactly,
and never repurpose them as app UI colors:

- **Kakao:** `#FEE500` background, `#3A2400` text.
- **Google:** `#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`.

---

## Typography

- **Family:** Inter, loaded via `next/font/google` in `src/app/layout.tsx`.
  Inter covers Latin only; Korean glyphs fall back to the system stack. Treat a
  proper Korean webfont as a future enhancement, not part of this lock.
- **Scale (source of truth: `src/app/globals.css → @layer base`):**
  - `h1` — `text-4xl font-bold tracking-tight`
  - `h2` — `text-3xl font-semibold tracking-tight`
  - `h3` — `text-2xl font-semibold tracking-tight`
- **Body:** default Tailwind `text-base`; secondary/meta text `text-sm text-gray-500`.
- **On-brand text** (buttons, markers) is **dark on yellow** (`ink` / black) — never
  white on yellow (fails contrast and looks washed out).
- **Admin tier (added 2026-08-08, colour plan Phase 5 F2).** The scale above is
  sized for the landing, where a title sits over a full-bleed map. `/admin` is a
  dense CMS and steps every level down; it applies these as **utilities**, which
  override the `@layer base` element styles:

  | Element | Admin                   | Role        |
  | ------- | ----------------------- | ----------- |
  | `h1`    | `text-2xl font-bold`    | page title  |
  | `h2`    | `text-xl font-semibold` | section     |
  | `h3`    | `text-lg font-semibold` | sub-section |
  | `h4`    | `text-sm font-medium`   | label       |

  ⚠️ **This tier is why admin headings look "wrong" against the base scale — they
  are not.** Before it was written down, admin ran it de facto and disagreed with
  itself: `h1` was `text-2xl` on 12 screens and `text-3xl` on 5, so a page title
  changed size as an operator moved between 게시물 and 게시물 수정.
  📌 **One deliberate exception:** the persistent admin masthead
  (`AdminAuth.tsx`) stays `text-xl` — it is chrome in a 64px bar, not a page
  title, and it is commented as such at the site.

---

## Language & Voice

- **All user-facing copy is Korean.** This is a single Korean-locale app (no i18n
  library). English must not ship in user-facing UI — labels, placeholders,
  buttons, titles/tooltips, `aria-label`s, `alert`/`confirm`, and error messages.
- **Voice: warm, friendly-polite Korean (해요체)** to match the landing/intro
  tone — e.g. "로그아웃 할까요?" over a clipped "로그아웃". Avoid terse,
  word-for-word formal translations.
- **집사 (caretaker) framing.** The app calls members 집사 (집사메뉴, 집사톡); use
  it for identity — e.g. "내 집사 정보" rather than a literal "마이페이지". **Avoid
  "회원" — use "집사"**: signup is **"집사등록"** (not "회원가입"), and the join verb
  is **"등록"** (e.g. "등록한 계정", "집사 등록을 하신 뒤"). This makes participation
  feel warmer and on-brand. _(Open: whether to extend the same reframe to the
  generic "계정"/"새 계정 만들기" account wording.)_
- **Vendor names in Korean; logos/colors unchanged** — e.g. 카카오톡 (not
  "KakaoTalk"); keep Kakao `#FEE500` and logo glyphs (the "TALK" mark) as-is.
- **Error copy reassures and guides** — say what happened and the next step, not
  a bare failure; point users to the real in-app location (e.g. 「내 집사 정보」의
  연결된 계정). Keep destructive/red affordances per the Modal rules.
- **Source of truth:** user-facing strings for the **auth flow + mypage** live in
  [`src/constants/strings.ts`](../../src/constants/strings.ts)
  (`strings.<area>.<key>`), not inline in JSX, so the voice stays consistent and
  edits happen in one place. Prefer this pattern for new copy-heavy surfaces.

## Layout & Spacing

- Use Tailwind's default spacing scale (`4 / 8 / 12 / 16 / 24…` via `p-`, `gap-`,
  `m-` utilities). No custom spacing tokens.
- **Header:** a frosted-glass bar (`backdrop-blur`) so nav stays legible over any
  part of the map. Keep it **low-height** — just enough breathing room between
  header content and the top edge (per the redesign plan).
- **Intro card:** floats over the **bottom-left** of the map; dismissible; one line
  of copy. Minimal footprint — it nudges, it doesn't explain.
- The map is the full-bleed canvas; chrome (header, cards) floats over it rather
  than pushing it down.

---

## Elevation & Depth

- Reserve shadows for elements that float **over the map**: header bar, intro card,
  markers, modals, dropdowns.
- Markers use a soft shadow so the avatar + ring + pointer read as one object
  lifted off the satellite image.
- Use Tailwind's shadow scale (`shadow-sm/md/lg`); avoid heavy/colored shadows
  except the marker's subtle brand-yellow pointer shadow.
- Dropdowns and the intro card animate in/out (see the `animate-dropdown-*` and
  `animate-bounce-gentle` utilities in `globals.css`).

---

## Shapes

- **Rounded, friendly geometry.** Avoid sharp 0-radius corners on interactive
  surfaces. **This applies to `/admin` too** (D5, 2026-08-05).

  | Surface                                 | Radius                      |
  | --------------------------------------- | --------------------------- |
  | Buttons (filled, bordered, or nav pill) | `rounded-lg`                |
  | Cards, panels, modals, notice boxes     | `rounded-md` … `rounded-xl` |
  | Avatars, markers, circular ghost close  | `rounded-full`              |
  | **Form inputs** (input/select/textarea) | **`rounded`**               |
  | **Small badges & pills** (`text-xs`)    | **`rounded`**               |
  | **Checkboxes / radios**                 | **`rounded`**               |
  | Loading skeletons                       | `rounded`                   |

  ⚠️ **The last four rows were added 2026-08-08 (colour plan Phase 5 F3) and are
  descriptive, not aspirational** — they record what both halves of the app
  already do consistently. A tighter 0.25 rem on a 16px checkbox or a `text-xs`
  badge is correct; `rounded-lg` there would be visibly wrong.

  🔑 **Why this needed writing down: the spec was silent, not violated.** Before
  Phase 5 the rule legislated only buttons, cards, modals, avatars and markers,
  so bare `rounded` read as drift — 38 % of admin's radii and 23 % of the public
  components'. Measuring both halves showed they had filled the silence the same
  way. ⚠️ **Do not "fix" one half against the other**; normalising admin alone
  would make it diverge from the UI it is meant to match.

- ⚠️ **Rewritten 2026-08-08:** the rule used to justify itself by warning that
  squareness _"reads as admin/utility, which is the opposite of the landing's
  tone"_ — written while admin was out of scope, and self-contradictory once it
  came in. Admin is not a lesser tone to be avoided; it is a surface governed by
  the same geometry.
- **Correctly square, and not to be swept up:** underline tabs (`border-b-2`) and
  ghost icon buttons with no background carry no radius by design. The rule is
  about filled and bordered surfaces.

---

## Components

### Primary CTA button (e.g. 입양홍보)

- Filled **brand→accent gradient**, dark text, `rounded-lg`, bold.
- `bg-gradient-to-r from-brand to-accent text-ink font-bold rounded-lg`,
  `hover:shadow-lg transition`.
- This is the single most emphasized action; use it sparingly so it stays special.

### Secondary / neutral button

- `bg-gray-200 text-gray-800 hover:bg-gray-300 rounded-lg` (matches the existing
  `.btn-secondary` in `globals.css`).
- ⚠️ `globals.css .btn-primary` is currently blue (`bg-blue-600`) — a legacy
  default that predates the brand lock. Prefer the brand gradient above for true
  primary actions; reconcile `.btn-primary` during the redesign.

### Cat-marker (feeding-point pin)

The defining component. Restyle visuals only — the click-opens-modal behavior is
unchanged.

- **At rest:** circular cat-avatar + **white ring** (separates it from the
  satellite background) + a **downward pointer/tail** above the avatar
  (classic map-marker shape). Pointer is **brand-yellow** (`brand`) with a soft
  shadow. Label sits **below** the avatar.
- **Hover:** enlarge the whole pin (~`scale-125`); leave a larger brand-yellow ring.
- Avatar + ring + pointer must read as **one cohesive cat-marker**.
- Carry this spec verbatim into the Phase 2 Leaflet `L.divIcon` HTML/CSS so
  desktop and mobile markers are pixel-identical.

### Cluster marker (Phase 2, mobile only)

- On-brand and playful — a stack/fan of mini cat-avatars or a circle with cat
  ears — **always with a count badge**.
- Hover: gentle scale-up consistent with the single-pin hover + a tooltip
  (e.g. "고양이 급식소 3곳 — 펼치기").

### Top navigation

- Frosted-glass bar; grouped top-level items with dropdowns (냥이들 / 동참 ▾ /
  갤러리 ▾ / 소식 ▾).
- Right side: 집사메뉴 (login-gated, disabled + tooltip when logged out) · 로그인.
- **입양홍보** is surfaced as a standalone brand-gradient CTA in/near the header.

### Intro card

- Dismissible, bottom-left, single line: "지도의 고양이 사진을 클릭해보세요".
- Small cat-ear/paw accent + subtle bounce-in (`animate-bounce-gentle`).

### Modal (`src/components/ui/Modal.tsx`)

The single shared shell for all public modals — "a warm card floating over the
map." Every public modal (cat gallery/info, photo & video albums, announcement,
cat selector, auth) renders inside it so they stay visually identical; restyle
the shell here, never per-modal.

- **Backdrop:** frosted dark — `bg-black/50 backdrop-blur-sm` — with a fade-in
  (`animate-modal-backdrop`). Click-outside closes.
- **Card:** white, `rounded-xl shadow-xl`, `p-6`, scale/fade entrance
  (`animate-modal-panel`). Deliberately **narrow** so it doesn't dominate the map
  — size scale `sm/md/lg/xl` = `max-w-sm/md/lg/2xl`. Bump a size only when content
  needs it; cat gallery and cat info sit at `xl` (≈672px).
- **Close:** neutral **circular ghost** button, top-right (`ModalCloseButton`) —
  gray, `rounded-full`, brand focus ring. **Never** a red/square close button
  (red is reserved for destructive actions). A secondary top-left action (e.g.
  album refresh) mirrors the same ghost style.
- **Title:** optional centered bold heading. Section labels inside use a short
  brand-yellow underline accent.
- **Brand accent is restrained:** avatar rings, status pills, section underlines,
  and brand-tinted action chips — surfaces stay neutral white/gray.
- **Behavior:** rendered through a **portal to `<body>`** (so the frosted
  header's `backdrop-blur` can't trap a `fixed` modal), body scroll-lock while
  open, `role="dialog"`. ESC closes only the **topmost** overlay via the shared
  `useModalLayer` stack — every overlay (modals, lightboxes, players) registers
  on it, so one keypress never closes the layers beneath.
- **Primary action** inside a modal is the brand→accent gradient with `text-ink`
  (e.g. announcement 확인, cat-selector 완료); secondary is `bg-gray-100`.
  Destructive confirms (logout) keep `red`; vendor buttons (Kakao `#FEE500`)
  are never re-themed.

### Media viewer (`Lightbox` / `VideoPlayer`, `src/components/ui/`)

Full-bleed image/video viewers shown over an album grid — intentionally **not**
the white Modal card but a dark immersive surface (`bg-black/90`) so the media is
the focus. Close and prev/next use the same subtle circular-ghost language on the
dark backdrop; they register on the shared `useModalLayer` stack (Esc closes,
←/→ navigate, topmost only). One shared copy of each is reused by both the
album components and the gallery pages.

---

### Album page (`src/components/album/`, `src/app/pages/{photo,video}-album`)

The photo & video album pages share one set of building blocks so they stay
visually identical; restyle them here, never per-page.

- **`AlbumHero`** — warm, restrained page header: a brand→accent gradient icon
  chip, a centered title with a short **brand-yellow underline accent** (the
  modal section-label motif), and a one-line subtitle. Surface stays neutral
  white; brand is accent only.
- **`AlbumFilterBar`** — search input + cat-selector trigger + a **single**
  consolidated selected-cat chip row. Brand focus rings (`ring-brand-300`),
  brand-tinted chips (`bg-brand-50 text-ink ring-brand-200`); removing a filter
  is **not** destructive, so its × and "모두 지우기" stay neutral (no red). Owns
  the shared `CatSelectorModal` (commits on 완료).
- **`MediaTile`** — uniform grid tile: `rounded-xl` (matches the modal card),
  hover lift + image `scale-105`, a hover overlay affordance, an always-on
  caption that shows the description **only when present** (no "설명 없음"
  filler) plus a meta line. Photos are square cells, videos 16:9. Vendor YouTube
  red badge is kept; the internal "직접 업로드" badge is neutral.
- **States** (`AlbumStates`) — branded **loading** spinner and warm **empty /
  error** messages (brand accent-chip icon + friendly Korean), not bare gray
  text.
- Grid stays uniform & cropped (decided): `grid-cols-2 … xl:grid-cols-6`. The
  full, uncropped media shows in the `Lightbox` / `VideoPlayer`.

## Do's and Don'ts

**Do**

- Reference tokens by name (`brand`, `accent`, `ink`) and edit values only in
  `tailwind.config.js`.
- Keep brand-yellow for **actions and markers**; keep surfaces neutral.
- Use dark text on yellow.
- Keep the map the visual hero; let chrome float over it.

**Don't**

- Don't hard-code brand hex values in components — use the tokens.
- Don't duplicate token values into this file, a `tokens.json`, or component CSS.
- Don't use white text on brand-yellow.
- Don't repurpose Kakao/Google vendor colors as app UI colors.
- Don't use the legacy blue `.btn-primary` for new primary CTAs.

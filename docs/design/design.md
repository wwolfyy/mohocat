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
> **Scope:** the user-facing landing experience (see
> [`mohocat-landing-redesign-plan.md`](./mohocat-landing-redesign-plan.md)).
> Admin (`react-admin`) screens are out of scope.

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

---

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

- **Rounded, friendly geometry.** Buttons `rounded-lg`; cards/modals `rounded-md`
  to `rounded-xl`; avatars and markers fully circular (`rounded-full`).
- Avoid sharp 0-radius corners on interactive surfaces — squareness reads as
  "admin/utility," which is the opposite of the landing's tone.

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

---

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

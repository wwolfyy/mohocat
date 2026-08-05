# Color token centralization — plan — 20260805

> **Status:** 🟢 **DECIDED, not started.** All five open questions were answered by the owner
> on 2026-08-05 (§2). §6's checklist is actionable as written.
>
> **Origin.** The owner asked to control colors "in one central place by a config file,"
> suggesting a new design-token file, and raised that per-mountain color freedom would be an
> administrative burden. Investigating produced a different answer than expected (§1), one
> product bug (§5), and one stale scope line already corrected.
>
> **Related:** [`docs/design/design.md`](../../design/design.md) — the design reference, whose
> §Colors this plan implements rather than replaces · PROJECT_PLAN **§9 M8** (per-tenant
> theming — this plan **narrows** it; see §3) · [`BACKLOG.md`](../BACKLOG.md).

---

## 1. The short version

**No new token file.** The repo already designates one, and says so in as many words:

> **Single source of truth for token _values_ is `tailwind.config.js`.** … It defines **no
> color/spacing values of its own** — that would create a second source of truth that drifts.
> — [`design.md:9-13`](../../design/design.md)
>
> Don't duplicate token values into this file, a `tokens.json`, or component CSS.
> — [`design.md:292`](../../design/design.md)

A `config/design-tokens.json` is exactly the artifact that doc exists to prevent, and Tailwind
cannot read one without a build step — so every color would live in two files kept in sync by
hand. **The central file exists; it is under-adopted.**

🔑 **So the work is not "centralize colors" but "decide which colors are the brand."** Most of
what looks like drift is deliberate, and a mechanical migration would ship two real defects
(§4.2, §4.3).

---

## 2. Decisions (owner, 2026-08-05) — all five answered

| ID     | Question                               | Answer                                                                                         |
| ------ | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **D1** | May tenants differ in color?           | ❌ **No — every tenant uses the same colors.** `primaryColor` is **kept but made global** (§3) |
| **D2** | Delete `secondaryColor`/`accentColor`? | ✅ **Yes**                                                                                     |
| **D3** | 급식현황 gradient                      | ✅ **Keep the continuous gradient — change green→red to _blue→red_** (§5)                      |
| **D4** | Fix the Kakao button's color?          | ❌ **Do not touch vendor colors** (§4.3)                                                       |
| **D5** | Is admin UI in scope?                  | ✅ **Yes — admin folds into the color scheme.** `design.md`'s scope line was stale, now fixed  |

📌 **D5's correction is already applied.** `design.md:15-17` read _"Admin (`react-admin`)
screens are out of scope"_ — it outlived what it described: the react-admin subsystem was
deleted in **`d963d30` (2026-06-29)** and the CMS has been custom-built since. Rewritten with
that history inline so it cannot be re-derived as a live constraint.

⚠️ **D5 is wider than color.** `design.md` also governs typography, spacing, elevation, shapes
and the modal/component specs. Admin screens are now measured against **all** of it and
**nothing has ever checked them against any of it.** Out of scope here — §6 Phase 5 records it
as unscoped follow-up, not as done.

---

## 3. D1 — how "global `primaryColor`" resolves

Today `primaryColor` is **per-tenant**: `mountains.json` → `getMountainConfig().theme` →
`[mountain]/layout.tsx:23-29` injects `:root{--color-primary:…}` → `tailwind.config.js:29`
maps the `primary` token → **7 CTA sites** use `from-primary to-accent`. That mechanism is
**M8** (`a237e8b`, 2026-07-25), browser-verified at the time for geyang `#FACC15` / manisan
`#0ea5e9`.

**D1 narrows M8 rather than deleting it.** The **CSS-variable plumbing stays** — it is the only
way a token reaches third-party CSS (§8) — but the value stops being per-tenant:

| Piece                               | Today                                    | After                                                         |
| ----------------------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| `mountains.json` `theme` block      | 3 colors × 2 mountains                   | **Deleted entirely** (D1 + D2)                                |
| `MountainTheme` (`config.ts:20-24`) | interface with 3 fields                  | **Deleted**; `MountainConfig.theme` (`config.ts:122`) removed |
| `[mountain]/layout.tsx:23-29`       | reads config, validates hex, injects     | **Deleted** — nothing left to inject                          |
| `globals.css:14`                    | `--color-primary: #facc15` (hand-copied) | `--color-primary: theme('colors.brand.DEFAULT')`              |
| `tailwind.config.js:29`             | `var(--color-primary, #FACC15)`          | `var(--color-primary)` — no fallback needed                   |
| The 7 `from-primary` sites          | unchanged                                | **unchanged** — no component edits                            |

🔑 **`theme('colors.brand.DEFAULT')` is the crux.** Tailwind resolves it at **build time**, and
`globals.css` already has `@tailwind base` + `@apply`, so it works today. That collapses the
**three** hand-copied copies of `#FACC15` (`tailwind.config.js:29`, `:44`, `globals.css:14`)
down to **one** — `brand.DEFAULT` — while keeping the variable that non-Tailwind CSS needs.

✅ **Zero visual change.** Every tenant already resolved to a yellow except hidden `manisan`.
📌 **Two provisioning guides tell operators to pick a theme color** and must be corrected in
the same change: `docs/manuals/deployment/new-mountain-setup.md` and
`docs/manuals/admin-manual/adding-a-mountain.md`.

---

## 4. Where color is defined, and what to do with each

Counted on `dev` at `61b1904`.

| #   | Mechanism                              | Volume                           | Verdict                          |
| --- | -------------------------------------- | -------------------------------- | -------------------------------- |
| 1   | `tailwind.config.js` tokens            | `brand` `accent` `ink` `primary` | Keep — the target                |
| 2   | Semantic token usage                   | ~350 occurrences                 | Already correct                  |
| 3   | Tailwind palette utilities             | **1350**, 111 files              | Mostly leave — §4.1              |
| 4   | Raw hex in TS/TSX                      | 30, 18 distinct, 9 files         | Mixed — vendor vs leak           |
| 5   | Raw hex in `<style>` / CSS             | `globals.css`, `CatGrid.tsx`     | Leak — invisible to a class grep |
| 6   | **Computed at runtime** (`rgb()` math) | 1 site                           | §5 — the 급식현황 gradient       |

⚠️ **Mechanism 6 is why the first survey undercounted.** Greps for hex literals and for
`text-*` utilities both return **nothing** for a color built by arithmetic. **Any future color
audit must also grep `rgb(`, `hsl(`, and inline `style={{ color`.**

### 4.1 The 1350 breaks down — most is not drift

| Family                        | Count | Classification                                                                                                                           |
| ----------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `gray-*`                      | 1068  | **Leave.** `design.md:65` deliberately does not alias neutrals — re-encoding Tailwind's palette would itself be a second source of truth |
| `red`/`green`/`blue`/`purple` | 207   | **Leave.** Status + interactive, defined at `design.md:69-75` as built-ins by intent                                                     |
| `yellow`/`amber`/`orange`     | 75    | **Split three ways** — §4.2/§4.3 and the table below                                                                                     |

🔴 **An earlier estimate given in conversation — "migrate the 75 yellow/amber/orange
utilities" — was wrong**, and is corrected here. Reading the call sites, a minority are brand.

### 4.2 Brand — migrate (~30 classes, 9 files; admin included per D5)

| Site                                                                                | Class                                            | Becomes                           |
| ----------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------- |
| `admin/posts:27,38,49,60` · `admin/members:30,41,52,63` · `admin/app-management:49` | `border-yellow-500 text-yellow-600` (active tab) | `border-brand-500 text-brand-600` |
| `AdminPostList:281,465,494,507`                                                     | `from-yellow-400 to-orange-300` (CTA)            | `from-brand to-accent`            |
| `AdminPostList:466`                                                                 | `border-yellow-500`                              | `border-brand-500`                |
| `LoginForm:324,344` · `PhoneLoginForm:161,193`                                      | `focus:ring-yellow-500`                          | `focus:ring-brand-500`            |
| `ShowInModalToggle:47`                                                              | `bg-yellow-500` (switch **on**)                  | `bg-brand-500`                    |
| `CatGrid:564-565`                                                                   | `#fef9c3` / `#fde047` in `<style jsx global>`    | ⚠️ **not a class rename** — §8    |

✅ **The CTA row is `design.md:60`'s own example** — _"migrating existing buttons to the tokens
is a rename, not a redesign."_ `brand` **is** `yellow-400` and `accent` **is** `orange-300`
(`tailwind.config.js:44,52`), so these are pixel-identical.

**Judgment calls, decide at the keyboard** (all admin, all currently orange): the two
`bg-orange-500` badges (`tag-videos:983`, `tag-images:537`), the two `text-orange-600` stat
values (`tag-videos:684`, `tag-images:418`), and `RoleManagement:130`'s `bg-orange-50
border-orange-100` panel. **Default to leaving them** unless they read as brand emphasis
rather than status — orange is also the warning-adjacent family.

### 4.3 Leave — status (≈20 sites) and vendor

**Status:** `ui/Alert.tsx:15` (`warning: 'bg-amber-50 border-amber-300 text-amber-800'` — the
canonical one), `tag-videos:646-670,845-863`, `tag-images:449-467`, `admin/cats:1063`,
`RoleManagement:83-84`, `UserNotFoundModal:26,44,45`, `AboutContentEditor:205`, `CatGrid:576`,
`CatGrid:559` (`#fee2e2` = red-100).

⚠️ **`design.md:75` is explicit that warning is _"distinct from `brand` — warning is
informational, not a brand action."_** Tokenizing these makes a caution notice adopt the brand
hue and stop reading as a caution.

**Vendor (D4 — do not touch):** `SocialLoginButton:55,56,123,78-142` ·
`KakaoLoginGuidanceModal:35,44` · `mypage:492,509`.

📌 **Known deviation, recorded and deliberately NOT fixed (D4).** The app has **three different
Kakao yellows**: `design.md:82` mandates `#FEE500`; `KakaoLoginGuidanceModal:44` and
`mypage:492` use it correctly; but the **primary** Kakao login button
(`SocialLoginButton:55`) is `bg-yellow-400` = **`#FACC15`**, and its SVG is `#FFEB00`
(lines 133,137). So the main login button is off-brand for Kakao and disagrees with the other
Kakao button in the same app. **Left as-is by decision.** ⚠️ **Consequence for Phase 2:**
`SocialLoginButton:55`'s `bg-yellow-400` is a `yellow-400` that must **not** become `bg-brand`
— it looks exactly like a brand site and is not one.

---

## 5. D3 — the 급식현황 time-lapse gradient

**Where:** `src/components/FeedingSpotsList.tsx:16-33` (`getColorForHours`), applied at
`:112-121` to the 급식소명 and 최근 방문일 cells.

**What it is today — neither brand nor a raw hex, but a fourth thing:** three named states use
Tailwind built-ins (`text-gray-500` unknown · `text-green-600` at 0 · `text-red-600` at ≥60)
while **everything between is inline `rgb()` arithmetic** with no definition anywhere:

```ts
const ratio = hoursAgo / 60;
const red = Math.round(255 * ratio);
const green = Math.round(255 * (1 - ratio));
return { className: '', style: { color: `rgb(${red}, ${green}, 0)` } };
```

🔑 **No config file can reach this.** Changing the palette cannot change the gradient; only
editing the arithmetic can.

### 5.1 Two defects D3 fixes as a side effect

🐛 **(a) The endpoints don't meet the gradient.** `hoursAgo === 0` renders `green-600`
(`#16A34A`, deep) but `hoursAgo === 1` computes `rgb(4,251,0)` (near-fluorescent); likewise
`59` computes `rgb(251,4,0)` against `red-600` (`#DC2626`) at `60`. The scale reads as
continuous and is **discontinuous at exactly the two thresholds an operator cares about**.

🐛 **(b) The green end is effectively unreadable.** `rgb(0,255,0)` on the white row
(`FeedingSpotsList:93`) is ≈**1.4:1** against WCAG AA's 4.5:1; mid-scale olive
(`rgb(128,128,0)`) is ≈4.2:1, still short. ⚠️ **Worst exactly where the news is good** — a
recently-fed spot is the hardest row to read.

✅ **Blue→red also fixes a third thing the owner did not ask about: green↔red is the classic
red-green colour-blindness failure** (~8% of men), i.e. the old ramp's two endpoints were the
pair most likely to be indistinguishable. Blue→red separates cleanly under deuteranopia and
protanopia.

### 5.2 The replacement

**Anchor the ramp on two tokens that both pass AA, and let the formula produce the endpoints**
— which removes the special cases and therefore the discontinuity:

| `hoursAgo` | Colour                      | ≈ contrast on white |
| ---------- | --------------------------- | ------------------- |
| `null`     | `text-gray-500` (unchanged) | —                   |
| `0`        | `#1D4ED8` (= `blue-700`)    | ≈6.7:1 ✅           |
| `30`       | `#6B357A` (muted purple)    | ≈8.7:1 ✅           |
| `≥60`      | `#B91C1C` (= `red-700`)     | ≈6.5:1 ✅           |

```ts
const ratio = Math.min(Math.max(hoursAgo / 60, 0), 1); // clamped — no special cases
const r = Math.round(29 + 156 * ratio);
const g = Math.round(78 - 50 * ratio);
const b = Math.round(216 - 188 * ratio);
```

📌 **The midpoint is purple** — an RGB interpolation from blue to red passes through it. That
is the expected reading (파랑 = 방금, 보라 = 중간, 빨강 = 오래됨), not a bug.
📌 **`text-green-600` / `text-red-600` disappear from this component**, because the ramp now
covers both ends; `text-gray-500` for `null` stays.
📌 **The `!` urgency marker at `formatHoursAgo():42` (≥48h) stays** — it is the non-colour
channel and the only part accessible to a fully colour-blind operator.

⚠️ **Honest limit: the two endpoints are still hand-synced.** They mirror `blue-700`/`red-700`
but the arithmetic cannot read Tailwind at runtime, so they live as one exported constant with
a comment naming the tokens. **This is a documented deviation, not central control** — the
alternative (reading computed styles off a hidden element) is worse. Verified by eye at Phase 3.

⚠️ **No test can catch a regression here.** `seed-emulators.mjs` seeds **no** `feeding_spots`,
so the e2e harness only ever reaches the empty branch (PROJECT_PLAN §10r). Phase 3.4 fixes that.

---

## 6. Task checklist

### Phase 1 — collapse the theme to one global value (D1 + D2) — ✅ **DONE 2026-08-05**

> **Gates:** `tsc` **0** · unit **189** · smoke **39** · **`next build` green** (both tenants
> prerendered) · built CSS contains `--color-primary:#facc15`, and **no** `color-primary`
> appears in any prerendered HTML — proving the per-tenant `<style>` injection is gone and the
> value now comes from `theme()` at build time. ✅ **Zero visual change**, as predicted.

- [x] 1.1 Delete the whole `theme` block from **both** mountains in `config/mountains/mountains.json`.
- [x] 1.2 Delete `MountainTheme` (`src/utils/config.ts:20-24`) and `theme` from `MountainConfig` (`:122`).
- [x] 1.3 Delete `tenantPrimaryColorStyle()` (`layout.tsx:22-30`) **and its render site at `:58`**. ✅ **That render site was a `dangerouslySetInnerHTML`** — removing it drops an injection surface the hex validation existed to guard. Also dropped the now-unused `getMountainConfig` import. 📌 The variable's `:root` placement — which the deleted comment noted was "so it also reaches modals that portal to `document.body`" — is **preserved**, since `globals.css` declares it at `:root`.
- [x] 1.4 `globals.css:14` → `--color-primary: theme('colors.brand.DEFAULT');`, comment rewritten.
- [x] 1.5 `tailwind.config.js:29` → `var(--color-primary)`, `#FACC15` fallback dropped.
- [x] 1.6 Grepped `src`/`scripts`/`tests`/`config` for `.theme` / `MountainTheme` / the three colour fields — **readers were exactly the four sites predicted**, no surprises.
- [x] 1.7 ⚠️ **Scope was wrong as planned and is corrected here.** `adding-a-mountain.md` needed **nothing** (it is the console checklist and never mentions colour). Four **other** files did: `deployment/new-mountain-setup.md` (§config table + the go-live checklist), `admin-manual/README.md:483`, `codebase/multi-tenant-config.md:71`, and **`AGENTS.md`/`CLAUDE.md:106`** — the agent guide itself stated the per-tenant model. 🔑 **A doc grep beats a remembered list**; the plan's two-file guess missed the one file every future agent reads first.
- [x] 1.8 PROJECT_PLAN amended in **both** places M8 is recorded — §9's milestone note and the §12 "Theme wired through" checklist item. 📌 That item had closed because `config.theme` "was read by nothing"; the resolution three weeks later was that it should not have been read by anything.
- [x] 1.9 🆕 **Not planned:** `mountain-2-prerequisites.md` §3.2 ("the `brand` ramp is still geyang-yellow in the admin UI") is **dissolved, not fixed** — it described a gap between the ramp and `primaryColor`, and there is no longer a `primaryColor` for it to differ from. Marked resolved with the reasoning.

### Phase 2 — brand adoption (§4.2; admin included per D5) — ✅ **DONE 2026-08-05**

> **Gates:** `tsc` **0** · unit **189** · smoke **39** · `next build` green (81/81 pages).
> **Equivalence proven three ways**, not asserted: (1) every `brand`/`accent` ramp stop is
> **byte-identical** to Tailwind's `yellow`/`orange` scale (checked programmatically against
> `tailwindcss/colors`); (2) each migrated class compiles to the **same declaration** as the
> one it replaced — e.g. `.border-brand-500` and `.border-yellow-500` both emit
> `rgb(234 179 8)`; (3) old vs new rendered side by side in the live page.

- [x] 2.1 Active-tab pairs — 9 sites across `admin/posts`, `admin/members`, `admin/app-management`.
- [x] 2.2 CTA gradients in `AdminPostList` — 4 sites + one `border-yellow-500`.
- [x] 2.3 The `focus:ring` rings in `LoginForm` (×2) and `PhoneLoginForm` (×2).
      ⚠️ **There were six, not four.** The other two (`SocialLoginButton:56`,
      `KakaoLoginGuidanceModal:44`) sit **inside Kakao button style blocks**; left untouched,
      because changing one line of a vendor button's styling while 2.6 forbids the line above
      it splits a single block for no benefit. 📌 Verified `focus:ring-yellow-500` still
      compiles for them.
- [x] 2.4 `ShowInModalToggle:47` → `bg-brand-500`.
- [x] 2.5 All five orange judgment calls → **left**, now with reasons rather than a default:
      the two `text-orange-600` stat values pair with `text-green-600` (untagged/tagged) and
      the two `bg-orange-500` badges pair with `bg-green-500` — both **status**; and
      `RoleManagement:130` is one of **four role panels** (gray/orange/blue/white), a
      **categorical** palette, not brand emphasis.
- [x] 2.6 `SocialLoginButton:55` untouched (§4.3, D4) — still `bg-yellow-400`.
- [x] 2.7 `CatGrid:559-565` — **done, and judged worth it.** Two new variables
      (`--color-brand-100`, `--color-brand-300`) declared in `globals.css` via `theme()`, and
      the styled-jsx rules now read `var(…)`. 🔑 **`theme()` does not work inside
      `<style jsx global>`** — styled-jsx never passes through Tailwind's PostCSS pipeline — so
      the variable indirection is not a preference, it is the only mechanism available.
      `#fee2e2` (red-100, invalid-cell) stays: **status**. Runtime-verified: all three
      variables resolve (`#FEF9C3`, `#FDE047`, `#FACC15`).
- [x] 2.8 Browser pass — **partial, and the gap is stated below.**

⚠️ **What the browser pass did NOT cover.** `/admin/*` is behind `AdminAuth` and this session
had no credentials, so the **admin screens were never seen rendered** — the tab pairs, the
`AdminPostList` CTAs, and the `CatGrid` header are verified by compiled-CSS equality and by an
injected side-by-side, **not** by looking at the real screens. ✅ Verified in-browser for real:
the login page (both `focus:ring-brand-500` rings, rendered), the header CTA gradient, and all
three CSS variables resolving. **An operator with admin access should glance at 게시물/집사들/앱
관리 and 냥이들' grid header once.**

📌 **An unplanned completeness proof.** In the side-by-side, the OLD column's CTA and toggle
rendered **unstyled** — because Tailwind had **purged `from-yellow-400`, `to-orange-300` and
`bg-yellow-500` from the bundle entirely**, which happens only if **no source file references
them any more**. That is a stronger check than the grep that drove the migration.
(`border-yellow-500` / `text-yellow-600` do survive — used by the Kakao button and
`UserNotFoundModal`, i.e. exactly the vendor/status sites left alone by design.)

### Phase 3 — 급식현황 (§5) — ✅ **DONE 2026-08-05**

> **Gates:** `tsc` **0** · unit **196** (+7) · smoke **39** · **full e2e 233 passed / 13
> skipped / 0 failed** (was 229 — the 4 new specs).

- [x] 3.1 Ramp extracted to **`src/utils/feedingFreshness.ts`** — clamped ratio, both endpoints
      in one exported constant, **both special cases removed**. 📌 Extraction was not tidiness:
      the logic was a closure inside the component and therefore **untestable**, which is why
      a 1.4:1 ramp survived unnoticed. The component now only decides how to apply the colour.
- [x] 3.2 Contrast **encoded as a test**, not checked once: `feedingFreshness.test.ts` walks
      every hour 0→60 and fails under 4.5:1. **Measured worst point 6.47:1** (at 60h); midpoint
      8.69:1. The old ramp's fresh end measured **1.37:1**. 🔑 The suite carries a **negative
      control** asserting `rgb(0,255,0)` fails, so the check cannot silently stop measuring.
- [x] 3.3 `text-gray-500` for `null` kept; the `!` marker kept and now driven by the exported
      `FRESHNESS_URGENT_HOURS` rather than a bare `48`.
- [x] 3.4 `feeding_spots` **seeded** (`tests/e2e/fixtures/feeding-spots.json`, 4 spots at 1h /
      30h / 70h / none — spanning fresh, mid, past-both-thresholds, and unknown).
      ⚠️ **Needed its own writer:** `seedCollection` turns a fixture's `id` into the _document_
      id and strips it, but this collection reads `data.id` as a **numeric field** and orders
      by it. Offsets are converted to Timestamps **relative to the seed run**, because a fixed
      date would drift into the clamped end and stop exercising the scale.
      New spec: `tests/e2e/member/feeding-spots-list.spec.ts` (4 tests).
- [x] 3.5 Corrected the now-false coverage claims in `feedingCheckIn.test.ts`'s header and
      PROJECT_PLAN **§10r R3** — both said the harness "cannot reach" the list.

✅ **Both nets were proven to have teeth** (the repo's own lesson: a suite green on its first
run has proved nothing). Inverting `FRESHNESS_RAMP` made the unit hue test **and** the e2e
colour assertion fail, while the hue-agnostic tests correctly stayed green. Ramp restored.

### Phase 4 — hygiene

- [ ] 4.1 `YouTubeAuthPanelNew:114-127` — the status hex map duplicates emerald/amber/red/gray-500 as raw hex.
- [ ] 4.2 `LeafletMountainMap:302` (`#6b7280` = gray-500) · `Compass:33,35`.
- [ ] 4.3 Record in `design.md` §Colors that the palette is global (not per-tenant) — **prose only, no values** (`design.md:12`).

### Phase 5 — unscoped follow-up from D5

- [ ] 5.1 🆕 Audit admin screens against the **non-colour** halves of `design.md` (typography, spacing, elevation, shapes, modal spec). Exempt until 2026-08-05; never checked. **Not sized here.**

### Gates

`npx tsc --noEmit` · `npm run test:smoke` · `npm test` · `npm run test:e2e`
(`export PATH=/usr/local/opt/openjdk/bin:$PATH` first). ⚠️ **No automated test observes
colour**, so every phase needs a browser pass; the suites only prove nothing else broke.

---

## 7. What changes on deploy

- 급식현황's freshness scale goes **green→red ⇒ blue→red**, and its two endpoints shift to
  deeper shades. **Operators will notice this**; it is the only user-visible change here.
- Everything in Phase 2 is **pixel-identical by construction** (`brand` == `yellow-400`,
  `accent` == `orange-300`). If a screen looks different, that is a bug in the migration.
- Phase 1 is invisible: every tenant already resolved to yellow except hidden `manisan`.

---

## 8. Watch-outs

- ⚠️ **Never tokenize a status or vendor colour** (§4.3). This is the one way this work ships a
  regression, and both cases look exactly like brand sites in a grep.
- ⚠️ **A colour audit must grep `rgb(` / `hsl(` / inline `style` too** (§4, mechanism 6), or it
  misses the 급식현황 gradient the way the first pass did.
- ⚠️ **A Tailwind token cannot reach every surface.** `<style jsx global>` blocks (`CatGrid`)
  and third-party CSS (`.dsg-*`, Leaflet) consume **CSS variables only**, never utility
  classes. 🔑 `CatGrid:561`'s comment literally says _"(brand-100)"_ next to a hardcoded
  `#fef9c3` — **the author knew the token and could not use it.** This is a tooling limit, not
  carelessness, and it is why §3 keeps the `--color-primary` variable rather than deleting it.
- 📌 **`theme()` in `globals.css` is what keeps this honest.** Without it, every CSS variable
  is a hand-copied duplicate of a Tailwind value — which is the drift `design.md:292` forbids.
- 📌 **`brand` is yellow by definition and stays that way.** Under D1 there is no derived ramp
  and no second palette; renaming yellow utilities to `brand` buys single-point control, not
  themeability. That is the decided trade.

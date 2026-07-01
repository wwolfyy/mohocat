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

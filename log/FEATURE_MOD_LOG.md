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

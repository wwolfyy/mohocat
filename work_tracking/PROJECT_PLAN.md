# 산냥이집냥이 (mohocat) — Project Plan & Progress Tracker

> **Project-wide** plan and execution tracker — the layer **above** the
> feature-specific design docs. Where the redesign plan/tasks docs track one
> workstream (the landing + app redesign), this document maps **all** workstreams
> (redesign, mobile UX, admin cleanup, codebase health, compliance, multi-tenant,
> testing) and their status in one place.
>
> **Companion docs:**
> [`docs/handoff/2026-06-21-kickoff-3.md`](../docs/handoff/archive/2026-06-21-kickoff-3.md)
> (orientation — read first) ·
> [`design.md`](../docs/design/design.md) (design source-of-truth) ·
> [`mohocat-app-redesign-plan.md`](../docs/design/mohocat-app-redesign-plan.md) +
> [`-tasks.md`](../docs/design/mohocat-app-redesign-tasks.md) (redesign detail) ·
> token values: [`tailwind.config.js`](../tailwind.config.js).
>
> **Status:** 🚧 **SKELETON** — workstreams below are placeholders. Each one's
> concrete specs/tasks are filled in (and spun into a companion `*-tasks.md`)
> when it's picked up with the user.

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` deferred/out of scope ·
🚧 placeholder (needs spec)

---

## 1. Snapshot (as of 2026-08-03)

> ⚠️ **Audited against the code on 2026-08-02, and seven entries were wrong** — six unticked
> boxes described work finished weeks earlier (§7 API-route auth + RBAC drift, §7a's static-data
> seam, §9's two config-consistency items and theme wiring, §10's four testing candidates), and
> §5's "급식소 관리 is a disabled stub" was stale in a way that would have misled: its
> neighbouring §7 note claimed `points` is `write: if false` with no live writer, when the 급식소
> CMS writes it through the client SDK under a `manage-canteen` rule. Each is now ticked with a
> note on where it actually closed. 🔑 **A plan entry is a claim about the code, and claims rot —
> verify before scheduling, and tick the box in the same change that does the work.**

> 📌 **This table is an index, not a record.** A row says the status and where to read the rest —
> the narrative is in the numbered section the row names, and each individual item is a row in
> [`work_tracking/registry.md`](./registry.md). ⚠️ **A cell that grows past a
> couple of sentences has stopped being an index**; move the prose down into its section.

| Workstream                                     | Status                      | Where the detail is                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing redesign (Phases 0–2)                  | `[x]` done                  | Brand tokens, frosted nav, Leaflet migration, mobile clustering.                                                                                                                                                                                                                                                    |
| App redesign — A (Modals)                      | `[x]` done                  | Shared `ui/Modal` system (commit `5892b43`).                                                                                                                                                                                                                                                                        |
| App redesign — B (Album pages)                 | `[x]` done                  | Shared `components/album/*` + `useMediaFilter`.                                                                                                                                                                                                                                                                     |
| App redesign — D (Localization)                | `[x]` done                  | Auth + mypage → Korean (해요체), `strings.ts`.                                                                                                                                                                                                                                                                      |
| App redesign — C (other pages)                 | `[x]` done                  | Brand audit of the public + 집사 surfaces, **done 2026-07-03**; button convergence closed 2026-07-10 (§12.2). Auth-gated list/pagination checks still owed under **§4**.                                                                                                                                            |
| Redesign A4 (live-verification)                | `[~]` blocked               | Needs real sign-in / SMS (assistant can't enter creds).                                                                                                                                                                                                                                                             |
| **Functional: 입양홍보 page missing**          | `[x]` done                  | **§11** — adoptable-cats gallery (`Cat.adoptable` + admin tagging + `/pages/adoption`); every 404 entry point resolved. Browser-verified 2026-06-26.                                                                                                                                                                |
| **Functional: 동참 form end-to-end**           | `[x]` done                  | **§11** — `POST /api/contact` shipped 2026-06-28; the sending account changed and is verified live — see §11's 2026-08-06 sub-section.                                                                                                                                                                              |
| **Deployment-target cleanup**                  | `[x]` done                  | **§7** — Vercel-only; Phases 1–3 removed Cloud Run / home-server / Firebase Hosting / Docker and the Cloud Storage static-data push. ([`phase3-cleanup-plan.md`](../docs/planning/completed/phase3-cleanup-plan.md))                                                                                                |
| **Perf: bake the data layer**                  | `[x]` done                  | **§7a** — cats read server-side and baked into the home + adoption Server Components (ISR 3600s, on-demand revalidate on admin edits); zero client Firestore queries. Closed 2026-06-30.                                                                                                                            |
| **Mobile UX optimization**                     | `[~]` in progress           | **§4** — two planned passes plus three off-plan rounds, device-verified on an S22 through 2026-07-11. **Remaining:** mobile perf (not started) and a full audit of the sign-in-gated surfaces.                                                                                                                      |
| **Firebase Storage → Seoul bucket**            | `[x]` done                  | `us-central1` → `asia-northeast3`, bucket `mountaincats-61543`; URLs rewritten across all 6 collections. Runbook: `scripts/migration/README_korea_bucket_migration.md`.                                                                                                                                             |
| **Admin desktop cleanup**                      | `[~]` in progress           | **§5** — spreadsheet-grid cat editor, react-admin removed, `AdminAuth` hardened (2026-06-29→30). **Remaining:** two owner-deferred consistency items + the `겨울집 관리` stub.                                                                                                                                      |
| **Admin mobile optimization**                  | 🚧 placeholder              | **§6** — admin usable on phones.                                                                                                                                                                                                                                                                                    |
| Codebase health / tech-debt                    | `[~]` in progress           | **§7** — permissions + admin-API auth (2026-06-28), CMS write rules (2026-06-29), complexity retirement P0–P6 (2026-07-19), media routes gated (2026-07-26). **Remaining:** error handling, structured logging, request validation.                                                                                 |
| **Auth / media integrity (2026-08-02)**        | `[x]` done                  | Not a numbered § — see **§7** (PII in auth logs), **§8** (consent, orphan cleanup, `defaultRole`), **§10h**, **§10i**. Commits `8a50348`…`82d0f07`. 🔑 Two premises were wrong and corrected; `docs/codebase/authentication.md` was rewritten around both.                                                          |
| Compliance / legal                             | `[x]` done                  | **§8** — CLOSED 2026-07-10: policy + terms, 국외 이전 disclosure, consent capture, self-service 탈퇴. **Still open:** Kakao scope verification, and the legal review + PIPA audit that need an outside professional.                                                                                                |
| Multi-tenant hardening                         | `[x]` done                  | **§9** — M0–M8 complete, shipped via PR #8 (`366425c`) then PR #9 (`f570bcc`). ⚠️ M8's colour half was withdrawn (**§10u**). What is left is owner-gated ([`mountain-2-prerequisites.md`](../docs/planning/pending/mountain-2-prerequisites.md)) plus path-based tenancy — decided, **not started** (`R-0395`).     |
| **Data protection / backups**                  | `[x]` done                  | Not a numbered § — PITR (7-day) + weekly backups + `npm run backup:firestore`, round-trip verified lossless; weekly-not-daily and no-GCS-bucket are deliberate. 🔑 **Snapshot before any script writes to prod.** Runbook: [`admin-manual` §10](../docs/manuals/admin-manual/README.md#10-backups--recovery-owner). |
| Testing & quality gates                        | `[x]` done                  | **§10** — main plan complete, merged via PR #7 (2026-07-16). Vitest + emulator-backed Playwright e2e; `e2e` is a required status check on `main`.                                                                                                                                                                   |
| Member post authoring                          | `[x]` **LIVE** (corrected)  | **§10n** — 집사 roles view / create / edit their own on 집사톡 + 급식현황 (`8334c51`), live in prod since 2026-08-02. 🔑 The ask's premise was false: there was no non-admin author for "let the author edit" to apply to.                                                                                          |
| Member media upload (집사톡)                   | `[x]` **LIVE** (2026-08-03) | **§10p** — narrow `upload-own-photo` / `upload-own-video` + `uploadedByUid`. 🔴 Before the fix a member lost the **whole post** on attach, and both test nets missed it for mirror-image reasons.                                                                                                                   |
| Author delete + reply edit/delete              | `[x]` **LIVE** (2026-08-04) | **§10q** — authors delete their own posts; a reply's author edits and deletes that reply. The delete **cascade** was the clause that needed care.                                                                                                                                                                   |
| **입양홍보 posts + adoption/modal polish**     | `[x]` done                  | Not a numbered § — 입양홍보 post type, admin post editing, adoption-page polish, cat-modal redesign, inline `[img]`/`[video]` links. See [`handoff-21`](../docs/handoff/archive/2026-07-03-handoff-21.md).                                                                                                          |
| **Posts: detail route + editing (2026-08-02)** | `[x]` done                  | **§10k / §10l** — a post is addressed by `(type, id)`, not `id`; detail moved onto the 공지사항 shell + `PostMedia`; editing moved onto the create composers (급식현황 excepted by decision).                                                                                                                       |
| **Colour / design tokens (2026-08-05)**        | `[x]` **done 2026-08-08**   | **§10u** — colour has one source of truth (`tailwind.config.js`) and per-tenant theming is **withdrawn**, superseding M8. Phase 5 closed 2026-08-08 (`df132d0`): the admin CMS was measured against `design.md` for the first time — full account in `R-0050`.                                                      |
| **Work-tracking restructure (2026-08-08)**     | `[~]` **ACTIVE**            | Not a numbered § — ▶️ the active workstream, and **application work is PAUSED** until it lands. Design, plan and live progress are in [`work_tracking/`](./); the open records are the resume point.                                                                                                                |
| **Admin manual / operator docs**               | `[x]` started               | Not a numbered § — `docs/manuals/admin-manual/` + [`adding-a-mountain.md`](../docs/manuals/admin-manual/adding-a-mountain.md) + `deployment/new-mountain-setup.md` (rewritten as a real runbook in M8).                                                                                                             |

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

What is **not** done: live-verification of several auth/mypage
states (A4), the functional gaps in §11, and every workstream in §4–§10 below —
those are the forward plan.

- **App-wide redesign Phase C shipped.** C: 집사메뉴/butler surfaces (`ButlerStreamClient`,
  `ButlerTalkClient`, `PostList`, `NewPostForm`, `NewButlerTalkForm`) de-gradient-ified,
  `border-yellow-500` dropped, English empty states → 해요체 brand cards, submit buttons →
  shared `<Button variant="primary">`, login-required notices → brand-tinted cards, all
  `focus:ring-blue-500` → `ring-brand-300`, dead `data-oid` stripped. Done 2026-07-03.

---

## 3. How this tracker works

- Each numbered workstream below is a **placeholder** until picked up. Picking one
  up means: (1) confirm scope/specs with the user, (2) write them into that
  section, (3) spin a companion `docs/planning/pending/<workstream>-tasks.md`
  mirroring the rigor of the redesign tasks doc, (4) implement in small,
  browser-verified chunks, (5) update the §1 snapshot.
- **Where planning docs live (2026-07-28):** this tracker stays at
  `docs/planning/`; every companion doc sits in **`pending/`** (open, in
  progress, or decided-but-not-executed) or **`completed/`** (executed —
  historical record). A doc **moves from `pending/` to `completed/` when its
  own status line says it is done**, and links to it are updated in the same
  change.
- **Known gaps that are _not_ scheduled live in [`BACKLOG.md`](../docs/planning/BACKLOG.md)** (added
  2026-08-02) — real, deferred on purpose, no date — together with owner questions
  awaiting an answer. 🔑 **An item belongs in exactly one of the two:** promoting a
  backlog entry means moving it here (or into a `pending/` plan) and striking it there
  **in the same change**. A duplicated entry is how the 2026-08-02 audit ended up with
  seven claims that had rotted.
- **Sequencing is not yet decided** — see §12. Mobile UX and admin cleanup are
  called out by the user as priorities; ordering among them and the debt items is
  open.

---

## 4. 🚧 Mobile UX optimization (public-facing)

> **Goal:** make the entire **public** experience first-class on phones, not just
> the landing map. The map already has a mobile path (clustering + portrait
> rotation); the rest of the user-facing app is now **audited at mobile widths**
> (2026-07-04 pass — see below).

> **Verification tooling — SETTLED (2026-07-04).** `resize_window` is broken (resizes
> window chrome but does **not** reflow the content viewport → stays desktop-width). The
> working method is an **iframe sized to phone width**, which genuinely reflows (validated:
> a 390px frame reports `innerWidth 390` + Tailwind `md:` query `false`). Prove reflow
> before trusting the harness; it's sound for layout/CSS media queries but does **not**
> emulate touch / orientation / device-pixel-ratio — those remain device-owed.

**Pass 1 audit — 2026-07-04 (verified in the iframe harness at 390, nav also at 360×560):**

> 📋 **22 items — 20/22 done — now in the work registry**
> as `R-0145`…`R-0166`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

_(Out of scope here: admin mobile — that's §6.)_

---

## 5. 🚧 Admin interface cleanup (desktop)

> **Goal (placeholder):** bring the `/admin` CMS up to a consistent, maintainable
> desktop standard. Admin was **explicitly out of scope** for the design
> redesign; this workstream brings it _into_ scope as a cleanup (not necessarily
> a full re-skin to the public brand — **confirm the target look**).

**Candidate scope — _confirm with user_:**

> 📋 **9 items — 7/9 done — now in the work registry**
> as `R-0167`…`R-0175`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

_(Security/route-auth hardening overlaps §7 — coordinate so it's done once.)_

---

## 6. 🚧 Admin page optimization (mobile)

> **Goal (placeholder):** make the admin CMS usable on phones. Admin is
> desktop-only today (inline-styled layout, wide tables, batch-tagging grids).
> Volunteers may need to do light admin (approve, tag, post an announcement) from
> a phone. **Confirm which admin tasks must work on mobile** — full parity is
> likely overkill.

**Candidate scope — _confirm with user_:**

> 📋 **6 items — 0/6 done — now in the work registry**
> as `R-0176`…`R-0181`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

---

## 7. 🚧 Codebase health / tech-debt

> **Goal (placeholder):** pay down the recurring issues the codebase deep-dives
> flagged. Tracked here so they're visible even though they're not user-facing.

**Candidate scope — _confirm & prioritize_:**

> 📋 **22 items — 17/22 done — now in the work registry**
> as `R-0182`…`R-0203`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

---

## 7a. ✅ Perceived latency — bake the data layer (DONE 2026-06-28; cleanup carried)

> **Surfaced 2026-06-26**, picked up with the user **2026-06-28** and implemented the same
> session. Full task log + locked design decisions:
> [`7a-bake-data-layer-tasks.md`](../docs/planning/completed/7a-bake-data-layer-tasks.md). The client cat-query
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

> 📋 **6 items — 5/6 done — now in the work registry**
> as `R-0204`…`R-0209`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

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

## 8. ✅ Compliance / legal — CLOSED (2026-07-10)

> **Closed** as a workstream: 개인정보처리방침 + 이용약관 published and footer-linked,
> 국외 이전 disclosed (Art. 28-8, disclosure-based), and email-signup consent capture
> shipped. The items below under **"Deferred / owner-owed"** are consciously accepted
> as out of this workstream — reopen if/when membership scales.
>
> ✅ **Two of the four closed on 2026-08-01** — see the consent item below, whose stated
> premise turned out to be **wrong** (implicit signup was already refused; the real gap was
> an orphaned Auth account, now deleted) and the 🔴 **PII-in-auth-logs** defect found during
> the same check, fixed and tracked in **§7** with the rest of the logging debt.
> **Still open: the two that need an outside professional**, plus Kakao scope verification,
> which needs the Kakao Developers console.

**Done:**

> 📋 **9 items — 6/9 done — now in the work registry**
> as `R-0210`…`R-0218`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

**Deferred / owner-owed (accepted, out of workstream).** ⚠️ **Split into two kinds
(2026-08-01)** — the four items had been sitting as one undifferentiated pile, but two are
ordinary code work and two need an outside professional. All four **re-verified still open**
on 2026-08-01; none had been quietly closed.

_Code work — doable in a normal session, no external party:_

'system'`distinguishes it in the audit log). 📌 Worth knowing:`viewer`is **not**
    permission-less — it carries`view-video`+`view-photo`; it merely happens to be
equivalent to no-role today because public content is not gated on them. That is exactly
why the relaxed-rule alternative was rejected.

- ✅ **Consent is now recorded** (it never was — the email path gated the button and stored
  nothing). `users/{uid}.consent` holds `terms` + `privacy`, each with `agreedAt` and the
  **policy version**, written by `SignupForm` on doc creation only — never on update, since
  overwriting the timestamp would falsify when consent was given. New
  `src/constants/policy.ts` single-sources `POLICY_VERSION` / `POLICY_EFFECTIVE_DATE_KO`,
  and both policy pages now render 시행일 from it so the displayed date and the stamped
  version cannot drift. ⚠️ **Bump it whenever either policy's substance changes.**
  📌 Members created before 2026-08-01 have **no** consent record — absent ≠ refused, it
  means "predates the feature". A re-consent flow for a future policy revision does not
  exist and would be its own piece of work.

_Needs an outside professional — cannot be closed in-repo:_

---

## 9. ✅ Multi-tenant hardening (M0–M8 complete; owner-gated externalities only)

> **Goal (placeholder):** make the "add a second mountain by editing JSON" promise
> actually true. Today several paths are single-mountain hard-coded.
>
> **Decision framework (2026-07-18):**
> [`multi-tenant-architecture-decision-20260718.md`](../docs/planning/completed/multi-tenant-architecture-decision-20260718.md)
> — verified current state, the custody-vs-management gating question, the open
> deployment/data axes, and open questions Q1–Q8. **Q1–Q8 ANSWERED 2026-07-19**
> (management-only · B1 one-Firestore-`mountainId` · A1 one-Vercel + subdomains ·
> visitor-facing selector); ⚠️ **the "subdomains" half of that answer was REVERSED on
> 2026-07-28** — tenancy goes **path-based** (`mohocats.org/manisan`), see
> [`tenancy-url-model-decision-20260728.md`](../docs/planning/pending/tenancy-url-model-decision-20260728.md) +
> [`tenancy-path-migration-plan-20260728.md`](../docs/planning/pending/tenancy-path-migration-plan-20260728.md).
> Q3's substance — one Vercel project, one build serving every mountain — is unaffected;
> only how the tenant is named in a URL changes. The execution plan is
> [`multi-mountain-refactor-plan-20260719.md`](../docs/planning/completed/multi-mountain-refactor-plan-20260719.md)
> (phases M0–M8 — supersedes the framework's §10 checklist and this section's
> candidate-scope list as the tracker; every item below is absorbed into a phase).
> **✅ M1–M5 DONE & SHIPPED TO PROD (PR #8, merge `366425c`, 2026-07-23); cutover complete.
> ✅ M6 (`d644d1b`) + M7 (`48f7085`) + M8 (`a237e8b`) committed on `dev`, plus a standalone GA4
> setup guide (`7e3c517`). All phases M0–M8 done & committed — only owner-gated externalities
> remain. ✅ **Shipped to production via PR #9 (`f570bcc`, 2026-08-07)** — P5.4 passed the same day.** M1–M3
> (`8920c66`/`092d226`/
> `491b832`, 2026-07-19) → **M4** `b83a112` per-tenant service factory + write stamps
> (2026-07-20, incl. the prod backfill) → **M5.1** `d4a0bb2` scoped reads + composite
> indexes → **M5.2** `47d0f3d` per-mountain role model (map keyed by `mountainId`) +
> mountain-aware `firestore.rules` (both 2026-07-22). M5.2a (role model) and M5.2b
> (rules) were **inseparable at the emulator gate**. Gates: tsc, smoke 30/30, unit
> 39/39, **rules 11/11** (new mountain dimension), **full e2e 116/13/0**.
> **CI updated 2026-07-23** — a dedicated emulator-backed `rules` job in `ci.yml` runs
> `npm run test:rules`; the M5.4 isolation e2e already rides the `e2e` job. **M5.3 route
> audit DONE 2026-07-23** (all 21 API routes verified: no leak-by-omission; residual
> cross-tenant surface = shared YouTube channel only, non-Firestore/deferred; a pre-existing
> 7-ungated-route auth gap logged as a thread — **that gap is now CLOSED, 2026-07-26**: six
> routes gated with `requireApiPermission`, permission mirroring the `firestore.rules`
> clause on the resource each touches, the 7th (`generate-youtube-signed-url`) **deleted as
> dead code**, + a 21-test `media-route-authz` e2e net;
> `log/FEATURE_MOD_LOG.md` 2026-07-26). **M5.4a + M5.4b DONE 2026-07-23** — `manisan`
> stub added to `mountains.json` (`hidden: true`) + seeded, and the two-tenant isolation
> e2e written; full e2e 125/13/0. **✅ PROD CUTOVER COMPLETE 2026-07-23 (owner):** snapshot →
> migration (`currentRole`→`roles`, `'default'`→`geyang`) → `firestore:indexes` (Enabled) →
> **PR #8 merge** → `firestore:rules`. Multi-mountain is live in prod. Tail: delete legacy
> `currentRole` + `about_content/about` + local dump once CMS confirmed healthy. Its §6
> prerequisite — the **Tier 1 write migration** — is **done 2026-07-18** (see §7 +
> `log/FEATURE_MOD_LOG.md`).
>
> **✅ M6 DONE & committed (`d644d1b`, 2026-07-25; no prod cutover) — per-tenant upload
> namespacing.** Image uploads now prepend the active tenant's `storagePrefix`
> (`generate-signed-url` route + the direct-storage form strategy via `useMountain()`); geyang
> `''` → exact no-op, a future tenant's uploads isolate under `mountains/<id>/…`. **Scope was
> corrected mid-flight:** a first draft also namespaced baked thumbnails + a `cats.thumbnailUrl`
> migration, but the owner's dry-run found **0 changes** — prod cat thumbnails **and** album
> photos serve from live Firebase **Storage URLs** (already tenant-scoped by object path), not
> baked local paths. The thumbnail namespacing + migration script + M6 cutover runbook + e2e
> fixture edits were **reverted/deleted**. The baked-vs-Storage-URL image model is now
> documented in
> [`docs/codebase/media-and-youtube.md`](../docs/codebase/media-and-youtube.md#image-storage--serving-strategy).
> Gates: tsc 0, unit +2, smoke 30/30, **full e2e 125/13/0**.
>
> **✅ M7 DONE & committed (`48f7085`, 2026-07-25) — analytics decoupling.**
> `firebase/analytics` → a single shared **GA4** property via `gtag.js` (root-layout
> `<Script>` gated on `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `send_page_view:false`);
> `AnalyticsTracker` emits every `page_view` with `mountain_id` from `useMountain()`.
> `getAnalytics` + the `analytics` export removed from `services/firebase.ts`; dead
> `measurementId` dropped from `getFirebaseConfig`. Gates: tsc 0, smoke 30/30, unit 71/71,
> **e2e 125/13/0**. 🔑 Owner-owed: register the GA4 `mountain_id` custom dimension + set
> `NEXT_PUBLIC_GA_MEASUREMENT_ID` in Vercel before any tenant-2 traffic.
>
> **✅ M8 DONE & committed (`a237e8b`, 2026-07-25) — geyang-as-one-of-many + per-tenant
> theming (minimal) + provisioning proof.** `manisan` stub + isolation e2e already landed
> (M5.4). Theme wiring (owner-chose "primary color only"): a `primary` tailwind token →
> `--color-primary` CSS var injected per tenant on `:root` by the `[mountain]` layout;
> public CTAs repointed `from-brand`→`from-primary`; geyang reconciled to zero-change
> (`#FACC15`). Browser-verified: geyang `#FACC15`, manisan `#0ea5e9`. The
> `docs/manuals/deployment/new-mountain-setup.md` provisioning guide was **rewritten** as a
> real runbook (one Firebase + one Vercel, host-routed, no new env), and the docs close-out
> is done (`multi-tenant-config.md`, `services-layer.md`, AGENTS/CLAUDE.md, this §9, the
> decision framework → EXECUTED). Gates: tsc 0, smoke 30/30, unit 71/71, **e2e 125/13/0**.
> ⚠️ Theming is **deliberately partial** — the `brand` ramp + admin-only `from-brand` CTAs
> stay static (a real 2nd mountain reads yellow there until a fuller pass). **The
> multi-tenant hardening track is complete.**
>
> 🔄 **M8 SUPERSEDED 2026-08-05 (owner): the palette is GLOBAL — per-tenant theming is
> removed, not extended.** Asked to centralize color control, the owner decided a mountain may
> **not** differ in color: choosing colors per tenant is an administrative burden with no
> preview and no contrast check, and `mountains.json` is baked, so "trying a color" queues a
> redeploy. The `theme` block is **deleted from `mountains.json`** (both mountains), along with
> `MountainTheme` and the `[mountain]` layout's injection (a `dangerouslySetInnerHTML`, now
> gone with the hex validation that guarded it).
>
> 🔑 **What survives is the indirection, and deliberately so.** `--color-primary` remains,
> declared once in `globals.css` as `theme('colors.brand.DEFAULT')` — resolved at **build**
> time, so it is not a copy. The variable exists because a Tailwind token cannot reach
> `<style jsx global>` blocks or third-party CSS (`.dsg-*`, Leaflet), which read variables
> only. Net effect: the **three** hand-copied `#FACC15`s (`tailwind.config.js:29`, `:44`,
> `globals.css:14`) collapse to **one**, and the 7 `from-primary` CTA sites need no edits.
> ✅ Zero visual change — every tenant already resolved to yellow except hidden `manisan`.
> 📌 M8's other half (geyang-as-one-of-many, provisioning proof) is untouched; only the
> per-tenant color knob is withdrawn. Plan:
> [`color-token-centralization-plan-20260805.md`](../docs/planning/pending/color-token-centralization-plan-20260805.md).
>
> 📁 **Everything still gated on a real mountain #2 lives in one doc** (created 2026-07-28):
> [`mountain-2-prerequisites.md`](../docs/planning/pending/mountain-2-prerequisites.md) — the blocking code items,
> the owner-run provisioning externalities, the should-fixes, and the decided/won't-fix
> record. This §9 no longer tracks them individually; add new ones there.

### ⚠️ Production data was modified — 2026-07-20 (`mountainId` backfill)

**This change is NOT in any commit** — it is a one-shot mutation of **production
Firestore**, so it cannot be found by reading a diff. Recorded here because the
git history alone will not reveal it.

|                 |                                                                                                                                                                                                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **What**        | Added `mountainId: "geyang"` to every pre-existing document                                                                                                                                                                                                                                                  |
| **When**        | 2026-07-20, owner-authorized (dry-run → owner review → run)                                                                                                                                                                                                                                                  |
| **Scope**       | **99 documents** across 13 collections: `about_content` 1 · `cat_images` 10 · `cat_videos` 12 · `cats` 32 · `contacts` 3 · `feeding_spots` 10 · `points` 8 · `posts_adoption` 1 · `posts_announcements` 1 · `posts_butler` 5 · `posts_feeding` 16 · (`admin_data` empty · `permission_logs` already stamped) |
| **Script**      | `scripts/migration/backfill-mountain-id.js` — added in **`b83a112`**                                                                                                                                                                                                                                         |
| **Record**      | **`da19e1f`** (this write-up + plan/hand-off status)                                                                                                                                                                                                                                                         |
| **Method**      | `set(..., { merge: true })` only — additive; no document replaced or deleted                                                                                                                                                                                                                                 |
| **Re-runnable** | Yes — skips docs that already carry `mountainId` (idempotent)                                                                                                                                                                                                                                                |

**Verified three ways:** (a) dry-run re-run inverted completely (`Would stamp 0
document(s)`); (b) per-collection totals identical before/after; (c) Admin-SDK
field spot-check — `개똥이` 19 fields incl. `adoptable:false`, `깡패` 21 incl.
`adoptable:true`/`adoption_info`/`name_origin` — i.e. the Sheets-importer
overwrite failure mode did **not** recur. Browser pass against the stamped data
rendered unchanged (map 8 points + avatars, photo album 10).

Full detail: [`multi-mountain-refactor-plan-20260719.md`](../docs/planning/completed/multi-mountain-refactor-plan-20260719.md) §3 M4.

### ⚠️ This Firestore is shared with a second application — M5 constraint

`image_uploader` (13 docs) is the **owner's own image-upload script** (confirmed
2026-07-22 — a one-off 2020-photo triage queue), not part of this codebase. Found via
`listCollections()` during the 2026-07-20 backup work — referenced **nowhere** in
`src`, scripts, or config. Also shares Storage (`images_thumbnail/` under the same
bucket).

What M5 accounts for (verified benign):

- **The M5.2b rules landed on this shared DB but don't touch `image_uploader`** — it
  has **no entry in `config/firebase/firestore.rules`**, so it falls under
  default-deny and must be using the Admin SDK (which bypasses rules). Unaffected by
  the rework. ✅ Owner-confirmed it's the Admin-SDK uploader script.
- **Its documents carry no `mountainId`** (excluded from the backfill by design).
  If that tool ever promotes records into `cat_images`, those writes must stamp
  `mountainId` or the images will disappear once M5 scopes reads.
- More generally: **inventories built from this repo's source are not a complete
  picture of this database.** The backup script discovers collections at runtime
  for exactly this reason.

**Candidate scope — _confirm with user; may be far-future_:**

> 📋 **6 items — 5/6 done — now in the work registry**
> as `R-0219`…`R-0224`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

---

## 10. ✅ Testing & quality gates — **MAIN PLAN COMPLETE (merged to `main` 2026-07-16)**

> **Goal:** coverage was **zero**; now Vitest (40 tests) + an emulator-backed
> **Playwright e2e harness with GitHub Actions CI** are in place (harness landed
> 2026-07-11), and **all main-plan e2e suites are written, green, and merged to
> `main`** — `public/`, `auth/`, `member/`, `admin/`, `api/` (~140 tests). Phase 7
> is done: flake audit green (local 3× consecutive + CI green on PR #7 and pushes),
> docs finalized, and **branch protection now enforces the `e2e` check on `main`**.
> The suites merged via **PR #7** (`dev → main`, merge commit `65d2020`,
> 2026-07-16). **Only remaining owner action:** `firebase deploy --only
firestore:rules` for prod parity on the scoped `users` self-write rule.

**Done:**

> 📋 **14 items — 9/14 done — now in the work registry**
> as `R-0225`…`R-0238`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

**Plans drafted (2026-07-11):**

- [`playwright-ci-plan.md`](../docs/planning/completed/playwright-ci-plan.md) — the Playwright E2E suite
  (public / auth / member / admin / API-security) against the **Firebase Emulator
  Suite** with seeded fixtures, run in a greenfield GitHub Actions CI. **Phases 0–7
  are DONE + merged to `main`** — harness/CI, `public/`, `auth/`, `member/`, `admin/`,
  `api/` (~140 tests), flake audit, docs, branch protection. The intermittent
  "markerless bake" build hang is **fixed** (2026-07-13, DEBUG_LOG), and the **§5
  non-admin-login blocker is resolved** — a scoped `users` self-write rule
  (+ `npm run test:rules`, 6/6) now lets non-admins log in. ⚠️ Still to do: deploy the
  rules change to Firebase for prod parity (`firebase deploy --only firestore:rules`).
- [`playwright-ci-prerequisite-plan.md`](../docs/planning/completed/playwright-ci-prerequisite-plan.md) —
  the enabler plan that must land first: adopts the main plan's recommendations
  as decisions (D1–D7), resolves its flags (F1–F12) via 4 spikes + 8 work
  packages (emulator wiring, asset-script compat, fixtures/seed, harness, CI).
  ✅ **EXECUTED.**

**Candidate scope — ✅ SUPERSEDED by the executed main plan (ticked 2026-08-01).** These four
were written when coverage was **zero** and the stack was undecided. The main plan answered all
of them, so they are closed as **overtaken by events**, not as individually-worked items:

**Deferred — e2e Phase 8 (revisit later, not required for "done"):** these are the
main plan's explicitly-parked extensions (see `playwright-ci-plan.md` §8 Phase 8) —
none block the completed workstream.

---

## 10a. ✅ Post-composer separation + per-mountain playlist filing (DONE 2026-07-27)

> **Goal:** stop 집사게시판 from being a second media composer, move the per-file media work
> to the one that does the job (집사톡), and make YouTube filing per-mountain instead of
> title-matched. Plan + decisions:
> [`butler-media-separation-plan-20260727.md`](../docs/planning/completed/butler-media-separation-plan-20260727.md).

> 📋 **4 items — 4/4 done — now in the work registry**
> as `R-0239`…`R-0242`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

🔑 **Owner-owed:** add the channel's back catalogue to the 계양산 playlist — it holds **4** of
**13** videos, and the deferred `syncVideos` fix will treat the rest as unowned.

⏸️ **DEFERRED, not queued** (HANDOFF open threads): 촬영일 should come from the **file's own
metadata** with its timezone rather than the filename — iPhone files parse to nothing and
silently take the upload time. **The owner deferred this deliberately on 2026-07-27; do not
start it unasked.** Recorded to explain the behavior, not to schedule it.

📌 **Logged, not fixed:** `/api/youtube-playlists` now has **no caller**.

**Gates:** tsc 0 · smoke 31/31 · unit 102/102 · **full e2e 153 passed / 13 skipped / 0
failed** · browser passes on both composers. ⚠️ YouTube-side behavior is **Preview-verified
only** — no credentials in the emulator.

---

## 10c. ✅ Shareable link to one cat's modal (DECIDED 2026-07-29, DONE 2026-08-01)

> **Ask:** "invite someone to view a particular cat." Today the only answer is _link to
> `/pages/cats` and tell them the name_ — there is no URL that opens a specific cat.

**Decision (owner, 2026-07-29): take the cheap option. The "real fix" is explicitly declined.**

> 📋 **3 items — 3/3 done — now in the work registry**
> as `R-0243`…`R-0245`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

**Behaviour, as verified in a production build** (dev and prod were checked separately — see
the ⚠️ below for why that mattered): arriving on `?cat=<id>` opens the modal; closing returns to
a clean `/pages/cats` **without leaving the site**; opening a cat from the list sets the param;
the browser **back** button closes the modal and clears it. An unknown id (deleted cat, mangled
link) lands quietly on the full list. A link to a 별냥이 / 행방불명 cat opens too — the lookup
runs against the full list, not the filtered view, so the visitor needs no toggle.

⚠️ **Forward does not re-open the modal, deliberately left as-is.** Next's AppRouter re-asserts
its own canonical URL onto the history entry while handling the back navigation, so going
forward lands on a _clean_ URL with nothing to restore — self-consistent (no param, no modal),
just not a restore. The `popstate` sync in `CatsBrowser` and the adopt branch in `useModalLayer`
keep it correct if that ever changes, and make a restore unable to push a duplicate entry.

🐛 **The one real trap, worth knowing before touching this.** The deep-link open is deferred by
one `setTimeout(…, 0)`, and that is not a stylistic choice: Next's AppRouter re-asserts its
canonical URL in an effect that runs **after** the page's own effects. Stripping the param and
letting the modal push it back **in the same commit** means the re-assert runs last, with a
canonical URL computed before the push — it wipes `?cat=` straight back off, and the modal then
has no entry to pop. Symptom: the URL flicks to `?cat=…` and reverts a moment later. ⚠️ It must
be `setTimeout`, **not** `requestAnimationFrame` — a shared link is often opened into a
**background tab**, where rAF does not fire until the tab is looked at, and the modal simply
would not be there on arrival. (Both failure modes were observed in the browser, not reasoned
about.) The scheduled open is also **not** cancelled on effect cleanup: the effect re-runs when
the router hands down a fresh `cats` array, and cancelling drops the open while the run-once
guard swallows the retry — the deep link then silently does nothing.

**What this deliberately does NOT do — recorded so it isn't re-litigated.** There is no
`generateMetadata` / `openGraph` anywhere in the app, so a shared link renders whatever generic
preview the site's default gives — the same card for 아롱이 as for the homepage. A `?cat=` param
on a client component **cannot change that**. Per-cat link previews would need a real
`/pages/cats/[id]` page; the owner weighed that and declined the cost (2026-07-29). ⚠️ If the
motivating use case ever turns out to be **입양홍보** — persuading someone about a specific
adoptable cat, where the preview card does the persuading — this decision is worth revisiting,
because a faceless link wastes the share. **Still true as built** — this shipped unchanged.

🆕 **One owner decision this raises, not blocking.** The cats page now emits a **GA4
`page_view` per modal open**, because the URL genuinely changes and `AnalyticsTracker` fires on
every `searchParams` change. That is standard SPA behaviour and arguably correct now that a cat
_is_ an address — but it means `/pages/cats` view counts include modal opens, so the page will
look busier than it did. `page_path` stays `/pages/cats` (only `page_location` carries the cat),
so reports do not split per cat. Suppressing it would mean teaching `AnalyticsTracker` to ignore
the `cat` param — a few lines, not done, since which behaviour is wanted is a product call.

📌 **Sequencing note:** the path-based tenancy migration rewrites ~83 navigation sites, so new
URL surface built now is touched again by it. Not a blocker at this size; it is the reason the
contained version won.

---

## 10d. Per-file media in every composer (2026-07-29 → **redirected + partly DONE** 2026-07-30)

> 🔄 **The 2026-07-29 decision was replaced by the owner on 2026-07-30, before any of it was
> built.** It read: _"remove multiple-video upload from the composers — posts should not carry
> a pile of videos"_, capping video at one everywhere. **That is no longer the plan.** Do not
> implement a cap from the old text; it is kept here only so the reversal is legible.

**Decision (owner, 2026-07-30) — two parts, in this order:**

1. **Admin composers stay unrestricted.** 공지사항 and 입양홍보 are admin-only surfaces;
   admins may attach as much media as they want. What those two forms were actually missing
   was 집사톡's **per-file** upload — one file per section, each with its own 제목/설명 —
   which is the opposite of a cap. **✅ DONE 2026-07-30** (see below).
   > 📋 **8 items — 6/8 done — now in the work registry**
   > as `R-0246`…`R-0253`. See
   > [`work_tracking/registry.md`](./registry.md); each links to its full
   > text in `work_tracking/records/`.

📌 **Not a bug, recorded so it isn't re-investigated:** on 2026-07-29 videos appeared
greyed-out and unselectable in 공지사항's picker while the same files were selectable in
집사톡's. Cause: the **image** picker was used. It is first in 공지사항 but second in 집사톡,
so muscle memory from one form lands on the wrong picker in the other, and `accept="image/*"`
correctly greys out videos. Both components resolve `accept` from the same `kind` prop and
both pass it correctly — **there is nothing wrong with the pickers.** The external drive was
a red herring; only the two pickers' `accept` values differed. D3 exists to remove the trap.
_D1b's framed sections and header bars address the same confusion from the other side: the
picker now sits visibly inside a labelled 사진 or 동영상 box._

---

## 10e. ✅ Post media rendering converged (DONE 2026-07-31)

> **Ask (owner, over one session):** the 입양홍보 feed's expanded post showed no image; 입양홍보
> should be able to pop up on a site visit like 공지사항; and none of the per-file 제목/설명/태그
> the composer collects was visible anywhere in a post.

**The root cause behind all three: three hand-rolled media renderers.** `AnnouncementModal`,
`AdoptionPostCard` and `/pages/announcements/[id]` each had their own copy, and they had
drifted — different capabilities, different bugs. They now share **`PostMedia`**.

> 📋 **4 items — 4/4 done — now in the work registry**
> as `R-0254`…`R-0257`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

📌 **Open question for the owner, not a defect:** a video's 제목 now appears **twice** — once in
YouTube's own player overlay and once as our caption. Correct, possibly redundant; dropping the
caption title for videos is a one-line change if wanted.

⚠️ **A green test was covering a broken feature, twice over.** The adoption e2e asserted
`getByAltText('이미지')` and passed throughout E1's bug, because the old markup emitted that alt
on the image-only path the spec happened to exercise — and **no fixture in the repo carried any
media at all**. `test-adopt-02` now carries two images _and_ a video (the broken combination),
with different tags/captions per medium so a lookup returning one answer for everything cannot
pass.

---

## 10f. ✅ Post surfaces: proportion, tone, and the 30-second stall (DONE 2026-08-01)

> **Ask (owner, one session):** photos in an 입양홍보 post rendered out of proportion with the
> video beside them; the 공지사항 detail page's standing "중요한 안내사항" banner reads too
> official; and — on Safari — 공지 pages showed "no posts" / "can't find the post", with a post's
> tags arriving late or never, all cured by reloading.

> 📋 **3 items — 3/3 done — now in the work registry**
> as `R-0258`…`R-0260`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

📌 **Why no error was ever logged.** Firestore retries network failures internally rather than
rejecting, so a bad connection **hangs** and never throws. That is why the owner's console showed
a clean run returning 4 documents — and why the new e2e delays the response instead of aborting
it. The genuinely reachable error cases are permission-denied and missing-index, not offline.

✅ **PASSED 2026-08-08, in production, by the owner — this is closed.** 입양홍보's
**새로운 입양 소식** section filled in with the rest of the page on Safari, on the network where
the stall was originally seen. That section is `AdoptionPromotionClient`, a client island reading
`posts_adoption` through the **browser** SDK, so it exercises the probe; the adoptable-cats
gallery above it does not (server-read via the Admin SDK with ISR). 🔑 **One client read is
enough**: the probe runs once per page load when the Firestore client initializes, not once per
collection. 📌 The verification could only happen this week — the fix shipped to `dev` on
2026-08-01 but only reached production with **PR #9** (2026-08-07). ⚠️ **Still not established,
and now moot: whether the probe ever stalled for anyone but the owner** — the suspect buffer was
always an ISP or proxy rather than Safari itself. The fix is correct either way.

---

## 10g. ✅ Videos deleted from YouTube (DONE 2026-08-01, `7e8aa1b`)

> **Ask (owner):** a couple of videos were deleted on YouTube and still showed tiles in the
> public 영상첩, filled with YouTube's grey "unavailable" placeholder.

**Root cause:** `syncVideos` is **import-only** — it computes one set difference (YouTube minus
Firestore) and imports it. Nothing computes the other direction, so a `cat_videos` record
outlives its video indefinitely.

🔑 **Why auto-pruning was rejected (owner chose label-then-confirm).** `fetchChannelVideos` reads
the uploads playlist with the **public API key**, in which a video made **private** disappears
identically to a deleted one. Pruning on absence would destroy the record — and the cat tags,
설명 and playlist membership the tagging queue exists to produce — the moment somebody flips a
video to private, which destroys nothing on YouTube's side. Same shape as the 2026-07-26
"YouTube owns video data" rule, aimed at the one thing YouTube does **not** own: our tags.

> 📋 **4 items — 4/4 done — now in the work registry**
> as `R-0261`…`R-0264`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

⏳ **Not testable here, and owner-owed:** the classification itself needs real YouTube OAuth,
which the emulator harness has no credential for (the same reason P5.4 is manual). Existing
records stay unlabelled until **📺 YouTube와 동기화** runs once on a deployed environment; the
ghosts then appear in the panel for deletion. _(Verified against prod data 2026-08-01 after the
owner ran it: 20 videos, 18 `available` + 2 `missing`, both hidden from the public album and
listed in the CMS panel.)_

---

## 10h. ✅ 촬영일 stopped being fabricated, and the two composers that could not set it gained the field (DONE 2026-08-02, `6e2dc49`)

> **Ask (owner):** "when uploading videos the upload date becomes creation date."

**The defect.** `POST /api/upload-youtube/complete` wrote
`createdTime: createdTime ? calendarDateToInstant(createdTime) : new Date()`. 촬영일 is derived
by regex-matching the **filename**, and when nothing parses the composers send `''` — falsy — so
the route substituted the moment of upload.

🔑 **The owner's own observation was the diagnosis.** They noted the bug did **not** affect
집사톡, and that turned out to be the whole explanation: the composers split across two hooks.
집사톡 / 집사게시판 (`useRichContentForm`) have had a **촬영 날짜 field** from the start, so a date
is nearly always supplied; 공지사항 / 입양홍보 (`useSimpleContentForm`) had **none**. Following
that asymmetry found **the same fabrication in the image path** (`uploadStrategies.ts`).
⚠️ **The image one is worse:** `cat_images` has no upstream — Firestore **is** the source of
truth for photos — so unlike videos nothing ever corrects it.

⚠️ **Why it was hard to notice, and reads as two bugs.** The same request sends YouTube **no
`recordingDate`** when none is supplied, so Firestore claimed a date YouTube did not have — and
the next metadata sync overwrites it with `null`. The wrong date therefore **disappears later**,
which looks like an unrelated "the date vanished" bug rather than evidence of this one. Neither
stage logs anything.

> 📋 **3 items — 3/3 done — now in the work registry**
> as `R-0265`…`R-0267`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

- ⏸️ **Still deferred (owner):** that 촬영일 is guessed from the **filename** at all rather than read
  from the file's own metadata. This change only stops the fabrication.
- 📌 **Existing records:** videos self-heal on the next sync; **photos do not** (no upstream). The
  owner fixed the affected photos by hand 2026-08-02.

**Verified.** `tests/unit/uploadYouTubeComplete.test.ts` (5 cases) asserts on the written
document; 2 more cover the image strategy. **Both mutation-checked** — restoring each fallback
fails exactly the date cases. The new field is driven in a **real browser** by 3 e2e cases.

---

## 10i. ✅ One album tile implementation instead of two (DONE 2026-08-02, `b61216a` + `82d0f07`)

> **Ask (owner):** the photo album captions its thumbnails, the video album does not — "it's
> likely how the video thumbnails are structured makes it difficult." Then, on seeing the code:
> "`video.description || '제목 없음'` is indeed odd. Let's remove the fallback."

🔑 **It was not a structural difficulty.** Both grids use the same shared `album/MediaTile`, but
pass **different layouts**: photos take the default `layout="overlay"` and pass `description`, so
the caption is drawn over the image; videos use `layout="below"`, whose footer shelf rendered
**only tags and meta**. `description` was neither passed nor rendered there.

> 📋 **3 items — 3/3 done — now in the work registry**
> as `R-0268`…`R-0270`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

- ⚠️ **Side effect, owner call open:** converging removed `PhotoAlbum`'s `설명 없음` filler, which
  had been left alone deliberately (unlike the video one it is correctly labelled). The shared
  tile drops empty-state fillers by design; restoring it should be done **there**, so both
  grids agree.
- 📌 **Also deliberate:** the photo modal moved from `next/image` to `MediaTile`'s raw `<img>`. The
  shared tile documents that full-size Firebase URLs stall `next/image`, and the photo album
  **page** has served the same images that way all along.

**Verified.** Screenshots of both converged modals in a real browser (seeded with media matching
the cat's name — fixtures tag by id, so the modals render empty otherwise), plus a new e2e case
pinning both title paths. Full e2e 196 passed / 3 failed, all three green in isolation.

---

## 10j. ✅ A settings screen that configured nothing, deleted (DONE 2026-08-02)

> **Found while siting §10d's D2 toggle**, not reported: 앱 관리's 게시물 컬렉션 설정 tab was
> the natural home for it, and inspecting it showed it had never worked.

**What it was.** A textarea in 앱 관리 where an admin typed Firestore collection names; it saved
them to **`localStorage`** (`admin-posts-collections`) and the dashboard's 게시물 tile listed
them back. Introduced 2025-06-27 (`3907ad7`), carried through the permissions and `[mountain]`
refactors, never finished.

**Why it was dead, precisely** — the distinction matters, because the value _was_ read:

- The dashboard read the key, then passed it to a stub that pushed **`count: 0`** for every
  name behind a `// TODO: Replace with post service…`. It never queried Firestore.
- The tile's headline number was **`postsCollections.length`** — how many lines you had typed,
  not how many posts exist.
- 🔑 **The tell:** the default list shipped **`posts_main`**, a collection that **has never
  existed** in this codebase, and omitted **`posts_adoption`** and **`posts_butler`**, which do.
  A wrong name sat there for ~14 months with no symptom, because a wrong name and a right name
  both rendered `0`.
- Being `localStorage`, it was per-browser and per-admin regardless.

**What replaced it.** The tile now counts the four real collections through the existing service
getters (`getAllPosts()` is mountain-scoped and excludes replies), labelled by the surface each
backs — 급식현황 / 집사톡 / 공지사항 / 입양홍보 — with a real total. **Which collections exist is
a fact about the code** (each is a service's `COLLECTION_NAME`), not an operator choice, which is
why the configurability was the wrong shape to begin with; the list lives in `POST_COLLECTIONS`
in the dashboard, and a new post service adds a row. The 앱 관리 tab is gone (the page keeps
소개페이지 관리 + the disabled FAQ).

**Verified in a browser against live data:** 게시물 **14** = 급식현황 6 + 집사톡 2 + 공지사항 4 +
입양홍보 2. ⚠️ The hydration mismatch logged on those admin pages is **pre-existing and unrelated**
— it reproduces on untouched pages (`/admin/cats`) and comes from the auth-dependent header
(server renders 로그인/등록, client renders the signed-in user).

---

## 10k. ✅ Post detail: the wrong collection, then the wrong layout (DONE 2026-08-02)

> **Ask (owner):** clicking any post on `/pages/butler_talk` — and on the 집사톡 tab of
> `/admin/posts` — showed **"Post not found."** instead of the post. Then, once they opened:
> they rendered full-bleed and unstyled, not like 공지사항 / 입양홍보.

**Two defects, one after the other. Both had always been there; only 급식현황 ever reached
this route, so nobody had seen either.**

> 📋 **2 items — 2/2 done — now in the work registry**
> as `R-0271`…`R-0272`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

**Verified:** `tests/e2e/admin/post-detail.spec.ts` (9 tests) — clicking through from the
집사톡 list, all four types by direct URL, a genuine miss, an unrecognised type resolving
nothing rather than guessing, the shared shell, and 댓글 scoping.

---

## 10l. ✅ Editing converged onto the create composers (DONE 2026-08-02)

> **Ask (owner):** the CMS edit form takes media as a **pasted URL** — _"It's going to be
> cumbersome to find the URL of an image. Is it possible to edit those posts with the creation
> form?"_ Raised first for 공지사항 / 입양홍보 (`d71a101`), then for 집사톡 (`219b0e5`).

**It was possible, and the obstacle had already been removed.** `EditPostForm` documented its
own limit as _"their upload paths differ — signed URLs for feeding, direct Storage for
announcements/adoption, YouTube for video"_ — true when written, **stale since 2026-07-30**
(§10d D1), when 공지사항 / 입양홍보 moved onto the same signed-URL strategy 집사톡 uses.
Nothing was left but the divergence, and two implementations of one job is what produced
§10e's defects.

> 📋 **3 items — 3/3 done — now in the work registry**
> as `R-0273`…`R-0275`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

🔑 **Four decisions inside this, each of which could have gone wrong quietly:**

1. **`기존` items carry no 제목/설명 editor.** That text lives on the medium's own record
   (`cat_images` / `cat_videos`), and for a video **YouTube is the source of truth** — a caption
   typed here would be erased by the next 동기화. It is edited in 사진 관리 / 동영상 관리.
2. **An edit does not re-stamp `username` / `date` / `time`.** Only creation sets them;
   re-stamping would relabel someone else's post with the editor's address and jump it to the
   top of a list ordered by 게시일.
3. **Post-level `tags` are omitted on an edit with no new files.** They mirror the cat selector,
   which only applies to files being uploaded now — and since `updatePost` **merges**, sending
   an empty array would have **erased the tags the post already carried**.
4. **Retained media counts against 집사톡's cap** (§10d D2). A post already holding one video
   and one photo shows **no picker at all** until one is removed. Editing must not be a way
   around a limit creation enforces.

⚠️ **급식현황 stays on `EditPostForm`, and this is a decision, not an oversight.** Its composer
uploads no media at all (§10a, owner 2026-07-27), so routing its edit screen there would leave
legacy 급식현황 posts that still carry a photo with **no way to change it**. The URL list can.

**Verified:** `tests/e2e/admin/post-edit-composer.spec.ts` (6 tests) — prefilled composer with
real pickers and no URL boxes, existing media surviving a text-only save, removing one photo
detaching only that one, the 집사톡 cap holding against retained media and freeing one slot on
removal, and authorship / 게시일 unchanged. Full e2e **2× consecutive 214 / 13 / 0**.

---

## 10m. ✅ The about page has one source of truth — the CMS (DONE 2026-08-02)

> **Ask (owner):** _"I want whatever's entered in the CMS page to be the source of truth, and
> get rid of everything that gets in the way."_ Raised on noticing that `mountains.json` still
> carried an `about` object that looked stale.

**It was stale in the half that was visible, and load-bearing in the half that wasn't** — which
is why "just delete it" needed the photo pipeline moved first.

- Firestore won for `title` / `subtitle` / `mainContent` / `sections`: `about_content/geyang`
  exists, so the JSON was pure fallback. 📌 The proof was `sections` — the JSON declared two,
  Firestore held **zero**, and the live page showed none.
- **The photo was the opposite.** `useAboutPhoto` short-circuited to a `localPath` baked into
  `mountains.json` by `fetch-static-assets.js` and **ignored the filename it was handed from
  Firestore**. So the image came from static config while the caption beside it came from the
  CMS. 🔑 **Changing the photo in the CMS did nothing** — a latent bug, invisible only because
  both sources happened to name the same file.

> 📋 **6 items — 6/6 done — now in the work registry**
> as `R-0276`…`R-0281`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

⚠️ **Two costs accepted on purpose, not overlooked:**

1. **A missing about photo used to fail the build; now it is a broken image on a live page.**
   The fail-loud guard was only possible because the filename sat in config the build could
   read. Putting the CMS in charge means the check moves to the operator — hence the new
   "check `/pages/about` after saving" step in both manuals.
2. **The 파일 이름 field is free text matched against Storage.** The CMS names the photo but
   cannot upload it, so a typo reads as "사진을 불러오지 못했어요". Making that a real upload
   control is the natural follow-up — **deliberately not folded into this change**, and now
   tracked as [`BACKLOG.md`](../docs/planning/BACKLOG.md) **B1**, which records why it is not the drop-in
   reuse of `generate-signed-url` it looks like.

📌 **Found on the way, awaiting a decision: `sections` is stored, editable, and never
rendered.** The public page shows 제목 / 부제 / 대표 사진 / 본문 only; the CMS has offered a
섹션 editor the whole time. Either the page should render them or the field should go.
Tracked as [`BACKLOG.md`](../docs/planning/BACKLOG.md) **Q1**.

**Verified:** `tsc` clean, smoke 34/34, unit 103/103, full e2e (below). Prod Storage confirmed
to serve `about-photos/**` to an anonymous reader, which the new path requires.

---

## 10n. ✅ Members author and edit their own 집사톡 / 급식현황 posts (BUILT + LIVE 2026-08-03)

> **Ask (owner):** _"allow the author of 집사톡 and 급식현황 posts to edit the post"_ —
> refined, after the finding below, to: **members may view, create and edit their own** on
> **those two boards only**, and **may not delete**.

🔑 **The premise was false, and that was the whole finding.** Members could not **see or
create** on either board: the pages gated on `isAdmin()`, and the client-SDK write requires
`manage-posts`, which only `admin` holds (verified against the **live**
`role_permissions/role-config`, not just `config/permissions.json`). So "the author" was
always an admin — who could already edit everything. The missing capability was never editing.

📌 **The model had anticipated this and nothing used it.** `view-post-butler` /
`view-post-feeding` were already granted to the butler roles **and already drove the nav**, so
a member saw the link and then met 관리자 권한이 필요합니다. The code said so out loud:
_"we allow both admin and butler roles"_, directly above `setHasPermission(isAdmin)`.

> 📋 **7 items — 7/7 done — now in the work registry**
> as `R-0282`…`R-0288`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

⚠️ **Two cross-collection consequences found while building, not while planning:**

1. **A reply writes to two documents.** `createReply` increments `replyCount` on the
   **parent**, which the replier usually does not own — so "authors may edit their own" alone
   denies most replies. A narrow `+1`-only clause covers it.
2. **A 급식현황 post stamps `feeding_spots`**, which was `manage-posts`-gated. That stamp _is_
   the board's purpose, and the call is non-fatal, so a member's post would have landed while
   their check-in silently did not. ⚠️ Note a feeding spot is **shared state with no owner** —
   this grant is genuinely wider than the post rules.

🔴 **CORRECTED 2026-08-03 — this section said "NOT LIVE" and it was live.** Verified against
production: the deployed ruleset (release **2026-08-02T16:00:12Z**) matches
`config/firebase/firestore.rules` ignoring comments; `role_permissions/role-config` already
grants `write-own-post-*` to both butler roles; and one active `butler-ground` member has
**already authored two 급식현황 posts** (2026-08-03, both stamped with `authorUid`). The
deploy steps below were therefore already taken — by an admin-UI save on Preview or an
unrecorded `APPLY=true` run; the auto-seed path is ruled out (it fires only when the doc is
absent). 🔑 **"Not on `main`" is not "not in production":** Preview runs `dev` against the
**production** database, and rules + the matrix deploy by hand, out of band. **Check the
deployed artifact, not the branch.**

~~Deploy order: (1) `firebase deploy --only firestore:rules`; (2) `APPLY=true node
scripts/migration/add-member-post-permissions.js`; (3) push.~~ Done. The remaining deploy
belongs to **§10p**.
Plan: [`member-post-authoring-20260802.md`](../docs/planning/completed/member-post-authoring-20260802.md).

---

## 10p. ✅ Members can post on 집사톡 but cannot attach media (FIXED + DEPLOYED 2026-08-03)

> **Owner-raised:** _"we modified roles and permissions to allow butlers to edit their own
> posts. I think we only thought about permissions for posts, but if you upload images
> and/or videos you need image/video permissions as well."_ — correct, and verified before
> any code was written.

§10n granted the two **post** permissions and stopped there. 집사톡 is the only board a
non-admin may write **and** the only one that uploads, and every upload surface gates on
`manage-photo` / `manage-video`, which **only `admin` holds**:
`POST /api/generate-signed-url` (manage-photo), `POST /api/upload-youtube` and its
`/complete` half (manage-video, independently), and the `cat_images` client write
(rules: `manage-photo`).

🔴 **The member does not get a degraded post — they lose the post.**
`useRichContentForm` catches an upload failure, alerts, and **`return`s**, so the save never
runs. Everything typed is gone, behind an English `Image upload failed: Failed to get signed
URL: Forbidden`.

✅ **Verified before planning:** a throwaway rules suite asserted both butler roles denied on
`cat_images` / `cat_videos`, **with two controls in the same run** — admin succeeds on both,
and butler-ground succeeds on its own `posts_butler` post — so the denials are specific to
media, not a broken fixture.

📌 **Scope is 집사톡 only** (create page **and** the member edit route, which renders the same
composer). 급식현황 uploads nothing by design (2026-07-27 D1); 공지사항 / 입양홍보 upload but
stay admin-only.

> 📋 **8 items — 8/8 done — now in the work registry**
> as `R-0289`…`R-0296`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

🔬 **Why both nets missed it, which is the part worth keeping.**
`tests/e2e/member/butler-authoring.spec.ts` is text-only by an exclusion **inherited from
`admin/butler-create.spec.ts`, where it was harmless because an admin holds every
permission**. Carried into the member specs, the same exclusion sat exactly on top of the one
thing the new role could not do. And the §10n rules suite missed it for the mirror-image
reason: **it tested the permissions the feature added, not the ones its user journey depends
on.** 🔑 **When a role gains a capability, walk its whole journey and list every permission
each step needs — the gap is never in the permission you just wrote.**

Plan: [`member-media-upload-permissions-20260803.md`](../docs/planning/completed/member-media-upload-permissions-20260803.md).

---

## 10q. ✅ Authors may delete their own posts, and reply authors may edit + delete their replies (DEPLOYED 2026-08-04)

> **Owner:** _"give the authors the permission to delete the post they created. The media can
> survive. Also, I want to give authors the same permissions (modify & delete). For replies, I
> do not mean the author of the post, but the author of the reply."_

**This reverses a §10n decision, deliberately.** Delete was withheld from members because _"a
집사톡 post can carry other people's replies"_ — that reason is real and unchanged; the owner
weighed it and chose to let authors retract their own work anyway.

🔑 **A reply is a document in the SAME collection as the post**, distinguished by `isReply` +
`parentId`. So one rule governs both, and "the author of the reply" needs no separate
permission — the existing author test already resolves to the replier for a reply document.
`ReplyForm` has stamped `authorUid` since §10n, so the identity is there.

> 📋 **6 items — 6/6 done — now in the work registry**
> as `R-0297`…`R-0302`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

✅ **"The media can survive" needed no code.** Verified in both services: `deletePost` /
`deleteReply` touch only reply documents and the post document — never `cat_images`,
`cat_videos`, or Storage. A deleted post's photos stay in the 사진첩, which is what the owner
asked for and what the code already did.

⚠️ **It spent a few hours in the exact half-state the deploy order exists to prevent, and that
is worth recording because the shape recurs.** The **code shipped** (`01d02d7`) while the
rules had not, so `PostList` rendered **삭제** on a member's own post while the deployed rules
still said `allow delete: if canWrite('manage-posts')` — the button appeared, the confirm
appeared, and the write was refused. (Reply **수정** worked throughout; editing never needed a
rule change.) 📌 **Not an operator mistake** — the earlier deploy simply predated work written
the next day. 🔑 **The standing hazard: code reaches production on `git push`, rules and the
permission matrix do not.** Which is why the deployed artifact, not the branch, is what you
check.

---

## 10o. ✅ A document with no `mountainId` is undeletable by everyone (FIXED 2026-08-03)

> **Ask (owner):** _"deleted posts are still there in `posts_feeding` / `posts_butler`, but
> 공지사항 / 입양홍보 delete cleanly."_

🔑 **`canWrite()` reads the mountain off the _stored_ doc on a delete** — `request.resource` is
null then — and `hasPermissionFor()` requires it non-null. **No permission grants past a
missing field**, which is why it never presented as a permission problem.

📌 **The correlation was a decoy, and the exception was the evidence.** The owner first read it
as "flat-structured documents survive" — a real pattern, since those are the **replies**, all
written 2025-07-09 before multi-tenancy and therefore unstamped until the 2026-07-20 backfill.
Then they produced a **nested** post that had also survived. It was created **2026-07-21, one
day after that backfill ran**, and was the only unstamped document among **98** across 11
content collections.

⚠️ **The gap is silent by construction:** a one-shot backfill cannot catch what is written
after it, and an unstamped document behaves normally until someone tries to write or delete it.

> 📋 **2 items — 2/2 done — now in the work registry**
> as `R-0303`…`R-0304`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

✅ **Verified by testing the rules rather than reading them** — `@firebase/rules-unit-testing`
against the real `firestore.rules`, same admin deleting the same doc twice: **with
`mountainId` ALLOWED, without DENIED**. 💡 The same harness backs the existing
`tests/rules/users.rules.test.ts` (M5.2b, `npm run test:rules`) — and, since 2026-08-03,
`tests/rules/posts.rules.test.ts` for the §10n post rules (below).

---

## 10r. ✅ 급식현황 publishing is gated on a check-in confirmation (DONE 2026-08-05, `c515058`)

> **Owner:** _"let's gate the 급식현황 post with confirmation. Once the post is posted, the
> status of the feeding spots change and there's no way you can take it back. We should at
> least give the list of updated feeding spots and have the user confirm."_

🔑 **The irreversibility is real and asymmetric with the rest of the composer.** Publishing
writes `last_attended` / `last_attended_by` onto shared `feeding_spots` documents, and a spot
keeps only its **latest** visit — the previous stamp is overwritten, not versioned. So unlike
the post itself (which its author may edit, and since §10q delete), the check-in has **no**
correction path: `deletePost` never touches `feeding_spots`, and `NewPostForm` has hidden the
급식소 section on edits since §10n for exactly this reason. The dialog is the only correction
opportunity the flow has.

> 📋 **4 items — 4/4 done — now in the work registry**
> as `R-0305`…`R-0308`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

**Verified.** tsc · unit **133** (+11) · smoke **39** · e2e **229/13/0** (+1). Mutation-tested:
dropping the `checkedSpotIds` filter failed exactly the four cases that assert the listing.

📌 **Not done, deliberately out of scope:** the 급식소 write is still non-fatal
(`NewPostForm.tsx` logs and swallows — "the post is already created"). The dialog now _promises_
those spots will change, so a failed write leaves the author told the post succeeded with the
spots unstamped. Flagged to the owner; also collides with the repo's log-and-re-raise convention.

---

## 10s. ✅ Renaming a cat is a cascade, and there is a script for it (DONE 2026-08-05, APPLIED to prod)

> **Owner:** _"what happens when I change a cat's name? Will the cat modal and urls to the cat
> modal break?"_ → _"can you write a script to 'refactor' a cat name?"_

🔑 **A cat's identity is its document id.** `updateCat` patches in place, so `?cat=<id>` links
already pasted into KakaoTalk survive a rename untouched — the reason §10c C2 made that param
the id and not the name. **But four things store the name as a string, and editing the cat
updates none of them. All four fail silently.**

| Stored where                              | What a bare rename does                                                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `cat_images[].tags` / `cat_videos[].tags` | 사진첩/영상첩 come back **empty** — the albums query `array-contains cat.name`. Media is not deleted, just unreachable. |
| `[catmodal:이름]` in CMS text             | The link still renders and still looks clickable; clicking it produces a `console.warn` and nothing else.               |
| Other cats' prose                         | The same tokens sit in any cat's 작명 사유 / 특이사항 / 설명.                                                           |
| `cats.parents` / `cats.offspring`         | The modal's 엄마/애 rows keep naming a cat that no longer exists. Plain text, so nothing breaks — it just reads wrong.  |

> 📋 **5 items — 5/5 done — now in the work registry**
> as `R-0309`…`R-0313`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

⚠️⚠️ **The video half of the cascade does not stick, and this is not fixable here.**
`/api/refresh-video-metadata` overwrites `cat_videos.tags` from `snippet.tags` on every
📺 YouTube와 동기화 run — the route says `// YOUTUBE-SOURCED: tags (ALWAYS OVERWRITE)`. Writing
to YouTube needs the OAuth path the CMS owns, so the script instead **prints the affected
YouTube ids and the exact CMS step** (동영상 태깅 → 일괄 태그 저장, which writes through). A fix
that silently un-fixes itself would be worse than none.

🔑 **The lesson that generalises: fixtures only model the fields you already know matter.**
`parents`/`offspring` were missing from the first cut and **no test could have caught it** — the
emulator fixtures were written by the same person who missed the field. What found it was the
**owner dry-running the script against production** and querying a listed document that looked
wrong. It was in fact correct (`cats/엄마조로`'s description links to the renamed cat), but
checking it exposed `offspring: "아들조로"` sitting one field away. **Dry-run destructive tooling
on real data before trusting its coverage.**

✅ **APPLIED to production 2026-08-05** (owner): 아들조로 → 조로. Verified after the fact —
`cats/아들조로.name = "조로"`, `cats/엄마조로.offspring = "조로"`, `cats/깡패.adoption_info` token
repointed. ⚠️ **Two YouTube re-tags outstanding** (`HG-SA4gyVAE`, `XnIEN2chwww`).

📌 **On cat document ids, since this surfaced it.** All **32** legacy cat docs are keyed by name,
but `createCat` uses `addDoc`, so every cat added through the CMS already has a random id —
`id ≠ name` is the normal state going forward, not an inconsistency to repair. **Changing an id
is not possible**: Firestore ids are immutable, so it means create-copy-delete, which breaks
every `?cat=` link in circulation **silently** (the page renders with no modal open). Verified
across 8 collections that **nothing else in the database references a cat id**.

---

## 10s-bis. ✅ Migration scripts get an emulator-backed suite + a demo-only guard (DONE 2026-08-05, `de4efe2`)

A **third** emulator-backed test category, `tests/scripts/**`, run by `npm run test:scripts`
with its own CI job — mirroring `tests/rules/**` exactly, and excluded from the default
`npm test` for the same reason (that run must stay usable with no emulator and no JVM).

🔑 **The plumbing was mechanical; the real change was the script's credential path.**
`rename-cat.js` could only start from a real service-account key, so the harness had to be
pointed at the production project id by hand. CI is deliberately hermetic — the e2e job's
comment: _"a demo-\* Firebase project with fake keys means NO GitHub secrets are required"_ — so
the script now takes the credential-less emulator path `seed-emulators.mjs` already uses, **and
refuses to run unless the project is `demo-*`**.

📌 **The guard is the point, not a side effect.** It makes "the test cannot touch production" a
property the script enforces rather than a property of how it happens to be invoked. It runs the
other way too: every run prints `TARGET: PRODUCTION Firestore …` or `TARGET: … EMULATOR …`
first, because a stray `FIRESTORE_EMULATOR_HOST` in an operator's shell would otherwise send an
`APPLY` run to a throwaway database and report a tidy success.

⚠️ **Each case spawns the script as a child process** — it reads `APPLY` / `OLD_NAME` /
`NEW_NAME` at module load, so an imported copy could not vary them. `fileParallelism: false`,
since the cases reseed shared collections.

**Verified.** **23** cases. ✅ **Re-run with the service-account key moved aside and
`SERVICE_ACCOUNT_KEY` unset** — still green, which is the claim the CI job actually depends on.
Mutation-tested: neutering the `demo-*` check failed exactly the one case asserting it.
⚠️ **The CI job has never run on a runner** — it is a near-copy of the `rules` job, but the
first PR is its proof.

---

## 10t. ✅ A video's YouTube 설명 is taken verbatim, empty included (DONE 2026-08-05, `551049f`)

> **Owner:** _"there is a distinct video description input field. We need to take what's in that
> input field verbatim - empty if empty. […] I might have said something inconsistent with this
> in the past."_

They had, and the code recorded it. 공지사항/입양홍보 uploaded a video with
`item.description || message || '공지사항 동영상'`, so a blank 설명 silently published the **post
body** as the YouTube description.

> 📋 **3 items — 3/3 done — now in the work registry**
> as `R-0314`…`R-0316`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

📌 **집사톡 needed no change and never appeared in the diff.** The report named it and was
accurate — about **production**, which runs `main`, where the old shared hook still does
`description: message || config.youtubeDescriptionDefault`. `dev` has taken the 설명 verbatim
since the per-file refactor (§10d). 🔑 **A behaviour report is about the deployed artifact, not
the branch** — the §10n lesson arriving from the opposite direction: there the repo looked behind
and production was ahead; here the repo is ahead and production is behind.

📌 Photo descriptions in these forms were already verbatim; only the video path inherited.

**Verified.** tsc · unit **189** · lint · full e2e **229/13/0**, unchanged. ⚠️ **The upload leg
has no automated cover** — `generate-signed-url` signs with a service-account key the harness
lacks, and YouTube upload is manual-parity (P5.4) — so what description actually reaches YouTube
is a **manual** check: upload a video to a 공지사항 with 설명 blank and confirm YouTube shows
none. 📌 **Existing videos keep their inherited descriptions**; 동기화 reads description _from_
YouTube, so correcting an old one means editing it there.

---

## 10u. 🎨 Colour has one source of truth; per-tenant theming is withdrawn (Phases 1–5 DONE 2026-08-08)

> **Owner:** _"I want to be able to control the colors in one place… a more natural place would
> be a file that controls design tokens."_ — and, on scope: _"tenants may not differ in color.
> every tenant use the same colors."_
>
> **Full plan, decisions and reasoning:**
> [`color-token-centralization-plan-20260805.md`](../docs/planning/pending/color-token-centralization-plan-20260805.md).
> Commits `165df61` · `223e3ef` · `b7fef42` · `ae363a1` · `f11c171` · `6618c8b`.

🔑 **The answer to the ask was "you already have it."** `design.md:9` designates
`tailwind.config.js` as the single source of truth for token values and `:292` explicitly
forbids duplicating them into "this file, a `tokens.json`, or component CSS". A new token file
would have been the exact artifact that doc exists to prevent — and Tailwind cannot read one
without a build step, so every colour would then live in two hand-synced files. **Nothing was
created; the existing file was adopted.**

🔑 **The survey found colour defined in six mechanisms, and that most apparent drift is
deliberate.** Of 1350 palette utilities, **1068 are neutrals** `design.md:65` intentionally does
not alias and **207 are status colours**. Of the 75 yellow/amber/orange, only **~30 are brand**.
⚠️ **A blanket migration would have shipped two defects**: warning notices adopting the brand
hue (`design.md:75`: warning is _"distinct from brand"_) and a Kakao button that stops being
Kakao yellow. **The classification was the work; the renaming was mechanical.**

⚠️ **Mechanism 6 is the one to remember: colour computed at runtime.** The 급식현황 ramp was
`rgb()` arithmetic inline in a component — invisible to a grep for hex literals _and_ to a grep
for `text-*` utilities, which is why the first survey missed it entirely. **Any future colour
audit must also grep `rgb(`, `hsl(`, and inline `style={{ color`.**

### What shipped

> 📋 **8 items — 7/8 done — now in the work registry**
> as `R-0317`…`R-0324`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

**Gates:** `tsc` 0 · unit **196** · smoke **39** · **full e2e 233 passed / 13 skipped / 0
failed** · `next build` green. ✅ **Both nets proven to have teeth** — inverting the ramp made
the unit hue test _and_ the e2e colour assertion fail while hue-agnostic tests stayed green.

### Phase 4 — hygiene — ✅ DONE 2026-08-06

### Phase 5 — the admin CMS measured against `design.md` — ✅ DONE 2026-08-08 (`df132d0`)

The audit **inverted its own premise**: spacing, elevation and language were already clean, and
the real gaps were **absences in `design.md`**, which was written landing-first and had no admin
tier. 🔑 **Check the thing you are conforming to before conforming to it.** Full account, including
the three places the obvious fix was wrong, is in `R-0050`.

### Open

⏳ **One item — `R-0324`.** The `/admin/*` screens have still never been seen rendered in a
browser; they are auth-gated and no session here has had credentials.

📌 **Naming trap in the plan doc:** it numbers **§4/§5** (analysis) _and_ **Phase 4/Phase 5**
(work). Say "Phase N" when you mean work.

---

## 11. 🔴 Functional gaps — broken / missing nav destinations

> **Functional, not design** (flagged by the user). The nav menu links to
> destinations that 404 or aren't confirmed working — a visitor who clicks hits a
> dead end or a form that may do nothing. Tracked here as functionality, separate
> from the Phase C design restyle. Both also surface in the redesign tasks doc, but
> the _functional_ fix is the point here.

> 📋 **2 items — 2/2 done — now in the work registry**
> as `R-0325`…`R-0326`. See
> [`work_tracking/registry.md`](./registry.md); each links to its full
> text in `work_tracking/records/`.

#### 2026-08-06 — the sending account changed, and the silence around it was closed

The outgoing address moved to a new Gmail account. ✅ **Done and verified live:** the owner
confirmed the **From header** on a real submission from the deployed app.

🔑 **It failed twice first, and both failures were silent by construction.** (1) The App
Password was rejected — `535-5.7.8` — so two real submissions recorded a contact, told the
visitor it sent, and sent nothing. (2) Regenerating the password moved `SMTP_USER` and left
`SMTP_FROM` on the old address; ⚠️ **Gmail silently rewrites a From it does not own**, so that
would have "worked" while ignoring the header. **Re-check `SMTP_FROM == SMTP_USER` after any
change to either.**

- 🆕 **`npm run smtp:verify`** (`scripts/maintenance/smtp-verify.js`) mirrors
  `sendNotification()` and authenticates **without sending mail** — safe against production
  credentials. It warns on the `SMTP_FROM != SMTP_USER` rewrite trap (which is how fault 2 was
  caught before shipping), on whitespace, and on a `#` in the value. 📌 **That last one is
  real:** dotenv strips an inline `# comment`, the **Vercel dashboard stores values verbatim**,
  so the same line authenticates as the whole string once pasted there.
- 🆕 **`emailDelivered` is surfaced** (was computed and consumed by nobody). The **visitor**
  gets expectation-setting on the non-error styling; the **operator** gets a persisted
  `notified` flag rendered as an **⚠️ 미전송** badge in the admin 동참 table. `undefined` stays
  distinct as _unknown_ — pre-existing records are not painted as failures. ⚠️ The visitor copy
  must never invite a resubmit: the contact is already recorded, so a retry duplicates it.
- 🔴 **A harness defect surfaced with it: the e2e suite had been sending REAL email to the
  production `adminEmail`, two per run.** `next start` runs Next's own env loader, which
  backfills any key `.env.test` leaves **undefined** from `.env` on disk. `.env.test` now
  declares the five SMTP keys **empty** — defined-but-blank beats the backfill.
  ⚠️ **Blank is load-bearing.** 📌 **Generalises: any secret in `.env` that `.env.test` does not
  explicitly blank is reachable from the harness** — the demo-project guarantee covers Firebase
  only. Full write-up in [`log/DEBUG_LOG.md`](../log/DEBUG_LOG.md).
- ✅ **Doc hygiene done in the same session.** The **Gmail App Password procedure moved** from
  `vercel-terraform-walkthrough.md` §8 into
  [`docs/manuals/deployment/README.md`](../docs/manuals/deployment/README.md), beside the env vars
  it configures, with §8 left as a pointer. 🔑 **It had been the only live, routinely-needed
  instruction inside a document whose own banner says it is not the current process.** The
  README copy adds the `smtp:verify` pre-check and the four traps that have bitten.
- 🔴 **The `.env.example` half was filed wrong, and the real defect was bigger.** The to-do read
  "still hardcodes the old address" — but **the file was never in the repo**: `.gitignore`'s
  broad `.env*` swallowed it (only `.env.test` had a negation). So it exposed nothing, while
  **`CLAUDE.md` pointed readers at it** and that link **resolved to nothing in a fresh clone**.
  Fixed both halves — placeholder address, and `!.env.example` added so the template ships.
  ⚠️ **It must stay secret-free** (all populated values are `NEXT_PUBLIC_*` or OAuth **client
  ids**; every secret field is empty); `.env` / `.env.local` / `.env.production` verified still
  ignored. 🔑 **Same lesson as the 2026-08-02 plan audit: a to-do is a claim about the repo, and
  claims rot** — acting on this one as written would have fixed a leak that did not exist and
  left the broken link.

---

## 12. Open decisions / sequencing

- ✅ **SETTLED (2026-08-08) — the work-tracking storage medium.** A single **append-only
  `registry.ndjson`** is the source of truth; **SQLite is built in memory on every script run**
  and never written to disk or committed. Decided after ten tests, recorded with the rejected
  alternatives in
  [`work-tracking-restructure-20260808.md`](./work-tracking-restructure-20260808.md) §4.
  🔑 The deciding evidence: merging two branches' `.db` yields a **valid file with one branch's
  rows silently gone**, and the checkout workflow cannot prevent it because the conflict is
  below where that workflow operates. Execution sequence:
  [`work-tracking-migration-plan-20260808.md`](./work-tracking-migration-plan-20260808.md);
  live progress: [`MIGRATION_JOB.md`](./MIGRATION_JOB.md).
- ⚠️ **NOT a decision, but the correction that keeps getting re-asked (2026-08-08): the
  path-based tenancy migration has NOT started.** It looks done from two directions — M1–M8
  multi-tenant hardening **is** live (PR #8, PR #9), and `src/app/[mountain]/` **is** a full
  route tree. But that segment is a **rewrite target, not a URL**: `src/middleware.ts` resolves
  the tenant from the **Host** header and `NextResponse.rewrite()`s onto it with the browser URL
  unchanged; the `/{id}` path works only as a dev/preview fallback. **The plumbing is in place;
  the selector is still the hostname.** Verified against the code: no `useTenantPath` module,
  **zero** `X-Mountain-Id` occurrences repo-wide, `getRequestMountainId` still one Host-only line
  (`src/lib/tenant.ts:62`), **65 un-prefixed navigation sites across 21 files**, and middleware
  that rewrites rather than redirects. ▶️ **T0 is next and unstarted** — see §9's row and
  [the plan](../docs/planning/pending/tenancy-path-migration-plan-20260728.md).
- **✅ SETTLED (owner, 2026-07-03): finalize the shared surface on desktop before the
  §4 mobile pass.** Rationale: shared code paths (markup, brand tokens, shared primitives,
  copy) render identically on both surfaces, so anything un-finalized there gets restyled by
  the mobile pass **and** rewritten by the desktop work → double work. Pure responsive-
  breakpoint tuning is inherently per-surface and correctly belongs to §4. **The
  finalize-before-mobile set (do first):**
  1. **✅ Phase C — 집사메뉴 / butler restyle** — DONE 2026-07-03. All components
     brand-clean; cross-cutting `globals.css` dead `.btn` block removed; nav blue hovers
     fixed. Auth-gated verifications (list/pagination, "새글 작성" button while signed in)
     still owed and carried in §4 sign-in-gated mobile audit.
  2. **✅ Cross-cutting button/color convergence** — DONE 2026-07-10. globals.css `.btn` block
     and nav hovers done (see #1); the **public + auth hand-rolled-button sweep → shared
     `<Button>` primitive** shipped (`256bc53`, FEATURE_MOD_LOG): announcements-detail, contact
     submit, announcement/cat-selector modals, email/phone login submits, 4 auth modals; stray
     non-brand accents normalized to brand tokens. Grep-clean of hand-rolled gradient `<button>`s
     in public/auth code (only 2 intentional `<Link>` CTAs remain).
  - _Deferred to §4 (genuinely per-surface, no double-work):_ map re-fit on mobile, modal/
    album/form mobile sizing, mobile nav drawer.
  - _Deferred, non-UI (render-invariant):_ structured logging, request validation, RBAC
    drift, Tier-1 Admin-SDK migration, upload-on-edit util. _Judgment calls (shared but not
    redesign):_ branded error-states (§7), link-token rendering in 공지/급식/집사톡.
- **Priority order** among Mobile UX (§4), Admin desktop cleanup (§5), Admin
  mobile (§6), cross-cutting button sweep (§12.2), and A4 — **to be set with the user.**
  Note the dependency: §6 (admin mobile) is best built **after** §5 (admin
  cleanup) so it's not built twice.
- **Admin visual target** — ✅ **SETTLED (owner, 2026-06-30): admin adopts the public
  brand.** The "deliberately utilitarian" option is retired; admin re-skins to the brand as
  part of the cross-cutting design system (handoff-16 §4).
- ✅ **RESOLVED 2026-08-02 — the hydration mismatch that wiped typed input.** `AuthProvider`
  seeded `useState` from `auth.currentUser`, a **browser-only** value read **during render**;
  the server always has `null`, so the header disagreed and React discarded the server DOM to
  re-render the root — remounting everything and **erasing text the visitor had already
  typed**. Now seeded from `null` / `loading: true`, with `onAuthStateChanged` delivering the
  user as an ordinary post-hydration update.
  🔑 **The general rule this leaves behind:** nothing the server could not have known
  (`localStorage`, `window.*`, `Date.now()`, `Math.random()`, a restored auth session) may
  affect the **first** client render. Read it in `useEffect`, which runs after the handshake.
  💡 Accepted cost: one tick of logged-out header on a full page load.
  Detail: `log/DEBUG_LOG.md` 2026-08-02.
- **Firestore transport if live listeners are ever added (2026-08-01).** §10f F3 forced the
  browser onto long polling, which is free **only** because the app has zero `onSnapshot`
  listeners. The natural candidates if that changes: replies appearing without a reload,
  new 동참 submissions in the admin, a shared tagging queue two admins work at once, and a
  "changed elsewhere" warning on concurrent edits. ⚠️ Listeners also bill per document read
  **per change**, and the service layer returns plain promises — a listener needs a
  subscribe/unsubscribe shape, so it is a real change to that layer. At that point revisit the
  alternative that was set aside: keep the probe but cap its wait (`experimentalLongPolling
Options.timeoutSeconds`, min 5) instead of skipping it.
- **Mobile verification tooling** — real device vs un-maximized Chrome vs DevTools
  (the `resize_window` tool was flaky).
- Whether the §7–§10 debt workstreams are scheduled now or parked until the
  user-facing work lands.

---

## 13. How to resume

1. Read [`docs/handoff/HANDOFF.md`](./HANDOFF.md) — the **single, continuously-updated**
   hand-off, and the entry point. Start with its 🔜 box, which carries current state, the
   findings worth knowing before touching anything, and the ordered next steps.
   _(Corrected 2026-08-02: this used to point at the archived `handoff-27` from 2026-07-10. The
   numbered `handoff-NN` files are **frozen history** for the detail behind a given session; the
   living doc supersedes them as the place to start.)_
2. With the user, pick the next workstream from §1 and fill in its section's
   concrete specs.
3. Spin a companion `docs/planning/pending/<workstream>-tasks.md` (mirror the
   redesign tasks doc's rigor); move it to `docs/planning/completed/` when done.
4. Implement in small, browser-verified chunks; keep `tsc` clean; update the §1
   snapshot and `design.md` as you go.

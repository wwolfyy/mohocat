# Subdomain → path-based tenancy — execution plan — 20260728

> **Status:** ▶️ **DECIDED and UNBLOCKED (2026-08-07) — still not started.** The owner chose
> **path-based** on 2026-07-28 and answered the one question that could have reversed it (§4.2 of
> the decision doc): a second mountain's owner does **not** need their own hostname.
>
> 🆕 **Both gates that held this are now clear** — the P5.4 manual YouTube pass passed
> 2026-08-07, and the `dev → main` promotion landed the same day (PR #9, `f570bcc`). Nothing
> sequenced ahead of it remains, so this is the next large workstream whenever it is picked up.
>
> ⚠️ **Start at T2, and read why before scheduling anything else.** Every `/api/*` route resolves
> the tenant from the **Host header**, so path-based tenancy resolves every API call to geyang —
> including `requireApiPermission`. That is an **authorization inversion** (a geyang-only admin
> allowed on manisan; a manisan-only admin denied on their own mountain), not a cosmetic routing
> bug, and it is why T2 is sequenced first rather than with the other plumbing.
>
> **Decision record:** [`tenancy-url-model-decision-20260728.md`](./tenancy-url-model-decision-20260728.md)
> — the _why_. This doc is the _how_, and follows the phase shape its §7 sketched.
>
> **Companion docs this will rewrite on completion:**
> [`mountain-2-prerequisites.md`](./mountain-2-prerequisites.md) (§1.1, §1.5, §1.6, most of §2,
> §4's re-login won't-fix) · [`adding-a-mountain.md`](../../manuals/admin-manual/adding-a-mountain.md) ·
> [`new-mountain-setup.md`](../../manuals/deployment/new-mountain-setup.md) ·
> [`multi-mountain-refactor-plan-20260719.md`](../completed/multi-mountain-refactor-plan-20260719.md) §0.

---

## 1. What is being built

A mountain is identified by a **path prefix**, not a hostname:

| Tenant                            | URL today (design)             | URL after                  |
| --------------------------------- | ------------------------------ | -------------------------- |
| geyang (**default**)              | `mohocats.org` (apex fallback) | `mohocats.org` — unchanged |
| manisan, and every mountain after | `manisan.mohocats.org`         | `mohocats.org/manisan`     |

🔑 **The asymmetry is the risk control.** The default tenant keeps **prefix-free** URLs, served
by the existing host-rewrite middleware. Every URL, bookmark, and SEO signal geyang has today
survives untouched, and **geyang cannot regress while the sweep is in progress** — which is
what lets this land incrementally instead of as a cutover.

**The host-rewrite middleware stays** (decision §10). Nothing about this is a one-way door: a
future tenant that genuinely needs its own hostname can be given one as a deliberate opt-in,
accepting the decision doc's §2 costs for that tenant alone. Keeping `domains` in
`mountains.json` is what preserves that, and it costs nothing.

**What does not change:** one Vercel project, one build, one Firebase project, one Firestore
with `mountainId` on every content doc, the `[mountain]` route segment, `firestore.rules`, the
role model, GA4, storage prefixes. Only **how the tenant is named in a URL** changes.

---

## 2. The measured surface

Re-measured against the tree at `d129b9e` (the decision doc measured only the first block).

### 2.1 In-app navigation — 83 sites / 29 files

| Kind                                    | Count  |
| --------------------------------------- | ------ |
| Root-absolute `href` (`Link` and `<a>`) | 56     |
| `router.push` / `router.replace`        | 24     |
| `window.location.href/replace/assign`   | 3      |
| **Total**                               | **83** |

Concentration (the sweep is not evenly spread — the top 3 files are 45% of it):

```
Navigation.tsx                    23
app/[mountain]/admin/layout.tsx    8
AdminPostList.tsx                  6
SignupForm / PostList / EditPostForm / AnnouncementClient   3 each
…22 further files at 1–2 each
```

### 2.2 🚨 API tenant resolution — 6 routes + the shared gate, 27 fetch sites / 11 files

**This is the part the decision doc did not price, and it is the one that matters.**

Every `/api/*` route resolves the tenant from the **Host header**
(`getRequestMountainId` → `getMountainIdForHost`), because `/api` is excluded from the
middleware matcher and there is no tenant in an API URL. Under path-based tenancy **every
request carries the same Host**, so every API call would resolve to the **default tenant**:

- `src/app/api/points/route.ts` and `api/admin/cats/route.ts` — a manisan admin's reads and
  writes land on **geyang** data.
- `src/app/api/contact/route.ts` — a 동참 submission from `/manisan` is stamped
  `mountainId: 'geyang'`.
- `src/app/api/upload-youtube/route.ts`, `api/refresh-video-metadata/route.ts` — per-mountain
  playlist filing and channel config resolve to the wrong mountain.
- `src/lib/auth/requireApiPermission.ts` — **the authorization break**: it checks
  `roles[requestMountainId]`, so it would grant on `roles['geyang']` regardless of which
  mountain the caller is acting on. A geyang-only admin would be allowed on manisan's
  surfaces, and a manisan-only admin denied on their own.

So the tenant must travel **on the request** instead of in the hostname. Shape (§3.T2): a
validated `X-Mountain-Id` header, host as the fallback. This is not a weakening — the header
only _selects_ which mountain is being acted on; `requireApiPermission` still checks that the
caller actually holds the permission **on that mountain**, so forging it grants nothing you
did not already have. (Host is equally client-controlled today; the trust model is unchanged.)

### 2.3 `usePathname()` comparisons — 4 files

`usePathname()` returns the **browser** path. For the default tenant that stays prefix-free
(rewrite), but on `/manisan/...` it includes the prefix — so every literal comparison breaks:

- `app/[mountain]/admin/layout.tsx` — `getNavItemClasses('/admin')` active state
- `components/Navigation.tsx` — active-nav highlighting
- `components/auth/NavigationBarLogin.tsx` — redirect-back-after-login target
- `components/AnalyticsTracker.tsx` — the `page_path` sent to GA4 (⚠️ do **not** strip here;
  GA4 should see the real URL, and `mountain_id` already segments it — verify, don't assume)

### 2.4 Not affected

`firestore.rules` · the role model · service-layer scoping · storage prefixes · GA4 ·
Kakao (Firebase OIDC via `signInWithPopup`; its redirect URI is Firebase's fixed handler,
constant across tenants — verified 2026-07-28) · `/api/revalidate` (already loops every
configured mountain's `[mountain]` paths).

---

## 3. Phases

Every phase gates on **`npx tsc --noEmit` + `npm run test:smoke` + `npm run test:unit`**, and
the phases that touch behavior additionally on the **full e2e suite**. Nothing is committed
without its gate green.

### T0 — Extend the net first (no source change)

The safety net already half-exists: `tests/e2e/public/tenant-isolation.spec.ts` **already
browses `/manisan/...` by path prefix** and asserts content isolation, so the target mode is
under test before the work starts. What it does **not** cover is the thing the sweep breaks:
**navigating** within a non-default tenant.

- **T0.1** Add a navigation-retention spec: from `/manisan`, click through 헤더 nav (냥이들 /
  사진첩 / 공지사항 / FAQ), the footer (개인정보처리방침), and the logo — assert the URL keeps
  the `/manisan` prefix and the rendered content stays manisan's. This **must fail** on the
  current tree for the right reason; a spec that passes before the sweep is not a net.
- **T0.2** Add an admin-side counterpart: `/manisan/admin` sidebar navigation + active-state.
- **T0.3** Record the pre-sweep full-e2e baseline (expected: 153 passed / 13 skipped / 0
  failed at `97b72ed`; re-run to confirm at `d129b9e`).

_Gate: full e2e, with T0.1/T0.2 expected-failing and marked as such._

### T1 — The tenant path helper (no call sites migrated)

`src/lib/tenant-path.ts` — pure, unit-testable, no Next imports:

- `tenantPath(mountainId, path)` → `path` when `mountainId` is the default tenant, else
  `/{mountainId}{path}`. Handles `'/'` → `'/'` vs `/{id}`, query strings, and already-prefixed
  input (idempotent).
- `stripTenantPrefix(pathname)` → `{ mountainId | null, path }` for the §2.3 comparisons.

Client ergonomics: `useTenantPath()` in `MountainProvider.tsx` (reads `useMountain()`, returns
a bound `tenantPath`). Server components take `mountainId` from `params.mountain` and call the
pure function — no hook, no new provider.

**Decision to make here, not later:** a `<TenantLink>` wrapper over `next/link` vs calling the
helper at each `href`. Recommendation: **the helper, not a wrapper** — a wrapper is one more
component to remember to use and is invisible when someone forgets, whereas a bare `href="/…"`
is greppable and can be lint-enforced (T5.3).

- **T1.1** Write the module + unit tests (default tenant, non-default, root, query, idempotence).
- **T1.2** Wire `useTenantPath()`; no consumers yet.

_Zero behavior change. Gate: tsc + unit + smoke._

### T2 — The API tenant channel (§2.2 — do this before the link sweep)

- **T2.1** `getRequestMountainId(request)` resolves **header-first**: read `X-Mountain-Id`,
  validate with `resolveMountainIdOrNull`, **400 on an unknown value** (never silently fall
  back — a bad claim must fail loud, not write to the default tenant), then fall back to Host
  for callers that send no header (keeps the subdomain opt-in and every existing test honest).
- **T2.2** Client side: extend `src/lib/auth/authHeader.ts`'s sibling — a `tenantHeader(mountainId)`
  helper, or fold it into a small `tenantFetch` wrapper. Sweep the **27 fetch sites across 11
  files** (heaviest: `admin/tag-videos/useYouTubeVideoMutations.ts` and `tag-videos/page.tsx`).
- **T2.3** Unit tests pinning the precedence (header > host > default) and the 400-on-unknown.
- **T2.4** Rewrite `tests/e2e/api/tenant-isolation.spec.ts` onto the header, **keeping one
  host-based case** so the opt-in subdomain path stays proven. Its authz assertions (b)/(c) —
  single-mountain admin denied cross-tenant, dual admin allowed on both — are exactly the
  regression net for the §2.2 authorization break and must stay green throughout.

_Gate: tsc + unit + smoke + full e2e._

### T3 — The link sweep (83 sites / 29 files)

Batched by surface so each batch is independently verifiable, largest first:

- **T3.1** Chrome — `Navigation.tsx` (23), `Footer.tsx`, `[mountain]/layout.tsx` logo link.
- **T3.2** `MountainSelector.tsx` — drops the `findMountainIdByHost` branch entirely: select →
  `tenantPath(id, '/')`. (This also deletes the decision doc's §2.5 provisioning-order trap.)
- **T3.3** Admin — `admin/layout.tsx` (8), `admin/page.tsx`, `AdminPostList.tsx` (6),
  `AdminAuth.tsx`.
- **T3.4** Public pages — adoption, faq, contact, announcements, mypage.
- **T3.5** Auth flows — `LoginForm`, `SignupForm`, `NavigationBarLogin/Logout`,
  `login/page.tsx`, and the 3 `window.location` sites.
- **T3.6** Content forms + client lists — `useSimpleContentForm`, `useRichContentForm`,
  `NewPostForm`, `EditPostForm`, `PostList`, `AnnouncementClient`, `ButlerStreamClient`,
  `ButlerTalkClient`, `useDialog`.

_Gate after each batch: tsc + smoke. Full e2e at the end of T3._

### T4 — `usePathname()` comparisons (§2.3)

Route the 3 comparison sites through `stripTenantPrefix`. **`AnalyticsTracker` is a deliberate
decision, not a mechanical fix** — settle whether GA4 should see `/manisan/pages/cats` (the real
URL, with `mountain_id` as the segmenting dimension) or the stripped path, and write the answer
into the code as a comment. Recommendation: **leave it unstripped**; `mountain_id` is already a
default parameter on every event (2026-07-26), so stripping would only destroy information.

_Gate: tsc + smoke + full e2e. **T0.1/T0.2 must now pass** — that is the phase's real gate._

### T5 — Canonicalize the default tenant

Without this, geyang has **two** live URL forms (`/pages/cats` and `/geyang/pages/cats`) — a
duplicate-content split and two code paths for one tenant.

- **T5.1** Middleware: **308-redirect** `/{defaultMountainId}/*` → `/*`. One canonical form per
  page, permanently.
- **T5.2** Confirm `generateStaticParams` + ISR still key correctly per tenant after the
  redirect (the default tenant's cache entries live under `/{id}/…` internally — the redirect
  is on the _incoming_ URL, and must not fight the rewrite).
- **T5.3** Optional guard: an ESLint rule (or a `test:smoke` structural check, which this repo
  already leans on) that fails on a bare root-absolute `href="/…"` in `src/components` and
  `src/app/[mountain]`. This is what stops the sweep from silently un-doing itself over the
  next six months.

_Gate: tsc + smoke + full e2e._

### T6 — Prove it in a browser (not just in CI)

Per the standing rule that UI work is not done on a green suite alone:

- **T6.1** `npm run dev`, `/chrome` pass over **both** tenants: `/` (geyang, prefix-free) and
  `/manisan`. Click every nav item, the footer, the logo, the mountain selector, login/logout,
  and a form submit — the prefix must survive every one, and geyang must look exactly as it
  does today.
- **T6.2** Admin pass on `/manisan/admin` — sidebar navigation, active state, and one gated
  API call (proving T2 end to end, which is the piece CI covers least convincingly).
- **T6.3** Temporarily un-hide `manisan` (`hidden: false`) to exercise the real selector flow,
  then restore `hidden: true` before commit.

### T7 — Docs close-out

- **T7.1** `mountain-2-prerequisites.md` — delete/rewrite §1.1 (the 🚨 security defect is gone
  structurally, **not** fixed by code — say so explicitly), §1.5, §1.6, most of §2; §4's
  re-login won't-fix becomes moot. Keep §1.2 `syncVideos`, §1.3 the playlist back-fill, §1.4
  the roster leak, §3.1 the CMS mountain label — **path-based fixes none of those** (decision §9).
- **T7.2** `adding-a-mountain.md` → roughly two steps: config entry, first admin.
- **T7.3** `new-mountain-setup.md` — drop DNS / Vercel domain / authorized-domain steps.
- **T7.4** `multi-mountain-refactor-plan-20260719.md` §0 — Q2 and the host-selection half of Q3
  superseded; sub-decision 1 ("cross-subdomain session: accepted limitation") retired.
- **T7.5** Decision doc status → ✅ **EXECUTED**; `CLAUDE.md`/`AGENTS.md` tenancy paragraph;
  `docs/codebase/multi-tenant.md`.
- **T7.6** `log/FEATURE_MOD_LOG.md` entry + HANDOFF section and changelog.

---

## 4. Task checklist

```
[ ] T0.1  e2e: navigation retention on /manisan (public)      — must FAIL first
[ ] T0.2  e2e: navigation retention on /manisan/admin         — must FAIL first
[ ] T0.3  record the pre-sweep full-e2e baseline
[ ] T1.1  src/lib/tenant-path.ts + unit tests
[ ] T1.2  useTenantPath() in MountainProvider
[ ] T2.1  getRequestMountainId → header-first, 400 on unknown
[ ] T2.2  client tenant header + sweep 27 fetch sites / 11 files
[ ] T2.3  unit tests: header > host > default, 400 on unknown
[ ] T2.4  rewrite api/tenant-isolation.spec.ts (keep one host case)
[ ] T3.1  sweep: chrome (Navigation 23, Footer, layout)
[ ] T3.2  sweep: MountainSelector — drop the host branch
[ ] T3.3  sweep: admin (layout 8, page, AdminPostList 6, AdminAuth)
[ ] T3.4  sweep: public pages
[ ] T3.5  sweep: auth flows + the 3 window.location sites
[ ] T3.6  sweep: content forms + client lists
[ ] T4.1  stripTenantPrefix at the 3 comparison sites
[ ] T4.2  AnalyticsTracker — decide + document (recommend: unstripped)
[ ] T5.1  middleware: 308 /{default}/* → /*
[ ] T5.2  verify ISR/generateStaticParams under the redirect
[ ] T5.3  lint/smoke guard against bare root-absolute hrefs
[ ] T6.1  browser pass — both tenants, public
[ ] T6.2  browser pass — /manisan/admin + one gated API call
[ ] T6.3  selector flow with manisan temporarily un-hidden
[ ] T7.1  rewrite mountain-2-prerequisites.md
[ ] T7.2  rewrite adding-a-mountain.md
[ ] T7.3  rewrite new-mountain-setup.md
[ ] T7.4  supersede multi-mountain plan §0 Q2/Q3
[ ] T7.5  decision doc → EXECUTED; CLAUDE.md; codebase docs
[ ] T7.6  FEATURE_MOD_LOG + HANDOFF
```

---

## 5. Risks

| Risk                                                                                                                                    | Control                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **The API tenant break (§2.2) is silent** — wrong-tenant reads look like empty pages, and the authz inversion looks like nothing at all | T2 lands **before** the link sweep; the existing isolation spec's authz cases are the net, and they already exist and pass                             |
| A missed link site escapes the tenant, invisibly                                                                                        | The default tenant is prefix-free, so **geyang cannot regress at all** — only non-default tenants can, and T0.1/T0.2 catch that; T5.3 stops recurrence |
| `usePathname` breakage is cosmetic-looking but hits the login redirect-back                                                             | T4 is its own phase with its own gate; T6.1 clicks the flow                                                                                            |
| The 308 (T5.1) fights the rewrite, or breaks ISR keys                                                                                   | T5.2 verifies explicitly; the redirect is on the incoming URL only                                                                                     |
| Sweep churn collides with the pending **P5.4 manual YouTube pass**                                                                      | T2.2 touches `tag-videos` heavily. ⚠️ **Sequencing question for the owner — §7.**                                                                      |

---

## 6. What this does not fix

Unchanged by this work, and still on the mountain-#2 gate (decision §9): `syncVideos()`
claiming the whole shared YouTube channel (prereq §1.2) · the 계양산 playlist back-fill
(§1.3, owner chore) · the **members roster returning every mountain's users** (§1.4 — a real
data leak, orthogonal to URLs) · the CMS never naming the mountain being edited (§3.1) · the
admin `brand` ramp still geyang-yellow (§3.2).

`revokeRefreshTokens` on sign-out is **demoted from prerequisite to optional hardening** — with
one origin the defect is structurally gone; revocation would now only buy multi-device sign-out.

---

## 7. Sequencing — DECIDED: promotion first (owner, 2026-07-28)

This work and the pending **P5.4 manual YouTube pass** both want `/admin/tag-videos` to hold
still, so they do not overlap:

1. Owner runs the **P5.4 manual YouTube pass** on Preview (it re-runs from the top — the
   credential source, the scopes, and four write paths changed under it).
2. **`dev → main` promotion** — M6/M7/M8 + the GA4 guide + the 2026-07-26/27/28 sessions.
3. **Then T0 of this plan starts** on a freshly-promoted `dev`.

Rejected: _migration first_ (a failure in the pass would be hard to localize between two
unrelated changes) and _in parallel_ (T2.2 would rewrite the `tag-videos` fetch sites underneath
the pass).

🔑 **Do not start T0 before the promotion lands.** `dev` already leads `main` by 258 commits;
adding an 83-site sweep to that backlog before it drains is the thing this ordering exists to
prevent.

# Multi-Tenant Architecture — Decision Framework — 20260718

> Decision framework for onboarding a **second mountain** (e.g. `manisan`) alongside
> `geyang`. Every "current state" claim in §1 was grep-/read-verified against the actual
> files on branch `dev` — not inferred from docs. Estimates in §4–§5 are judgment, and
> are labelled as such.
>
> **Companion inventories** (2026-06-30 snapshots; verified still-relevant 2026-07-18):
> [`firebase-sdk-usage-inventory.md`](./firebase-sdk-usage-inventory.md) (every **write**
> path by SDK + the decided Tier 1/Tier 2 migration verdicts) and
> [`firebase-read-access-inventory.md`](./firebase-read-access-inventory.md) (every **read**
> path + its rules coverage). Under option B1 (§5) these are effectively the pre-built
> work-item list for tenant-scoping enforcement.
>
> **Status:** 📋 **decision framework — no code changed, nothing recommended as final.**
> §1–§2 establish facts and requirements; §3 is the gating question; §4–§7 lay out the
> open axes; §8 lists work required under every option; §9 collects the questions to
> resolve. §10 is a task checklist that stays blocked until §9 is answered.
>
> **Origin:** Started as "should we replace Firebase with Supabase to escape vendor
> lock-in?" That question was **set aside** (see §0) once it became clear the blocker is
> not the vendor but the absence of a tenancy dimension in the app.

**Legend:** `[ ]` todo · `[x]` done · ⚠️ watch-out · ❓ open question

---

## 0. Why the Supabase question was set aside

The investigation that produced this doc began as a Firebase → Supabase migration
assessment. Three findings redirected it:

1. **The hardest part of a Firebase exit doesn't apply here.** There are **zero
   `onSnapshot` listeners** in `src/`. Read patterns are ISR server reads plus simple
   filtered queries (`where` / `orderBy` / `limit`, 5 `writeBatch`, 1 `increment`). The
   realtime-sync problem that makes Firestore migrations painful is absent.
2. **Supabase costs $25/mo per project minimum** (free tier pauses after ~7 days idle).
   Under a project-per-mountain model that is a per-tenant floor, where Firebase's Spark
   tier would plausibly be $0 for a small mountain.
3. **Nothing about a second mountain is blocked by Firebase.** Everything in §8 is
   vendor-independent work that must happen regardless.

Vendor lock-in remains real and unsolved. It is deferred, not resolved. Revisit if a
concrete trigger fires: cost pressure, a query the document model can't serve, or a
decision that per-mountain data custody must be transferable to its owner (§3).

---

## 1. Verified current state

### 1.1 One app _instance_ — but three init _modules_

Three modules call `initializeApp`, all resolving config from `getFirebaseConfig()`
(`src/utils/config.ts:230` → `config.secrets?.firebase` — a **per-mountain** value):

| Module                         | SDK    | Notes                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/services/firebase.ts:38`  | Client | The main init — **auth, Firestore, Storage, and Analytics all derive from this one app** (lines 39–89)                                                                                                                                                                                                                                    |
| `src/lib/firebase.ts:17`       | Client | ⚠️ A **parallel** client init with its own `db`/`storage` exports and factory-bypassing data functions. One live consumer: `useAboutPhoto.ts:39` (`getStorageUrl`). Its `getPoints`/`getCatsByPointId` have **no callers** and query `where('pointId'…)` — a field cats don't have (`dwelling`/`prev_dwelling`) — dead and wrong. See §8. |
| `src/lib/firebase-admin.ts:15` | Admin  | Server-only init for API routes / server reads                                                                                                                                                                                                                                                                                            |

At runtime a single app instance wins, because each module guards with
`getApps().length` and reuses `getApps()[0]` if any app exists.

⚠️ Consequence 1: auth currently lives in the _same_ project as content data. Any change
to which project the app points at moves auth, data, storage, **and analytics together**.

⚠️ Consequence 2: the `getApps()[0]` reuse guard is exactly the pattern that breaks
under a two-project split (central auth + per-mountain data). With multiple projects,
"return whichever app initialized first" **silently binds a module to the wrong
project**. The §6 identity split is therefore not "split one `initializeApp`" — it is
"impose named-app discipline across all three init modules (client _and_ Admin), one of
which (§8) shouldn't exist at all."

### 1.2 Central auth is declared but not implemented

`config/mountains/mountains.json` → `_meta.centralUserService` names project
`mountain-cats-users` and claims it handles `authentication`, `user-management`, and
`cross-mountain-access`.

**Nothing reads it.** It is configuration with no consumer. Central auth is net-new work,
not an existing property to preserve.

### 1.3 The permission model _is_ tenant-aware; content is not

| Domain              | `mountainId` present? | Evidence                                                                                                                                                                                      |
| ------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roles / permissions | **Yes**               | `src/types/permissions.ts:22,51`; `permission-service.ts:134,290`; query at `permission-service.ts:293` — `where('currentRole.mountainId', '==', mountainId)`; role-change history records it |
| All content         | **No**                | No `mountainId` field on any content type; no content query filters by it                                                                                                                     |

Content `where` clauses across `src/` are: `tags`, `parentId`, `pointId`, `dwelling`,
`prev_dwelling`, `userId`, `youtubeId`, `storagePath`, `showInModal`, `name`, `id`.
None are tenant scoping.

⚠️ `role-assignment-service.ts:25` and `:116` default `mountainId = 'geyang'` — a
hard-coded tenant default in otherwise tenant-aware code.

### 1.4 The multi-tenant config layer is barely consumed

- `getCurrentMountainId()` — imported by **2 files**: `MountainSelector.tsx` (which
  PROJECT_PLAN §9 confirms is a **no-op** — it sets a query param nothing reads) and
  `useAboutPhoto.ts`.
- `getMountainConfig()` — **4 files**.

CLAUDE.md describes the codebase as "multi-tenant ready." The config system is real; its
consumption is close to nil.

### 1.5 Deployment is single-project, single-domain

No `vercel.json`. `docs/manuals/deployment/README.md` describes one Vercel project:
`main` → Production domain, `dev` → Preview ("staging"). One Firebase project, one
domain, `MOUNTAIN_ID=geyang`.

### 1.6 The provisioning guide is a stub, and its key sections are open questions

`docs/manuals/deployment/new-mountain-setup.md` is 116 lines, nearly all TODO:

- **§2 Tenancy model** — _"decide the tenancy model first… This section gates the others."_
- **§4 Domain** — _"Register / choose the domain (**or subdomain per mountain?**)"_
- **§5 Vercel** — _"whether it's a new Vercel project or the same project with a
  different env scope."_

⚠️ These read like prescriptions from their headings but are unanswered questions in
their bodies. This doc exists to answer §2, §4, and §5.

### 1.7 Analytics is one event, plus dead scaffolding

- **Live:** `AnalyticsTracker.tsx` logs a single `page_view` event via
  `firebase/analytics`, with `page_location` / `page_path` / `page_title`. **No mountain
  parameter.**
- **Dead:** an `analytics` Firestore collection is protected by `firestore.rules:166-171`
  and a `view-analytics` permission (`usePermissions.ts:61`, `lib/auth/admin.ts:109`) —
  but **nothing reads or writes that collection**, and no admin analytics UI exists.

### 1.8 Content collections that would need tenant scoping

From `config/firebase/firestore.rules`, excluding identity-domain collections (`users`,
`role_permissions`, `permission_logs`) and the dead `analytics`:

`about_content`, `admin_data`, `cat_images`, `cat_videos`, `cats`, `contacts`,
`feeding_spots`, `points`, `posts_adoption`, `posts_announcements`, `posts_butler`,
`posts_feeding` — **12 collections.**

---

## 2. Owner requirements (stated 2026-07-18)

1. **Central auth / user management** — one identity store across all mountains.
   Rationale: standing up Kakao OIDC, SMS, and OAuth consent per tenant is too much
   burden for a second mountain's owner.
2. **Localized content management** — each mountain's owner manages their own cats,
   feeding spots, media, posts.
3. **Central analytics with a separable per-mountain identifier** — one place to see
   visitors and clicks, broken down by mountain.

Stated preference: **not** separate registered domains. Mountain selection via a
drop-down on a shared domain, possibly subdomains (`manisan.mohocats.org`,
`geyangsan.mohocats.org`). Separate Vercel projects acceptable **if** the same codebase
can deploy per-mountain with isolated content and admin access.

⚠️ Note the tension to resolve in §9: subdomains **are** distinct hosts. "One domain,
different subdomains" and "no separate hosts" are not the same statement.

---

## 3. ❓ The gating question: management vs custody

Everything downstream branches on this, and it is a **business** question, not a
technical one.

> **Does the second mountain's owner need to _hold_ their data — their own billing,
> their own console, the ability to leave with it — or do they need to _manage content_
> through the admin CMS, scoped to their mountain?**

|                                        | **Custody**                            | **Management only**                         |
| -------------------------------------- | -------------------------------------- | ------------------------------------------- |
| Means                                  | Separate Firebase project per mountain | Shared project, RBAC + `mountainId` scoping |
| Data isolation                         | Free (different database)              | Enforced by rules + query scoping           |
| Who is PIPA controller                 | Each owner, for their users            | **You**, for everyone                       |
| Whose bill                             | Theirs                                 | **Yours**                                   |
| If you stop maintaining                | They continue independently            | They lose the platform                      |
| Fits requirement 1 (central auth)      | Awkward — needs two-backend split      | Natural                                     |
| Fits requirement 3 (central analytics) | Awkward — cross-property reporting     | Natural                                     |
| Existing RBAC reusable                 | Partly                                 | **Yes — §1.3 already models it**            |
| Rough effort                           | Large                                  | Moderate                                    |

**Observation:** requirements 1, 2, and 3 as written all point toward **management
only** — central infrastructure with per-mountain scoping. Requirement 2 says
_"management of cats, feeding spots, media… handled by them,"_ which the existing
`currentRole.mountainId` model already anticipates.

**Counter-consideration:** "the owner of that mountain may be different" was the original
motivation. If that owner is an independent party rather than a delegate, custody may
matter for reasons that have nothing to do with the code — liability, trust, continuity,
or their own wish to not depend on you.

_This question is not answered by this document. It should be answered before §4–§5._

---

## 4. Axis A — deployment topology

Independent of Axis B. Both options work with subdomains.

### A1 — One Vercel project, host-based mountain selection

One deploy serves `geyangsan.` and `manisan.`; `getCurrentMountainId()` resolves the
mountain per-request from the `Host` header (or cookie/query).

- ➕ Single deploy, single build, single env set to maintain.
- ➕ Makes the `MountainSelector` drop-down (§1.4) meaningful — it can switch tenants.
- ➖ Requires implementing host/cookie/query selection — the PROJECT_PLAN §9 gap.
- ⚠️ **Config is currently baked at build.** `mountains.json` is a static import; per-
  request tenant resolution means theme/features must be resolved at request time, not
  module-load time. This is a real refactor of the config layer, not a flag.
- ⚠️ Owner #2's site lives inside your Vercel project — your deploys, your bill.
  Incompatible with a custody answer in §3.

### A2 — One Vercel project per mountain, `MOUNTAIN_ID` env var

Same repo, multiple Vercel projects, each with a different `MOUNTAIN_ID`. Vercel supports
multiple projects from one Git repo.

- ➕ **Works with today's mechanism — no code change to selection logic.**
- ➕ Deploy isolation: a bad deploy for one mountain can't take down the other.
- ➕ Compatible with either §3 answer; required if custody.
- ➖ N builds, N env-var sets to keep in sync; a shared-code change requires N deploys.
- ⚠️ A cross-mountain drop-down becomes a **link to another origin**, not client-side
  navigation.

_Estimate (judgment): A1 ≈ moderate refactor of the config layer + selection. A2 ≈ small,
mostly provisioning and documentation._

---

## 5. Axis B — data topology

### B1 — One Firestore, `mountainId` scoping

Add `mountainId` to the 12 content collections (§1.8), scope every content read/write,
extend `firestore.rules` to enforce tenant match, backfill existing `geyang` documents.

- ➕ Natural fit for requirements 1 and 3.
- ➕ Reuses the existing tenant-aware RBAC (§1.3) rather than duplicating it.
- ➕ One rules deploy, one schema, one backup story.
- ➖ Touches every content service and query — broad, if shallow, surface.
- ⚠️ **Isolation becomes a correctness property, not a structural one.** A missing
  `where` clause leaks one mountain's content into another. This is exactly the class of
  bug the Admin SDK bypasses (`requireApiPermission` must self-enforce — see
  `docs/codebase/permissions-and-roles.md` watch-outs).
- ⚠️ **Enforcement is heterogeneous — two mechanisms, not one.** Per the SDK/read
  inventories (header links), writes split across client-SDK paths gated by
  `firestore.rules` _and_ ~7 Admin-SDK API routes that **bypass rules** and self-enforce.
  Under B1, `mountainId` checks must be implemented in **both**: the rules for every
  client path, and the route code for every Admin-SDK path. The inventories enumerate
  exactly which collections travel which path.
- ⚠️ **`hasPermission()` has no mountain dimension.** The permission-resolution function
  shared by `firestore.rules` and `requireApiPermission` resolves role → permission with
  no `mountainId` check. Concrete leak: `contacts` (PII — 동참 submissions) is readable
  by _any_ `manage-users` holder (`firestore.rules:69-74`), so granting mountain #2's
  owner `manage-users` for **their** mountain would expose **geyang's** contact PII.
  B1 is therefore not "add a tenant match per collection" — it requires reworking the
  shared permission-resolution logic (rules + API guard) to be mountain-aware.
- ⚠️ Requires a **one-shot backfill migration** over existing production data.

### B2 — One Firebase project per mountain

- ➕ Isolation is structural and free; content code barely changes.
- ➕ Required if §3 answers "custody."
- ➖ Forces a **two-backend split**: central auth project + per-mountain data project,
  meaning multiple named `initializeApp()` instances where §1.1 has one.
- ➖ Fights requirement 3 (analytics would need cross-property reporting or dual-tagging).
- ⚠️ Per-mountain Storage bucket must be created in **`asia-northeast3` (Seoul)** to
  preserve the latency win from the completed US→Seoul migration (PROJECT_PLAN:41).

\*Estimate (judgment): B1 ≈ 12 collections × (field + query scoping) + mountain-aware
rework of the shared `hasPermission` logic + `mountainId` checks in ~7 Admin-SDK routes

- backfill. B2 ≈ named-app refactor of all three init modules (§1.1) + per-tenant
  provisioning.\*

---

## 6. Identity — decided (requirement 1), with open design items

Central auth is **required**, and per §1.2 must be **built**.

- [ ] Named-app discipline across all three init modules (§1.1) so auth targets the
      central project while data targets the per-mountain backend. Includes
      `firebase-admin.ts` — its `getApps()[0]` reuse guard must become per-project
      named apps too, since `requireApiPermission` reads `users/{uid}` (central) while
      content routes write per-mountain data.
- [x] ⚠️ **Prerequisite: Tier 1 write migration — DONE (2026-07-18,** ⚠️ **rules deploy
      pending, owner-run).** Role assignment moved to `POST /api/admin/assign-role`
      (Admin SDK, `requireApiPermission('manage-users')`); the role write and its
      `permission_logs` audit entry are one transaction — **the audit trail is
      restored**. Client role-write methods removed from both services; the `users`
      admin write clause removed from the rules (owner self-provision clauses kept —
      that half of the original Tier 1 scope had already been solved by the 2026-07-11
      rules clauses). See `log/FEATURE_MOD_LOG.md` 2026-07-18 + PROJECT_PLAN §7.
- [ ] Decide whether `mountain-cats-users` is the central project or the existing
      `mountaincats-61543` is promoted to that role.
- [x] Remove the `mountainId = 'geyang'` hard-coded defaults
      (`role-assignment-service.ts:25,116`). **Done (2026-07-18, via Tier 1):** the
      methods carrying those defaults were deleted outright; the new
      `/api/admin/assign-role` route derives `mountainId` from
      `getCurrentMountainId()` server-side. (RoleManagement's hard-coded `'geyang'`
      call-site argument went with it.)
- [ ] ⚠️ **Cross-subdomain session.** `services/firebase.ts` uses
      `browserLocalPersistence`, which is **per-origin**. Central auth gives a user one
      _account_ across mountains, but they will be **logged out when moving between
      subdomains** unless a cookie-based session on `.mohocats.org` is added. Easy to
      miss until users hit it.
- [ ] Resolve `mountains.json` vs `permissions.json` drift — `manisan` exists in one and
      not the other (PROJECT_PLAN §9).

---

## 7. Analytics — decided (requirement 3), with open design items

Central collection with per-mountain breakdown is achievable and cheap.

- [ ] ⚠️ **Decouple analytics from the Firebase app instance.** Because §1.1 hangs
      `getAnalytics(app)` off the same app as auth, centralizing auth would _silently_
      centralize analytics into one property with no mountain dimension. Swap
      `firebase/analytics` → `gtag.js` so analytics is one env var
      (`NEXT_PUBLIC_GA_MEASUREMENT_ID`) independent of any Firebase project.
- [ ] Add `mountain_id` as an event parameter in `AnalyticsTracker.tsx` and register it
      as a GA4 custom dimension.
- [ ] ⚠️ **Timing:** GA4 does **not backfill** custom dimensions. Register before mountain
      #2's traffic starts or that data is permanently unsegmentable.
- [ ] Decide access model. GA4 permissions are **property-level** — there is no row-level
      restriction (sub-properties/roll-ups are Analytics 360 only, ~$50k/yr). If owner #2
      is granted the shared property, **they see your data too**. - Option: **dual-tag** — send events to both a per-mountain property (owner #2 sees
      only theirs) and a shared roll-up property (you see everything). `gtag.js`
      supports multiple measurement IDs natively. Costs $0.
- [ ] Decide the fate of the dead `analytics` collection + `view-analytics` permission
      (§1.7): build the admin analytics view, or delete the scaffolding.

---

## 8. Work required under _every_ option

These are vendor- and topology-independent. They gate mountain #2 regardless of §3–§5.

From PROJECT_PLAN §9:

- [ ] `?mountain=` selector is a no-op — implement selection or remove the selector.
- [~] Hard-coded service-account path — `feeding-spots-admin-service.ts` still hard-codes
  it. (`generate-signed-url` and `fetch-static-assets.js` already fixed 2026-07-10.)
- [ ] Hard-coded map image path in the map host — source from mountain config.
- [ ] `mountains.json` vs `permissions.json` drift (`manisan`).
- [ ] Theme not wired through — `config.theme` colors are read by nothing.
- [ ] Per-mountain DB isolation at the service-factory seam.

Plus, from this assessment:

- [ ] Write `new-mountain-setup.md` for real once §2/§4/§5 are answered (§1.6).
- [ ] Verification checklist for a provisioned tenant (that guide's §8).

**Independent of all of the above** (worth doing regardless — each removes a coupling
that would bite under several options):

- [ ] **Persist storage _paths_, not absolute URLs.** `storage-service.ts` returns
      `getDownloadURL()` and those absolute URLs are stored in `thumbnailUrl` /
      `imageUrls` / `videoUrls`. This already forced a full-collection rewrite once
      (`scripts/migration/rewrite-storage-bucket-urls.js`, for the Seoul move). Resolve
      to URLs at read time instead.
- [ ] **Retire `src/lib/firebase.ts`** (§1.1). Fold `getStorageUrl` into
      `storage-service.ts` (its only live consumer is `useAboutPhoto.ts:39`); delete the
      caller-less `getPoints`/`getCatsByPointId` (which query a nonexistent `pointId`
      field and swallow errors, against repo convention). Removes a service-factory
      bypass and reduces the client init modules from two to one **before** the §6
      split makes duplicate inits dangerous.
- [ ] **Re-test `next/image` on the media surfaces.** `album/MediaTile.tsx:61` and
      `Lightbox.tsx` use native `<img>` against full-size Firebase URLs. The recorded
      reason (`docs/design/mohocat-app-redesign-tasks.md:34`) is that the **dev** image
      optimizer stalls — a dev-mode symptom that may not hold in production on Vercel.
      If it works in prod, these surfaces gain Vercel edge caching and origin egress
      drops sharply.

---

## 9. ❓ Open questions — resolve before execution

| #   | Question                                                                                                            | Blocks                          |
| --- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Q1  | **Custody or management only?** (§3)                                                                                | Everything                      |
| Q2  | Subdomains — confirmed acceptable? They are distinct hosts, which conflicts with "no separate hosts" as stated (§2) | Axis A, analytics segmentation  |
| Q3  | One Vercel project (A1) or one per mountain (A2)?                                                                   | §8 provisioning, deploy story   |
| Q4  | One Firestore with `mountainId` (B1) or project-per-mountain (B2)?                                                  | 12 collections, rules, backfill |
| Q5  | Is `mountain-cats-users` the central auth project, or is the existing project promoted?                             | §6                              |
| Q6  | Analytics access model — shared property, or dual-tag with per-mountain properties?                                 | §7                              |
| Q7  | Does the mountain drop-down need to work for **visitors**, or only as an owner/admin convenience?                   | Axis A weighting                |
| Q8  | Is a second mountain actually imminent, or is this preparatory?                                                     | Whether §8 is urgent            |

---

## 10. Task checklist — 🔒 blocked on §9

No tasks are actionable until Q1–Q4 are answered. Sequencing once they are:

1. [ ] **Decisions locked** — record answers to Q1–Q8 in this doc, then update
       PROJECT_PLAN §9.
2. [ ] **Prerequisites** (§8) — the six §9 gaps + the two standalone items.
3. [~] **Identity split** (§6) — ✅ Tier 1 write migration done 2026-07-18 (`users` +
   `permission_logs` → Admin SDK, audit log restored; rules deploy pending,
   owner-run). Remaining: central auth with named apps across the init modules,
   including the cross-subdomain session decision — blocked on §9 like the rest.
4. [ ] **Data tenancy** (§5) — per the Q4 answer; includes the backfill migration if B1.
5. [ ] **Analytics decoupling** (§7) — before mountain #2 traffic begins (GA4 backfill
       constraint).
6. [ ] **Provisioning guide** — write `new-mountain-setup.md` for real.
7. [ ] **E2E coverage** — extend the Playwright suite to a two-tenant scenario;
       isolation under B1 is a correctness property and needs a test that proves one
       mountain cannot read another's content.
8. [ ] **Provision mountain #2** and run the §8 verification checklist.

---

_Companion docs: [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) §9 (multi-tenant hardening),
[`../manuals/deployment/new-mountain-setup.md`](../manuals/deployment/new-mountain-setup.md)
(provisioning stub), [`../codebase/multi-tenant-config.md`](../codebase/multi-tenant-config.md)
(how the config layer works), [`../codebase/permissions-and-roles.md`](../codebase/permissions-and-roles.md)
(the RBAC that §1.3 leans on)._

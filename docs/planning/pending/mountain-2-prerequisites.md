# Prerequisites for a real mountain #2

> **Status:** open · **Created:** 2026-07-28 · **Owner-gated**
>
> **What this is:** the single list of everything that must be true **before a second
> mountain goes live** with real content, real visitors, and its own admin. Multi-tenancy
> itself is **done** — the M0–M8 refactor shipped, `geyang` runs as "one of many", and a
> `hidden: true` stub (`manisan`) plus two-tenant isolation e2e prove the machinery. What
> remains is collected here.
>
> **What this is not:** the how-to. Provisioning steps (DNS, Vercel, console allowlists,
> config, first admin) live in
> [`../manuals/deployment/new-mountain-setup.md`](../manuals/deployment/new-mountain-setup.md).
> Read this doc first to know what to fix; read that one to execute.
>
> **Why it exists:** these items were scattered across HANDOFF open threads, the
> multi-mountain plan's deferred list, PROJECT_PLAN §9, and the 2026-07-18 decision
> framework. Anyone asking "what's left before mountain #2?" had to reassemble them.
> Those docs now point here instead of carrying their own copies.
>
> **None of this is urgent _yet_.** `manisan` is a hidden stub with no production data and
> no admin, so nothing below is a live bug. This is a gate, not a backlog.
>
> ⚠️ **PARTLY SUPERSEDED — read this before working anything below.** The open architectural
> decision was **answered on 2026-07-28: tenancy goes path-based** (`mohocats.org/manisan`,
> geyang prefix-free at the apex) —
> [`tenancy-url-model-decision-20260728.md`](./tenancy-url-model-decision-20260728.md), executed by
> [`tenancy-path-migration-plan-20260728.md`](./tenancy-path-migration-plan-20260728.md).
> With **one origin**, these stop being work:
>
> | Section                               | Fate under path-based                                                                                    |
> | ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
> | **§1.1** sign-out security defect     | **Structurally impossible** — not fixed, _deleted_. `revokeRefreshTokens` demotes to optional hardening. |
> | **§1.5** geyang's own subdomain       | **Moot** — production stays on the apex.                                                                 |
> | **§1.6** bare links escape the tenant | **Promoted** — it _is_ the migration's link sweep (plan T3), no longer an accepted dev-only caveat.      |
> | **§2** ops externalities              | **Mostly deleted** — no per-mountain DNS, Vercel domain, TLS wait, or authorized-domain entry.           |
> | **§4** re-login when switching        | **Moot** — one session covers every mountain.                                                            |
>
> 🔑 **Still live, and path-based fixes none of them:** **§1.2** `syncVideos()` claiming the
> shared YouTube channel · **§1.3** the 계양산 playlist back-fill (owner chore) · **§1.4** the
> members roster returning every mountain's users (a real data leak) · **§3.1** the CMS never
> naming the mountain being edited · **§3.2** the geyang-yellow admin `brand` ramp.
>
> These sections are rewritten wholesale by the migration's **T7**, not edited piecemeal now —
> so the original text is left standing below as the record of what the problem was.

---

## 1. Blocking — a second mountain is wrong without these

### 1.1 🚨 SECURITY — 로그아웃 does not sign the user out of the other mountains

**The most serious item in this document.** Sign-out is per-origin. `signOut(auth)` clears
Firebase's `localStorage` state for the origin it runs on and nothing else
(`src/services/firebase.ts:57` — `browserLocalPersistence`), so a user who signs out on
`geyangsan.mohocats.org` **remains signed in on `manisan.mohocats.org`**, indefinitely,
with no indication anywhere that they still are.

The user is told they logged out. They did not. On a shared, public, or later-stolen
machine, the next person reaches a live session one subdomain away.

**This affects members and admins alike — it is one mechanism, not an admin feature.** All
four sign-out paths bottom out in the same Firebase call and none of them is role-aware: the
top-nav 로그아웃 modal and the mypage button both go `useAuth().signOut` →
`authService.signOut()` → `firebaseSignOut(auth)` (`auth-service.ts:91`), and the CMS header
and idle timeout call `signOut(auth)` directly (`AdminAuth.tsx:66,120`). What differs is
blast radius, not exposure:

- **Member** — the residual session acts as them: 내 집사 정보, posting to 집사게시판/집사톡
  under their name, 회원 탈퇴 on their account.
- **Admin** — the residual session is a live CMS: content writes on that mountain, the
  members roster (which today returns every mountain's users and emails — §1.4), and the
  YouTube routes that drive the shared channel on the operator's OAuth credential.

⚠️ **The likeliest victim is a member, not an admin.** The motivating case is an **offline
butler holding roles on two mountains** (butler-ground) — they work the public 집사 pages,
never `/admin`, and they are the population most likely to hold two live sessions at once.
Do not scope a fix to the CMS.

**It also hollows out the admin idle timeout.** `handleIdleTimeout` calls the same
per-origin `signOut(auth)` (`AdminAuth.tsx:118-127`), so an admin timed out of geyang's CMS
is still authenticated in manisan's. The timeout's security value is partly illusory the
moment a second mountain exists. _(This variant is the one genuinely admin-only part — the
timeout runs only inside the CMS. The plain "I clicked 로그아웃 and wasn't logged out"
variant hits everyone.)_

⚠️ **This is the same cross-origin boundary as the login friction in §4 — but it is _not_
covered by that won't-fix.** Declining to _carry a session across_ origins for convenience
is a fair trade. Failing to _end a session_ the user explicitly ended is not. Do not read
§4 as having settled this.

**Zero exposure today**, which is exactly why it is a gate and not an incident: production
serves one origin (the apex), the subdomains do not resolve (§1.5), so no user has a second
session to leak.

**Fix shape — server-side revocation is the recommended default.** On sign-out, call an
endpoint that runs `admin.auth().revokeRefreshTokens(uid)`; every origin's refresh token
dies, so sibling sessions break on their next token refresh. It needs no cross-origin
plumbing and does not depend on browser storage behavior. Two things to get right: verify
with `checkRevoked` on the paths that matter, or a sibling stays valid for up to the ID
token's remaining hour; and accept that revocation is **account-wide** — it signs the user
out on every device, which is arguably the correct meaning of a deliberate 로그아웃, but it
is a behavior change worth stating in the UI.

_Rejected alternatives:_ a **hidden-iframe broadcast** to sibling origins is unreliable
under third-party storage partitioning (already shipped in Safari/Firefox); a
**parent-domain session cookie** is not a fix either — see the correction below.

⚠️ **Correction (2026-07-28) — cross-origin session sharing does _not_ fix this, it makes it
worse.** An earlier draft of this section, and the 2026-07-28 discussion behind it, treated a
parent-domain cookie (or any "sign in once, propagate the session" design) as something that
would close this item. It does not, for a concrete reason worth keeping:

- **Each origin ends up with its own independent refresh token.** Propagation designs do not
  share a session; they hand the second origin a short-lived proof it redeems via
  `signInWithCustomToken` for **new** tokens of its own. Clearing a parent-domain cookie at
  sign-out only stops _future_ bootstraps — the sibling's already-issued refresh token is
  sitting in its `localStorage` and keeps working.
- **So propagation multiplies the defect.** More origins holding live sessions, same broken
  sign-out. A cookie design additionally risks _resurrecting_ a session you just ended (a
  page load re-bootstraps from the cookie), which would defeat the admin idle timeout
  outright unless sign-out, timeout, **and** 탈퇴 all clear it.
- 🔑 **Therefore `revokeRefreshTokens` is the prerequisite, not the bonus.** It is required
  whether or not any propagation design is ever built. If one is ever built, revocation must
  land **first or with it** — never after.

_Not affected:_ **탈퇴** (`POST /api/account/delete`) hard-deletes the account, so sibling
sessions die on their next token refresh regardless. It is plain sign-out that is broken.

### 1.2 🔴 `syncVideos()` claims the whole YouTube channel

`syncVideos(mountainId)` (`src/services/media-albums.ts` ~L638) fetches **every** video on
the configured channel and imports anything missing from that mountain's Firestore set,
stamping it with that `mountainId`. Under the **single-shared-channel** decision (owner,
2026-07-26 — all mountains publish to one channel; attribution rides on
`cat_videos.mountainId`), a second mountain running 동기화 would claim geyang's entire back
catalogue.

**Fix shape:** scope the import by something channel-side that identifies the mountain. The
**per-mountain playlist** is the natural handle (`social.youtubePlaylistId`, wired
2026-07-27) and doubles as the auditable attribution a second mountain's owner would want
for any revenue split.

**Depends on 1.3** — the playlist is only a valid ownership record once it is complete.

### 1.3 🔑 Back-fill the 계양산 playlist (owner chore)

The 계양산 playlist holds **4** of the channel's **13** videos. Since 1.2's fix will treat
the playlist as the ownership record, every video left out will look unowned. One-time bulk
add on YouTube; no code.

### 1.4 🔴 The members roster leaks every mountain's users

`GET /api/admin/get-all-user-permissions-client` runs `db.collection('users').get()`
unfiltered (`route.ts:23`) and returns **every** user's email + displayName to any
`manage-users` holder — on any mountain. The **role** column is correctly scoped to
`roles[mountainId]`, so the tenancy work was done on the role and not on the roster.

Benign today (geyang is the only mountain with an admin) and **not** a rules hole — the
route uses the Admin SDK, and `firestore.rules` correctly restricts client reads to
self-only (`users`) and to `resource.data.mountainId` (`contacts`). It is a product
decision that was never made: **should mountain #2's admin see mountain #1's members?**
M5.3's audit classified `users` as "central-by-design", which is right for _identity_ but
does not answer the roster question.

**Fix shape:** decide first. If the answer is no, filter the roster to users holding a role
on the request mountain, and accept that assigning a brand-new user a role then needs a
lookup-by-email path rather than a browse.

### 1.5 🌐 Provision geyang's own subdomain before a second mountain becomes visible

Production currently serves from the **apex** `mohocats.org`, which is **not** in geyang's
`domains` list — so every request today resolves through the _fallback_ branch
(`getMountainIdForHost` → `getDefaultMountainId()`), not the Host mapping. Verified
2026-07-28: `mohocats.org` → `216.198.79.1` (Vercel); `geyangsan.mohocats.org` →
**NXDOMAIN**; `manisan.mohocats.org` → does not resolve.

That works fine with one mountain, but it makes `MountainSelector` treat production as an
**unmapped host** (`MountainSelector.tsx:83`), so it emits **path-form** links
(`mohocats.org/manisan`) instead of cross-origin ones. Path-form browsing is exactly the
mode where in-app bare links escape the tenant (1.6). Currently latent only because hidden
tenants are excluded from the selector.

**Do:** attach `geyangsan.mohocats.org` (DNS + Vercel + Firebase authorized domains + Kakao
redirect URIs) **before** un-hiding a second mountain — not at the same time.

### 1.6 🔗 Bare in-app links escape the tenant under path-prefix browsing

Links like `href="/admin"` are origin-relative, so on `/{id}`-prefixed URLs the browser
drops the prefix and the request falls back to the default tenant. This is documented as an
accepted **dev-only** caveat (plan M3 notes) — and stays dev-only **only** while production
is host-mapped. Combined with 1.5, a visible second mountain without DNS would make it a
production bug across every in-app link.

**Fix shape:** either always provision the subdomain first (1.5, cheap) or introduce a
tenant-aware link helper and sweep the app (thorough, repo-wide). The former is the
recommended default; the latter is only required if path-form tenant URLs ever become a
supported production mode.

---

## 2. Ops externalities — moved out (2026-07-28)

**The console work — DNS, Vercel, Firebase authorized domains, the YouTube playlist, seeding
the first admin — now lives in its own owner-facing checklist:
[`../manuals/admin-manual/adding-a-mountain.md`](../manuals/admin-manual/adding-a-mountain.md).**

It was carved out of this doc because it is a different kind of thing: those steps are not
decisions to make or defects to fix, they are a procedure to execute, and they belong where
the owner works rather than in a planning tracker. **Do not re-add the steps here** — this
section stays as the pointer so the gate is still visible from the list.

**This doc remains the gate.** The checklist's first instruction is to come back here and
confirm §1 is resolved before provisioning anything.

📌 One ops item is already **done** and is not waiting on anyone: the GA4 `mountain_id`
custom dimension was registered by the owner 2026-07-26. GA4 does not backfill, so it
genuinely had to precede tenant-2 traffic — it now does, globally and once, not per mountain.
(⚠️ `NEXT_PUBLIC_GA_MEASUREMENT_ID` stays deliberately **Production-only**, keeping `dev`
traffic out of the data.)

---

## 3. Should-fix — not blocking, but it will bite

### 3.1 The CMS never says which mountain you are editing

The admin header is a static "산냥이집냥이 관리자" + your name
(`AdminAuth.tsx:300-303`). The only cue to the active tenant is the public
`MountainSelector` above it and the URL. With one live mountain that is invisible; with two,
고양이 관리 for geyang and for manisan are pixel-identical, and a mis-scoped publish is a
plausible operator error rather than a contrived one.

**Fix shape:** render the tenant name in the admin header. Small; `useMountain()` +
`getMountainName()` are already there.

### 3.2 The `brand` ramp is still geyang-yellow in the admin UI

M8 wired **`theme.primaryColor` only** (owner-chosen minimal scope). The `brand` 10-stop
ramp and the **admin-only** `from-brand` CTAs (content-form submits, `IntroCard` badge)
stay static, so a non-geyang tenant reads yellow on those surfaces. Public CTAs are
correctly themed.

### 3.3 The selector cannot reach hidden tenants

`getPublicMountains()` excludes `hidden: true` (`MountainSelector.tsx:26`), by design.
Un-hiding is part of going live; noted so nobody debugs "why can't I switch to it".

---

## 4. Decided — do not re-litigate

- **Re-login when switching mountains: accepted, won't fix** (owner, 2026-07-28). Production
  subdomains are separate origins and Firebase persists auth in `localStorage`
  (`src/services/firebase.ts:57`), so a session does not cross subdomains. Both fixes
  considered and rejected as poor trades for seconds of operator friction: a **one-time
  handoff code** (custom-token exchange on switch) and a **parent-domain session cookie**
  on `.mohocats.org` — the latter would additionally defeat the admin idle timeout unless
  sign-out, idle-timeout, and 탈퇴 all learned to clear it. **Revisit only if** one person
  works both mountains routinely in the same sitting.
  - 🚨 **Scope of this decision: login only.** It does **not** cover sign-out, which is
    broken rather than merely inconvenient — see **§1.1**. Convenience may be declined;
    ending a session the user explicitly ended may not.
  - 📌 Refinement (2026-07-28): the friction is smaller than first described. Firebase's
    `localStorage` persistence survives tab close and browser restart, so this is **one
    login per subdomain per browser**, not one per switch — once signed in on both, both
    stay signed in. Which is precisely why §1.1 matters: those sessions are long-lived.
  - ⚠️ **Neither rejected design would have fixed §1.1** (correction, 2026-07-28). Both end
    in `signInWithCustomToken`, which mints the second origin **its own** refresh token — so
    they add sessions rather than unify them, and sign-out stays broken either way. Do not
    revisit this decision on the theory that it also solves the security item; it does not.
    See the correction in §1.1.
  - 📌 What is actually being added, if either is ever built: **not a second identity
    system** — one Firebase project, one uid namespace, one `users` doc, and both designs
    terminate in a first-class Firebase API. What is new is a **credential we own** (the
    handoff code, or the session cookie) that Firebase does not validate — our code does.
    Issuance, TTL, replay protection, storage, and revocation become ours. That is the real
    cost of either design, and the reason not to take it on for convenience alone.
- **One shared YouTube channel**, not one per mountain (owner, 2026-07-26). A new channel
  would have to clear monetization thresholds (1,000 subs / 4,000 watch hours) alone, and N
  channels means N OAuth credentials with N independently expiring refresh tokens.
  Attribution rides on `cat_videos.mountainId`; §1.2 is the consequence.
- **Shared GA4 property + `mountain_id` dimension**, dual-tagging per-mountain properties
  deferred (Q6, 2026-07-19).
- **Management-only, not custody** (Q1) — one Firebase + one Vercel project; you stay PIPA
  controller and bill payer.
- **Subdomains** (Q2/Q3, A1) — one Vercel project, host-based selection.

---

## 5. Already closed — so nobody re-derives it

M0–M8 shipped; `main` carries M1–M5 (PR #8, 2026-07-23) and M6/M7/M8 wait on `dev` for the
next promotion. Specifically **done**: per-request Host→tenant resolution + `[mountain]`
segment, `mountainId` stamping and scoped reads with composite indexes, the **roles map
keyed by `mountainId`** (one account, many mountains — which supersedes the old plan-§6
"multi-role users deferred" note), mountain-aware `firestore.rules` + `requireApiPermission`,
per-tenant upload `storagePrefix`, GA4 with `mountain_id` on every event, per-tenant
`primaryColor`, the stub tenant, two-tenant isolation e2e, and a CI rules job.

---

## Sources this consolidates

Items were lifted from — and these now point back here rather than carrying their own copies:

- [`../handoff/HANDOFF.md`](../handoff/HANDOFF.md) — open threads (`syncVideos`, playlist chore)
- [`multi-mountain-refactor-plan-20260719.md`](./multi-mountain-refactor-plan-20260719.md) — §3 M8 checklist, §6 deferred
- [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) §9 — multi-tenant hardening
- [`multi-tenant-architecture-decision-20260718.md`](./multi-tenant-architecture-decision-20260718.md) — §8/§10 (historical; the framework is ✅ EXECUTED)
- [`butler-media-separation-plan-20260727.md`](./butler-media-separation-plan-20260727.md) — the `syncVideos` note
- [`../manuals/deployment/new-mountain-setup.md`](../manuals/deployment/new-mountain-setup.md) — the runbook (companion, not a source)

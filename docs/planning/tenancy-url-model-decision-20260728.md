# Tenancy URL model — subdomains or paths? — Decision doc — 20260728

> **Status:** 🟡 **RECOMMENDED, awaiting owner decision.** Nothing has been changed in the
> code on the strength of this doc.
>
> **The question:** should a mountain be identified by its **host**
> (`manisan.mohocats.org`) or by a **path prefix** (`mohocats.org/manisan`)?
>
> **Recommendation:** **switch to path-based**, migrated asymmetrically so geyang keeps its
> current prefix-free URLs. Reasoning in §6; costs, honestly stated, in §4.
>
> **Deliberately not here:** a task-level execution plan. That is a separate exercise for a
> fresh session, and §7 gives only the phase shape it should follow.
>
> **Companion docs:** [`mountain-2-prerequisites.md`](./mountain-2-prerequisites.md) (several
> of its items are deleted outright by this decision — see §8) ·
> [`multi-mountain-refactor-plan-20260719.md`](./multi-mountain-refactor-plan-20260719.md)
> (§0 Q2/Q3, the decisions this would revisit) ·
> [`multi-tenant-architecture-decision-20260718.md`](./multi-tenant-architecture-decision-20260718.md)
> (the original framework).

---

## 1. Why this is being asked now

The multi-tenant refactor (M0–M8) shipped on a **host-based** model: the tenant is resolved
per request from the `Host` header, with a `/{mountainId}` path prefix as a dev/preview
fallback. That was decided on 2026-07-19 (Q2 "subdomains confirmed", Q3 "A1 — one Vercel
project, host-based selection").

A 2026-07-28 working session went looking for what still gates a real mountain #2, and the
answer turned out to be dominated by one thing. Not a list of unrelated gaps — **one root
cause with many symptoms.**

⚠️ **The original decision was not careless, and this doc is not a reversal of a mistake.**
The multi-mountain plan named this exact cost when it was taken — §0 sub-decision 1:
_"Cross-subdomain session: accepted limitation for v1."_ What changed is the price. The
session surfaced a **security defect** that was not foreseen (§2.1), and a per-mountain
operational chore that had not been added up. A reasonable decision is meeting new
information.

🔑 **Nothing has been provisioned, so there is nothing to undo.** Verified 2026-07-28:
`mohocats.org` → `216.198.79.1` (Vercel); `geyangsan.mohocats.org` → **NXDOMAIN**;
`manisan.mohocats.org` → does not resolve. Production serves geyang from the **apex**,
through the default-tenant fallback rather than the host mapping. The subdomain design exists
in config (`domains` arrays) and in the middleware, but **has never been used in production**.
This is a choice of direction, not a migration away from something running.

---

## 2. The root cause: more than one origin

Browsers isolate by **origin**. Firebase's web SDK persists auth in `localStorage`
(`src/services/firebase.ts:57`, `browserLocalPersistence`), which is per-origin and cannot be
scoped, shared, or inherited. Every problem below is that one fact, wearing a different hat.

### 2.1 🚨 The security defect

`signOut()` clears the origin it runs on and nothing else. A user who signs out on one
mountain **stays signed in on the others**, indefinitely, with no indication. It affects
members and admins alike — all four sign-out paths bottom out in the same non-role-aware
Firebase call — and it hollows out the admin idle timeout, which signs out the same
per-origin way. Full write-up: prerequisites §1.1.

### 2.2 The fix for it is not cheap either

`revokeRefreshTokens(uid)` on sign-out, plus `checkRevoked` on the paths that matter. And
note the trap established in the same session: **cross-origin session propagation does not
fix this, it multiplies it** — every propagation design mints the second origin its _own_
refresh token, so more origins hold live sessions and sign-out stays broken.

### 2.3 The login friction, and what fixing it would cost

One login per subdomain per browser. Small in itself — accepted as won't-fix. But closing it
means either a **one-time handoff code** or a **parent-domain session cookie**, and both mean
**a bearer credential that Firebase does not validate — our code does**. Issuance, TTL,
replay protection, and revocation become ours. That is a new security surface bought for
convenience already priced as low.

### 2.4 The per-mountain chore

Firebase **authorized domains** has no wildcard support (`*.mohocats.org` is not a thing) and
no documented maximum, so every new subdomain needs an entry. It is scriptable via the
Identity Toolkit Admin API, but that is a script to write and own. Add DNS, the Vercel domain
attach, and a TLS wait.

_(Kakao is **not** part of this. It runs as a Firebase OIDC provider through
`signInWithPopup`, so its redirect URI is Firebase's fixed handler and is constant across
tenants — verified 2026-07-28, and the docs that claimed otherwise were corrected.)_

### 2.5 An ordering trap

Because geyang has no subdomain of its own, `MountainSelector` reads production as an
unmapped host and would emit **path-form** links for a second mountain — the exact mode in
which in-app bare links escape the tenant. Provisioning order becomes load-bearing.

---

## 3. What path-based eliminates

| Today's item                                       | Under path-based                                      |
| -------------------------------------------------- | ----------------------------------------------------- |
| 🚨 Sign-out leaves sibling sessions live (§2.1)    | **Gone** — one origin, one session store              |
| `revokeRefreshTokens` as a **prerequisite**        | Demoted to optional hardening (multi-device sign-out) |
| Re-login when switching mountains                  | **Gone** — one session covers every mountain          |
| Handoff-code / session-cookie design (§2.3)        | **Never needed** — no credential of our own to own    |
| Firebase authorized domains per subdomain          | **One entry, forever**; no Identity Toolkit script    |
| DNS record + Vercel domain + TLS wait per mountain | **Nothing per mountain**                              |
| Provisioning-order trap (§2.5)                     | **Gone**                                              |
| The 8-step owner checklist written 2026-07-28      | Shrinks to roughly **two**: config entry, first admin |

The honest summary: adding a mountain stops being an infrastructure event and becomes a
config change.

---

## 4. What it costs

### 4.1 A link sweep — measured, not estimated

In-app navigation that hard-codes a root-absolute path, and would therefore drop the tenant
prefix:

| Kind                                  | Count                   |
| ------------------------------------- | ----------------------- |
| `href="/…"`                           | 53                      |
| `router.push/replace(…)`              | 24                      |
| `window.location.href/replace/assign` | 3                       |
| **Total**                             | **~80 across 27 files** |

Mechanical rather than architectural: introduce a tenant-aware link helper and sweep the call
sites. The safety net is real — 153 e2e tests, and
`tests/e2e/public/tenant-isolation.spec.ts` **already exercises `/manisan/…` path-prefixed
browsing**, so the target mode is under test before the work starts.

This is currently logged as an accepted **dev-only** caveat (prerequisites §1.6). Adopting
path-based is what makes it real — and also what makes it worth fixing properly.

### 4.2 Branding

`mohocats.org/manisan` reads as a section of your site; `manisan.mohocats.org` reads as
theirs. **This is the one genuine argument left for subdomains**, and it is a partnership
question rather than a technical one — how much a second mountain's owner needs to feel they
have their own site.

Weigh it against what is already shared: one Firebase project, one YouTube channel, one GA4
property, management-only custody. "Their own site" is already partly a costume.

### 4.3 It revisits two locked decisions

Q2 (subdomains acceptable) and the **host-based-selection half** of Q3. Note that Q3's
substance — _one Vercel project, one build serving every mountain_ — is **unaffected**. Only
how the tenant is named in the URL changes.

---

## 5. The structural argument

**The `[mountain]` route segment already exists.** The app tree is literally
`src/app/[mountain]/…`; every page already renders under a tenant segment. The host-rewrite
middleware (`src/middleware.ts`) is an **adapter** that maps a hostname onto that segment.

Path-based is not something to build. It is what is already underneath. Adopting it removes a
layer rather than adding one — which is also why the sweep is the only real work: the routing
is done.

---

## 6. Options and recommendation

| #     | Option                                                                                                   | Verdict                                                                          |
| ----- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **1** | **Keep subdomains, fix the symptoms** — revocation + a propagation design + an authorized-domains script | Most total work, and ends with a bearer credential we own. Buys branding.        |
| **2** | **Path-based** (recommended)                                                                             | Deletes the whole class. Cost is one bounded sweep. Gives up subdomain branding. |
| **3** | **Status quo** — subdomains, revocation only, live with the chore                                        | Viable while there is one mountain. Every §2 cost returns the day there are two. |

**Recommended: option 2.** The deciding considerations, in order:

1. **It removes a security defect instead of managing one.** Option 1 fixes §2.1 with
   revocation and then _adds_ origins holding independent sessions. Option 2 makes the defect
   structurally impossible.
2. **The costs it removes are permanent and recurring; the cost it adds is one-time and
   measurable.** ~80 call sites against a per-mountain infrastructure ritual forever.
3. **It avoids owning a credential.** Option 1's convenience fix means operating our own
   bearer token. Option 2 never raises the question.
4. **The routing already exists** (§5), and the target mode is already under e2e test.
5. **Nothing has been provisioned** (§1), so choosing now costs no rollback.

The counter-argument that could reverse this is **§4.2 alone**: if a second mountain's owner
must have their own hostname to agree to participate, that outranks everything above, and the
answer is option 1. That is the owner's call, not an engineering one.

---

## 7. Migration shape (phases only — the plan is a separate exercise)

> Deliberately not a task list. Recorded so a future session starts from the right shape.

1. **Tenant-aware link helper**, with the default tenant emitting **no prefix**.
2. **Sweep the ~80 call sites** onto it.
3. **Un-hide a second tenant in preview** and verify isolation and navigation end to end.
4. **Docs + decision close-out** (§8).

🔑 **The asymmetry is the risk control.** Keep the default-tenant fallback so **geyang stays
at `mohocats.org` with no prefix** — every existing URL, bookmark, and SEO signal preserved,
and geyang's links behave exactly as they do today. Only mountain #2+ carries a prefix. This
means **geyang cannot regress while the sweep is in progress**, and the work can land
incrementally rather than as a cutover.

---

## 8. If adopted — what changes elsewhere

- **`mountain-2-prerequisites.md`**: §1.1 (security), §1.5 (geyang subdomain), §1.6 (bare
  links, promoted to the actual work) and most of §2 (ops externalities) are **deleted or
  rewritten**. §4's re-login won't-fix becomes moot.
- **`admin-manual/adding-a-mountain.md`**: collapses to roughly config entry + first admin.
- **`deployment/new-mountain-setup.md`**: loses DNS/Vercel/authorized-domain steps.
- **`multi-mountain-refactor-plan-20260719.md`** §0: Q2 and the host-selection half of Q3
  superseded; §0 sub-decision 1 ("cross-subdomain session: accepted limitation") retired.
- **`mountains.json`**: `domains` arrays become vestigial (keep the mechanism — see §10).

## 9. What this does **not** fix

Orthogonal, and survive untouched: **§1.2** `syncVideos()` claiming the shared channel ·
**§1.3** the 계양산 playlist back-fill · **§1.4** the members roster returning every
mountain's users · **§3.1** the CMS not naming the mountain being edited. Path-based tenancy
is not a silver bullet for mountain #2 readiness.

## 10. Not a one-way door

The host-rewrite middleware would **stay**. If a future mountain genuinely needs its own
hostname for branding, it can be given one — accepting the §2 costs **for that tenant only**,
as a deliberate opt-in rather than the platform default. Keeping `domains` in the config is
what preserves that option; it costs nothing to leave in place.

## 11. Open for the owner

1. **Does a second mountain's owner need their own hostname?** (§4.2 — the only argument that
   reverses the recommendation.)
2. **Confirm geyang keeps prefix-free URLs at the apex** (§7). Assumed yes; it is what makes
   the migration low-risk.
3. **Sequencing:** before mountain #2, or is mountain #2 far enough out to defer? The
   recommendation is _before_ — doing it after means doing it under pressure, with a live
   second tenant and real URLs to preserve.

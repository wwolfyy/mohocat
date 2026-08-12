# Firebase read-access inventory (Client SDK vs Admin SDK)

> **Purpose.** Companion to
> [`firebase-sdk-usage-inventory.md`](./firebase-sdk-usage-inventory.md) (which scopes the
> **write** migration question). This doc takes stock of **reads**: every collection read
> path, the SDK it uses, and the `firestore.rules` read-scope it relies on. It serves two
> jobs at once:
>
> 1. **Rules-coverage audit** — does every _client-SDK_ read have a matching, correctly
>    scoped `firestore.rules` read rule? (A missing rule is the bug that broke
>    `butler_stream` — `feeding_spots` had no rule at all.)
> 2. **Client-vs-Admin decision** — for the _sensitive_ subset, should the data reach the
>    browser at all, or move behind an Admin-SDK API route?
>
> **This is a stock-take, not a blanket decision.** The read SDK choice is driven by a
> different axis than writes (see below), so the decision column is only non-trivial for the
> R3 bucket.
>
> _Snapshot date: 2026-06-30. Verify against code before acting on specifics._

---

## How the read SDK choice is decided (two axes — neither is the write axis)

Writes migrate to the Admin SDK to restore a hard `write: if false` trust boundary. Reads
are decided by two _different_ forces:

1. **Rendering / performance** _(dominant; not a security question)_ — does the data belong
   in the initial HTML (SEO / above-the-fold / slow-changing → **Admin SDK baked into a
   Server Component / ISR**) or is it live / interactive / per-user (→ **client SDK**)? This
   call was already made in §7a: `cats` are baked server-side
   (`src/lib/server/cat-reads.ts`, Admin SDK, ISR `revalidate=3600`) **and** also read live
   client-side where interactivity needs it.
2. **Sensitivity / rules-expressibility** _(the axis that mirrors the write question)_ — can
   read access be expressed **cleanly and safely** in `firestore.rules`? Public, owner-only,
   and simple permissioned reads → client SDK is idiomatic and fine. Sensitive data (other
   users' PII, secrets, admin-only) or cross-document / complex authz → **Admin-SDK route**
   so the raw data never reaches the browser.

So most reads are settled by axis 1 or are obviously fine on axis 2. Only **R3** (sensitive /
permissioned) carries a real "client+rules vs Admin-SDK route" decision.

---

## A. Admin SDK reads (server-only; bypass `firestore.rules`)

These already live server-side; no rules-coverage concern (rules don't apply).

| Path                                                                             | Collection      | Purpose                                                                       |
| -------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------- |
| `src/lib/server/cat-reads.ts`                                                    | `cats`          | §7a — baked into home + adoption Server Components (ISR `revalidate=3600`)    |
| `src/services/feeding-spots-admin-service.ts` + `basic-feeding-spots-service.ts` | `feeding_spots` | server-side read for `/api/feeding-spots-basic` + `butler_stream/new` (build) |
| `src/lib/auth/requireApiPermission.ts`                                           | `users`         | resolve role from `users/{uid}` to gate `/api/admin/*` routes                 |

> **Note (corrects the prior mis-read):** the `butler_stream` **page** does **not** get its
> feeding-spot list from these Admin-SDK services. The on-page `FeedingSpotsList` component
> reads via the **client** `feeding-spots-service.ts` (see R2). The Admin-SDK feeding services
> back the API route + the build-time `new`-post page only.

---

## B. Client-SDK reads (browser; subject to `firestore.rules`)

Init: `src/services/firebase.ts`. Each row is a client read path and the read-rule it
depends on. **Audit rule:** every row must have a matching `match` block in
`config/firebase/firestore.rules` whose `allow read` covers the actor.

### R1 — Public reads (`allow read: if true`) — settled

Decided by axis 1 (rendering). Client SDK is correct; some are _also_ baked server-side for
perf. No security question.

| Collection            | Client read path(s)                                        | Rule read-scope | Notes                                                            |
| --------------------- | ---------------------------------------------------------- | --------------- | ---------------------------------------------------------------- |
| `points`              | `point-service.ts` `getAllPoints` / `getPointById`         | `if true`       | home page Server Component awaits this at build (public)         |
| `cats`                | `cat-service.ts` `getAllCats` / `getCatById` / by-dwelling | `if true`       | also baked via Admin SDK (`cat-reads.ts`, §7a); client = live UI |
| `about_content`       | `about-content-service.ts` `getContent`                    | `if true`       | about page                                                       |
| `cat_images`          | `media-albums.ts` `getImages` / `getImagesByCatId`         | `if true`       | photo album                                                      |
| `cat_videos`          | `media-albums.ts` `getVideos` / `getVideosByCatId`         | `if true`       | video album                                                      |
| `posts_announcements` | `announcement-service.ts` `getAllPosts` / modal query      | `if true`       | announcements + modal                                            |

### R2 — Authed / owner reads — legitimate client SDK, keep

Decided by axis 2: access is **cleanly expressible** in rules (any authed user, or the data
owner). This is what the Client SDK exists for; migrating would mean rebuilding authz that
rules already express. **No decision needed — just ensure the rule exists.**

| Collection      | Client read path(s)                                          | Rule read-scope                       | Notes                                                                |
| --------------- | ------------------------------------------------------------ | ------------------------------------- | -------------------------------------------------------------------- |
| `posts_feeding` | `post-service.ts` `getAllPosts` (+ replies)                  | `if request.auth != null`             | butler_stream community feed                                         |
| `posts_butler`  | `butler-talk-service.ts` `getAllPosts` (+ replies)           | `if request.auth != null`             | butler-talk feed                                                     |
| `feeding_spots` | `feeding-spots-service.ts` `getAllFeedingSpots`              | `if request.auth != null` **(added)** | **the bug** — collection had no rule; FeedingSpotsList + NewPostForm |
| `users` (self)  | `permission-service.ts` `getUserPermissions` / `getUserRole` | `if uid == userId` (own doc)          | a user resolving its own role/permissions                            |

### R3 — Sensitive / permissioned reads — the decision bucket (mirrors write-Bucket 1)

These read data that **should not be broadly client-readable**. Each carries the real
question: keep as client+rules, or move behind an Admin-SDK route so the raw data never hits
the browser?

| Collection                         | Client read path                                                                                                       | Rule read-scope                       | Decision question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `contacts`                         | `contact-service.ts` `getAllContacts` (admin ContactManagement)                                                        | `if manage-users`                     | PII (동참 submissions). Client read is admin-gated by rule — **defensible to keep**, but a read API route would keep PII off the wire entirely.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `users` (others)                   | `permission-service.ts` `getUserPermissions`/listing; `role-assignment-service.ts` reads target user before role write | `if manage-users` (admin reads any)   | Admin reading _other_ users' docs. Same migrate-or-keep call as the `users` **write** path (write-Bucket 1).                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `permission_logs`                  | `permission-service.ts` `getLogs`                                                                                      | `if view-analytics`                   | Audit log read. Defensible client+rule; or fold into an admin read route.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `role_permissions/role-config`     | `permission-service.ts` `loadConfig`                                                                                   | `if request.auth != null` **(added)** | **RESOLVED → R3-(a).** Was denied (no rule) → "Failed to load permission config" → stale local-JSON fallback, drifting from the live matrix that _both_ enforcement paths (`hasPermission()` rule + `requireApiPermission`) actually use. Added an authed read rule so the client resolves from the **live** matrix. An API route was rejected: the existing `/api/admin/role-permissions` GET is `manage-users`-gated, so non-admins (butler/viewer) couldn't resolve their own role. The matrix is config, not PII → authed read is appropriate; writes stay Admin-SDK-only. |
| `role_permissions/resource-config` | `ResourcePermissionConfig.tsx` via `GET /api/admin/resource-permissions`                                               | n/a — Admin-SDK route                 | **The model R3-(b):** no direct client read; read/written only through an admin API route. Left as-is (default-deny for direct client access).                                                                                                                                                                                                                                                                                                                                                                                                                                 |

---

## Findings (this snapshot)

1. **`feeding_spots` — FIXED.** Collection had **no** `firestore.rules` block → default-deny →
   `FeedingSpotsList` (and the `NewPostForm` check-in write) failed with "Missing or
   insufficient permissions." Added `match /feeding_spots` (`read: if auth != null`;
   `write` gated on `manage-posts`), mirroring `posts_feeding`. **Needs
   `firebase deploy --only firestore:rules` to take effect.**
2. **`role_permissions/role-config` — RESOLVED (R3-(a)).** Added an authed read rule so the
   client UI resolves from the **live** matrix (the same doc the `hasPermission()` rule and
   `requireApiPermission` enforce against), instead of the drift-prone bundled-JSON fallback.
   Silences the "Failed to load permission config" error. **Needs the same rules deploy.**
   `resource-config` already follows the Admin-SDK-route model (R3-(b)) and is left as-is.
3. **Other R3 rows (`contacts`, `users`-others, `permission_logs`) — keep.** Each is cleanly
   rule-gated and working; moving them behind Admin-SDK read routes (to keep PII/audit data
   off the wire entirely) is a lower-priority hardening, logged not actioned.

---

## Cross-links

- Writes: [`firebase-sdk-usage-inventory.md`](./firebase-sdk-usage-inventory.md)
- Rules: [`config/firebase/firestore.rules`](../../../config/firebase/firestore.rules)
- §7a baked reads / ISR: [`PROJECT_PLAN.md`](../../../work_tracking/PROJECT_PLAN.md) §7a

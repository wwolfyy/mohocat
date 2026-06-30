# Firebase SDK usage inventory (Client SDK vs Admin SDK)

> **Purpose.** Take stock of where the codebase uses the **Firebase Client (Web) SDK**
> vs the **Firebase Admin SDK**, as a precondition for revisiting the
> "eventual target = Admin SDK for all writes" conclusion recorded in
> [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) §7.
>
> **This is a stock-take, not a decision.** It maps the current state and groups the
> Client-SDK write paths by _why_ they exist, so the migrate-vs-keep analysis can be
> done bucket-by-bucket rather than as one blanket call.
>
> _Snapshot date: 2026-06-30. Verify against code before acting on specifics._

---

## TL;DR

- **Admin SDK** is already the production writer for `contacts`, the permission/role
  config, and YouTube/video metadata — the "Admin SDK is the only writer" model is
  partly live.
- **Client SDK writes** split into three buckets:
  1. **Privileged/admin writes temporarily on the Client SDK** → the real migration
     candidate list. Currently gated by `hasPermission(...)` rules as the interim.
  2. **Legitimately Client-SDK writes** — the acting user _is_ the data owner
     (community posts, check-ins, auth). This is what the Client SDK exists for; the
     blanket "migrate everything to Admin SDK" framing arguably over-reached here.
  3. **Dead / superseded write paths.**
- Migrating writes to Admin SDK ≠ removing Firebase from the browser: `AuthProvider`
  eagerly imports `firebase/auth`, and bucket-2 writes + nearly all live reads are
  client-side.

---

## A. Admin SDK (server-only; bypasses `firestore.rules`)

Init: `src/lib/firebase-admin.ts`. Used only in API routes, server components, and
build/migration scripts under `scripts/`.

### Reads (server render / build)

| Path                                                                             | Collection    | Purpose                                                                    |
| -------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------- |
| `src/lib/server/cat-reads.ts`                                                    | `cats`        | §7a — baked into home + adoption Server Components (ISR `revalidate=3600`) |
| `src/services/feeding-spots-admin-service.ts` + `basic-feeding-spots-service.ts` | feeding spots | read-only; powers `butler_stream` pages + `/api/feeding-spots-basic`       |

### Writes (API routes)

| Route                                                       | Collection / target                           | Gate                                    |
| ----------------------------------------------------------- | --------------------------------------------- | --------------------------------------- |
| `/api/contact`                                              | `contacts` `.add()`                           | ID-token verify (§11, Variant A)        |
| `/api/admin/role-permissions`                               | `role_permissions/role-config` `.set()`       | `requireApiPermission` → `manage-users` |
| `/api/admin/resource-permissions`                           | resource→permission map `.set()`              | `manage-users`                          |
| `/api/admin/youtube-auth/callback`                          | `admin_config/youtube_auth` `.set()`          | Google OAuth `code`                     |
| `/api/refresh-video-metadata` + `/api/update-youtube-video` | `cat_videos` metadata `.update()`             | `manage-video`                          |
| `/api/generate-signed-url`                                  | Cloud Storage (write signed URL)              | upload flow                             |
| `/api/upload-youtube`                                       | `cat_videos` (via `videoService.createVideo`) | —                                       |

All `/api/admin/*` routes are gated through `src/lib/auth/requireApiPermission.ts`
(verify Firebase ID token → resolve role via `users/{uid}` → require permission).

---

## B. Client SDK writes (browser; subject to `firestore.rules`)

Init: `src/lib/firebase.ts` / `src/services/firebase.ts`. The migration question is
**not uniform** across these — hence three buckets.

### Bucket 1 — Privileged/admin writes, temporarily on Client SDK (the migration candidate list)

Currently gated by `hasPermission(...)` Firestore rules as the interim approach,
pending a possible move behind Admin-SDK API routes.

| Service                      | Collection(s)                                        | Rule gate                       | Note                                                                                         |
| ---------------------------- | ---------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------- |
| `cat-service.ts`             | `cats` (add/update/delete/batch)                     | `manage-cat`                    | CMS cat editing                                                                              |
| `media-albums.ts`            | `cat_images`, `cat_videos` (add/update/delete/batch) | `manage-photo` / `manage-video` | tagging; the only client `cat_videos` writer is the date-parser path (+ `syncWithYouTube`)   |
| `about-content-service.ts`   | `about_content`                                      | `manage-app`                    |                                                                                              |
| `announcement-service.ts`    | `posts_announcements`                                | `manage-posts`                  |                                                                                              |
| `role-assignment-service.ts` | `users` + `permission_logs`                          | `manage-users`                  | members page; **audit-log write denied & swallowed** (`permission_logs` = `write: if false`) |
| `permission-service.ts`      | `users`, `permission_logs`                           | partial                         | `ensureUserExists` self-provision blocked for new non-admins; log write swallowed            |

### Bucket 2 — Legitimately Client SDK by nature (acting user _is_ the data owner)

This is precisely the Client SDK's design purpose. Migrating these to Admin SDK would
mean rebuilding ownership/authz that Firestore rules already express naturally.

| Service                    | Collection                             | Actor                     |
| -------------------------- | -------------------------------------- | ------------------------- |
| `post-service.ts`          | `posts_*` (community posts/replies)    | end users (butler_stream) |
| `butler-talk-service.ts`   | butler-talk posts/replies              | end users                 |
| `feeding-spots-service.ts` | feeding spots `last_attended` check-in | end users                 |
| `auth-service.ts`          | account create/delete, Kakao OIDC      | the user themselves       |

### Bucket 3 — Dead / superseded write paths

| Service                              | Status                                                                                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `contact-service.ts` `addContact`    | superseded by `/api/contact`; `contacts` rule = `create: if false`. **Still used for reads** (`getAllContacts` in admin `ContactManagement`) |
| `point-service.ts` add/update/delete | no live caller (급식소/겨울집 pages disabled; rule = `write: if false`)                                                                      |

---

## C. The bundle-cost wrinkle

Even if every write moved to the Admin SDK, the Client SDK **cannot** be dropped from
the public bundle:

- `src/components/auth/AuthProvider.tsx` eagerly imports `firebase/auth` (login/session
  persistence).
- Bucket-2 community writes are inherently client-side.
- Nearly all live reads (cat detail, galleries beyond the baked landing, community
  feeds) still run client-side.

So **"migrate writes to Admin SDK" ≠ "remove Firebase from the browser."** Those are
separate efforts with separate payoffs, and the bundle-size argument for migration is
weaker than it first appears.

---

---

## D. Analysis — should Bucket 1 switch to Admin SDK? (2026-06-30)

**Verdict: not all-or-nothing. Migrate the `users`/`permission_logs` writes; defer the
rest; keep Bucket 2 on the Client SDK.**

### The core question

Bucket 1 writes run on **untrusted devices**. The only thing between an authenticated
low-privilege user (or a tampered client) and a write to `cats`/`users` is a **Firestore
rule**. So the real comparison is:

|                                        | Client SDK + `hasPermission` rule                                                    | Admin SDK route + `write: if false`                    |
| -------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| **Authz ("who")**                      | Rule mirrors `requireApiPermission`                                                  | `requireApiPermission` (single source)                 |
| **Payload validation ("what")**        | Rules — clumsy, can't express most invariants                                        | Arbitrary TS, server-side                              |
| **Enforcement location**               | Separate deploy artifact (`firebase deploy`), out of band from the Vercel app deploy | In the app, same deploy, testable                      |
| **Audit writes to locked collections** | Impossible (client can't write `write:if false`; client logs are forgeable anyway)   | Native                                                 |
| **Latency / offline**                  | One hop, optimistic — irrelevant for admin CMS                                       | Extra hop — irrelevant for admin CMS                   |
| **Bundle size**                        | —                                                                                    | **No help** (auth + Bucket 2 keep Firebase in browser) |

Two factors drop out immediately:

- **Bundle size is _not_ a reason to migrate** (see §C).
- **Latency/offline is _not_ a reason to stay** — the CMS serves a handful of butlers;
  a round-trip is nothing and there is no offline requirement.

So the decision turns on **security / validation / auditability vs. migration
cost + regression risk** — and those weigh very differently across the six services.

### Tier 1 — `users` + `permission_logs` (role-assignment-service, permission-service): **migrate. Strong yes.**

- **Audit integrity is structurally impossible on the client.** `assignSpecificRole →
logRoleChange` writes `permission_logs` (`write:if false`); the write is denied and the
  failure is **swallowed**, so **every role change currently loses its audit entry.** A
  locked collection can't be written from the client, and a client-writable audit log
  would be forgeable — so only a server route yields a trustworthy trail. This alone
  justifies migration.
- **Roles are the crown jewels.** The only real escalation vector found in the repo lived
  here (the once-ungated `role-permissions` POST). Keeping role writes client-side keeps an
  entire vuln class (self-escalation via a rules gap) alive, mitigated solely by rule
  correctness — and the `hasPermission` incident (rules silently denied _everyone_,
  admins included, for an unknown window) is the cautionary tale for trusting subtle rules
  with the crown jewels.
- **It was designed for this** — `users` was originally grouped Admin-SDK-only with
  `permission_logs` / `admin_data`.
- **Resolves the self-provision gap** — `ensureUserExists` (new non-admin can't create its
  own `users/{uid}`) is naturally fixed by a server route.
- **Low effort, low volume** — few write methods, infrequent calls;
  `/api/admin/get-all-user-permissions-client` already proves the Admin-SDK pattern for
  this collection.

**Plan:** 1–2 routes behind `requireApiPermission` → repoint the role / provision / audit
writes in `role-assignment-service` + `permission-service` → restore the audit log →
relock `users` to `write: if false`.

### Tier 2 — `cats`, `cat_images`, `cat_videos`, `about_content`, `posts_announcements`: **defer; migrate opportunistically, not big-bang.**

- **Authz is adequately handled by the (now-fixed) `hasPermission` rules.** Worst case for
  a gap here is a `manage-cat` holder writing a bad record — a recoverable _data-quality_
  problem, not a privilege one.
- **The genuine upside is server-side validation, not security** — the
  `ignoreUndefinedProperties` / string-typing issues and the Sheets-import field
  standardization (the two CMS "Migrate" buttons) would be cleaner as a server chokepoint
  that whitelists fields and stamps un-spoofable timestamps. "Nice to have," not "must."
- **Scaffolding is half-there** — `/api/admin/cats` POST and `/api/admin/posts-collections`
  POST exist as gated stubs, lowering the cost _if/when_ migration happens.
- **But cost/risk is real** — ~5 services, many write sites (`media-albums` alone has ~12,
  incl. batches); each needs a route + the service repointed to `fetch()` with an ID token,
  turning every service into a hybrid (read client / write server). Meaningful regression
  surface across the whole CMS for a mostly cleanliness payoff.

**Rule of thumb:** migrate a Tier 2 collection only when you're already touching it for
server-side-validation reasons. No purity-driven sweep.

### Not migration targets

- **Bucket 2** (community / user-as-owner writes) should **stay** Client SDK — the original
  "Admin SDK for all writes" target over-reached here.
- **Bucket 3** (dead/superseded paths) is cleanup, independent of this decision.

### Net recommendation

1. **Migrate Tier 1 now** (high value: audit + escalation surface; low effort).
2. **Leave Tier 2 on the gated Client SDK**; revisit per-collection only on a validation
   need.
3. **Retire the blanket "Admin SDK is the eventual target for all writes" framing** →
   replace with "Admin SDK for privileged/audited writes; rules-gated Client SDK is fine
   for the rest." (Reflected in `PROJECT_PLAN.md` §7.)

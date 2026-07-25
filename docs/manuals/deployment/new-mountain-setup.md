# Onboarding a New Mountain (Tenant) — Provisioning Guide

> **STATUS: ✅ REAL GUIDE (multi-tenant M1–M8 complete).** The platform is genuinely
> multi-tenant: one Firebase project + one Vercel project serve every mountain, and the
> active tenant is resolved **per request by Host** (production subdomains) with a
> `/{mountainId}` path fallback for dev/preview. Standing up a new mountain is therefore
> **config + DNS + a couple of console allowlists + data** — there is **no new
> infrastructure and no new environment variables** to provision.
>
> **Audience:** developer / operator provisioning a tenant (not the CMS operator — that's
> [`docs/manuals/admin-manual/`](../admin-manual/README.md)).
>
> **Companion docs:** [`README.md`](./README.md) (how deploys work today) ·
> `config/mountains/mountains.json` + `config/permissions.json` (per-mountain config) ·
> `src/lib/tenant.ts` (Host→tenant resolution) · `src/utils/config.ts` (config accessors) ·
> [`docs/codebase/multi-tenant-config.md`](../../codebase/multi-tenant-config.md) (the model) ·
> [`docs/planning/PROJECT_PLAN.md`](../../planning/PROJECT_PLAN.md) §9.

---

## The model in one paragraph

All mountains live in **one Firebase project** (shared Auth, Firestore, Storage) and deploy
from **one Vercel project**. Every content document carries a `mountainId`; the service layer
stamps it on writes and scopes every read by it, and the Firestore rules enforce it — so the
tenants share a database without leaking into each other. Auth is **central**: email/password,
phone (SMS), and Kakao OIDC are configured once and shared, so a second mountain's owner does
**not** set up any auth provider. A user's roles are a **map keyed by `mountainId`**
(`users/{uid}.roles = { geyang: {...}, <new>: {...} }`), so one account can administer several
mountains and the Host/URL picks which one applies.

**What this means for provisioning:** you are not creating a project — you are adding a config
entry, pointing a subdomain at the existing deployment, allowlisting that subdomain in two
consoles, and seeding the mountain's first admin + content.

---

## 1. Prerequisites

- Write access to this repo (the config lives in git and ships on `git push`).
- **Firebase Console** access (Authentication → Settings; to seed the first admin).
- **Vercel dashboard** access (to attach the domain — env vars need no changes).
- **DNS** control for the domain (to add the subdomain record).
- **Kakao Developers console** access (to add the new subdomain's redirect URI), if Kakao
  login should work on the new subdomain.
- No new CLI tooling beyond what the repo already uses (`firebase-tools` only if you seed
  the first admin with a script instead of the console).

---

## 2. App configuration (two files, kept coherent)

A new mountain must be added to **both** files, with a matching `id`:

### 2a. `config/mountains/mountains.json`

Add a tenant object (copy the `manisan` stub as a template). Fields:

| Field                  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                   | the tenant key; also the `/{id}` path segment. Must match the `permissions.json` key.                                                                                                                                                                                                                                                                                                                                                                                          |
| `name` / `description` | Korean public branding.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `adminEmail`           | recipient for 동참 (contact) email on this mountain.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `hidden`               | `true` = routable + prerendered but **excluded from the public `MountainSelector`**. Use it to stage a mountain (config + data in place) before announcing it, then flip to `false`/omit.                                                                                                                                                                                                                                                                                      |
| `domains`              | production subdomains that resolve to this tenant by Host, e.g. `["<id>.mohocats.org"]`. This is what makes the clean visitor URL work.                                                                                                                                                                                                                                                                                                                                        |
| `storagePrefix`        | upload namespace, e.g. `"mountains/<id>/"`. New uploads (signed-URL route + form image strategy) land under it automatically (M6), isolating this tenant's photos. `geyang` uses `""` (flat).                                                                                                                                                                                                                                                                                  |
| `about`                | about-page copy (title/subtitle/mainContent/sections + `about.mainPhoto.localPath` for the baked photo).                                                                                                                                                                                                                                                                                                                                                                       |
| `theme.primaryColor`   | **the primary brand color** (M8) — a **6-digit hex** like `#0EA5E9`. Drives the signature CTA gradient (header 동참/입양홍보 button, shared action buttons, map cluster markers, adoption/FAQ CTAs). ⚠️ A malformed hex makes the mountain's pages fail to render (fail-loud). `secondaryColor`/`accentColor` are **not yet wired**, and the fixed `brand` ramp does not follow `primaryColor`, so non-CTA surfaces still read the default yellow until a fuller theming pass. |
| `features`             | feature flags (`videoAlbum`, `photoAlbum`, `advancedFiltering`, `adminPanel`).                                                                                                                                                                                                                                                                                                                                                                                                 |
| `social`               | `youtubeChannelId` etc. ⚠️ The YouTube **OAuth credential is shared** (single `admin_config/youtube_auth`), so `youtubeChannelId` selects the channel but uploads still use the one shared account.                                                                                                                                                                                                                                                                            |
| `map`                  | optional. `landscapeImage`/`portraitImage` (per-tenant map imagery — set these; a new mountain can temporarily reuse geyang's), plus the mobile clustering knobs `clustering` (`true`/`false`) and `maxClusterRadius`. Omit to inherit `DEFAULT_MAP_CONFIG`.                                                                                                                                                                                                                   |
| `authentication`       | `roles`, `smsRegions`, `defaultRole`, `requireApproval` — mirror geyang unless the mountain needs different defaults.                                                                                                                                                                                                                                                                                                                                                          |

### 2b. `config/permissions.json`

Add the same `id` under the top-level **`mountains`** block (with its `name`). The `roles`
matrix (role → permission list) is **global** — the same role definitions apply on every
mountain, so you normally add **nothing** there. Keeping `mountains.json` and
`permissions.json` in sync is the long-standing "drift" guard; adding the tenant to both is
the whole task.

> Both files are **baked at build** — commit and `git push` (Preview ← `dev`, Production ←
> `main`) to make the tenant real. There is no runtime toggle.

---

## 3. Domain / DNS / Vercel

1. **DNS:** add the subdomain (e.g. `CNAME <id>.mohocats.org → cname.vercel-dns.com`, or per
   Vercel's instructions).
2. **Vercel:** in the **same** project (Settings → Domains), add `<id>.mohocats.org`. No new
   project, no new env scope. Vercel issues TLS automatically.
3. The `domains` entry from §2a is what maps that Host to the tenant (`src/lib/tenant.ts`
   `findMountainIdByHost`). Until DNS + the config entry are both live, reach the tenant by
   path (`/<id>`) on any existing deployment.

**No environment-variable changes.** Every env var (`NEXT_PUBLIC_FIREBASE_*`,
`SERVICE_ACCOUNT_KEY`, SMTP, Kakao/YouTube, `NEXT_PUBLIC_GA_MEASUREMENT_ID`,
`NEXT_PUBLIC_BASE_URL`, `MOUNTAIN_ID` default) is shared across tenants and stays as-is.

---

## 4. Central auth — allowlist the new subdomain

Auth is shared, so there are **no new providers to configure** — but two consoles key on the
exact domain and must learn the new subdomain:

- **Firebase Console → Authentication → Settings → Authorized domains:** add
  `<id>.mohocats.org`. Without it, sign-in on the new subdomain is rejected.
- **Kakao Developers → your app → redirect URIs:** add the new subdomain's OAuth callback
  (mirror geyang's path on the new host). Skip only if Kakao login isn't offered there.

Phone/SMS and email/password need nothing per-subdomain.

---

## 5. Data — first admin + initial content

- **No backfill.** A new mountain starts empty; every write stamps `mountainId` automatically
  (M4), so there is nothing to migrate. (The one-time geyang backfill was for data that
  predated tenancy — it does not recur.)
- **Bootstrap the first admin (chicken-and-egg).** The in-app role-assignment flow
  (`POST /api/admin/assign-role`) requires an existing `manage-users` admin **on that
  mountain**, which a brand-new mountain has none of. So seed the first admin **directly**:
  set `users/{uid}.roles.<id> = { role: "admin", permissions: [...], isActive: true }` on the
  chosen account via the **Firebase Console** or a one-off **Admin SDK** script. After that,
  further roles on the mountain can be granted normally through the CMS (members/roles).
- **Seed content** (points, cats, cat_images, about, announcements) either through the
  `/admin` CMS while browsing the tenant, or with a seeding script that stamps `mountainId`.
  Uploaded images auto-namespace under `storagePrefix` (§2a).
- **Firestore rules & indexes need no per-mountain work** — the rules are already
  mountain-aware and deployed, and the composite indexes are global (they already exist).
  New content is governed and indexed by the same infrastructure.

---

## 6. Analytics

Analytics is a **single shared GA4 property** (M7). Nothing per-mountain is created — page
views are already sent with a `mountain_id` field. The one prerequisite is global and
one-time: register `mountain_id` as a **custom dimension** in the GA4 console **before** the
new mountain gets traffic (GA4 does not backfill). See the admin manual §9 → Analytics.

---

## 7. about-photos (the only baked media)

Cat thumbnails and album photos ride on live Storage URLs (nothing to build). Only
**about-page photos** are baked: place the tenant's photo per its
`config.about.mainPhoto.localPath` mapping into Storage, and `npm run fetch:assets` (run by
`npm run build`) downloads it into `public/` at deploy. Full model:
[`media-and-youtube.md`](../../codebase/media-and-youtube.md#image-storage--serving-strategy).

---

## 8. Verification checklist

Browse the tenant (subdomain once DNS is live, or `/<id>` before then):

- [ ] Home map renders with the tenant's markers; cat modal opens.
- [ ] Header shows the tenant's `name`; the CTA gradient uses its `theme.primaryColor`
      (and geyang is unchanged).
- [ ] Photo/video galleries and 공지사항 show **only** this tenant's content (isolation).
- [ ] Admin login works on the subdomain (authorized domain + Kakao redirect added); the
      seeded admin can perform a write; a non-member is denied.
- [ ] A 동참 submission arrives at this tenant's `adminEmail`.
- [ ] If `hidden` was set, the tenant is **absent** from the public `MountainSelector` but
      still reachable directly; flip it off to announce.
- [ ] Image optimization: the tenant's Storage host is covered by `next.config.js`
      `remotePatterns` (same bucket → already whitelisted).
- [ ] (Prod) GA4 Realtime shows the pageview tagged with the tenant's `mountain_id`.

---

_Two-tenant isolation is continuously proven by the `manisan` stub + the
`tests/e2e/**/tenant-isolation.spec.ts` suites. When a real second mountain is provisioned,
update PROJECT_PLAN §9 and link back here from [`README.md`](./README.md)._

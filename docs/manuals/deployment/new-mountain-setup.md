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
> ⛔ **Read this first:**
> [`docs/planning/mountain-2-prerequisites.md`](../../planning/mountain-2-prerequisites.md)
> — what must be **fixed or decided** before a second mountain goes live. 🚨 Its **§1.1 is a
> security defect**: `로그아웃` only signs the user out of the origin it runs on, so once a
> second subdomain resolves, logging out of one mountain leaves the session live on the
> other. Also there: `syncVideos()` would claim the shared channel's whole back catalogue for
> whichever mountain syncs first, and the members roster shows every mountain's users. This
> guide is the **how**; that doc is the **gate** — do not provision past it.
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
| _(no `about`)_         | ⚠️ **The about page is not configured here** (removed 2026-08-02). Its copy and 대표 사진 live in Firestore (`about_content/{id}`), written through the `/admin` CMS → 소개 편집. This block used to hold a second copy that shadowed the CMS for the photo; do not add it back. See §7.                                                                                                                                                                                       |
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

👉 **The steps are the owner's** — DNS record and Vercel domain attach are in
[`admin-manual/adding-a-mountain.md`](../admin-manual/adding-a-mountain.md) §1–2. Not
repeated here, so they can't drift.

What matters on the code side: the `domains` entry from §2a is what maps that Host to the
tenant (`src/lib/tenant.ts` `findMountainIdByHost`). Until DNS **and** the config entry are
both live, reach the tenant by path (`/<id>`) on any existing deployment.

**No environment-variable changes.** Every env var (`NEXT_PUBLIC_FIREBASE_*`,
`SERVICE_ACCOUNT_KEY`, SMTP, Kakao/YouTube, `NEXT_PUBLIC_GA_MEASUREMENT_ID`,
`NEXT_PUBLIC_BASE_URL`, `MOUNTAIN_ID` default) is shared across tenants and stays as-is.

---

## 4. Central auth — allowlist the new subdomain

Auth is shared, so there are **no new providers to configure**. Exactly **one** thing keys on
the new host: **Firebase → Authentication → Authorized domains**, which must list the new
subdomain or OAuth/popup sign-in there is rejected. 👉 Step in
[`admin-manual/adding-a-mountain.md`](../admin-manual/adding-a-mountain.md) §3.

⚠️ **Correction (2026-07-28): Kakao needs nothing per-subdomain.** This section previously
said to add a redirect URI per host. Kakao is a Firebase **OIDC** provider (`oidc.kakao`) via
`signInWithPopup`, so its redirect URI is Firebase's fixed handler
(`https://<authDomain>/__/auth/handler`, `src/services/auth-service.ts:150-153`) — constant
across tenants. Kakao never sees the mountain's subdomain.

⚠️ **Authorized domains has no wildcard.** `*.mohocats.org` is not supported by Firebase Auth
(exact-host matching only), and no maximum count is documented. It **is** scriptable, though —
the Identity Toolkit Admin API `PATCH
https://identitytoolkit.googleapis.com/admin/v2/projects/{PROJECT_ID}/config?updateMask=authorizedDomains`
takes the full list, and this project already holds a service account (`SERVICE_ACCOUNT_KEY`).
Worth automating if mountain count ever grows past a handful.

Phone/SMS and email/password need nothing per-subdomain.

---

## 5. Data — first admin + initial content

- **No backfill.** A new mountain starts empty; every write stamps `mountainId` automatically
  (M4), so there is nothing to migrate. (The one-time geyang backfill was for data that
  predated tenancy — it does not recur.)
- **Bootstrap the first admin (chicken-and-egg).** The in-app role-assignment flow
  (`POST /api/admin/assign-role`) requires an existing `manage-users` admin **on that
  mountain**, which a brand-new mountain has none of — so the first one is seeded directly
  onto `users/{uid}.roles.<id>`. 👉 Console steps in
  [`admin-manual/adding-a-mountain.md`](../admin-manual/adding-a-mountain.md) §6; a one-off
  Admin SDK script does the same thing if you'd rather not click. After that, further roles
  are granted normally through the CMS.
- **Seed content** (points, cats, cat_images, announcements) either through the
  `/admin` CMS while browsing the tenant, or with a seeding script that stamps `mountainId`.
  The **about page is CMS-only** — see §7 for its two steps.
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

## 7. The about page (CMS-authored, nothing baked)

**Nothing about this page is built or configured** — it is entered in the CMS, and a new
mountain therefore needs one manual step:

1. Upload the 대표 사진 to Storage at **`about-photos/{id}/{filename}`** (any name; it is
   matched by the filename you type next).
2. Browse the tenant, open **`/admin` → 소개 편집**, and fill in 제목 / 부제 / 본문 plus the
   photo's **파일 이름**, 설명 and 대체 텍스트. Saving writes `about_content/{id}`.

Until step 2 the page renders **"아직 소개가 준비되지 않았어요."** — that is the intended
not-set-up state, not a fault. ⚠️ The 파일 이름 is free text matched against Storage: a
typo renders "사진을 불러오지 못했어요" with no other warning, so check the page after saving.

📌 **Changed 2026-08-02.** About photos used to be the one baked medium — downloaded into
`public/` by `npm run fetch:assets` and served from a path written back into
`mountains.json`. That made static config, not the CMS, the real source of the image, so
changing the photo in the CMS kept rendering the old one. They now ride live Storage URLs
like cat thumbnails and album photos, and **no media is baked any more**. Full model:
[`media-and-youtube.md`](../../codebase/media-and-youtube.md#image-storage--serving-strategy).

---

## 8. Verification checklist

Browse the tenant (subdomain once DNS is live, or `/<id>` before then):

- [ ] Home map renders with the tenant's markers; cat modal opens.
- [ ] `/pages/about` shows the 소개 written in the CMS **and its photo loads** (§7) — not
      "아직 소개가 준비되지 않았어요" and not "사진을 불러오지 못했어요".
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

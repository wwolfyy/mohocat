# Onboarding a New Mountain (Tenant) — Provisioning Guide

> **STATUS: 🚧 PLACEHOLDER — outline only, not yet written.** This is a skeleton for
> the end-to-end, developer-facing runbook to stand up a **new mountain** (tenant):
> Firebase project, domain, Vercel project + env vars, and app config. Fill each
> section when we actually do a second-mountain provisioning; until then it captures
> the intended scope so nothing is forgotten.
>
> **Audience:** developer / operator provisioning infrastructure (not the CMS operator
> — that's [`docs/manuals/admin-manual/`](../admin-manual/README.md)).
>
> **Companion docs:** [`README.md`](./README.md) (how deploys work today) ·
> `config/mountains/mountains.json` (per-mountain config) · `src/utils/config.ts`
> (config accessors) · [`docs/planning/PROJECT_PLAN.md`](../../planning/PROJECT_PLAN.md) §9
> (multi-tenant hardening — the gaps below).

---

## ⚠️ Read first: multi-tenancy is not fully real yet

The app is **multi-tenant _ready_** (a `MOUNTAIN_ID` drives config/theme/features), but
several paths are still **single-mountain hard-coded**, so a clean second-mountain
bring-up will hit gaps. Before/while writing this guide, resolve or account for
**PROJECT_PLAN §9**:

- `?mountain=` switch is a no-op (`getCurrentMountainId()` reads env only).
- Hard-coded service-account path + bucket fallbacks (`feeding-spots-admin-service.ts`,
  `generate-signed-url`, fetch-assets).
- Hard-coded map image path in the map host (should come from mountain config).
- `mountains.json` vs `permissions.json` drift.
- Theme not wired through (`getMountainTheme()` colors are unread).
- No per-mountain DB isolation at the service-factory seam.

> **TODO:** decide the tenancy model first — one Firebase project with per-mountain
> collections, vs one Firebase project **per** mountain, vs one Vercel project per
> mountain. The rest of this guide branches on that decision.

---

## 1. Prerequisites

> **TODO:** accounts/access needed (Firebase, Vercel, domain registrar, Google Cloud for
> YouTube/Storage), CLI tooling (`firebase-tools`, `vercel` if used), required roles.

## 2. Tenancy model decision

> **TODO:** document the chosen model (see the warning above) and its implications for
> everything below. This section gates the others.

## 3. Firebase setup

> **TODO:**
>
> - Create / choose the Firebase project.
> - Firestore: database, indexes, and **deploy security rules**
>   (`firebase deploy --only firestore:rules` — owner-run; see admin manual §8).
> - Auth providers: email/password, phone (SMS), **Kakao OIDC** (per-tenant client IDs?).
> - Storage: bucket, CORS, public-URL strategy.
> - Service account (`SERVICE_ACCOUNT_KEY`) for the Admin SDK.
> - Seed data: points, initial cats, about content (or migration scripts).

## 4. Domain setup

> **TODO:**
>
> - Register / choose the domain (or subdomain per mountain?).
> - DNS records; attach to Vercel; TLS.
> - `NEXT_PUBLIC_BASE_URL`, `YOUTUBE_REDIRECT_URI`, and any OAuth redirect allowlists
>   that embed the domain.

## 5. Vercel project & environment variables

> **TODO:** whether it's a new Vercel project or the same project with a different env
> scope. Enumerate every env var and its per-mountain value:
>
> - `MOUNTAIN_ID` / `NEXT_PUBLIC_MOUNTAIN_ID`
> - `NEXT_PUBLIC_FIREBASE_*` (API key, auth domain, project id, storage bucket, sender id,
>   app id)
> - `SERVICE_ACCOUNT_KEY`
> - SMTP (`SMTP_HOST/PORT/USER/PASSWORD/FROM`) for 동참 email
> - `NEXT_PUBLIC_BASE_URL`, `YOUTUBE_*` (auth/redirect), Kakao keys, etc.
>
> Cross-reference the canonical list in `_infra/_terraform/_terraform.tfvars.example` and
> [`README.md`](./README.md) → "Environment variables". Note: Vercel bakes env at build
> time — **redeploy** after changes.

## 6. App configuration

> **TODO:**
>
> - Add the mountain to `config/mountains/mountains.json` (branding, theme, features,
>   social, `adminEmail`, optional `map`).
> - **`map` block** (optional) — the mobile marker-**clustering** knobs, and the **whole-mountain
>   lever** for cluttered pins (the per-pin levers — coordinates & label side — are CMS edits, no
>   config): `map.clustering` (`true`/`false`, default `true`) and `map.maxClusterRadius` (screen
>   pixels, default `50`). Omit to inherit `DEFAULT_MAP_CONFIG`. Baked at build → redeploy to change.
>   See [`deployment/README.md` → Map clustering](./README.md#map-clustering--per-mountain-config-values).
> - Confirm `getMountainConfig()` / `isFeatureEnabled()` resolve it.
> - Map image asset + its (currently hard-coded) path — see §9 gap.

## 7. Build & assets

> **TODO:** `npm run fetch:assets` sources thumbnails/about-photos from **this tenant's**
> Storage bucket (verify it's not hard-coded to the default bucket — §9 gap). First build
> / deploy walkthrough.

## 8. Verification checklist

> **TODO:** a concrete post-provisioning smoke list — home map + markers, cat modal,
> galleries, admin login + a write, 동참 submission + email, rules enforcement, image
> optimization domains whitelisted in `next.config.js`.

---

_When this guide is written for real, update PROJECT_PLAN §9 status and link it from
there and from [`README.md`](./README.md)._

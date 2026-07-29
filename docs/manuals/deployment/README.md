# Deployment

> Single source of truth for **how this app is deployed today.** Start here.
>
> _Standing up a **new mountain** (Firebase / domain / Vercel env from scratch)? See the
> provisioning skeleton: [`new-mountain-setup.md`](./new-mountain-setup.md) (🚧 placeholder)._

## TL;DR — the current process is just `git push`

There is **no deploy command** and **no IaC in the loop**. Vercel's GitHub integration watches
the repo and builds on push:

| Branch                | Vercel environment      | URL                               |
| --------------------- | ----------------------- | --------------------------------- |
| `main`                | **Production**          | production domain                 |
| `dev`                 | **Preview** ("staging") | staging domain (pinned to `dev`)  |
| any PR / other branch | Preview                 | per-deployment `*.vercel.app` URL |

Everything Vercel needs to build is **already in the repo** (`next.config.js`, the
`vercel-build` script = `fetch-static-assets.js && next build`). The only things configured
_outside_ the repo are **environment variables**, set **by hand in the Vercel dashboard**
(Settings → Environment Variables), scoped to Production + Preview.

So a normal deploy is:

```bash
git push origin dev     # → Preview build
# merge/push to main    # → Production build
```

## Environment variables

Managed **manually in the Vercel dashboard** (not by Terraform — see below). The full set is
documented as a blueprint in `_infra/_terraform/_terraform.tfvars.example`. When you add or
change one:

1. Vercel dashboard → project → **Settings → Environment Variables** → add/edit, scope
   **Production + Preview** (or env-specific where appropriate, e.g. `NEXT_PUBLIC_BASE_URL`,
   `YOUTUBE_REDIRECT_URI`).
2. **Redeploy** — Vercel bakes env vars at build time and does **not** retro-apply changes to
   existing deployments.

For **local dev**, mirror the values into a gitignored `.env` (see `.env` / `.env.local`).

### 동참 (contact) / SMTP — the most recent addition

The contact route (`src/app/api/contact/route.ts`) needs five SMTP vars in Vercel
(Production + Preview) **and** in local `.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<gmail address>
SMTP_PASSWORD=<gmail App Password, no spaces>
SMTP_FROM=<same gmail address>
```

(Gmail App Password setup is in the walkthroughs, §7/§8.) Everything else the route needs —
`SERVICE_ACCOUNT_KEY`, the recipient `adminEmail` (from `config/mountains/mountains.json`) —
is already in place.

## ISR revalidation — the `revalidate` (N) value is hardcoded in the codebase

The landing + 입양홍보 pages are baked (SSG) and refreshed with **ISR**. Freshness is **hybrid**:
admin cat-edits trigger **on-demand revalidation** (instant), backed by a **time-based fallback
`revalidate = N`** (currently **3600s / 1h**) that bounds staleness for out-of-band changes
(Firebase-console edits, `update:*`/migration scripts, a dropped revalidate call).

**N is hardcoded in the source — not an env var, not a config file, not a Vercel dashboard
setting.** Next.js requires the route-segment `revalidate` to be statically analyzable, and an
env var would still need a redeploy to take effect while hiding the value from the repo. It
lives as `export const revalidate` in **two route segments** (kept in sync; the value is
single-sourced in `src/lib/cache-config.ts` → `REVALIDATE_SECONDS`):

1. `src/app/page.tsx` — landing
2. `src/app/pages/adoption/page.tsx` — 입양홍보

**To change N:** edit the value (one literal) and `git push` → Vercel rebuilds. There is no
runtime dial; a rebuild/redeploy is required either way.

## Map clustering — per-mountain config values

> **One of three ways to declutter overlapping pins.** The other two are **per-pin CMS edits**
> (no redeploy) — moving a pin's **coordinates**, or flipping a single pin's **label side** — done
> in 급식소 관리 (`/admin/points`); see the admin manual
> ([§4 → Three ways to fix cluttered pins](../admin-manual/README.md#three-ways-to-fix-cluttered--overlapping-pins)).
> **Clustering (below) is the whole-mountain lever** and, unlike those two, is a **baked config
> value → needs a redeploy.** Reach for it when a mountain simply has many pins packed together.

On the **mobile** map, nearby feeding-point markers can collapse into a single cluster badge
(tap to fan the members out). Two per-mountain knobs live in the `map` block of
`config/mountains/mountains.json`:

```json
"map": {
  "clustering": true,
  "maxClusterRadius": 50
}
```

- **`clustering`** (`true` / `false`) — turn clustering **on or off** for this mountain.
  `true` (default) clusters nearby points; `false` renders **every** point as its own pin on
  mobile (they may overlap where points sit close together). Off is a good fit for a mountain
  with only a few, well-separated feeding points, where the extra tap-to-expand is just friction.
- **`maxClusterRadius`** — when clustering is on, the **screen-pixel** radius (measured at the
  fill/default view) within which points group into one cluster. Larger = collapses points that
  are farther apart; smaller = keeps them separate longer. Ignored when `clustering` is `false`.
  _(The grouping is computed once by our own static clusterer — `src/utils/mapClustering.ts` —
  and never re-clusters on zoom; it is **not** `leaflet.markercluster`.)_
- **Mobile only.** The desktop map is always un-clustered, so neither value affects it.
- **Omitting the `map` section (or either field) is fine** — the code falls back to
  `DEFAULT_MAP_CONFIG` (`clustering: true`, `maxClusterRadius: 50`) in `src/utils/config.ts`.

**To change either:** edit `config/mountains/mountains.json` and `git push` → Vercel rebuilds.
Both values live in a config file (not a source literal), but they're still **baked at build**,
so a redeploy is required for a change to take effect — there is no runtime dial. Read/exposed via
`getMapConfig()`.

## Things that deploy _outside_ Vercel

- **Firestore security rules** — deployed via the Firebase CLI, not Vercel:

  ```bash
  firebase deploy --only firestore:rules
  ```

  (e.g. the `contacts` `create: if false` rule for 동참.)

  **`firebase` not found?** The CLI (`firebase-tools`) is a **local devDependency** of
  this repo, not a global install — so a bare `firebase …` only works if you've
  installed it globally. From the repo root, run it through the local copy instead
  (both forms invoke the same binary; `firebase-tools` is the npm package name,
  `firebase` is the binary it provides):

  ```bash
  npx firebase deploy --only firestore:rules        # or: npx firebase-tools deploy --only firestore:rules
  ```

  It's not an env/venv thing — nothing to "activate." To get the bare command,
  install globally with `npm install -g firebase-tools` (the command is still
  `firebase`, not `firebase-tools`).

  **First-time / prod-target checks** (the deploy targets the **real** project, not
  the `demo-mohocat` emulator project the tests use):

  ```bash
  npx firebase login:list          # authenticated? otherwise: npx firebase login
  npx firebase use                 # confirm the active project (or pass --project <id>)
  ```

- **Storage bucket CORS** — `config/firebase/cors_fbstorage.json`, applied with an npm
  script (**not** the Firebase CLI, and no `gcloud` install needed):

  ```bash
  npm run storage:cors                                  # dry run: prints live vs desired
  APPLY=true CONFIRM_PROJECT=mountaincats-61543 npm run storage:cors   # apply
  ```

  Dry-run by default, because `setCorsConfiguration` **replaces** the whole list rather
  than merging. It prints the live config, the desired config, and the origin-level diff,
  then reads back what actually landed. Uses the `@google-cloud/storage` client that
  `firebase-admin` already ships with, and the same service-account credential as the
  other maintenance scripts.

  <details>
  <summary>Equivalent with the Google Cloud SDK, if you have it</summary>

  ```bash
  gcloud storage buckets update gs://mountaincats-61543.firebasestorage.app \
    --cors-file=config/firebase/cors_fbstorage.json

  gcloud storage buckets describe gs://mountaincats-61543.firebasestorage.app \
    --format="default(cors_config)"
  ```

  </details>

  🚨 **This gates 집사톡 image upload, and it is easy to miss.** Those images are PUT
  from the **browser straight to the bucket** with a signed URL (`generate-signed-url`),
  so the bucket's own CORS list decides which origins may upload. Until 2026-07-29 that
  list held **only `http://localhost:3000`** — so the upload worked in dev and failed on
  every deployed origin with a bare `TypeError: Failed to fetch`, which names neither
  CORS nor the bucket (`log/DEBUG_LOG.md`).
  - 공지사항 / 입양홍보 images are **not** affected: they go through the Firebase JS SDK,
    which uses a different endpoint that doesn't consult this list. Only the signed-URL
    path does — so "images upload fine over there" proves nothing about this.
  - ⚠️ **No wildcards.** GCS matches origins exactly: `*.vercel.app` does not work. The
    list therefore names each environment — `http://localhost:3000` (local),
    `https://dev.mohocats.org` (the `dev` branch on Vercel) and `https://mohocats.org`
    (production). A one-off PR preview on a per-deployment `*.vercel.app` URL is **not**
    covered: test the upload path on `dev.mohocats.org` rather than adding a URL that
    changes on the next push.
  - 📌 **One origin per _environment_, never per mountain.** Tenancy is **path-based**
    (`mohocats.org/manisan`), so a new mountain adds a _path_ and nothing here changes when
    one is provisioned. `dev.` earns its place as an environment; per-mountain subdomains do
    not — `geyangsan.` / `manisan.mohocats.org` are **NXDOMAIN** and stay that way (decision
    `tenancy-url-model-decision-20260728.md`). `mountains.json` still carries a `domains`
    field because host resolution hasn't been retired yet; that is not evidence those hosts
    exist.
  - The origin list is not a security boundary — the short-lived signed URL is the
    credential, and minting one already requires `manage-photo`. It only decides which
    browser origins may present it.

## Whitelisting a new domain with the auth / identity providers

When you add or change a domain (see the deploy checklist below), several **external consoles**
must learn about it — these are separate from Vercel + DNS, and missing one breaks the matching
sign-in / share flow silently. Add the new domain in **every** place below for each domain that
should work (production apex, `staging.` subdomain, etc.).

> Quick reference for which paths actually matter: only **`/api/admin/youtube-auth/callback`**
> is a live Google OAuth redirect (the YouTube admin flow). Kakao login redirects to the
> **Firebase** auth handler (`…firebaseapp.com/__/auth/handler`), not the app domain — which is
> why Kakao only needs the two domain-list places below, not a per-domain redirect URI.

### Kakao (developers.kakao.com → app **산냥이집냥이**, ID 1338934)

**How login works here:** the app signs in via **Firebase OIDC**
(`OAuthProvider('oidc.kakao')` + `signInWithPopup`, in `src/services/auth-service.ts`) using the
Kakao **REST API key** as the client ID (`NEXT_PUBLIC_KAKAO_CLIENT_ID`). It does **not** load the
Kakao **JavaScript SDK**. The only login-load-bearing Kakao setting is the **로그인 리다이렉트
URI**, and it points at the **Firebase** handler
(`https://mountaincats-61543.firebaseapp.com/__/auth/handler`), **not** the app domain — so a new
app domain does **not** require a redirect-URI change.

Domain-list places (both under **앱 설정 → 앱**) — the new domain is currently added in both:

1. **제품 링크 관리 → 웹 도메인** — click **웹 도메인 수정** and add `https://<domain>`. Kakao
   strips any path (domain/origin only); one entry is the **기본 (default)**. Governs Kakao
   share / Kakao-message link navigation.
2. **플랫폼 키 → JavaScript 키 → JS SDK 도메인** — `https://<domain>` is registered here too, but
   is **likely optional**: this app doesn't use the Kakao JS SDK, and login worked with it
   registered (not tested without). Kept for completeness; safe to leave, probably safe to drop.

### Google OAuth (Google Cloud Console → APIs & Services → Credentials)

Open the **OAuth 2.0 Client ID named `mtcats`** (Web application, client ID `266233773870-f3ih…`)
— **not** the "Web client (auto created by Google Service)", which is Firebase's own client for
Google sign-in. On the client page use **+ Add URI** under each field, for every domain that runs
the **admin YouTube upload** flow:

- **Authorized redirect URIs** (load-bearing): `https://<domain>/api/admin/youtube-auth/callback`
  — the **only** redirect path the app actually uses (the YouTube admin flow; built from
  `NEXT_PUBLIC_BASE_URL`, so set that env var to match the domain per environment). The
  bare-origin, `/oauth/callback`, and `/__/auth/handler` entries already in the list are
  **vestigial** (see the redirect-URI audit above).
- **Authorized JavaScript origins**: `https://<domain>` (exact origin; no wildcards). The client
  lists every domain's origin, but the app has no confirmed browser-side Google API call (YouTube
  auth is server-side), so this is likely belt-and-suspenders — add it to match the existing
  pattern; not confirmed load-bearing.

_(Adding a URI auto-adds its domain to the OAuth consent screen's authorized domains.)_

### Firebase Auth (Firebase console → **Authentication → Settings → Domains → Authorized domains**)

Click **Add domain** and enter the **bare host** — no scheme, no path (e.g. `mohocat.org`,
`staging.mohocat.org`). `localhost` and the two project defaults
(`mountaincats-61543.firebaseapp.com`, `…web.app`) are **Default**; anything you add lists as
**Custom**. It's an exact-host allowlist — subdomains are **not** inherited from the apex, so each
host is listed separately. Required for Phone, Google, and third-party (Kakao OIDC) auth redirects.

## Terraform — parked, not in use

There **was** a Terraform config (`infra/terraform/`) intended to manage the Vercel project +
env vars. It is **not currently used for anything** — earlier `apply`s errored, state was
never persisted, and the project + env vars are managed by hand instead. To make that status
obvious the directory is parked as **`_infra/_terraform/`** with underscore-prefixed files
(`_main.tf`, `_variables.tf`, `_outputs.tf`, `_terraform.tfvars.example`).

It's kept as a **blueprint** (it documents exactly which env vars the project should have) and
a head start if adoption ever becomes worthwhile. **When would it?** — multi-tenant going real
(per-mountain Vercel projects via `MOUNTAIN_ID`), collaborators needing reviewable config,
audit/compliance, or frequent infra churn. Until one of those, the dashboard + `git push`
workflow is the right call for a single-maintainer single-project setup.

If/when you reactivate it, see:

- [`vercel-terraform-walkthrough.md`](./vercel-terraform-walkthrough.md) — **adoption** path:
  the project + ~20 env vars already exist in Vercel, so it covers the `terraform import` pass
  needed to bring them under management.
- [`vercel-terraform-greenfield.md`](./vercel-terraform-greenfield.md) — **from-scratch** path:
  nothing exists in Vercel yet, so Terraform creates everything (no imports).

## Deploy checklist (current process)

1. Land code on `dev` (preview) / `main` (production) → Vercel auto-builds.
2. New/changed env vars → set in the **Vercel dashboard** (+ local `.env`) → redeploy.
3. Firestore rule changes → `firebase deploy --only firestore:rules`.
4. New custom domain → add in Vercel **Settings → Domains** + DNS at the registrar, then
   whitelist it in Kakao / Google OAuth / Firebase Auth — see **"Whitelisting a new domain with
   the auth / identity providers"** above for the exact places.

**One-off cutovers with a data migration + rules change** are order-critical (a rules
deploy can outrun the app code / data it depends on). The multi-mountain M5 cutover has a
worked runbook: [`m5-prod-cutover-runbook.md`](./m5-prod-cutover-runbook.md).

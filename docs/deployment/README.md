# Deployment

> Single source of truth for **how this app is deployed today.** Start here.

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

## Things that deploy _outside_ Vercel

- **Firestore security rules** — deployed via the Firebase CLI, not Vercel:
  ```bash
  firebase deploy --only firestore:rules
  ```
  (e.g. the `contacts` `create: if false` rule for 동참.)

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
   whitelist it in Firebase Auth / Google OAuth / Kakao (see the walkthroughs §6).

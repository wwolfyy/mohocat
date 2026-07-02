# Deploying to Vercel with Terraform — Greenfield Walkthrough

> ⚠️ **NOT THE CURRENT PROCESS.** Terraform is **not used** for deployment today (see
> [`README.md`](./README.md) for what actually runs). The Terraform config is parked under
> **`_infra/_terraform/`** (underscore-prefixed = stale), files renamed `_main.tf`,
> `_variables.tf`, etc. This guide is kept **for future consideration**; paths below use the
> historical `infra/terraform/` names — translate to `_infra/_terraform/_*` if reactivating.

> **Audience:** someone deploying this repo to Vercel **from scratch** — assume the project
> has **never** been deployed and **nothing** exists in Vercel yet.
> **Scope:** `infra/terraform/` (Vercel is the only deployment target).
>
> Already have a project + hand-set env vars in Vercel? Use the adoption guide instead:
> [`vercel-terraform-walkthrough.md`](./vercel-terraform-walkthrough.md) (it covers the
> `terraform import` pass). This greenfield guide assumes a clean slate, so **no imports** —
> Terraform creates everything.

---

## 0. What Terraform will create

From `infra/terraform/main.tf`, a single `terraform apply` provisions, in Vercel:

- the **project** (`vercel_project.mohocat`), linked to your GitHub repo, framework = Next.js;
- the **staging domain** pinned to the `dev` branch (`vercel_project_domain.staging`);
- all **environment variables** — shared across Production + Preview (`shared_envs`), plus
  environment-specific ones (`NEXT_PUBLIC_BASE_URL`, `YOUTUBE_REDIRECT_URI` for prod vs. dev).

After that, Vercel's Git integration drives CI/CD automatically: **`main` → Production**,
**`dev` / PRs → Preview**.

---

## 1. Prerequisites

- **Terraform CLI** ≥ 1.5 — `brew install terraform`.
- **A Vercel account**, and the **Vercel GitHub App installed** on the account/org that owns
  the repo (Vercel needs repo read access before Terraform can link it):
  https://vercel.com/account → "Login Connections" / install from
  https://github.com/apps/vercel.
- **Vercel API token** — https://vercel.com/account/tokens.
- **The app's secrets** ready to paste (Firebase client config + Admin SDK service account
  JSON, YouTube OAuth, Kakao OAuth, SMTP). These come from your `.env` and the respective
  provider consoles. For the **Gmail App Password** used by SMTP, see §7.
- **Custom domains** (optional but assumed here), and access to their **DNS** registrar.

---

## 2. Fill in `terraform.tfvars`

The committed `terraform.tfvars.example` is a template. Copy it and supply real values; the
copy is **gitignored** (`.gitignore` → `infra/terraform/terraform.tfvars`) — never commit it.

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars — replace every PLACEHOLDER_* with a real value
```

Key fields (see `variables.tf` for the full list):

| Variable                               | What it is                                             |
| -------------------------------------- | ------------------------------------------------------ |
| `vercel_api_token`                     | Token from §1                                          |
| `vercel_project_name`                  | Name the project will have in Vercel                   |
| `github_repo`                          | `owner/repo` (e.g. `jaesangpark/mohocat`)              |
| `production_domain` / `staging_domain` | Your custom domains (prod on `main`, staging on `dev`) |
| `service_account_key`                  | Firebase Admin SDK JSON as a **single-line** string    |
| `firebase_*`, `youtube_*`, `kakao_*`   | Provider configs                                       |
| `smtp_host/port/user/password/from`    | Gmail SMTP for 동참 notifications (§7)                 |
| `mountain_id`                          | `geyang`                                               |

> **Note on the build:** Vercel runs `vercel-build` = `fetch-static-assets.js && next build`.
> The asset fetch pulls cat thumbnails/about-photos from **Firebase Storage**, so the Firebase
> config values above must be correct or the build fails. No Node version is pinned in
> `package.json`; set Vercel's project Node version to a current LTS if the default ever
> drifts.

---

## 3. (Recommended) Configure durable state before the first apply

`main.tf` ships with **no `backend` block**, so by default state is a local
`terraform.tfstate` file (gitignored). For a solo maintainer that's workable **if you never
lose that file**; for anything else, configure a remote backend now (before `init`) so state
survives machine changes:

```hcl
# add inside the top `terraform {}` block in main.tf
cloud {
  organization = "your-org"
  workspaces { name = "mohocat" }
}
```

(Or an S3/GCS backend.) Remote state holds plaintext secrets — keep the backend private and
encrypted.

---

## 4. Init, plan, apply

```bash
cd infra/terraform
terraform init      # downloads the vercel/vercel provider (~> 2.0)
terraform plan      # greenfield → everything shows as "+ create", "0 to destroy"
terraform apply     # type 'yes' to provision
```

A clean greenfield plan creates the project, the domain(s), and every env var — **no
`~ update` or `- destroy`**. If you instead see "already exists" errors, the slate wasn't
actually clean (a project/vars exist in Vercel) → switch to the
[adoption guide](./vercel-terraform-walkthrough.md) and import them.

On success, `terraform output` prints the project ID and the production/staging URLs.

---

## 5. Point DNS at Vercel

Terraform told Vercel to _expect_ your custom domains, but you must add the DNS records at
your registrar:

1. In the Vercel dashboard → project → **Settings → Domains**, Vercel shows the exact records
   (usually a `CNAME` to `cname.vercel-dns.com`, or `A`/`ALIAS` for an apex domain).
2. Add those records at your registrar (Namecheap/GoDaddy/Route53/…).
3. Wait for propagation; Vercel auto-issues TLS once the records resolve.

Until DNS resolves, deployments are still reachable on the auto-generated `*.vercel.app` URLs.

---

## 6. Whitelist the domains in third-party services (crucial for auth)

The app uses Firebase Auth, YouTube OAuth, and Kakao OAuth. Each rejects requests from
un-whitelisted origins, so add **both** the production and staging domains:

1. **Firebase Authentication** — Firebase Console → project → **Authentication → Settings →
   Authorized domains** → add both domains.
2. **Google Cloud (YouTube OAuth)** — Cloud Console → **APIs & Services → Credentials** → edit
   the OAuth 2.0 Client ID:
   - **Authorized JavaScript origins**: both domains.
   - **Authorized redirect URIs**: both domains' `/oauth/callback`.
3. **Kakao Developers** — your app → **Platform → Web**: add both domains to **Site Domain**;
   under **Kakao Login**, add both domains' `/api/auth/kakao/callback` to **Redirect URI**.

(These mirror the `YOUTUBE_REDIRECT_URI` values Terraform set per-environment.)

---

## 7. SMTP / Gmail App Password (for 동참 contact email)

`smtp_user` and `smtp_from` are both **your Gmail address** (the same value — Gmail won't send
"from" an arbitrary address). `smtp_password` is a 16-char **App Password**, not your login:

1. Enable **2-Step Verification** on the Google account (required for App Passwords):
   https://myaccount.google.com/security
2. Create an App Password: https://myaccount.google.com/apppasswords → name it (e.g.
   `mohocat SMTP`) → **Create**.
3. Copy the 16-character value, **remove the spaces**, and put it in `terraform.tfvars` as
   `smtp_password`. Host `smtp.gmail.com`, port `587`.

Gmail is rate-limited (~500/day) with weaker deliverability than a transactional provider —
fine for low-volume admin notices; revisit SendGrid/SES if volume grows.

---

## 8. Deploy Firestore rules (separate from Vercel/Terraform)

Terraform/Vercel does **not** manage Firestore security rules. Deploy them with the Firebase
CLI whenever they change (e.g. the `contacts` rule for 동참):

```bash
firebase deploy --only firestore:rules
```

---

## 9. Trigger the first deployment & verify

Vercel deploys on Git push (it doesn't auto-build at `apply` time):

1. Push to **`dev`** → a Preview build on the staging domain; push/merge to **`main`** →
   Production.
2. Smoke-check the live site: home page renders, login works (Firebase/Kakao), images load
   (Firebase Storage), and submitting `/pages/contact` both records the contact in **admin →
   Contact Management** _and_ emails `adminEmail`.
3. If env vars look missing in a deployment, redeploy — Vercel bakes env vars at build time and
   does **not** retro-apply changes to existing deployments.

---

## 10. Ongoing workflow

- **Code** → push to `dev` (preview) / `main` (production); Vercel builds automatically.
- **Env vars** → edit `terraform.tfvars` (secrets) or `main.tf` (non-secret literals) →
  `terraform apply` → redeploy. **Never** hand-edit env vars in the Vercel dashboard once
  Terraform owns them — that creates drift Terraform will try to revert.
- **New env var** → declare in `variables.tf` → map in `main.tf` (`shared_envs` or a standalone
  resource for env-specific values) → add to `terraform.tfvars` → `apply`.
- **Don't** set `production_branch` (Vercel infers it from the GitHub link) and **don't**
  assign the same domain twice — both have caused apply failures here historically.

```

```

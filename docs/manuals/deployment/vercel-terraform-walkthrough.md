# Deploying to Vercel with Terraform — Walkthrough (given the current circumstances)

> ⚠️ **NOT THE CURRENT PROCESS.** Terraform is **not used** for deployment today — the live
> process is plain `git push` + dashboard-managed env vars (see
> [`README.md`](./README.md)). The Terraform config is parked under **`_infra/_terraform/`**
> (underscore-prefixed = stale) and its files are renamed `_main.tf`, `_variables.tf`, etc.
> This guide is kept **for future consideration** (e.g. multi-tenant or disaster recovery);
> paths below use the historical `infra/terraform/main.tf` names — translate to the
> `_infra/_terraform/_*.tf` equivalents if you reactivate it.

> **Audience:** maintainer adopting Terraform to manage the existing Vercel project.
> **Scope:** `infra/terraform/` (the only deployment target — Vercel; see
> [`../codebase/deployment-and-build.md`](../codebase/deployment-and-build.md)).

## 0. Read this first — what makes _our_ situation special

This is **not** a greenfield setup. The Vercel project and ~20 environment variables
**already exist** (they were created by hand in the Vercel dashboard). Terraform was also
run before and errored partway (`production_branch`, double-domain — both since fixed).

Two facts drive everything below:

1. **No durable state.** `infra/terraform/main.tf` has **no `backend` block**, and
   `terraform.tfstate` is gitignored. There is no committed/remote state, so a fresh
   `terraform apply` would assume _nothing_ exists and try to **create** the project + every
   env var — which collides with the ones already in Vercel ("already exists" errors).
2. **The fix is an import pass.** Before the first real `apply`, you must
   `terraform import` each pre-existing resource so Terraform **adopts** it into state
   instead of recreating it. After that, normal `plan`/`apply` works.

The 5 **new** SMTP variables are the exception — they don't exist in Vercel yet, so they
`apply` cleanly without import.

---

## 1. Prerequisites

- **Terraform CLI** ≥ 1.5 (the `import {}` block + config generation used below need 1.5+):
  `brew install terraform` (macOS).
- **Vercel API token** — https://vercel.com/account/tokens → "Create Token".
- **Your Vercel IDs** (used as import IDs in §4):
  - **Project ID** — Vercel dashboard → project → **Settings → General** → "Project ID"
    (`prj_…`).
  - **Team ID** (only if the project lives under a Team, not your personal account) —
    **Settings → General** of the team (`team_…`). For personal projects, omit it.
- **A Gmail App Password** for SMTP (steps: [`README.md`](./README.md#동참-contact--smtp--the-most-recent-addition)).

---

## 2. Decide where state lives (do this once, up front)

The original breakage was _lost state_. Pick one:

- **Option A — local state (simplest).** State lives in `infra/terraform/terraform.tfstate`
  on your machine, gitignored. Fine for a solo maintainer **as long as you always run from
  the same machine and never delete that file.** Back it up.
- **Option B — remote backend (recommended, durable).** State lives off-machine so it
  survives laptop wipes and is safe for >1 person. e.g. Terraform Cloud (free tier):

  ```hcl
  # add to infra/terraform/main.tf inside the top `terraform {}` block
  cloud {
    organization = "your-org"
    workspaces { name = "mohocat" }
  }
  ```

  (Or an S3/GCS backend if you prefer.) If you choose this, set it up **before** `init`.

> Whichever you pick, **never hand-edit Vercel env vars in the dashboard again** once
> Terraform owns them — that creates drift Terraform will try to revert.

---

## 3. Create `terraform.tfvars` (the real secrets)

Copy the committed template and fill in real values. This file is **gitignored**
(`.gitignore` → `infra/terraform/terraform.tfvars`) — never commit it.

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# then edit terraform.tfvars: replace every PLACEHOLDER_* with the real value
```

Crucially, the values you put here **must match what's already in Vercel** for the existing
vars (otherwise the post-import `plan` will show drift and want to overwrite them). Pull the
current values from your `.env` / the Vercel dashboard. For the SMTP block see
[`README.md`](./README.md#동참-contact--smtp--the-most-recent-addition):

```hcl
smtp_host     = "smtp.gmail.com"
smtp_port     = "587"
smtp_user     = "jaesangpark@gmail.com"          # your Gmail address
smtp_password = "xxxxxxxxxxxxxxxx"               # 16-char Gmail App Password (no spaces)
smtp_from     = "jaesangpark@gmail.com"          # same as smtp_user
```

---

## 4. Initialize + import the existing resources

```bash
cd infra/terraform
terraform init        # downloads the vercel/vercel provider (~> 2.0); sets up the backend
```

### 4a. Get the env-var IDs from Vercel

Each `vercel_project_environment_variable` imports by **`project_id/env_id`** (prefix the
team id if applicable: `team_id/project_id/env_id`). The dashboard hides the per-var `env_id`,
so pull them from the API:

```bash
# Lists every env var with its id, key, and target
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/<PROJECT_ID>/env" | jq '.envs[] | {id, key, target}'
```

Keep that `key → id` mapping handy.

### 4b. Import — the modern way (Terraform 1.5+, recommended)

Create a throwaway `imports.tf` with one block per existing resource, then let Terraform do
it in a single `apply`. Example (fill in the real IDs):

```hcl
# imports.tf  — DELETE this file after the import apply succeeds
import { to = vercel_project.mohocat,        id = "<PROJECT_ID>" }
import { to = vercel_project_domain.staging,  id = "<PROJECT_ID>/<staging_domain>" }

# shared_envs (for_each → address carries the map key in [brackets])
import { to = vercel_project_environment_variable.shared["SERVICE_ACCOUNT_KEY"],            id = "<PROJECT_ID>/<env_id>" }
import { to = vercel_project_environment_variable.shared["NEXT_PUBLIC_FIREBASE_API_KEY"],   id = "<PROJECT_ID>/<env_id>" }
import { to = vercel_project_environment_variable.shared["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"], id = "<PROJECT_ID>/<env_id>" }
import { to = vercel_project_environment_variable.shared["NEXT_PUBLIC_FIREBASE_PROJECT_ID"],  id = "<PROJECT_ID>/<env_id>" }
import { to = vercel_project_environment_variable.shared["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"], id = "<PROJECT_ID>/<env_id>" }
import { to = vercel_project_environment_variable.shared["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"], id = "<PROJECT_ID>/<env_id>" }
import { to = vercel_project_environment_variable.shared["NEXT_PUBLIC_FIREBASE_APP_ID"],    id = "<PROJECT_ID>/<env_id>" }
import { to = vercel_project_environment_variable.shared["NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"], id = "<PROJECT_ID>/<env_id>" }
import { to = vercel_project_environment_variable.shared["YOUTUBE_CLIENT_ID"],              id = "<PROJECT_ID>/<env_id>" }
import { to = vercel_project_environment_variable.shared["YOUTUBE_CLIENT_SECRET"],          id = "<PROJECT_ID>/<env_id>" }
import { to = vercel_project_environment_variable.shared["YOUTUBE_REFRESH_TOKEN"],          id = "<PROJECT_ID>/<env_id>" }
import { to = vercel_project_environment_variable.shared["NEXT_PUBLIC_YOUTUBE_API_KEY"],    id = "<PROJECT_ID>/<env_id>" }
import { to = vercel_project_environment_variable.shared["NEXT_PUBLIC_KAKAO_CLIENT_ID"],    id = "<PROJECT_ID>/<env_id>" }
import { to = vercel_project_environment_variable.shared["NEXT_PUBLIC_KAKAO_CLIENT_SECRET"], id = "<PROJECT_ID>/<env_id>" }
import { to = vercel_project_environment_variable.shared["NEXT_PUBLIC_KAKAO_OAUTH_ENABLED"], id = "<PROJECT_ID>/<env_id>" }
import { to = vercel_project_environment_variable.shared["MOUNTAIN_ID"],                    id = "<PROJECT_ID>/<env_id>" }

# Standalone, environment-specific vars
import { to = vercel_project_environment_variable.base_url_production,            id = "<PROJECT_ID>/<env_id>" }
import { to = vercel_project_environment_variable.youtube_redirect_uri_production, id = "<PROJECT_ID>/<env_id>" }
import { to = vercel_project_environment_variable.base_url_staging,               id = "<PROJECT_ID>/<env_id>" }
import { to = vercel_project_environment_variable.youtube_redirect_uri_staging,   id = "<PROJECT_ID>/<env_id>" }
```

> **Do NOT add import blocks for the 5 SMTP vars** — they don't exist in Vercel yet.

Then:

```bash
terraform plan      # shows what will be imported + any drift
terraform apply     # performs the imports, and CREATES the 5 new SMTP vars
rm imports.tf       # imports are one-shot; remove the file afterward
```

### 4b-alt. Import — the CLI way (any Terraform version)

If you're on < 1.5, run one command per resource instead:

```bash
terraform import vercel_project.mohocat "<PROJECT_ID>"
terraform import 'vercel_project_environment_variable.shared["SERVICE_ACCOUNT_KEY"]' "<PROJECT_ID>/<env_id>"
# … repeat for every key in the list above …
```

---

## 5. Reconcile drift, then apply

```bash
terraform plan
```

Read the plan carefully:

- **`5 to add` (the SMTP vars), `0 to change`, `0 to destroy`** → perfect. Adopt complete.
- **`~ update` on an existing var** → the value in your `terraform.tfvars` differs from what's
  live in Vercel (drift). Decide the source of truth: usually fix `terraform.tfvars` to match
  Vercel, _unless_ you intend Terraform's value to win.
- **`- destroy` / `+ create` on something you imported** → an **address mismatch** (e.g. a
  `for_each` key typo, or a target/`git_branch` that doesn't match the real var). Fix the
  config/import to point at the right resource — do **not** apply a destroy you didn't intend.

When the plan is clean:

```bash
terraform apply
```

---

## 6. The new SMTP vars + verifying 동참 email

`terraform apply` (§4b/§5) pushes `SMTP_HOST/PORT/USER/PASSWORD/FROM` to Vercel for both
**Production** and **Preview**. Then verify the contact flow end-to-end:

1. Trigger a redeploy (push to `dev` for preview, or `main` for production) so the new env
   vars are baked into a fresh deployment — **Vercel does not retro-apply env changes to
   existing deployments.**
2. Sign in, submit `/pages/contact`. Expect: the contact appears in **admin → Contact
   Management** _and_ an email lands at `adminEmail` (`jaesangpark@gmail.com`).
3. If the record saves but no email arrives, check the function logs — the route returns
   `emailDelivered: false` and logs the SMTP error (see `src/app/api/contact/route.ts`).

Also remember the separate, non-Terraform step: **Firestore rules**
(`firebase deploy --only firestore:rules`) — the `contacts` `create: if false` change must be
deployed via the Firebase CLI; Terraform/Vercel doesn't handle it.

---

## 7. Ongoing workflow & gotchas

- **Change a var** → edit `terraform.tfvars` (or `main.tf` for non-secret literals) →
  `terraform apply` → redeploy. Never edit it in the dashboard (drift).
- **Add a var** → declare in `variables.tf` → map in `main.tf` `shared_envs` (or a standalone
  resource for env-specific values) → add to `terraform.tfvars` → `apply`.
- **`production_branch` / domains:** don't set `production_branch` (Vercel infers it from the
  GitHub connection — this caused an earlier failure), and don't assign the same domain twice
  (the other earlier failure).
- **Secrets hygiene:** real values live only in `terraform.tfvars` (gitignored) and remote
  state. State contains plaintext secrets — if using a remote backend, ensure it's private
  and encrypted.

---

## 8. Gmail App Password (for the SMTP vars) — **moved**

➡️ **The App Password procedure now lives in
[`README.md` → 동참 (contact) / SMTP](./README.md#동참-contact--smtp--the-most-recent-addition),
beside the env vars it configures. Use that copy.**

📌 **Why it moved (2026-08-06):** it was the only live, routinely-needed instruction inside
this **parked** Terraform document, so the person setting up SMTP had to read a workstream
that is explicitly not the deployment path — and it referenced the pre-rename
`infra/terraform` directory. The README version is also fuller: it covers checking the
credential with `npm run smtp:verify` before touching Vercel, and the traps that have actually
bitten (the `SMTP_FROM`/`SMTP_USER` rewrite, revocation on a 2SV change, pasting a trailing
`# comment` into the Vercel dashboard, and needing a redeploy).

For this document's purposes only: `smtp_user` and `smtp_from` are both the same Gmail address,
and `smtp_password` is the 16-character App Password with spaces removed — stored only in
`terraform.tfvars` (gitignored) and never committed.

```

```

# Vercel Deployment via Terraform Guide

This guide covers how to deploy the Mountaincats Next.js application to Vercel and set up a CI/CD pipeline using Terraform.

## Prerequisites

1. **Vercel Account**: Register/log in to [Vercel](https://vercel.com).
2. **GitHub Account**: Your codebase must be in a GitHub repository linked to your Vercel account.
3. **Terraform**: Install [Terraform](https://developer.hashicorp.com/terraform/downloads) CLI on your machine.
4. **Vercel API Token**: Generate one at [Vercel Tokens](https://vercel.com/account/tokens) to allow Terraform to authenticate with your Vercel account.

---

## 1. Directory Structure

Our Terraform configuration resides in `infra/terraform/`:

- `main.tf`: Contains the provider configuration, project creation, domain mapping, and environment variables.
- `variables.tf`: Contains the declarations of all variables without default values for secrets.
- `outputs.tf`: Contains output values, such as the Vercel project ID and domains.
- `terraform.tfvars.example`: A template for the variables file you need to fill out.

## 2. Setting Up Variables

Before running Terraform, you must create a `terraform.tfvars` file to supply the necessary secrets and configuration values.

1. Navigate to the Terraform directory:
   ```bash
   cd infra/terraform
   ```
2. Copy the template to create your actual variables file:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```
   **Important:** `terraform.tfvars` is ignored by Git, ensuring your secrets are not committed.
3. Open `terraform.tfvars` and replace all `PLACEHOLDER_*` values.
   - `vercel_api_token`: Your Vercel API token.
   - `github_repo`: Your GitHub repository in `username/repo` format (e.g., `github_username/mtcat_next`).
   - `production_domain`: Your custom production domain (e.g., `www.mcathcat.org`).
   - `staging_domain`: Your custom staging domain (e.g., `staging.mcathcat.org` or a Vercel subdomain).
   - `service_account_key`: The entire single-line JSON string representing your Firebase Admin service account.
   - `youtube_client_secret`: YouTube OAuth client secret.
   - `youtube_refresh_token`: YouTube refresh token.
   - `kakao_client_secret`: Kakao OAuth client secret.

## 3. Initializing and Applying Terraform

Once your `terraform.tfvars` is fully configured:

1. **Initialize Terraform:** This downloads the necessary provider plugins (e.g., the Vercel provider).

   ```bash
   terraform init
   ```

2. **Plan the Deployment:** Review the resources Terraform is going to create or modify. This is a dry run and safe to execute.

   ```bash
   terraform plan
   ```

   Check the output to ensure the environment variables, the project, and the domains are correctly mapped.

3. **Apply the Configuration:** Instruct Terraform to make the changes in your Vercel account.
   ```bash
   terraform apply
   ```
   You will be prompted to confirm the changes by typing `yes`.

### What Terraform Automatically Does in Vercel

When you run `terraform apply`, you **do not** need to manually click through the Vercel dashboard to set up your project. Terraform automatically:

1. Creates the Vercel project and links it to your GitHub repository.
2. Injects all your environment variables, explicitly assigning them to **Production** or **Preview** environments as defined in `main.tf`.
3. Adds your `production_domain` and assigns it to the `main` branch.
4. Adds your `staging_domain` and explicitly pins it to the `dev` branch.

### Manual Actions Required Outside Terraform

While Terraform configures Vercel, there are two initial steps you must do manually:

1. **GitHub App Installation**: Vercel requires permission to read your GitHub repository. The first time you use Vercel, you must install the Vercel GitHub App on your account/organization so Terraform has permission to link the repo.
2. **DNS Configuration**: Terraform tells Vercel to expect your custom domains, but you still need to log into your domain registrar (e.g., Namecheap, GoDaddy, Route53) and add the CNAME or A records pointing your domains to Vercel's servers. Vercel's dashboard will show you exactly which records to add once Terraform creates the project.

## 4. How the CI/CD Pipeline Works

By linking your GitHub repository via Terraform, Vercel automatically creates a CI/CD pipeline based on branches:

1. **Production Deployment**: Any commits merged or pushed to the default branch (e.g., `main`) trigger a Production build. This deployment uses the variables mapped to the `production` environment, and is served on your `production_domain`.
2. **Preview (Staging) Deployment**: Any commits pushed to non-default branches (e.g., `dev`), or Pull Requests targeting _any_ branch (including `dev` or `main`), trigger a Preview build. This handles your Staging environment.
   - With our Terraform config, your staging domain (`staging_domain`) is explicitly pinned to the `dev` branch.
   - Vercel injects the preview-specific Environment Variables (like the correct `NEXT_PUBLIC_BASE_URL` and OAuth redirect definitions) specifically for this domain.

## 5. Post-Deployment Steps (Crucial for OAuth and Firebase)

Both the production and staging domains must be explicitly whitelisted, otherwise your third-party integrations will reject the dynamic/custom URLs.

1. **Firebase Authentication**:
   - Go to [Firebase Console](https://console.firebase.google.com/) > select project (`mountaincats-61543`) > **Authentication** > **Settings** > **Authorized domains**.
   - Add both your production and staging domains.
2. **Google Cloud Console (YouTube OAuth)**:
   - Go to [Google Cloud Console (Credentials)](https://console.cloud.google.com/apis/credentials).
   - Edit your OAuth 2.0 Client ID.
   - Add both domains to **"Authorized JavaScript origins"**.
   - Add both domains' `/oauth/callback` to **"Authorized redirect URIs"**.
3. **Kakao Developers Console**:
   - Go to [Kakao Developers](https://developers.kakao.com/).
   - Go to your App > **Platform** > **Web** > Add both domains to **"Site Domain"**.
   - Under **Kakao Login**, add both domains' `/api/auth/kakao/callback` endpoints to **"Redirect URI"**.

## Ongoing Maintenance

If you ever need to add a new environment variable or update an existing one:

1. Add the variable to `variables.tf`.
2. Map it to the appropriate environments (`production`, `preview`, etc.) in `main.tf`.
3. Add the value to your local `terraform.tfvars` file.
4. Run `terraform apply` to push the changes to Vercel.

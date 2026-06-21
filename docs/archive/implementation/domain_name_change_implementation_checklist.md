# Domain Name Change Implementation Checklist: "mohocat"

This checklist focuses on updating the external identity (GitHub and Vercel) to **"mohocat"** and ensuring all authentication flows are correctly routed.

## Proposed Code & Config Changes

### [Terraform Configuration]

#### [MODIFY] [terraform.tfvars](file:///home/lstm/Documents/GitHub/mtcat_next/infra/terraform/terraform.tfvars)

- `vercel_project_name = "mohocat"`
- `github_repo = "wwolfyy/mohocat"`
- `production_domain = "mohocat.vercel.app"`
- `staging_domain = "mohocat-dev.vercel.app"`

_(These changes will automatically update the app's `BASE_URL` and `REDIRECT_URI` during deployment.)_

---

## User Action Required

### [1. GitHub Renaming]

1. Go to **Settings** in your GitHub repository.
2. Rename the repository from `mcathcat` to `mohocat`.
3. Inform me when done so I can update your local Git config.

### [2. Vercel Cleanup]

1. Go to your **Vercel Dashboard**.
2. Delete any failed/existing projects named `mcathcat-web` or `mohocat`.
3. In the Terraform directory, run `rm terraform.tfstate terraform.tfstate.backup` to start fresh.

### [3. Auth Console Updates]

Detailed steps to update strings to `https://mohocat.vercel.app`:

#### **Google Cloud Console (YouTube API)**

1. Go to the [Credentials page](https://console.cloud.google.com/apis/credentials).
2. Click on the **OAuth 2.0 Client ID** you are using.
3. Under **Authorized redirect URIs**, add: `https://mohocat.vercel.app/oauth/callback`.
4. Click **Save**.

#### **Kakao Developers Console**

1. Go to [Kakao Developers My Application](https://developers.kakao.com/console/app).
2. Select your application.
3. **Platform > Web**: Update **Site Domain** to `https://mohocat.vercel.app`.
4. **Kakao Login > Redirect URI**:
   - For **REST API** and **JavaScript** integrations, ensure the **Redirect URI** matches your **Firebase Auth Handler**:
   - `https://mountaincats-61543.firebaseapp.com/__/auth/handler`
   - (Usually, for OIDC, this is already set, but double-check it is registered in the Kakao console).
5. Click **Save**.

## Verification Plan

### Automated Tests

- Run `terraform plan` to ensure the new project and domain will be created correctly.

### Manual Verification

- Deploy using `terraform apply`.
- Verify the site is accessible at `https://mohocat.vercel.app`.

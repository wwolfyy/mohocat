# CI/CD Pipeline for Google Cloud Run

This guide sets up automated deployment to Google Cloud Run using GitHub Actions.

---

## Architecture

```
GitHub (Manual Trigger) → GitHub Actions → Cloud Build → Deploy to Cloud Run
```

---

## Prerequisites

1. **Google Cloud Project** with billing enabled
2. **APIs enabled**:
   - Cloud Run API
   - Cloud Build API
   - Artifact Registry API
3. **Service Account** with roles:
   - `roles/run.admin`
   - `roles/cloudbuild.builds.builder`
   - `roles/iam.serviceAccountUser`

---

## Step 1: Create Service Account

```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# Grant permissions
PROJECT_ID="your-project-id"
SA_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/cloudbuild.builds.builder"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/iam.serviceAccountUser"

# Create key file
gcloud iam service-accounts keys create key.json \
  --iam-account=$SA_EMAIL
```

---

## Step 2: Add Secrets to GitHub

Go to **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### Required Secrets

| Secret Name                        | Description                  |
| ---------------------------------- | ---------------------------- |
| `GCP_PROJECT_ID`                   | Your Google Cloud project ID |
| `GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY` | Contents of `key.json`       |

### App Configuration

| Secret Name            | Description                          |
| ---------------------- | ------------------------------------ |
| `MOUNTAIN_ID`          | Mountain identifier (e.g., `geyang`) |
| `NEXT_PUBLIC_BASE_URL` | Your Cloud Run URL                   |

### Firebase

| Secret Name                                | Description             |
| ------------------------------------------ | ----------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | Firebase API key        |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Firebase auth domain    |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | Firebase project ID     |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID      |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | Firebase app ID         |

### YouTube

| Secret Name                      | Description                         |
| -------------------------------- | ----------------------------------- |
| `NEXT_PUBLIC_YOUTUBE_API_KEY`    | YouTube API key (public)            |
| `YOUTUBE_CLIENT_ID`              | YouTube OAuth client ID             |
| `YOUTUBE_CLIENT_SECRET`          | YouTube OAuth client secret         |
| `YOUTUBE_REDIRECT_URI`           | YouTube OAuth redirect URI          |
| `YOUTUBE_REFRESH_TOKEN`          | YouTube OAuth refresh token         |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account credentials |

### Kakao OAuth

| Secret Name                       | Description                         |
| --------------------------------- | ----------------------------------- |
| `NEXT_PUBLIC_KAKAO_CLIENT_ID`     | Kakao client ID                     |
| `NEXT_PUBLIC_KAKAO_CLIENT_SECRET` | Kakao client secret                 |
| `NEXT_PUBLIC_KAKAO_OAUTH_ENABLED` | Enable Kakao OAuth (`true`/`false`) |

---

## Step 3: Deploy

1. Go to **Actions** → **Deploy to Cloud Run**
2. Click **Run workflow**

The workflow will:

1. Check out code
2. Install dependencies
3. Authenticate to Google Cloud
4. Deploy using Cloud Build (`--source .`)
5. Run health check on `/api/health`

---

## Workflow File

Location: `.github/workflows/deploy-cloud-run.yml`

See the workflow file for full configuration.

---

## Troubleshooting

| Issue              | Solution                                     |
| ------------------ | -------------------------------------------- |
| Permission denied  | Check service account has required roles     |
| Build fails        | Check Cloud Build logs in GCP Console        |
| Health check fails | Verify `/api/health` endpoint works locally  |
| Secret not found   | Verify secret name matches exactly in GitHub |

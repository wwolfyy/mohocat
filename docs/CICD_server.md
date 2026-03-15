# CI/CD Pipeline for Home Server Deployment

This guide sets up automated deployment to your home server using GitHub Actions with a **self-hosted runner**.

---

## Architecture Overview

```
GitHub Push → GitHub Actions → Self-Hosted Runner (on your server) → Docker Build & Deploy
```

The runner executes directly on your home server, so:

- ✅ No need to expose SSH to the internet
- ✅ No need for a container registry
- ✅ Secrets stay on your server
- ✅ Fast builds (no image transfer over network)

---

## Step 1: Set Up Self-Hosted Runner

### 1.1 Create a Runner on GitHub

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Actions** → **Runners**
3. Click **New self-hosted runner**
4. Select **Linux** and follow the instructions to download and configure the runner

### 1.2 Install the Runner on Your Server

```bash
# Create a directory for the runner
mkdir ~/actions-runner && cd ~/actions-runner

# Download (replace with the URL from GitHub)
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# Extract
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Configure (use the token from GitHub)
./config.sh --url https://github.com/YOUR_USERNAME/YOUR_REPO --token YOUR_TOKEN

# Install as a service (runs on boot)
sudo ./svc.sh install
sudo ./svc.sh start
```

### 1.3 Verify Runner Status

Check that the runner appears as **Idle** in your GitHub repository's **Settings** → **Actions** → **Runners**.

---

## Step 2: Create the GitHub Actions Workflow

Create `.github/workflows/deploy-home-server.yml`:

```yaml
name: Deploy to Home Server

on:
  push:
    branches:
      - main
  workflow_dispatch: # Allows manual trigger

jobs:
  deploy:
    runs-on: self-hosted

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Create .env file from secrets
        run: |
          cat << EOF > .env
          MOUNTAIN_ID=${{ secrets.MOUNTAIN_ID }}
          NEXT_PUBLIC_BASE_URL=${{ secrets.NEXT_PUBLIC_BASE_URL }}
          NEXT_PUBLIC_FIREBASE_API_KEY=${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID=${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
          NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
          NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${{ secrets.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
          NEXT_PUBLIC_FIREBASE_APP_ID=${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}
          NEXT_PUBLIC_YOUTUBE_API_KEY=${{ secrets.NEXT_PUBLIC_YOUTUBE_API_KEY }}
          YOUTUBE_CLIENT_ID=${{ secrets.YOUTUBE_CLIENT_ID }}
          YOUTUBE_CLIENT_SECRET=${{ secrets.YOUTUBE_CLIENT_SECRET }}
          YOUTUBE_REDIRECT_URI=${{ secrets.YOUTUBE_REDIRECT_URI }}
          YOUTUBE_REFRESH_TOKEN=${{ secrets.YOUTUBE_REFRESH_TOKEN }}
          GOOGLE_APPLICATION_CREDENTIALS=${{ secrets.GOOGLE_APPLICATION_CREDENTIALS }}
          NEXT_PUBLIC_KAKAO_CLIENT_ID=${{ secrets.NEXT_PUBLIC_KAKAO_CLIENT_ID }}
          NEXT_PUBLIC_KAKAO_CLIENT_SECRET=${{ secrets.NEXT_PUBLIC_KAKAO_CLIENT_SECRET }}
          NEXT_PUBLIC_KAKAO_OAUTH_ENABLED=${{ secrets.NEXT_PUBLIC_KAKAO_OAUTH_ENABLED }}
          EOF

      - name: Stop existing container
        run: docker compose down || true

      - name: Build and start container
        run: docker compose up --build -d

      - name: Clean up old images
        run: docker image prune -f

      - name: Health check
        run: |
          sleep 10
          curl -f http://localhost:8080 || exit 1
```

---

## Step 3: Add Secrets to GitHub

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each variable:

| Secret Name                        | Value                           |
| ---------------------------------- | ------------------------------- |
| `MOUNTAIN_ID`                      | `geyang`                        |
| `NEXT_PUBLIC_BASE_URL`             | `https://yourdomain.com`        |
| `NEXT_PUBLIC_FIREBASE_API_KEY`     | Your Firebase API key           |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Your Firebase auth domain       |
| ...                                | (all other variables from .env) |

---

## Step 4: Test the Pipeline

1. Push a commit to the `main` branch
2. Go to **Actions** tab in your GitHub repository
3. Watch the workflow run

Or trigger manually:

1. Go to **Actions** → **Deploy to Home Server**
2. Click **Run workflow**

---

## Alternative: SSH-Based Deployment

If you prefer not to install a runner on your server, you can deploy via SSH from GitHub's cloud runners.

> [!WARNING]
> This requires exposing SSH (port 22) to the internet, which has security implications.

```yaml
name: Deploy via SSH

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /path/to/mtcat_next
            git pull origin main
            docker compose up --build -d
```

Required secrets for SSH approach:

- `SERVER_HOST`: Your server's public IP or domain
- `SERVER_USER`: SSH username
- `SSH_PRIVATE_KEY`: Private key for authentication

---

## Comparison

| Approach               | Pros                                             | Cons                                       |
| ---------------------- | ------------------------------------------------ | ------------------------------------------ |
| **Self-Hosted Runner** | No SSH exposure, fast builds, secrets stay local | Requires runner installation               |
| **SSH Deployment**     | No runner to maintain                            | Exposes SSH, slower (pulls code each time) |

---

## Troubleshooting

| Issue                    | Solution                                                         |
| ------------------------ | ---------------------------------------------------------------- |
| Runner offline           | Check service: `sudo ./svc.sh status`                            |
| Docker permission denied | Add runner user to docker group: `sudo usermod -aG docker $USER` |
| Workflow stuck           | Check runner logs: `~/actions-runner/_diag/`                     |
| Build fails              | Check secrets are correctly set in GitHub                        |

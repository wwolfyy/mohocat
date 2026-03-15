terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 2.0"
    }
  }
}

# ---------------------------------------------------------------------------
# Provider: authenticate with your Vercel account token
# ---------------------------------------------------------------------------
provider "vercel" {
  api_token = var.vercel_api_token
}

# ---------------------------------------------------------------------------
# Data source: look up your existing GitHub-connected Vercel project
# (after you import it via `terraform import`, or create fresh below)
# ---------------------------------------------------------------------------
resource "vercel_project" "mountaincats" {
  name      = var.vercel_project_name
  framework = "nextjs"

  git_repository = {
    type = "github"
    repo = var.github_repo # e.g. "your-github-username/mcathcat"
  }
}

# ---------------------------------------------------------------------------
# Domains
# ---------------------------------------------------------------------------

# Production domain (mapped to `main` branch automatically by Vercel)
resource "vercel_project_domain" "production" {
  project_id = vercel_project.mountaincats.id
  domain     = var.production_domain # e.g. "www.mountaincats.com"
}

# Static staging domain pinned to the `dev` branch
resource "vercel_project_domain" "staging" {
  project_id  = vercel_project.mountaincats.id
  domain      = var.staging_domain # e.g. "staging.mountaincats.com" or "mountaincats-dev.vercel.app"
  git_branch  = "dev"
}

# ---------------------------------------------------------------------------
# Environment Variables — shared across Production AND Preview (staging)
# ---------------------------------------------------------------------------
locals {
  shared_envs = {
    # Firebase client-side config (public, same project for both environments)
    NEXT_PUBLIC_FIREBASE_API_KEY              = var.firebase_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN          = var.firebase_auth_domain
    NEXT_PUBLIC_FIREBASE_PROJECT_ID           = var.firebase_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET       = var.firebase_storage_bucket
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID  = var.firebase_messaging_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID               = var.firebase_app_id
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID       = var.firebase_measurement_id

    # Firebase Admin SDK — the full service account JSON as a string
    SERVICE_ACCOUNT_KEY = var.service_account_key

    # YouTube server-side config
    YOUTUBE_CLIENT_ID     = var.youtube_client_id
    YOUTUBE_CLIENT_SECRET = var.youtube_client_secret
    YOUTUBE_REFRESH_TOKEN = var.youtube_refresh_token

    # YouTube public API key
    NEXT_PUBLIC_YOUTUBE_API_KEY = var.youtube_api_key

    # Kakao OAuth
    NEXT_PUBLIC_KAKAO_CLIENT_ID      = var.kakao_client_id
    NEXT_PUBLIC_KAKAO_CLIENT_SECRET  = var.kakao_client_secret
    NEXT_PUBLIC_KAKAO_OAUTH_ENABLED  = "true"

    # Mountain identifier
    MOUNTAIN_ID = var.mountain_id
  }
}

resource "vercel_project_environment_variable" "shared" {
  for_each = local.shared_envs

  project_id = vercel_project.mountaincats.id
  key        = each.key
  value      = each.value
  # Apply to both production deployments (main) and preview deployments (dev, PRs)
  target     = ["production", "preview"]
  sensitive  = true
}

# ---------------------------------------------------------------------------
# Environment Variables — Production-specific (main branch)
# ---------------------------------------------------------------------------
resource "vercel_project_environment_variable" "base_url_production" {
  project_id = vercel_project.mountaincats.id
  key        = "NEXT_PUBLIC_BASE_URL"
  value      = "https://${var.production_domain}"
  target     = ["production"]
  sensitive  = false
}

resource "vercel_project_environment_variable" "youtube_redirect_uri_production" {
  project_id = vercel_project.mountaincats.id
  key        = "YOUTUBE_REDIRECT_URI"
  value      = "https://${var.production_domain}/oauth/callback"
  target     = ["production"]
  sensitive  = false
}

# ---------------------------------------------------------------------------
# Environment Variables — Preview/Staging-specific (dev branch)
# ---------------------------------------------------------------------------
resource "vercel_project_environment_variable" "base_url_staging" {
  project_id    = vercel_project.mountaincats.id
  key           = "NEXT_PUBLIC_BASE_URL"
  value         = "https://${var.staging_domain}"
  target        = ["preview"]
  sensitive     = false
  git_branch    = "dev"
}

resource "vercel_project_environment_variable" "youtube_redirect_uri_staging" {
  project_id = vercel_project.mountaincats.id
  key        = "YOUTUBE_REDIRECT_URI"
  value      = "https://${var.staging_domain}/oauth/callback"
  target     = ["preview"]
  sensitive  = false
  git_branch = "dev"
}

# ---------------------------------------------------------------------------
# Vercel
# ---------------------------------------------------------------------------
variable "vercel_api_token" {
  description = "Vercel API token. Generate at: https://vercel.com/account/tokens"
  type        = string
  sensitive   = true
}

variable "vercel_project_name" {
  description = "The name for this project in Vercel"
  type        = string
}

variable "github_repo" {
  description = "GitHub repo in 'owner/repo' format, e.g. 'your-org/mtcat_next'"
  type        = string
}

variable "production_domain" {
  description = "Custom domain for the production (main branch) deployment, e.g. 'www.mountaincats.com'"
  type        = string
}

variable "staging_domain" {
  description = "Static domain pinned to the dev branch, e.g. 'staging.mountaincats.com'"
  type        = string
}

# ---------------------------------------------------------------------------
# Firebase client config
# ---------------------------------------------------------------------------
variable "firebase_api_key" {
  description = "NEXT_PUBLIC_FIREBASE_API_KEY"
  type        = string
  sensitive   = true
}

variable "firebase_auth_domain" {
  description = "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
  type        = string
}

variable "firebase_project_id" {
  description = "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  type        = string
}

variable "firebase_storage_bucket" {
  description = "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
  type        = string
}

variable "firebase_messaging_sender_id" {
  description = "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  type        = string
}

variable "firebase_app_id" {
  description = "NEXT_PUBLIC_FIREBASE_APP_ID"
  type        = string
  sensitive   = true
}

variable "firebase_measurement_id" {
  description = "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID — Google Analytics measurement ID"
  type        = string
  # Not marked sensitive; measurementId is visible in client-side JS bundles
}

# ---------------------------------------------------------------------------
# Firebase Admin SDK
# ---------------------------------------------------------------------------
variable "service_account_key" {
  description = "SERVICE_ACCOUNT_KEY: the full Firebase Admin service account JSON as a single-line string"
  type        = string
  sensitive   = true
}

# ---------------------------------------------------------------------------
# YouTube
# ---------------------------------------------------------------------------
variable "youtube_api_key" {
  description = "NEXT_PUBLIC_YOUTUBE_API_KEY"
  type        = string
  sensitive   = true
}

variable "youtube_client_id" {
  description = "YOUTUBE_CLIENT_ID"
  type        = string
  sensitive   = true
}

variable "youtube_client_secret" {
  description = "YOUTUBE_CLIENT_SECRET"
  type        = string
  sensitive   = true
}

variable "youtube_refresh_token" {
  description = "YOUTUBE_REFRESH_TOKEN"
  type        = string
  sensitive   = true
}

# ---------------------------------------------------------------------------
# Kakao OAuth
# ---------------------------------------------------------------------------
variable "kakao_client_id" {
  description = "NEXT_PUBLIC_KAKAO_CLIENT_ID"
  type        = string
  sensitive   = true
}

variable "kakao_client_secret" {
  description = "NEXT_PUBLIC_KAKAO_CLIENT_SECRET"
  type        = string
  sensitive   = true
}

# ---------------------------------------------------------------------------
# Misc
# ---------------------------------------------------------------------------
variable "mountain_id" {
  description = "MOUNTAIN_ID: identifier for this mountain configuration"
  type        = string
}

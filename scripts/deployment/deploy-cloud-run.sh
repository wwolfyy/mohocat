#!/bin/bash

# Cloud Run Deployment Script for Mountain Cats Application
# This script deploys the application to Google Cloud Run with proper environment variables

set -e

# Configuration
PROJECT_ID="mountaincats-61543"
SERVICE_NAME="mcathcat"
REGION="asia-northeast3"
MEMORY="2Gi"
CPU="2"
MAX_INSTANCES="10"
MIN_INSTANCES="0"
TIMEOUT="300s"

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install Google Cloud SDK."
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set the project
echo "🔧 Setting Google Cloud project to $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required Google Cloud APIs..."
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory $MEMORY \
  --cpu $CPU \
  --max-instances $MAX_INSTANCES \
  --min-instances $MIN_INSTANCES \
  --timeout $TIMEOUT \
  --port 8080 \
  --set-env-vars "NODE_ENV=production,PORT=8080" \
  --execution-environment gen2

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')

echo "✅ Deployment completed successfully!"
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "📝 Next steps:"
echo "1. Update your environment variables in Cloud Run console if needed"
echo "2. Configure custom domain (optional)"
echo "3. Set up monitoring and logging"
echo ""
echo "🔧 To update environment variables:"
echo "gcloud run services update $SERVICE_NAME --region $REGION --set-env-vars KEY=VALUE"

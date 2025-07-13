@echo off
REM Cloud Run Deployment Script for Windows
REM This script deploys the application to Google Cloud Run

echo Starting Cloud Run deployment...

REM Configuration
set PROJECT_ID=mountaincats-61543
set SERVICE_NAME=mtcat-next
set REGION=asia-northeast3
set MEMORY=2Gi
set CPU=2
set MAX_INSTANCES=10
set MIN_INSTANCES=0
set TIMEOUT=300s

REM Check if gcloud is installed
where gcloud >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ gcloud CLI not found. Please install Google Cloud SDK.
    echo Visit: https://cloud.google.com/sdk/docs/install
    exit /b 1
)

REM Set the project
echo 🔧 Setting Google Cloud project to %PROJECT_ID%
gcloud config set project %PROJECT_ID%

REM Enable required APIs
echo 🔧 Enabling required Google Cloud APIs...
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com

REM Deploy to Cloud Run
echo 🚀 Deploying to Cloud Run...
gcloud run deploy %SERVICE_NAME% ^
  --source . ^
  --platform managed ^
  --region %REGION% ^
  --allow-unauthenticated ^
  --memory %MEMORY% ^
  --cpu %CPU% ^
  --max-instances %MAX_INSTANCES% ^
  --min-instances %MIN_INSTANCES% ^
  --timeout %TIMEOUT% ^
  --port 8080 ^
  --set-env-vars "NODE_ENV=production,PORT=8080" ^
  --execution-environment gen2

REM Get the service URL
for /f "tokens=*" %%a in ('gcloud run services describe %SERVICE_NAME% --platform managed --region %REGION% --format "value(status.url)"') do set SERVICE_URL=%%a

echo ✅ Deployment completed successfully!
echo 🌐 Service URL: %SERVICE_URL%
echo.
echo 📝 Next steps:
echo 1. Update your environment variables in Cloud Run console if needed
echo 2. Configure custom domain (optional)
echo 3. Set up monitoring and logging
echo.
echo 🔧 To update environment variables:
echo gcloud run services update %SERVICE_NAME% --region %REGION% --set-env-vars KEY=VALUE

pause

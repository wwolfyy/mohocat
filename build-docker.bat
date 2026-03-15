@echo off
setlocal enabledelayedexpansion

echo Reading environment variables from .env.local...

REM Initialize variables
set NEXT_PUBLIC_FIREBASE_API_KEY=
set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
set NEXT_PUBLIC_FIREBASE_PROJECT_ID=
set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
set NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
set NEXT_PUBLIC_FIREBASE_APP_ID=
set MOUNTAIN_ID=geyang

REM Read .env.local file
for /f "tokens=1,2 delims==" %%a in ('type .env.local 2^>nul ^| findstr "^[^#]"') do (
    set "key=%%a"
    set "value=%%b"

    if "!key!"=="NEXT_PUBLIC_FIREBASE_API_KEY" set "NEXT_PUBLIC_FIREBASE_API_KEY=!value!"
    if "!key!"=="NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" set "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=!value!"
    if "!key!"=="NEXT_PUBLIC_FIREBASE_PROJECT_ID" set "NEXT_PUBLIC_FIREBASE_PROJECT_ID=!value!"
    if "!key!"=="NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" set "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=!value!"
    if "!key!"=="NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" set "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=!value!"
    if "!key!"=="NEXT_PUBLIC_FIREBASE_APP_ID" set "NEXT_PUBLIC_FIREBASE_APP_ID=!value!"
    if "!key!"=="MOUNTAIN_ID" set "MOUNTAIN_ID=!value!"
)

echo Building Docker image with environment variables...
docker build ^
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="%NEXT_PUBLIC_FIREBASE_API_KEY%" ^
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="%NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN%" ^
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="%NEXT_PUBLIC_FIREBASE_PROJECT_ID%" ^
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="%NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET%" ^
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="%NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID%" ^
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="%NEXT_PUBLIC_FIREBASE_APP_ID%" ^
  --build-arg MOUNTAIN_ID="%MOUNTAIN_ID%" ^
  -t mcathcat:latest .

if %errorlevel% neq 0 (
    echo Build failed!
    exit /b 1
)

echo Docker image built successfully!
echo You can run it with: docker run -p 8080:8080 --env-file .env.local mcathcat:latest

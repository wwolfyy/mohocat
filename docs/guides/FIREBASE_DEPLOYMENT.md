# Firebase Deployment Guide

This guide explains how to deploy the Mountain Cats application to Firebase Hosting using the centralized configuration system for both single-mountain and multi-tenant deployments.

## Overview

The application is built with Next.js and configured for static export (`output: 'export'`) to deploy to Firebase Hosting. The centralized configuration system allows the same codebase to be deployed to multiple Firebase projects for different mountains.

## Prerequisites

- Node.js and npm installed
- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project(s) created
- Firebase Authentication, Firestore, and Storage configured
- Environment variables properly set

## Single Mountain Deployment (Current)

### 1. Environment Setup

Create or verify your `.env.local` file in the project root:

```bash
# Mountain Configuration
MOUNTAIN_ID=geyang

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mountaincats-61543
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=mountaincats-61543.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=mountaincats-61543.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (Server-side)
GOOGLE_APPLICATION_CREDENTIALS=config/firebase/mountaincats-61543-7329e795c352.json

# YouTube API
YOUTUBE_API_KEY=your_youtube_api_key
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
YOUTUBE_REFRESH_TOKEN=your_youtube_refresh_token

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-domain.web.app
```

### 2. Build the Application

```bash
# Install dependencies
npm install

# Build for production (includes static asset fetching)
npm run build
```

### 3. Deploy to Firebase

```bash
# Login to Firebase (if not already logged in)
firebase login

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### 4. Verify Deployment

Visit your Firebase Hosting URL to verify the deployment is successful.

## Multi-Tenant Deployment

The centralized configuration system allows you to deploy the same codebase to multiple Firebase projects for different mountains.

### 1. Add New Mountain Configuration

Edit `config/mountains/mountains.json` to add your new mountain:

```json
{
  "geyang": {
    "id": "geyang",
    "name": "계양산 냥이들",
    // ... existing configuration
  },
  "jirisan": {
    "id": "jirisan",
    "name": "지리산 냥이들",
    "description": "지리산의 고양이들을 보호하고 돌보는 커뮤니티",
    "theme": {
      "primaryColor": "#059669",
      "secondaryColor": "#047857",
      "accentColor": "#fbbf24"
    },
    "features": {
      "videoAlbum": true,
      "photoAlbum": true,
      "advancedFiltering": true,
      "adminPanel": true
    },
    "contact": {
      "email": "jirisan.cats@example.com",
      "phone": "+82-10-xxxx-xxxx"
    },
    "social": {
      "youtubeChannelId": "UC_jirisan_channel_id",
      "instagramHandle": "@jirisan_cats",
      "facebookPage": "jirisan.cats"
    }
  }
}
```

### 2. Create New Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (e.g., `jirisan-cats`)
3. Enable Authentication, Firestore, and Storage
4. Configure security rules (copy from existing project)
5. Set up Authentication providers
6. Download the service account key

### 3. Setup New Environment Configuration

Create a new environment file for the new mountain (e.g., `.env.jirisan`):

```bash
# Mountain Configuration
MOUNTAIN_ID=jirisan

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_PROJECT_ID=jirisan-cats
NEXT_PUBLIC_FIREBASE_API_KEY=jirisan_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=jirisan-cats.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=jirisan-cats.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=jirisan_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=jirisan_app_id

# Firebase Admin
GOOGLE_APPLICATION_CREDENTIALS=config/firebase/jirisan-cats-service-account.json

# YouTube API (Jirisan-specific channel)
YOUTUBE_API_KEY=your_youtube_api_key
YOUTUBE_CLIENT_ID=jirisan_youtube_client_id
YOUTUBE_CLIENT_SECRET=jirisan_youtube_client_secret
YOUTUBE_REFRESH_TOKEN=jirisan_youtube_refresh_token

# Authentication
NEXTAUTH_SECRET=jirisan_nextauth_secret
NEXTAUTH_URL=https://jirisan-cats.web.app
```

### 4. Deploy to New Mountain

```bash
# Copy environment for new mountain
cp .env.jirisan .env.local

# Build application for new mountain
npm run build

# Configure Firebase CLI for new project
firebase use --add
# Select the new project and give it an alias (e.g., 'jirisan')

# Deploy to new Firebase project
firebase deploy --only hosting --project jirisan
```

### 5. Automated Multi-Tenant Deployment

You can create a deployment script for multiple mountains:

Create `scripts/deployment/deploy-all-mountains.js`:

```javascript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const mountains = ['geyang', 'jirisan']; // Add more as needed

mountains.forEach(mountain => {
  console.log(`Deploying ${mountain}...`);

  // Copy environment file
  const envFile = `.env.${mountain}`;
  if (fs.existsSync(envFile)) {
    fs.copyFileSync(envFile, '.env.local');

    // Build and deploy
    execSync('npm run build', { stdio: 'inherit' });
    execSync(`firebase deploy --only hosting --project ${mountain}`, { stdio: 'inherit' });

    console.log(`${mountain} deployed successfully!`);
  } else {
    console.error(`Environment file ${envFile} not found for ${mountain}`);
  }
});
```

## Firebase Configuration Files

### firebase.json
The project includes a `config/firebase/firebase.json` file with hosting configuration:

```json
{
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### Firestore Rules
Security rules are in `config/firebase/firestore.rules`. Make sure to deploy them:

```bash
firebase deploy --only firestore:rules
```

### Storage CORS
CORS configuration for Firebase Storage is in `config/firebase/cors_fbstorage.json`.

## CI/CD Pipeline

The project includes GitHub Actions workflows for automated deployment:

- `.github/workflows/firebase-hosting-merge.yml` - Deploys on merge to main
- `.github/workflows/firebase-hosting-pull-request.yml` - Preview deployments for PRs

### Setup GitHub Actions

1. Generate Firebase token: `firebase login:ci`
2. Add `FIREBASE_TOKEN` to GitHub repository secrets
3. Add environment variables as GitHub secrets
4. Customize workflow files for your mountains

## Troubleshooting

### Common Issues

1. **Build fails during static asset fetching**
   - Ensure Firebase service account key exists at correct path
   - Verify Firebase project configuration in environment variables

2. **Authentication not working after deployment**
   - Check Firebase Authentication configuration
   - Verify authorized domains in Firebase Console
   - Ensure NEXTAUTH_URL matches deployed URL

3. **Environment variables not working**
   - Next.js public environment variables must start with `NEXT_PUBLIC_`
   - Verify environment file is properly loaded before build

4. **Firebase deploy fails**
   - Ensure Firebase CLI is logged in: `firebase login`
   - Check project permissions: `firebase projects:list`
   - Verify `firebase.json` configuration

### Debug Deployment

To debug the current configuration:

```bash
# Check current mountain configuration
npm run build 2>&1 | grep "Mountain ID"

# Verify Firebase project
firebase projects:list

# Test authentication
firebase auth:export users.json --project your-project
```

## Security Considerations

1. **Service Account Keys**: Never commit service account keys to version control
2. **Environment Variables**: Use secure storage for production secrets
3. **Firestore Rules**: Ensure proper security rules are deployed
4. **CORS Configuration**: Configure Firebase Storage CORS properly
5. **Authentication**: Use Firebase Authentication for secure access

## Multi-Tenant Benefits

The centralized configuration system provides:

- **Zero Code Changes**: Same codebase deploys to multiple mountains
- **Consistent UX**: Each mountain gets the same features and interface
- **Easy Maintenance**: Updates apply to all mountains simultaneously
- **Mountain-Specific Branding**: Each deployment can have unique themes and content
- **Isolated Data**: Each mountain has its own Firebase project and data

## Next Steps

1. Consider using Firebase CLI tools for automated deployments
2. Set up monitoring and alerting for each mountain's deployment
3. Implement automated testing for multi-tenant configurations
4. Consider using Firebase App Distribution for beta testing
5. Set up custom domains for each mountain's deployment

## Related Documentation

- [Configuration Implementation](../implementation/CONFIGURATION_IMPLEMENTATION.md)
- [Multi-Tenant Audit Report](../implementation/MULTI_TENANT_AUDIT_REPORT.md)
- [Platform Architecture](../architecture/PLATFORM_ARCHITECTURE.md)
- [Secrets Management](SECRETS_MANAGEMENT.md)

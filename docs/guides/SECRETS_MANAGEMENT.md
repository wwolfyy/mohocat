# Secrets Management Strategy

## Overview
This document outlines the secure management of API keys, service account files, and other sensitive configuration data for the multi-tenant mountain cat platform.

## Problem Statement
- Each mountain instance requires different Firebase configurations, YouTube API keys, and service account credentials
- Secrets cannot be stored in the shared repository for security reasons
- Need to inject different secrets per deployment target while maintaining single codebase
- Must ensure complete isolation between mountain instances

## Recommended Solution: GitHub Secrets + Environment Variables

### Architecture
```
Single Repository
├── Public Config (mountains.json)
├── GitHub Repository Secrets
│   ├── GEYANG_FIREBASE_CONFIG
│   ├── GEYANG_YOUTUBE_API_KEY
│   ├── GEYANG_SERVICE_ACCOUNT_KEY
│   ├── JIRISAN_FIREBASE_CONFIG
│   ├── JIRISAN_YOUTUBE_API_KEY
│   └── JIRISAN_SERVICE_ACCOUNT_KEY
└── Deployment Pipeline
    └── Injects secrets per mountain
```

## Implementation Details

### GitHub Repository Secrets Structure
```
# Naming Convention: {MOUNTAIN_NAME}_{SECRET_TYPE}

# Firebase Configuration
GEYANG_FIREBASE_CONFIG={"apiKey":"AIza...", "projectId":"geyang-cats", "authDomain":"geyang-cats.firebaseapp.com"}
JIRISAN_FIREBASE_CONFIG={"apiKey":"AIza...", "projectId":"jirisan-cats", "authDomain":"jirisan-cats.firebaseapp.com"}

# YouTube API Keys
GEYANG_YOUTUBE_API_KEY=AIza...
JIRISAN_YOUTUBE_API_KEY=AIza...

# Service Account Keys (JSON stringified)
GEYANG_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"geyang-cats",...}
JIRISAN_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"jirisan-cats",...}
```

### GitHub Actions Deployment
```yaml
# .github/workflows/deploy-all.yml
name: Deploy All Mountains
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        mountain: [geyang, jirisan, seoraksan]

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Deploy to Firebase
        env:
          MOUNTAIN_ID: ${{ matrix.mountain }}
          FIREBASE_CONFIG: ${{ secrets[format('{0}_FIREBASE_CONFIG', upper(matrix.mountain))] }}
          YOUTUBE_API_KEY: ${{ secrets[format('{0}_YOUTUBE_API_KEY', upper(matrix.mountain))] }}
          SERVICE_ACCOUNT_KEY: ${{ secrets[format('{0}_SERVICE_ACCOUNT_KEY', upper(matrix.mountain))] }}
        run: |
          # Create temporary service account file
          echo "$SERVICE_ACCOUNT_KEY" > service-account.json

          # Build application with mountain-specific config
          npm run build

          # Deploy to Firebase
          npx firebase deploy --project ${{ matrix.mountain }}-cats --token "$FIREBASE_TOKEN"

          # Clean up service account file
          rm service-account.json
```

### Configuration Loading in Application
```javascript
// utils/config.js
export function getMountainConfig() {
  const mountainId = process.env.MOUNTAIN_ID;

  if (!mountainId) {
    throw new Error('MOUNTAIN_ID environment variable is required');
  }

  // Load public configuration
  const publicConfig = require('../config/mountains/mountains.json')[mountainId];
  if (!publicConfig) {
    throw new Error(`Configuration not found for mountain: ${mountainId}`);
  }

  // Load secret configuration from environment variables
  const secretConfig = {
    firebase: JSON.parse(process.env.FIREBASE_CONFIG || '{}'),
    youtubeApiKey: process.env.YOUTUBE_API_KEY,
    serviceAccount: JSON.parse(process.env.SERVICE_ACCOUNT_KEY || '{}')
  };

  // Validate required secrets
  if (!secretConfig.firebase.apiKey) {
    throw new Error('Firebase configuration is missing or invalid');
  }

  if (!secretConfig.youtubeApiKey) {
    throw new Error('YouTube API key is missing');
  }

  return {
    ...publicConfig,
    secrets: secretConfig
  };
}

// services/firebase.js
import { getMountainConfig } from '../utils/config';

const config = getMountainConfig();

// Initialize Firebase with mountain-specific config
const firebaseConfig = config.secrets.firebase;
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
```

## File Structure
```
mtcat-platform/
├── src/
│   ├── services/
│   │   ├── firebase.js          # Uses secrets from environment
│   │   └── youtube.js           # Uses API key from environment
│   └── utils/
│       └── config.js            # Configuration loading logic
├── config/
│   ├── mountains.json           # Public configuration only
│   └── firebase-config.template # Template for Firebase config
├── scripts/
│   ├── setup-secrets.js         # Helper script for admin onboarding
│   └── validate-config.js       # Configuration validation
├── .env.example                 # Example environment variables
├── .gitignore                   # Must ignore sensitive files
└── docs/
    └── admin-setup-guide.md     # Instructions for admins
```

## Security Best Practices

### Repository Security
- **Never commit secrets** to the repository
- **Use .gitignore** to exclude sensitive files
- **Validate configurations** during build process
- **Rotate secrets regularly** (quarterly recommended)

### Access Control
- **Limit GitHub repository access** to essential personnel
- **Use least-privilege principle** for service accounts
- **Enable two-factor authentication** for all GitHub accounts
- **Monitor secret access** through GitHub audit logs

### Secret Rotation
```bash
# Script for rotating secrets
#!/bin/bash
# scripts/rotate-secrets.sh

MOUNTAIN=$1
if [ -z "$MOUNTAIN" ]; then
  echo "Usage: $0 <mountain-name>"
  exit 1
fi

echo "Rotating secrets for $MOUNTAIN..."

# 1. Generate new API keys in Google Cloud Console
# 2. Create new service account and download JSON
# 3. Update GitHub secrets
gh secret set "${MOUNTAIN^^}_YOUTUBE_API_KEY" --body "$NEW_API_KEY"
gh secret set "${MOUNTAIN^^}_SERVICE_ACCOUNT_KEY" --body "$NEW_SERVICE_ACCOUNT"

# 4. Deploy to update live application
gh workflow run deploy-all.yml
```

## Admin Onboarding Process

### What Admins Provide
1. **Firebase Project Details**
   - Project ID
   - Web app configuration (from Firebase console)
   - Custom domain (if desired)

2. **YouTube API Credentials**
   - API key from Google Cloud Console
   - Channel ID for their mountain's videos

3. **Service Account Credentials**
   - JSON file with appropriate Firebase permissions
   - YouTube API access permissions

### What Platform Owner Does
1. **Add secrets to GitHub repository**
   ```bash
   # Using GitHub CLI
   gh secret set NEWMOUNTAIN_FIREBASE_CONFIG --body "$FIREBASE_CONFIG_JSON"
   gh secret set NEWMOUNTAIN_YOUTUBE_API_KEY --body "$YOUTUBE_API_KEY"
   gh secret set NEWMOUNTAIN_SERVICE_ACCOUNT_KEY --body "$SERVICE_ACCOUNT_JSON"
   ```

2. **Update public configuration**
   ```json
   // config/mountains/mountains.json
   {
     "newmountain": {
       "name": "새로운 산 냥이들",
       "description": "새로운 산에서 살고 있는 고양이들의 이야기",
       "adminEmail": "admin@newmountain.com",
       "customDomain": "newmountain-cats.com",
       "theme": {
         "primaryColor": "#blue",
         "logoUrl": "/images/newmountain-logo.png"
       },
       "features": {
         "videoAlbum": true,
         "advancedFiltering": false
       }
     }
   }
   ```

3. **Update deployment configuration**
   ```yaml
   # Add to .github/workflows/deploy-all.yml matrix
   strategy:
     matrix:
       mountain: [geyang, jirisan, seoraksan, newmountain]
   ```

4. **Deploy new instance**
   - Push changes to trigger deployment
   - Verify deployment success
   - Test functionality with admin

## Environment Variables Reference

### Required Environment Variables (Per Mountain)
```bash
# Mountain identification
MOUNTAIN_ID=geyang

# Firebase configuration (JSON string)
FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"..."}

# YouTube API access
YOUTUBE_API_KEY=AIza...

# Service account credentials (JSON string)
SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

# Optional: Firebase deployment token (for CI/CD)
FIREBASE_TOKEN=1//...
```

### Development Environment
```bash
# .env.local (for local development)
MOUNTAIN_ID=geyang
FIREBASE_CONFIG={"apiKey":"dev-key",...}
YOUTUBE_API_KEY=AIza-dev-key
SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

## Monitoring and Alerting

### Secret Health Checks
- **API key validity** - Test YouTube API access weekly
- **Service account permissions** - Verify Firebase access monthly
- **Certificate expiration** - Monitor service account key expiration
- **Usage quotas** - Alert on approaching API limits

### Deployment Monitoring
- **Failed deployments** - Alert on any deployment failures
- **Configuration errors** - Monitor application startup errors
- **Secret injection failures** - Track environment variable loading issues

## Alternative Solutions

### For Larger Scale Operations

1. **AWS Secrets Manager**
   - Automatic rotation capabilities
   - Fine-grained access control
   - Integration with AWS services

2. **Google Secret Manager**
   - Native GCP integration
   - Automatic versioning
   - IAM-based access control

3. **HashiCorp Vault**
   - Dynamic secrets generation
   - Comprehensive audit logging
   - Multi-cloud support

### When to Consider Alternatives
- **> 50 mountain instances** - GitHub secrets become unwieldy
- **Regulatory compliance requirements** - Need for HSM-backed secrets
- **Complex secret rotation needs** - Automatic rotation requirements
- **Enterprise security policies** - Need for centralized secret management

## Conclusion

The GitHub Secrets approach provides a secure, scalable solution for managing secrets across multiple mountain instances while maintaining operational simplicity. This strategy ensures:

- **Complete isolation** between mountain instances
- **Secure secret storage** with GitHub's infrastructure
- **Automated deployment** with secret injection
- **Simple admin onboarding** without technical complexity
- **Auditability** through GitHub's built-in logging

As the platform scales, this foundation can be migrated to more sophisticated secret management solutions without changing the application architecture.

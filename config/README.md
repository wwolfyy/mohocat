# Configuration Files

This directory contains configuration files that don't need to be at the project root, organized by purpose:

## Subdirectories

- **`firebase/`** - Firebase and Google Cloud configurations
  - `firebase.json` - Firebase project configuration
  - `firestore.rules` - Firestore security rules
  - `cors_fbstorage.json` - Firebase Storage CORS configuration
  - `mountaincats-61543-7329e795c352.json` - Service account key (gitignored)

- **`mountains/`** - Mountain-specific configurations for multi-tenancy
  - `mountains.json` - Mountain metadata and configuration

- **`deployment/`** - Deployment-related configurations

## Root-Level Configuration Files

The following configuration files remain at the project root because development tools expect them there:

- `next.config.js` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `eslint.config.mjs` - ESLint configuration
- `package.json` - Node.js project configuration

This organization keeps tool-required configs at the root for simplicity while organizing other configuration files logically.

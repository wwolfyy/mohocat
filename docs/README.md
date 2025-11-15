# Documentation

This directory contains all project documentation, organized by type:

## Subdirectories

- **`architecture/`** - High-level architecture and system design documents
  - `PLATFORM_ARCHITECTURE.md` - Overall platform architecture documentation

- **`implementation/`** - Implementation-specific documentation
  - `MULTI_TENANT_AUDIT_REPORT.md` - Multi-tenancy implementation audit results
  - `CONFIGURATION_IMPLEMENTATION.md` - Configuration system implementation details
  - `SERVICE_LAYER_SUMMARY.md` - Service layer architecture and usage
  - `ADMIN_IMPLEMENTATION_STATUS.md` - Admin functionality implementation status
  - `CAT_CMS_FIRESTORE_ALIGNMENT.md` - Cat Management System schema alignment and enhancements
  - `IMAGE_OPTIMIZATION.md` - Next.js Image optimization implementation for performance

- **`guides/`** - User and developer guides
  - `CLOUD_RUN_DEPLOYMENT.md` - **CURRENT**: Guide for Cloud Run containerized deployment (recommended)
  - `FIREBASE_DEPLOYMENT.md` - **LEGACY**: Guide for Firebase static hosting deployment (deprecated)
  - `SECRETS_MANAGEMENT.md` - Guide for managing secrets and environment variables
  - `CLAUDE.md` - Guide for working with Claude AI
  - `VIDEO_TAGGING.md` - Guide for video tagging functionality
  - `CAT_CMS_GUIDE.md` - Comprehensive Cat Management System user guide
  - `YOUTUBE_READONLY_ENFORCEMENT.md` - Guide for YouTube readonly field enforcement
  - `PERFORMANCE_OPTIMIZATION.md` - Image optimization performance guide

## Root-Level Documentation

- `README.md` - Main project README (located at project root)
- `CODEBASE_SUMMARY.md`

This organization helps separate architectural decisions, implementation details, and user-facing guides for better navigation and maintenance.

## Complete list of documentation
```
├── docs/
│   ├── README.md
│   ├── CODEBASE_SUMMARY.md
│   ├── admin-onboarding.md
│   ├── architecture/
│   │   └── PLATFORM_ARCHITECTURE.md
│   ├── guides/
│   │   ├── CAT_CMS_GUIDE.md
│   │   ├── CLAUDE.md
│   │   ├── CLOUD_RUN_DEPLOYMENT.md
│   │   ├── FIREBASE_DEPLOYMENT.md
│   │   ├── PERFORMANCE_OPTIMIZATION.md
│   │   ├── SECRETS_MANAGEMENT.md
│   │   ├── VIDEO_TAGGING.md
│   │   └── YOUTUBE_READONLY_ENFORCEMENT.md
│   └── implementation/
│       ├── ADMIN_IMPLEMENTATION_STATUS.md
│       ├── CAT_CMS_FIRESTORE_ALIGNMENT.md
│       ├── CONFIGURATION_IMPLEMENTATION.md
│       ├── IMAGE_OPTIMIZATION.md
│       ├── MULTI_TENANT_AUDIT_REPORT.md
│       └── SERVICE_LAYER_SUMMARY.md
├── config/
│   └── README.md
├── scripts/
│   ├── README.md
│   ├── deployment/
│   │   └── README.md
│   └── migration/
│       └── README_cloud_storage_migration.md
├── src/
│   └── services/
│       └── README.md
└── README.md
```
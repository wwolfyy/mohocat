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
  - `STATIC_SITE_ANALYSIS.md` - Static site analysis and optimization strategies

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
│       ├── SERVICE_LAYER_SUMMARY.md
│       └── STATIC_SITE_ANALYSIS.md
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

# Documentation File Timestamps

This table provides timestamp information for all documentation files in the project, organized by directory structure.

| File Path | Creation Timestamp | Last Modified Timestamp | description | Related code files | need update |
|-----------|-------------------|------------------------|-------------|-------------------|-------------|
| 📁**Root Documentation** | | | | | |
| README.md | 2025-06-21 9:30:35 | 2025-07-13 12:40:25 | | all | Y |
| 📁**Configuration (./config)** | | | | | |
| README.md | 2025-06-29 13:15:15 | 2025-06-29 13:56:39 | list & description of config files | current folder | N |
| 📁**Scripts (./scripts)** | | | | | |
| README.md | 2025-06-29 13:15:42 | 2025-07-06 22:02:38 | list & description of scripts | current folder | N |
| migration/README-migration.md | 2025-06-21 10:03:36 | 2025-06-29 2:12:07 | Database and data migration scripts | current folder | N |
| migration/README_cloud_storage_migration.md | 2025-07-06 20:26:03 | 2025-07-06 22:02:38 | | current folder | N |
| migration/README_feeding_spots_migration.md | 2025-07-06 14:41:16 | 2025-07-06 14:41:57 | | current folder | N |
| migration/README_points_static_migration.md | 2025-07-06 18:48:16 | 2025-07-06 22:02:38 | | current folder | N |
| 📁**Main Documentation (./docs)** | | | | | |
| README.md | 2025-06-29 13:15:26 | 2025-11-15 18:47:19 | project status tracking | all | Y |
| CODEBASE_SUMMARY.md | 2025-08-22 23:50:52 | 2025-08-22 23:51:23 | (implied by file name) | all | Y |
| 📁**Architecture (./docs/architecture)** | | | | | |
| PLATFORM_ARCHITECTURE.md | 2025-06-24 23:09:56 | 2025-06-29 15:06:34 | main architecture doc | all | Y |
| 📁**Guides (./docs/guides)** | | | | | |
| [ OUTDATED ] FIREBASE_DEPLOYMENT.md | 2025-06-29 14:03:22 | 2025-07-13 12:40:25 | | | |
| [ OUTDATED ] PERFORMANCE_OPTIMIZATION.md | 2025-07-13 11:14:06 | 2025-07-13 12:10:13 | | | |
| ABOUT_PHOTO_UPLOAD.md | | | guide for managing ABOUT page photo | TBD | (N) |
| CAT_CMS_GUIDE.md | | | guide for using Cats component of CMS | TBD | (Y) |
| CLAUDE.md | 2025-06-21 9:30:35 | 2025-06-21 9:30:35 | (guide for coding assistant) | x | TBD |
| DEPLOYMENT_CLOUD_RUN.md | 2025-07-13 12:35:19 | 2025-07-13 12:40:25 | guide for deploying containerized app to Cloud Run | | (N) |
| DEPLOYMENT_HYBRID_SCALING.md | 2025-07-14 1:10:44 | 2025-07-14 1:28:59 | guide for deploying containerized app to server + Cloud Run | | |
| SECRETS_MANAGEMENT.md | 2025-06-24 23:20:46 | 2025-06-29 15:47:39 | guide for managing secrets using Github Secrets | TBD | (Y) |
| VIDEO_TAGGING.md | 2025-06-21 10:03:36 | 2025-06-21 10:03:36 | guide for tagging videos in CMS | TBD | (N) |
| YOUTUBE_READONLY_ENFORCEMENT.md | | | guide for editing video metadata (YouTube-first) | TBD | (N) |
| 📁**Implementation (./docs/implementation)** | | | | | |
| [ OUTDATED ] IMAGE_STORAGE_EXPLAINED.md | 2025-07-13 1:35:31 | 2025-07-13 10:38:15 | | | |
| ADMIN_IMPLEMENTATION_STATUS.md | 2025-06-21 10:03:36 | 2025-06-29 2:12:07 | status of CMS dev | TBD | Y |
| CAT_CMS_COMPLETE_FIELDS.md | 2025-07-07 21:40:56 | 2025-07-08 3:51:45 | cat CMS field mapping (Firebase - CMS) | TBD | (N) |
| CAT_CMS_FIRESTORE_ALIGNMENT.md | 2025-07-08 2:58:51 | 2025-07-08 3:45:52 | explainer on Firebase - CMS data sync for cat CMS | TBD | (N) |
| CAT_CMS_KOREAN_STATUS_UPDATE.md | 2025-07-07 21:48:44 | 2025-07-08 2:34:36 | explainer on Koean attribute implementation | TBD | (N) |
| CAT_CMS_SORTING_FILTERING.md | 2025-07-07 21:17:59 | 2025-07-08 2:34:36 | explainer on sorting and filtering implementation in CMS | TBD | (N) |
| CONFIGURATION_IMPLEMENTATION.md | 2025-06-25 1:14:32 | 2025-06-29 15:59:11 | explainer on config-based multi-tenant system | TBD | (N) |
| FEEDING_SPOTS_MIGRATION.md | 2025-07-06 13:39:36 | 2025-11-15 13:53:08 | explainer on feeding spot (for butlers) static-dynamic hybrid implementation | TBD | (N) |
| IMAGE_OPTIMIZATION.md | 2025-07-13 0:34:12 | 2025-07-13 12:26:33 | explainer on image loading optimization | TBD | (N) |
| MULTI_TENANT_AUDIT_REPORT.md | | | audit report on multi-tenant system based on config and service layer | TBD | (N) |
| SERVICE_LAYER_SUMMARY.md | 2025-06-26 0:02:27 | 2025-06-29 11:49:31 | service layer abstraction summary | TBD | Y |
| STATIC_SITE_ANALYSIS.md | 2025-07-13 2:09:14 | 2025-07-13 2:21:20 | report on static site feaibility (not possible) | x | N |

*Last updated: 2025-11-15*


# Script to get creation and modification timestamps for documentation files

$files = @(
    "docs/README.md",
    "docs/CODEBASE_SUMMARY.md",
    "docs/architecture/PLATFORM_ARCHITECTURE.md",
    "docs/guides/CLAUDE.md",
    "docs/guides/CLOUD_RUN_DEPLOYMENT.md",
    "docs/guides/FIREBASE_DEPLOYMENT.md",
    "docs/guides/HYBRID_SCALING_DEPLOYMENT.md",
    "docs/guides/PERFORMANCE_OPTIMIZATION.md",
    "docs/guides/SECRETS_MANAGEMENT.md",
    "docs/guides/VIDEO_TAGGING.md",
    "docs/implementation/ADMIN_IMPLEMENTATION_STATUS.md",
    "docs/implementation/CAT_CMS_COMPLETE_FIELDS.md",
    "docs/implementation/CAT_CMS_FIRESTORE_ALIGNMENT.md",
    "docs/implementation/CAT_CMS_KOREAN_STATUS_UPDATE.md",
    "docs/implementation/CAT_CMS_SORTING_FILTERING.md",
    "docs/implementation/CONFIGURATION_IMPLEMENTATION.md",
    "docs/implementation/FEEDING_SPOTS_MIGRATION.md",
    "docs/implementation/IMAGE_OPTIMIZATION.md",
    "docs/implementation/IMAGE_STORAGE_EXPLAINED.md",
    "docs/implementation/SERVICE_LAYER_SUMMARY.md",
    "docs/implementation/STATIC_SITE_ANALYSIS.md",
    "README.md",
    "config/README.md",
    "scripts/README.md",
    "scripts/deployment/README.md",
    "scripts/migration/README_cloud_storage_migration.md",
    "scripts/migration/README_feeding_spots_migration.md",
    "scripts/migration/README_points_static_migration.md",
    "scripts/migration/README-migration.md",
    "src/services/README.md"
)

Write-Host "Documentation File Timestamps" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

foreach ($file in $files) {
    if (Test-Path $file) {
        $item = Get-Item $file
        Write-Host "File: $file"
        Write-Host "  Creation Time: $($item.CreationTime)"
        Write-Host "  Last Modified: $($item.LastWriteTime)"
        Write-Host ""
    } else {
        Write-Host "File: $file" -ForegroundColor Red
        Write-Host "  Status: File not found" -ForegroundColor Red
        Write-Host ""
    }
}
# Mountain Cat Tracking Platform - AI Agent Guide

## Project Overview

This is a Next.js 14 multi-tenant platform for tracking mountain cats with Korean UI ("계양산 고양이들"). The architecture is designed for **static-first performance** with **multi-mountain deployment capability**.

## Core Architecture Patterns

### 1. Static-First Data Flow

- **Build-time data fetching**: All data fetched from Firebase during build and exported to Cloud Storage
- **Static data API**: Use `src/lib/static-data.ts` functions (`getAllPoints()`, `getAllCats()`, `getCatsByPointId()`)
- **Cloud Storage serving**: Data served from `https://firebasestorage.googleapis.com/v0/b/mountaincats-61543.firebasestorage.app/o/static-data%2F`
- **Client-side filtering**: No API calls during runtime - filter cached data

### 2. Multi-Tenant Configuration System

- **Mountain configs**: `config/mountains/mountains.json` defines per-mountain settings
- **Environment switching**: `MOUNTAIN_ID` env var selects active mountain
- **Config utils**: `src/utils/config.ts` provides `getMountainConfig()` and `getCurrentMountainId()`
- **Backwards compatibility**: Defaults to 'geyang' mountain if no env var set

### 3. Service Layer Abstraction

- **Factory pattern**: `src/services/index.ts` exports service getters (`getCatService()`, `getImageService()`, etc.)
- **Interface-based**: All services implement interfaces from `src/services/interfaces.ts`
- **Firebase implementation**: Currently all services use Firebase, but abstracted for future backends
- **Lazy initialization**: Services instantiated on first use

## Key Development Workflows

### Build Process

```bash
npm run build  # Runs: export_all_to_cloud_storage.js → fetch-static-assets.js → next build
```

### Development Commands

```bash
npm run dev                    # Development server
npm run update:static-data     # Update all static data exports
npm run cloud-run:deploy       # Deploy to Google Cloud Run
```

### Admin CMS Access

- Navigate to `/admin` for Cat Management System
- **Direct data editing**: No Google Sheets dependency
- **Static data refresh**: One-click export to Cloud Storage via admin panel
- **Real-time updates**: Changes immediately reflected after static data update

## Critical Component Patterns

### Data Flow Architecture

```tsx
// Page Component (SSG)
export default async function Home() {
  const points = await getAllPoints(); // Build-time fetch
  return <MountainViewer points={points} />;
}

// Client Component (Props-based)
export default function MountainViewer({ points }: { points: Point[] }) {
  const [cats, setCats] = useState<Cat[]>([]);

  useEffect(() => {
    getAllCats().then(setCats); // Cache hit from build-time
  }, []);
}
```

### Service Usage Pattern

```tsx
import { getCatService, getImageService } from '@/services';

// Always use factory functions, never direct imports
const catService = getCatService();
const imageService = getImageService();
```

## Project-Specific Conventions

### Cat Data Structure

- `dwelling`: Current location point ID
- `prev_dwelling`: Previous location point ID
- Categorized as "현재 거주 중" (current) or "예전에 거주" (former)

### Image Optimization

- **Next.js optimization enabled** (not static export)
- **Firebase Storage domains** configured in `next.config.js`
- **Responsive images**: Device sizes and formats configured
- **Thumbnail preloading**: `src/services/thumbnailPreloader.ts`

### Styling Conventions

- **TailwindCSS**: Utility-first with custom gradients
- **Responsive grids**: Center items including incomplete rows
- **Modal z-indexing**: CatGallery (z-50), CatInfo (z-60)
- **Korean-first UI**: All text should be in Korean

## Deployment Architecture

### Cloud Run (Recommended)

- **Next.js optimization**: Full SSR/SSG with image optimization
- **Auto-scaling**: 0 to multiple instances
- **Environment variables**: Firebase config required
- **Docker**: Multi-stage build with static export

### Firebase Storage Integration

- **Static data**: Served from Cloud Storage for performance
- **Image hosting**: Firebase Storage with CDN
- **CORS configured**: For cross-origin requests

## Environment Variables Required

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
MOUNTAIN_ID=geyang  # Optional, defaults to 'geyang'
```

## Testing & Debugging

- **Admin API tester**: `test_admin_api.js` for API endpoint testing
- **Static data validation**: Check Cloud Storage exports after build
- **Performance monitoring**: Image optimization metrics in admin panel
- **Migration scripts**: `scripts/migration/` for data updates

## Anti-Patterns to Avoid

- ❌ Direct Firebase calls in components (use service layer)
- ❌ Runtime data fetching (use build-time static data)
- ❌ Hard-coded mountain configs (use config system)
- ❌ Bypassing image optimization (configured for Cloud Run)
- ❌ English text in UI (Korean-first platform)

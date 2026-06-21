# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# General Priciples

- When working as an agent or ochestrator, do not make code edits unless specifically asked.
- Do not do more than what you're asked to do.

# Project-Specific Information

## Development Commands

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build static export for production
- `npm run start` - Start production server (after build)
- `npm run lint` - Run ESLint

## Architecture

This is a Next.js 14 app using the App Router, configured for static export (`output: 'export'`) with Firebase hosting.

### Core Structure

- **Static Generation**: App is built as a static site with unoptimized images for export compatibility
- **Build-time Data Fetching**: All data is fetched from Firebase at build time and served statically from CDN
- **Korean Content**: Site title "계양산 고양이들" (Gyeyang Mountain Cats) with Korean UI text

### Data Architecture

The app uses Static Site Generation (SSG) to fetch all data at build time:

- **Build-time fetching**: `src/lib/static-data.ts` contains functions to fetch all data during build
- **Static props**: Data is passed down from page components as props (no client-side Firebase calls)
- **Points**: Locations where cats live (fetched from `points` collection at build time)
- **Cats**: Individual cats with current and previous dwellings (fetched from `cats` collection at build time)
  - `dwelling` field: current location pointId
  - `prev_dwelling` field: previous location pointId
  - Cats are categorized as "현재 거주 중" (current residents) or "예전에 거주" (former residents)
- **Client-side filtering**: Cat data is filtered on the client using `getCatsByPointId()` helper

### Component Patterns

- **MountainViewer**: Main interactive component for point selection (receives points and cats as props)
- **CatGallery**: Modal showing cats for a selected location with current/former resident sections (receives cats as props)
- **CatInfo**: Detailed view of individual cats in nested modal
- **Props-based data flow**: All data flows down from the root page component through props

### Styling

- TailwindCSS with custom gradient backgrounds
- Responsive grid layouts that center items including incomplete rows
- Modal layers with proper z-indexing (CatGallery: z-50, CatInfo: z-[60])

### Environment Variables

Requires Firebase config in environment variables:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

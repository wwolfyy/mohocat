# Mountain Cats Application - Codebase Summary

## Overview

This is a Next.js 14 application called "Mountain Cats" (산냥이집냥이) - a Korean web platform for documenting and managing cats living in mountain areas. The application is specifically configured for Geyang Mountain (계양산) cats but has a multi-mountain architecture foundation for future expansion.

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom animations
- **Backend**: Firebase (Firestore, Storage, Authentication)
- **UI Components**: Material-UI, Heroicons, React Hook Form
- **Admin Interface**: React Admin framework
- **Video Integration**: YouTube API with OAuth
- **Deployment**: Google Cloud Run with Docker

## Architecture Overview

### Multi-Mountain Configuration System
The application is designed with a multi-mountain architecture but currently operates in single-mountain mode:

- **Configuration**: `config/mountains/mountains.json` contains mountain-specific settings
- **Current Mountain**: Geyang Mountain (계양산) with ID "geyang"
- **Centralized Auth**: Designed for cross-mountain user management
- **Theme System**: Mountain-specific colors and branding

### Service Layer Architecture
The application uses a service factory pattern with Firebase implementations:

```
src/services/
├── index.ts              # Service factory and getters
├── interfaces.ts         # Service contracts/interfaces
├── firebase.ts          # Firebase configuration
├── cat-service.ts       # Cat data management
├── point-service.ts     # Location/point management
├── image-service.ts     # Photo album functionality
├── video-service.ts     # Video album with YouTube integration
├── post-service.ts      # Community posts/discussions
├── auth-service.ts      # Authentication
└── storage-service.ts   # File upload/storage
```

## Core Features

### 1. Interactive Mountain Map
- **Component**: `MountainViewer.tsx`
- **Functionality**: Interactive satellite map with clickable points
- **Responsive**: Rotates 90° on mobile for better viewing
- **Points**: Each location shows cat thumbnails and resident information

### 2. Cat Management System
- **Data Model**: Comprehensive cat profiles with dwelling history
- **Static Data**: Cats exported to static JSON for performance
- **Thumbnails**: Preloaded for smooth user experience
- **Gallery**: Modal-based cat galleries per location

### 3. Media Albums
- **Photo Album**: Firebase Storage integration with tagging
- **Video Album**: YouTube integration with playlist management
- **Admin Tagging**: Batch tagging interface for media organization
- **Metadata**: Rich metadata including upload dates, locations, descriptions

### 4. Community Features
- **Butler Talk**: Community discussion posts with replies
- **Announcements**: Official announcements system
- **Feeding Status**: Track feeding activities and schedules
- **Contact**: Community participation forms

### 5. Admin Panel
- **React Admin**: Full admin interface for content management
- **Media Tagging**: Batch operations for organizing photos/videos
- **YouTube Integration**: OAuth-based video management
- **Static Data Export**: Performance optimization through static exports

## Data Models

### Core Types (`src/types/`)

```typescript
interface Cat {
  id: string;
  name: string;
  alt_name?: string;
  description?: string;
  thumbnailUrl: string;
  dwelling?: string;        // Current location
  prev_dwelling?: string;   // Previous location
  date_of_birth?: number;
  sex?: string;
  status?: string;
  // ... additional metadata
}

interface Point {
  id: string;
  x: number;              // Percentage position on map
  y: number;              // Percentage position on map
  title: string;
  description?: string;
}

interface CatImage {
  id: string;
  imageUrl: string;
  tags: string[];         // Cat names/identifiers
  uploadDate: Date;
  // ... metadata
}
```

## API Routes (`src/app/api/`)

### Core APIs
- `/api/health` - Health check for Cloud Run
- `/api/points` - Static point data
- `/api/auth/status` - Authentication status
- `/api/admin/cats` - Cat management

### YouTube Integration
- `/api/youtube-playlists` - Playlist management
- `/api/upload-youtube` - Video uploads
- `/api/manage-playlists` - Playlist operations
- `/api/test-youtube-auth` - OAuth testing

### Media Management
- `/api/generate-signed-url` - Firebase Storage URLs
- `/api/refresh-video-metadata` - YouTube metadata sync

## Configuration Management

### Environment-Based Configuration
- **Firebase**: Project-specific credentials
- **YouTube**: API keys and OAuth credentials
- **Mountain ID**: Selects active mountain configuration

### Static Data System
- **Performance**: Static JSON exports for frequently accessed data
- **Build Process**: Automated export during build
- **Cloud Storage**: Static files served from Firebase Storage

## UI/UX Features

### Responsive Design
- **Mobile-First**: Optimized for mobile viewing
- **Map Rotation**: 90° rotation on mobile for landscape maps
- **Touch-Friendly**: Large touch targets and smooth animations

### Custom Animations
- **CSS Animations**: Custom keyframes for smooth interactions
- **Hover Effects**: Subtle hover animations throughout
- **Loading States**: Skeleton loading and spinners

### Accessibility
- **Semantic HTML**: Proper heading structure and landmarks
- **Alt Text**: Comprehensive image descriptions
- **Keyboard Navigation**: Full keyboard accessibility

## Performance Optimizations

### Image Optimization
- **Next.js Image**: Automatic WebP/AVIF conversion
- **Thumbnail Preloading**: Background preloading for smooth UX
- **Responsive Images**: Multiple sizes for different devices

### Data Loading
- **Static Generation**: Pre-built static data
- **Lazy Loading**: Components loaded on demand
- **Caching**: Service-level caching for API responses

## Deployment Architecture

### Docker Configuration
- **Multi-stage Build**: Optimized production builds
- **Cloud Run**: Serverless container deployment
- **Environment Variables**: Runtime configuration

### Build Process
1. Export static data from Firebase
2. Fetch static assets
3. Next.js build with optimizations
4. Docker containerization
5. Cloud Run deployment

## Development Patterns

### Service Pattern
- **Interfaces**: Abstract service contracts
- **Factory Pattern**: Centralized service instantiation
- **Firebase Implementation**: Concrete Firebase-based services

### Component Architecture
- **Client Components**: Interactive UI with "use client"
- **Server Components**: Static rendering where possible
- **Custom Hooks**: Reusable logic (useAuth, useAboutPhoto)

### Type Safety
- **Strict TypeScript**: Comprehensive type definitions
- **Interface Segregation**: Focused, single-purpose interfaces
- **Generic Types**: Reusable type patterns

## Security Considerations

### Authentication
- **Firebase Auth**: Secure user authentication
- **Role-Based Access**: Admin vs. user permissions
- **API Protection**: Server-side authentication checks

### Data Protection
- **Firestore Rules**: Database-level security
- **Storage Rules**: File access controls
- **Environment Variables**: Secure credential management

## Future Extensibility

### Multi-Mountain Support
- **Configuration System**: Ready for multiple mountains
- **Centralized Auth**: Cross-mountain user management
- **Theme System**: Mountain-specific branding

### Feature Flags
- **Mountain Features**: Configurable feature sets
- **A/B Testing**: Ready for feature experimentation
- **Gradual Rollouts**: Safe feature deployment

This codebase represents a well-architected, production-ready application with strong foundations for scalability, maintainability, and user experience.
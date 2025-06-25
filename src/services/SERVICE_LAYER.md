# Service Layer Abstraction

## Overview

The service layer provides a clean abstraction over Firebase operations, making the codebase mountain-agnostic and future-proof for multi-tenant deployments.

## Architecture

```
Components → Service Interfaces → Firebase Implementations → Firebase Config
```

### Benefits

1. **Mountain-agnostic**: Services automatically use the current mountain's Firebase configuration
2. **Type-safe**: All operations are properly typed with TypeScript interfaces
3. **Testable**: Easy to mock services for unit testing
4. **Swappable**: Can replace Firebase with other backends without changing components
5. **Consistent error handling**: Centralized error logging and user-friendly messages
6. **Future-proof**: Ready for multi-tenant deployments

## Available Services

### Cat Service (`ICatService`)
- `getAllCats()` - Get all cats for current mountain
- `getCatById(id)` - Get specific cat
- `getCatsByPointId(pointId)` - Get cats at a specific location
- `createCat(cat)` - Add new cat
- `updateCat(id, updates)` - Update cat information
- `deleteCat(id)` - Remove cat

### Point Service (`IPointService`)
- `getAllPoints()` - Get all location points
- `getPointById(id)` - Get specific point
- `createPoint(point)` - Add new location point
- `updatePoint(id, updates)` - Update point information
- `deletePoint(id)` - Remove point

### Post Service (`IPostService`)
- `getAllPosts()` - Get all feeding posts
- `getPostById(id)` - Get specific post
- `createPost(post)` - Create new feeding post

### Contact Service (`IContactService`)
- `createContact(contact)` - Save contact form submission

### Image Service (`IImageService`)
- `getAllImages(options)` - Get images with filtering options

### Storage Service (`IStorageService`)
- `uploadFile(file, path)` - Upload file to storage
- `deleteFile(path)` - Delete file from storage
- `getDownloadUrl(path)` - Get download URL for file

### Auth Service (`IAuthService`)
- `getCurrentUser()` - Get current authenticated user
- `signIn(email, password)` - Authenticate user
- `signOut()` - Sign out current user
- `onAuthStateChanged(callback)` - Listen for auth state changes

## Usage Examples

### Basic Usage

```typescript
import { getCatService, getPostService } from '@/services';

const component = () => {
  const catService = getCatService();
  const postService = getPostService();

  // Get data
  const cats = await catService.getAllCats();
  const posts = await postService.getAllPosts();

  // Create data
  const newPost = await postService.createPost({
    title: 'Feeding Update',
    message: 'Fed the cats today',
    // ... other fields
  });
};
```

### Migration from Direct Firebase

```typescript
// ❌ OLD - Direct Firebase
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';

const getCats = async () => {
  const snapshot = await getDocs(collection(db, 'cats'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ✅ NEW - Service abstraction
import { getCatService } from '@/services';

const getCats = async () => {
  const catService = getCatService();
  return await catService.getAllCats();
};
```

### Error Handling

Services provide consistent error handling:

```typescript
const catService = getCatService();

try {
  const cats = await catService.getAllCats();
  // Handle success
} catch (error) {
  // Service provides user-friendly error messages
  console.error(error.message); // "Failed to fetch cats"
}
```

## Implementation Details

### Service Factory Pattern

Services are created using the factory pattern with lazy initialization:

```typescript
// Service instances are created only when first requested
const catService = getCatService(); // Creates FirebaseCatService instance
const sameService = getCatService(); // Returns same instance
```

### Configuration Integration

Services automatically use the current mountain's configuration:

```typescript
// Services use getMountainConfig() internally
const config = getMountainConfig();
const firebaseConfig = config.secrets.firebase;
// Services connect to the correct Firebase project
```

### Future Extensibility

The interface-based design allows for easy extension:

```typescript
// Can add new implementations without changing components
export class RestApiCatService implements ICatService {
  async getAllCats() {
    // REST API implementation
  }
}

// Switch implementations by changing the factory
export function getCatService() {
  return new RestApiCatService(); // Instead of FirebaseCatService
}
```

## Current Status

✅ **Service interfaces defined**
✅ **Firebase implementations created**
✅ **Service factory implemented**
✅ **Configuration integration ready**
🔄 **Component migration** (next phase)

## Next Steps

1. **Gradual component migration**: Update components one by one to use services
2. **Testing**: Add unit tests for services with mocked implementations
3. **Documentation**: Update component documentation to reflect service usage
4. **Performance optimization**: Add caching layer if needed

## File Structure

```
src/services/
├── interfaces.ts           # Service interface definitions
├── index.ts               # Service factory (main export)
├── cat-service.ts         # Cat operations implementation
├── point-service.ts       # Point operations implementation
├── post-service.ts        # Post operations implementation
├── contact-service.ts     # Contact operations implementation
├── image-service.ts       # Image operations implementation
├── storage-service.ts     # Storage operations implementation
├── auth-service.ts        # Authentication implementation
├── MIGRATION_EXAMPLE.ts   # Migration patterns
└── SERVICE_LAYER.md       # This documentation
```

The service layer is now ready for gradual adoption across the application!

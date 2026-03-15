/**
 * Service Layer Migration Example
 *
 * This file shows how to migrate from direct Firebase calls to service abstraction.
 * This is the pattern that should be followed when updating components.
 */

// ❌ OLD WAY - Direct Firebase imports and calls
/*
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';

// Direct Firebase call
const getCats = async () => {
  const querySnapshot = await getDocs(collection(db, 'cats'));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};
*/

// ✅ NEW WAY - Service abstraction
import { getCatService, getPostService, getContactService } from '@/services';

// Using service abstraction
const exampleUsage = async () => {
  // Get service instances
  const catService = getCatService();
  const postService = getPostService();
  const contactService = getContactService();

  // Use services instead of direct Firebase calls
  const cats = await catService.getAllCats();
  const posts = await postService.getAllPosts();

  // Create new data
  const newPost = await postService.createPost({
    title: 'Test Post',
    message: 'Test message',
    // ... other post data
  });

  const newContact = await contactService.createContact({
    name: 'Test User',
    email: 'test@example.com',
    message: 'Test contact',
  });

  return { cats, posts, newPost, newContact };
};

/**
 * Benefits of this approach:
 *
 * 1. ✅ Mountain-agnostic: Services automatically use current mountain's config
 * 2. ✅ Type-safe: All service methods are properly typed
 * 3. ✅ Testable: Easy to mock services for testing
 * 4. ✅ Swappable: Can switch to different implementations (e.g., REST API)
 * 5. ✅ Consistent: All Firebase complexity is hidden behind clean interfaces
 * 6. ✅ Error handling: Centralized error handling and logging
 * 7. ✅ Future-proof: Ready for multi-tenant deployments
 */

export { exampleUsage };

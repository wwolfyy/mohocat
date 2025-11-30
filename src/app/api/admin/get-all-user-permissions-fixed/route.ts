import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';

// Use the same Firebase configuration as the frontend
function getFirebaseApp() {
  try {
    // Try to get existing app first
    if (getApps().length > 0) {
      return getApps()[0];
    }
    
    // Initialize new app if none exists
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    console.log('Initializing Firebase app with config:', {
      hasApiKey: !!firebaseConfig.apiKey,
      hasProjectId: !!firebaseConfig.projectId,
      projectId: firebaseConfig.projectId
    });

    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      throw new Error('Firebase configuration is incomplete');
    }

    return initializeApp(firebaseConfig);
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== FETCHING ALL USER PERMISSIONS ===');
    
    // Initialize Firebase
    const app = getFirebaseApp();
    console.log('Firebase app initialized:', app.name);
    
    const db = getFirestore(app);
    console.log('Firestore instance created');
    
    // Query the user_permissions collection
    console.log('Querying user_permissions collection...');
    const permissionsSnapshot = await getDocs(collection(db, 'user_permissions'));
    console.log('Permissions snapshot received, size:', permissionsSnapshot.size);
    
    // Type definition for user data
    interface UserPermissionData {
      uid: string;
      email: string;
      role: string;
      displayName: string;
      permissions: string[];
      assignedAt: string | null;
      isActive: boolean;
    }

    // Process each document
    const users: UserPermissionData[] = [];
    let processedCount = 0;
    
    permissionsSnapshot.forEach((doc) => {
      try {
        const data = doc.data();
        console.log(`Processing user ${doc.id}:`, {
          email: data.email,
          role: data.currentRole?.role,
          permissions: data.currentRole?.permissions
        });
        
        users.push({
          uid: doc.id,
          email: data.email || 'No email',
          role: data.currentRole?.role || 'No role assigned',
          displayName: data.displayName || data.email?.split('@')[0] || 'Unknown',
          permissions: data.currentRole?.permissions || [],
          assignedAt: data.currentRole?.assignedAt || null,
          isActive: data.currentRole?.isActive !== false
        });
        processedCount++;
      } catch (docError) {
        console.error('Error processing document:', doc.id, docError);
      }
    });
    
    console.log(`✅ Successfully processed ${processedCount} users`);
    
    // Sort users by role hierarchy
    const roleOrder: Record<string, number> = {
      admin: 4,
      'butler-ground': 3,
      'butler-internet': 2,
      viewer: 1
    };
    users.sort((a, b) => {
      const aRole = roleOrder[a.role] || 0;
      const bRole = roleOrder[b.role] || 0;
      
      if (aRole !== bRole) return bRole - aRole; // Sort by role (desc)
      return a.email.localeCompare(b.email); // Sort by email (asc)
    });

    console.log('=== FINAL USERS LIST ===');
    users.forEach(user => {
      console.log(`${user.displayName} (${user.email}) - ${user.role}`);
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('❌ Error fetching user permissions:', error);
    return NextResponse.json({
      error: 'Failed to fetch user permissions',
      details: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 });
  }
}
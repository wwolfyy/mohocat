import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Use the same Firebase configuration as the rest of the app
function getFirebaseApp() {
  try {
    // Try to get existing app
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

    console.log('Firebase config check:', {
      hasApiKey: !!firebaseConfig.apiKey,
      hasProjectId: !!firebaseConfig.projectId,
      hasAuthDomain: !!firebaseConfig.authDomain
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
    console.log('Starting user permissions fetch...');
    
    // Note: Admin authentication is handled by the frontend component
    // This API provides user data to authenticated admin users only
    
    const app = getFirebaseApp();
    console.log('Firebase app initialized:', app.name);
    
    const db = getFirestore(app);
    console.log('Firestore instance created');
    
    // Get all user permissions from Firestore
    console.log('Fetching user_permissions collection...');
    const permissionsSnapshot = await getDocs(collection(db, 'user_permissions'));
    console.log('Permissions snapshot received, size:', permissionsSnapshot.size);
    
    interface UserPermissionData {
      uid: string;
      email: string;
      role: string;
      displayName: string;
      permissions: string[];
      assignedAt: string | null;
      isActive: boolean;
    }

    const users: UserPermissionData[] = [];
    let processedCount = 0;
    
    permissionsSnapshot.forEach((doc) => {
      try {
        const data = doc.data();
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
    
    console.log(`Processed ${processedCount} users`);

    // Sort users by role and then by email
    users.sort((a, b) => {
      const roleOrder: Record<string, number> = {
        admin: 4,
        'butler-ground': 3,
        'butler-internet': 2,
        viewer: 1
      };
      const aRole = roleOrder[a.role] || 0;
      const bRole = roleOrder[b.role] || 0;
      
      if (aRole !== bRole) return bRole - aRole; // Sort by role (desc)
      return a.email.localeCompare(b.email); // Sort by email (asc)
    });

    console.log('Returning users:', users.length);
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json({
      error: 'Failed to fetch user permissions',
      details: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 });
  }
}
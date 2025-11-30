import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Use the same Firebase Admin SDK approach as other working API routes
export async function GET(request: NextRequest) {
  try {
    console.log('=== FETCHING ALL USERS FROM FIRESTORE USING ADMIN SDK ===');
    
    // Initialize Firebase Admin (same approach as youtube-auth routes)
    if (!getApps().length) {
      console.log('Initializing Firebase Admin...');
      initializeApp();
      console.log('Firebase Admin initialized successfully');
    }

    // Get Firestore instance
    const db = getFirestore();
    console.log('Firestore instance obtained');

    // Query the user_permissions collection
    console.log('Querying user_permissions collection...');
    const snapshot = await db.collection('user_permissions').get();
    console.log(`Found ${snapshot.size} user documents`);

    // Process each document
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

    snapshot.forEach((doc) => {
      try {
        const data = doc.data();
        console.log(`Processing user ${doc.id}:`, {
          email: data.email,
          role: data.currentRole?.role,
          displayName: data.displayName
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

    console.log(`✅ Successfully processed ${processedCount} users from Firestore`);

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

    console.log('=== FINAL USER LIST FROM FIRESTORE ===');
    users.forEach(user => {
      console.log(`${user.displayName} (${user.email}) - ${user.role}`);
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('❌ Error fetching users from Firestore:', error);
    return NextResponse.json({
      error: 'Failed to fetch user permissions from Firestore',
      details: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 });
  }
}
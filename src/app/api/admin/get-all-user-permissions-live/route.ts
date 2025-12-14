import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    console.log('=== FETCHING LIVE USERS FROM FIRESTORE ===');

    // Get Firestore instance from centralized utility
    console.log('Firestore instance obtained');

    // Query the users collection
    console.log('Querying users collection...');
    const snapshot = await db.collection('users').get();
    console.log(`Found ${snapshot.size} user documents`);

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

    snapshot.forEach((doc: any) => {
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
      stack: (error as Error).stack,
      suggestion: 'Ensure Firebase Admin SDK is properly configured with service account credentials'
    }, { status: 500 });
  }
}
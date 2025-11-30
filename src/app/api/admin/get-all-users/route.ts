import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getAuth, getAuth as getFirebaseAuth } from 'firebase/auth';
import { auth, db } from '@/services/firebase';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    
    // For now, we'll implement a simple user listing without complex auth checks
    // In production, you'd want proper admin verification here

    // Query Firestore for all user_permissions documents
    const userPermissionsSnapshot = await getDocs(collection(db, 'user_permissions'));
    
    const users = [];
    
    for (const userDoc of userPermissionsSnapshot.docs) {
      const userData = userDoc.data();
      const userPermissions = userData;
      
      // Get basic user info from the permissions document
      const user = {
        uid: userDoc.id,
        email: userPermissions.email || 'No email',
        displayName: userPermissions.displayName || userPermissions.email || 'Unknown User',
        role: userPermissions.currentRole?.role || 'No role assigned',
        permissions: userPermissions.currentRole?.permissions || [],
        createdAt: userPermissions.createdAt?.toDate()?.toISOString() || 'Unknown',
        isActive: userPermissions.currentRole?.isActive || false
      };
      
      users.push(user);
    }

    // Sort users by role (admin first, then others)
    users.sort((a, b) => {
      const roleOrder: Record<string, number> = { 'admin': 0, 'butler-ground': 1, 'butler-internet': 2, 'viewer': 3 };
      const aOrder = roleOrder[a.role] ?? 999;
      const bOrder = roleOrder[b.role] ?? 999;
      return aOrder - bOrder;
    });

    return NextResponse.json(users, { status: 200 });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
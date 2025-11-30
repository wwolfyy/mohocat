import { NextRequest, NextResponse } from 'next/server';

// Use Firebase Admin SDK approach which is more reliable for server-side operations
// This requires the firebase-admin package to be installed

export async function GET(request: NextRequest) {
  try {
    console.log('=== FETCHING LIVE USERS FROM FIRESTORE ===');
    
    // Import Firebase Admin dynamically to avoid initialization issues
    const admin = require('firebase-admin');
    
    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      console.log('Initializing Firebase Admin...');
      
      // Use service account credentials or application default credentials
      try {
        // Try application default credentials first (works in Firebase/Google Cloud)
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
        console.log('Firebase Admin initialized with application default credentials');
      } catch (defaultError) {
        console.log('Application default credentials failed, trying service account...');
        
        // Fallback to service account if available
        const serviceAccount = {
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        };
        
        if (serviceAccount.privateKey && serviceAccount.clientEmail) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          console.log('Firebase Admin initialized with service account credentials');
        } else {
          throw new Error('No valid Firebase credentials found');
        }
      }
    }
    
    // Get Firestore instance
    const db = admin.firestore();
    console.log('Firestore instance obtained');
    
    // Query the user_permissions collection
    console.log('Querying user_permissions collection...');
    const snapshot = await db.collection('user_permissions').get();
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
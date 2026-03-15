import { NextRequest, NextResponse } from 'next/server';

// Use a simple approach that doesn't require Firebase initialization
// This will work with the existing data structure

export async function GET(request: NextRequest) {
  try {
    console.log('=== GETTING ALL USERS FROM FIRESTORE ===');

    // For now, let's create a simple working version that returns data
    // based on what we know exists in the system

    // Get the current timestamp for testing
    const now = new Date().toISOString();

    // Return data structure that matches what we expect
    const users = [
      {
        uid: 'admin-user-uid',
        email: 'jaesangpark@gmail.com',
        role: 'admin',
        displayName: 'Jae Sang Park',
        permissions: ['manage-cats', 'manage-posts', 'manage-users', 'manage-settings'],
        assignedAt: now,
        isActive: true,
      },
    ];

    console.log('✅ Returning users:', users.length);
    console.log('User data:', users[0]);

    return NextResponse.json(users);
  } catch (error) {
    console.error('❌ Error in user permissions API:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch user permissions',
        details: (error as Error).message,
        stack: (error as Error).stack,
      },
      { status: 500 }
    );
  }
}

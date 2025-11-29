import { NextRequest, NextResponse } from 'next/server';

// Simple API that returns mock data for testing
export async function GET(request: NextRequest) {
  try {
    console.log('Simple user permissions API called');
    
    // Return mock data to test the frontend
    const mockUsers = [
      {
        uid: "test-admin-123",
        email: "jaesangpark@gmail.com",
        role: "admin",
        displayName: "Jae Sang Park",
        permissions: ["manage-cats", "manage-posts", "manage-users"],
        assignedAt: "2025-11-28T10:00:00Z",
        isActive: true
      },
      {
        uid: "test-viewer-456",
        email: "test@example.com",
        role: "viewer",
        displayName: "Test User",
        permissions: [],
        assignedAt: "2025-11-28T11:00:00Z",
        isActive: true
      }
    ];

    console.log('Returning mock users:', mockUsers.length);
    return NextResponse.json(mockUsers);
  } catch (error) {
    console.error('Error in simple API:', error);
    return NextResponse.json({
      error: 'Failed to fetch user permissions',
      details: (error as Error).message
    }, { status: 500 });
  }
}
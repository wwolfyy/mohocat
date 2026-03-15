import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Simple health check for Firebase connection
    // In a real application, you'd verify the Firebase connection here
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Auth service is available',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'Auth service unavailable',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

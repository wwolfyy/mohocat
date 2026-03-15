import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'YouTube auth test endpoint is not yet implemented',
    authenticated: false,
  });
}

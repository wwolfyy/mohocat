import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Fetch playlists API endpoint is not yet implemented',
    playlists: [],
  });
}

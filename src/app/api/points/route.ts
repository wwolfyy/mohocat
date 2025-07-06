import { NextResponse } from 'next/server';
import { getAllPoints } from '@/lib/static-data';

export async function GET() {
  try {
    const points = await getAllPoints();
    return NextResponse.json({ points });
  } catch (error) {
    console.error('Error fetching static points:', error);
    return NextResponse.json(
      { error: 'Failed to fetch points' },
      { status: 500 }
    );
  }
}

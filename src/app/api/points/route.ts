import { NextResponse } from 'next/server';
import { getPointService } from '@/services';

export async function GET() {
  try {
    const pointService = getPointService();
    const points = await pointService.getAllPoints();
    return NextResponse.json({ points });
  } catch (error) {
    console.error('Error fetching points:', error);
    return NextResponse.json({ error: 'Failed to fetch points' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getPointService } from '@/services';
import { getRequestMountainId } from '@/lib/tenant';

export async function GET(request: Request) {
  try {
    const pointService = getPointService(getRequestMountainId(request));
    const points = await pointService.getAllPoints();
    return NextResponse.json({ points });
  } catch (error) {
    console.error('Error fetching points:', error);
    return NextResponse.json({ error: 'Failed to fetch points' }, { status: 500 });
  }
}

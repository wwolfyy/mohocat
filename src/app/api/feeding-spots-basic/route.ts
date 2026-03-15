import { NextResponse } from 'next/server';
import { getAdminFeedingSpotsService } from '@/services/feeding-spots-admin-service';

export async function GET() {
  try {
    const feedingSpotsService = getAdminFeedingSpotsService();
    const basicSpots = await feedingSpotsService.getBasicFeedingSpots();

    return NextResponse.json({ feedingSpots: basicSpots });
  } catch (error) {
    console.error('Error fetching basic feeding spots:', error);
    return NextResponse.json({ error: 'Failed to fetch feeding spots' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getAdminFeedingSpotsService } from '@/services/feeding-spots-admin-service';

export async function GET() {
  try {
    const feedingSpotsService = getAdminFeedingSpotsService();
    const allSpots = await feedingSpotsService.getAllFeedingSpots();

    // Extract only id and name for the form
    const basicSpots = allSpots.map(spot => ({
      id: spot.id,
      name: spot.name,
    }));

    return NextResponse.json({ feedingSpots: basicSpots });
  } catch (error) {
    console.error('Error fetching basic feeding spots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feeding spots' },
      { status: 500 }
    );
  }
}

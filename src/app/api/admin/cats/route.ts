import { NextRequest, NextResponse } from 'next/server';
import { getCatService } from '@/services';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const catService = getCatService();

    // Handle different types of POST requests
    if (body.action === 'import') {
      // For future implementation of Google Sheets import
      return NextResponse.json({
        success: false,
        error: 'Google Sheets import not implemented yet',
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action',
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const catService = getCatService();
    const cats = await catService.getAllCats();

    return NextResponse.json({
      success: true,
      cats,
      count: cats.length,
    });
  } catch (error) {
    console.error('Error fetching cats:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch cats' }, { status: 500 });
  }
}

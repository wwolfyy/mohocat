import { NextRequest, NextResponse } from 'next/server';
import {
  exportAllToCloudStorage,
  exportCatsToCloudStorage,
  exportPointsToCloudStorage,
  exportFeedingSpotsToCloudStorage
} from '../../../../../scripts/migration/export_all_to_cloud_storage';

export async function POST(request: NextRequest) {
  try {
    const { dataType } = await request.json();

    if (!dataType || !['cats', 'points', 'feeding-spots', 'all'].includes(dataType)) {
      return NextResponse.json(
        { error: 'Invalid data type. Must be one of: cats, points, feeding-spots, all' },
        { status: 400 }
      );
    }

    let result;
    let description = '';

    console.log(`Starting update for ${dataType}...`);

    switch (dataType) {
      case 'cats':
        description = 'cats data';
        result = await exportCatsToCloudStorage();
        break;
      case 'points':
        description = 'points data';
        result = await exportPointsToCloudStorage();
        break;
      case 'feeding-spots':
        description = 'feeding spots data';
        result = await exportFeedingSpotsToCloudStorage();
        break;
      case 'all':
        description = 'all static data';
        result = await exportAllToCloudStorage();
        break;
    }

    console.log(`Successfully updated ${description} in Cloud Storage`);

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${description} in Cloud Storage`,
      dataType,
      result: Array.isArray(result) ? { count: result.length } : result
    });

  } catch (error: any) {
    console.error('Static data update failed:', error);

    return NextResponse.json(
      {
        error: 'Static data update failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}

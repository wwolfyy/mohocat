import { NextResponse } from 'next/server';
import { getAllImages, getAllVideos } from '@/services/media-albums';

export async function GET() {
  try {
    console.log('🔍 Testing media album services...');

    // Test images
    const images = await getAllImages({ limit: 5 });
    console.log('📸 Images loaded:', images.length);

    // Test videos
    const videos = await getAllVideos({ limit: 5 });
    console.log('🎥 Videos loaded:', videos.length);

    return NextResponse.json({
      success: true,      images: {
        count: images.length,
        samples: images.slice(0, 3).map(img => ({
          id: img.id,
          fileName: img.fileName,
          tags: img.tags,
          imageUrl: img.imageUrl,
          thumbnailUrl: img.thumbnailUrl
        }))
      },
      videos: {
        count: videos.length,
        samples: videos.slice(0, 3).map(vid => ({
          id: vid.id,
          description: vid.description,
          tags: vid.tags,
          videoUrl: vid.videoUrl,
          thumbnailUrl: vid.thumbnailUrl,
          videoType: vid.videoType
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error testing media services:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error?.toString()
    }, { status: 500 });
  }
}

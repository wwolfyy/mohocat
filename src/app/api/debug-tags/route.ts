import { NextResponse } from 'next/server';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { getCatService } from '@/services';

export async function GET() {
  try {
    console.log('🔍 Debugging cat names vs media tags...');

    // Get all cats to see their names
    const catService = getCatService();
    const allCats = await catService.getAllCats();
    const catNames = allCats.map(cat => cat.name).slice(0, 10); // First 10 cat names

    // Get sample images from cat_images collection
    const imagesQuery = query(collection(db, 'cat_images'), limit(5));
    const imagesSnapshot = await getDocs(imagesQuery);
    const sampleImages = imagesSnapshot.docs.map(doc => ({
      id: doc.id,
      tags: doc.data().tags,
      fileName: doc.data().fileName,
      imageUrl: doc.data().imageUrl
    }));

    // Get sample videos from cat_videos collection
    const videosQuery = query(collection(db, 'cat_videos'), limit(5));
    const videosSnapshot = await getDocs(videosQuery);
    const sampleVideos = videosSnapshot.docs.map(doc => ({
      id: doc.id,
      tags: doc.data().tags,
      description: doc.data().description,
      videoUrl: doc.data().videoUrl,
      videoType: doc.data().videoType
    }));

    return NextResponse.json({
      success: true,
      debug: {
        totalCats: allCats.length,
        sampleCatNames: catNames,
        totalImages: imagesSnapshot.size,
        totalVideos: videosSnapshot.size,
        sampleImages,
        sampleVideos,
        // Check if any cat names match any image tags
        tagMatches: catNames.map(catName => ({
          catName,
          hasImageMatch: sampleImages.some(img => img.tags?.includes(catName)),
          hasVideoMatch: sampleVideos.some(vid => vid.tags?.includes(catName))
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error in debug:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

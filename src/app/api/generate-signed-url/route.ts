import { getStorage } from 'firebase-admin/storage';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseConfig } from '@/utils/config';

if (!getApps().length) {
  // Use centralized config for Firebase configuration
  const firebaseConfig = getFirebaseConfig();
  initializeApp({
    credential: applicationDefault(),
    storageBucket: firebaseConfig?.storageBucket,
  });
}

const firebaseConfig = getFirebaseConfig();
// Explicitly pass the bucket name, with a fallback to the known bucket if env var is missing during build
const storageBucket = firebaseConfig?.storageBucket || 'mountaincats-61543.firebasestorage.app';
const storage = getStorage().bucket(storageBucket);

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileType } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'Missing fileName or fileType' }, { status: 400 });
    }

    const file = storage.file(`uploads/${fileName}`);
    const [signedUrl] = await file.getSignedUrl({
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: fileType,
    });

    // Use centralized config for public URL generation
    const firebaseConfig = getFirebaseConfig();
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig?.storageBucket}/o/uploads%2F${encodeURIComponent(fileName)}?alt=media`;

    return NextResponse.json({ signedUrl, publicUrl });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
  }
}

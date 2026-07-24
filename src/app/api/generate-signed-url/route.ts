import { getStorage } from 'firebase-admin/storage';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseConfig, getMountainConfig } from '@/utils/config';
import { getRequestMountainId } from '@/lib/tenant';

if (!getApps().length) {
  // Use centralized config for Firebase configuration
  const firebaseConfig = getFirebaseConfig();
  initializeApp({
    credential: applicationDefault(),
    storageBucket: firebaseConfig?.storageBucket,
  });
}

const firebaseConfig = getFirebaseConfig();
const storageBucket = firebaseConfig?.storageBucket;
if (!storageBucket) throw new Error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not configured');
const storage = getStorage().bucket(storageBucket);

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileType } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'Missing fileName or fileType' }, { status: 400 });
    }

    // Namespace the upload under the requesting tenant's Storage prefix
    // (multi-tenant M6). Geyang's prefix is '' → the object path stays
    // `uploads/<file>`, so existing data is unaffected.
    const mountainId = getRequestMountainId(request);
    const storagePrefix = getMountainConfig(mountainId).storagePrefix;
    const objectPath = `${storagePrefix}uploads/${fileName}`;

    const file = storage.file(objectPath);
    const [signedUrl] = await file.getSignedUrl({
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: fileType,
    });

    // In a Firebase download URL the object name is a single URL-encoded segment
    // (slashes become %2F), so encode the whole prefixed path.
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodeURIComponent(objectPath)}?alt=media`;

    return NextResponse.json({ signedUrl, publicUrl });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
  }
}

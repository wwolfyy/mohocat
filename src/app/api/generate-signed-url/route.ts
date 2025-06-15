import { getStorage } from 'firebase-admin/storage';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { NextRequest, NextResponse } from 'next/server';

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const storage = getStorage().bucket();

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

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/uploads%2F${encodeURIComponent(fileName)}?alt=media`;

    return NextResponse.json({ signedUrl, publicUrl });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
  }
}

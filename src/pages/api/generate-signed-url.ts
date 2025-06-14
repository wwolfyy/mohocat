import { getStorage } from 'firebase-admin/storage';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import type { NextApiRequest, NextApiResponse } from 'next';

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const storage = getStorage().bucket();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fileName, fileType } = req.body;

  if (!fileName || !fileType) {
    return res.status(400).json({ error: 'Missing fileName or fileType' });
  }

  try {
    const file = storage.file(`uploads/${fileName}`);
    const [signedUrl] = await file.getSignedUrl({
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: fileType,
    });

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/uploads%2F${encodeURIComponent(fileName)}?alt=media`;

    res.status(200).json({ signedUrl, publicUrl });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ error: 'Failed to generate signed URL' });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

// Define the resource pages
const PAGES = {
    'home': 'Home Page',
    'about': 'About Page',
    'announcements': 'Announcements',
    'butler_talk': 'Butler Talk',
    'butler_stream': 'Butler Stream',
    'photo_album': 'Photo Album',
    'video_album': 'Video Album',
    'faq': 'FAQ'
};

export async function GET() {
    try {
        const configDoc = await db.collection('role_permissions').doc('resource-config').get();

        if (configDoc.exists) {
            return NextResponse.json(configDoc.data());
        }

        // Return default config if not found
        return NextResponse.json({
            resources: {
                butler_stream: ['view-post-feeding'],
                butler_talk: ['view-post-butler'],
                photo_album: ['view-photo'],
                video_album: ['view-video'],
                about: [], // Public
                contact: [], // Public
                announcements: [], // Public
                faq: [], // Public
                adoption: [] // Public/Disabled
            }
        });
    } catch (error) {
        console.error('Failed to read resource permission config:', error);
        return NextResponse.json({ error: 'Failed to read configuration' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { resources } = body;

        if (!resources) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        const configRef = db.collection('role_permissions').doc('resource-config');

        // Save to Firestore
        // We do a merge here just in case, or overwrite?
        // Let's overwrite 'resources' map completely to ensure deletions work if any
        await configRef.set({ resources, updatedAt: new Date().toISOString() }, { merge: true });

        return NextResponse.json({ message: 'Resource configuration saved successfully', resources });
    } catch (error) {
        console.error('Failed to save resource permission config:', error);
        return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireApiPermission } from '@/lib/auth/requireApiPermission';

export const dynamic = 'force-dynamic';

// 🗑️ A `PAGES` const lived here, declared and never read (removed 2026-08-03). It had
// drifted out of agreement with reality in both directions — it listed `home`, which is
// not a nav item, and omitted `contact` / `adoption` / `cats`, which are. The list that
// matters is `RESOURCES` in ResourcePermissionConfig.tsx, which must track the
// `resourceId` props in Navigation.tsx.

// GET is intentionally NOT gated: the public Navigation (via useResourceAccess) reads this
// page→permission map to decide which nav links to show, for anonymous visitors too. The map
// is non-sensitive config (no user data / secrets). Only the POST (write) is gated below.
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
        adoption: [], // Public/Disabled
      },
    });
  } catch (error) {
    console.error('Failed to read resource permission config:', error);
    return NextResponse.json({ error: 'Failed to read configuration' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authz = await requireApiPermission(request, 'manage-users');
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }
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

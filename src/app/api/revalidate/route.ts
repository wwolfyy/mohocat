import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/firebase-admin';

// Admin SDK token verification needs the Node runtime (not edge).
export const runtime = 'nodejs';

/**
 * On-demand revalidation for the §7a baked surfaces. An admin cat mutation POSTs
 * here so the public pages reflect the edit immediately, rather than waiting for
 * the time-based ISR backstop (`REVALIDATE_SECONDS`). See
 * docs/manuals/deployment/README.md → "ISR revalidation".
 *
 * Keep this list in sync with the route segments that read cats server-side
 * (`src/lib/server/cat-reads.ts` consumers).
 */
const BAKED_PATHS = ['/', '/pages/adoption'];

export async function POST(request: NextRequest) {
  try {
    // Members-only: verify the Firebase ID token (mirrors /api/contact). The
    // admin pages that call this are already behind AdminAuth; this stops
    // anonymous callers from forcing cache churn.
    const authHeader = request.headers.get('authorization') ?? '';
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    try {
      await auth.verifyIdToken(match[1]);
    } catch (error) {
      console.error('Revalidate: ID token verification failed');
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    for (const path of BAKED_PATHS) {
      revalidatePath(path);
    }

    return NextResponse.json({ success: true, revalidated: BAKED_PATHS });
  } catch (error) {
    console.error('Revalidate: failed to revalidate paths:', error);
    return NextResponse.json({ success: false, error: 'Failed to revalidate' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/firebase-admin';
import { getAllMountains } from '@/utils/config';

// Admin SDK token verification needs the Node runtime (not edge).
export const runtime = 'nodejs';

/**
 * On-demand revalidation for the §7a baked surfaces. An admin cat mutation POSTs
 * here so the public pages reflect the edit immediately, rather than waiting for
 * the time-based ISR backstop (`REVALIDATE_SECONDS`). See
 * docs/manuals/deployment/README.md → "ISR revalidation".
 *
 * Keep this list in sync with the route segments that read cats server-side
 * (`src/lib/server/cat-reads.ts` consumers). Since M3 the baked pages live
 * under the `[mountain]` segment, cached per tenant — revalidate them for
 * every configured mountain (cat data is shared until the M5 scoping; after
 * M5 an admin edit still only concerns its own tenant, and revalidating the
 * others is merely a no-op refresh — a handful of paths either way).
 */
const BAKED_SUBPATHS = ['', '/pages/adoption'];
const bakedPaths = () =>
  getAllMountains().flatMap((mountain) =>
    BAKED_SUBPATHS.map((subpath) => `/${mountain.id}${subpath}`)
  );

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

    const paths = bakedPaths();
    for (const path of paths) {
      revalidatePath(path);
    }

    return NextResponse.json({ success: true, revalidated: paths });
  } catch (error) {
    console.error('Revalidate: failed to revalidate paths:', error);
    return NextResponse.json({ success: false, error: 'Failed to revalidate' }, { status: 500 });
  }
}

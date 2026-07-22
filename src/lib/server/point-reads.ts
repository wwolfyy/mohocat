/**
 * Server-only point reads (Admin SDK).
 *
 * §7a "bake the data layer": the landing page reads feeding points at
 * build/server time through the Admin SDK (`@/lib/firebase-admin`) instead of
 * the client Web SDK (`getPointService().getAllPoints`), so the map's positions
 * bake deterministically at build. The client service layer (`getPointService`)
 * is untouched — this is a separate server path used by Server Components only.
 *
 * Why: the client Web SDK is meant for the browser; running it during
 * `next build` does not reliably connect to a local Firestore emulator, which
 * would bake a markerless map. The Admin SDK honours `FIRESTORE_EMULATOR_HOST`
 * and reads deterministically. Mirrors `getAllCatsServer` in `./cat-reads`.
 */
// Server-only by construction: importing firebase-admin pulls in the Admin SDK
// (Node + SERVICE_ACCOUNT_KEY), which cannot run in a client bundle.
import { db } from '@/lib/firebase-admin';
import type { Point } from '@/types';

const POINTS_COLLECTION = 'points';

/** Reads a tenant's feeding points once via the Admin SDK. Logs + re-raises on
 *  failure (a build read that fails must surface, not silently ship an empty
 *  map). */
export async function getAllPointsServer(mountainId: string): Promise<Point[]> {
  try {
    const snapshot = await db
      .collection(POINTS_COLLECTION)
      .where('mountainId', '==', mountainId)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Point[];
  } catch (error) {
    console.error('[point-reads] Failed to read points via Admin SDK:', error);
    throw error;
  }
}

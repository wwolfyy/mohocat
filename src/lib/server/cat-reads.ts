/**
 * Server-only cat reads (Admin SDK).
 *
 * §7a "bake the data layer": the landing + adoption pages read cats at
 * build/server time through the Admin SDK (`@/lib/firebase-admin`) instead of
 * the client Web SDK, so the heavy client-side Firestore waterfall (N parallel
 * `getCatsByPointId` queries after hydration) disappears. The client service
 * layer (`getCatService`) is untouched — this is a separate server path used by
 * Server Components only.
 *
 * Mirrors `fetchCatsData` in `scripts/maintenance/fetch-static-assets.js`.
 */
// Server-only by construction: importing firebase-admin pulls in the Admin SDK
// (Node + SERVICE_ACCOUNT_KEY), which cannot run in a client bundle.
import { db } from '@/lib/firebase-admin';
import type { Cat } from '@/types';

const CATS_COLLECTION = 'cats';

/** Cats grouped by feeding point — `current` = `dwelling`, `former` =
 *  `prev_dwelling`. Matches the shape the client `getCatsByPointId` returns,
 *  precomputed for every point in a single pass. */
export type CatsByPoint = Record<string, { current: Cat[]; former: Cat[] }>;

/** Reads every cat once via the Admin SDK. Logs + re-raises on failure (a build
 *  read that fails must surface, not silently ship an empty map). */
export async function getAllCatsServer(mountainId: string): Promise<Cat[]> {
  try {
    const snapshot = await db
      .collection(CATS_COLLECTION)
      .where('mountainId', '==', mountainId)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Cat[];
  } catch (error) {
    console.error('[cat-reads] Failed to read cats via Admin SDK:', error);
    throw error;
  }
}

/** Groups a flat cat list into `{ pointId: { current, former } }`. A cat with a
 *  `dwelling` lands in that point's `current`; a `prev_dwelling` lands in that
 *  point's `former` (a cat can appear in both — its old and new point). */
export function groupCatsByPoint(cats: Cat[]): CatsByPoint {
  const byPoint: CatsByPoint = {};
  const bucket = (pointId: string) => {
    if (!byPoint[pointId]) byPoint[pointId] = { current: [], former: [] };
    return byPoint[pointId];
  };

  for (const cat of cats) {
    if (cat.dwelling) bucket(cat.dwelling).current.push(cat);
    if (cat.prev_dwelling) bucket(cat.prev_dwelling).former.push(cat);
  }

  return byPoint;
}

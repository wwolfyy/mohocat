import MountainViewer from '@/components/MountainViewer';
import { getAllPointsServer } from '@/lib/server/point-reads';
import { getAllCatsServer, groupCatsByPoint } from '@/lib/server/cat-reads';
import { REVALIDATE_SECONDS } from '@/lib/cache-config';

// §7a: bake points + cats at build/server time (Admin SDK) so the landing map
// needs zero client Firestore queries for positions or avatars. ISR fallback
// backstop — see `src/lib/cache-config.ts` and
// docs/manuals/deployment/README.md → "ISR revalidation".
export const revalidate = REVALIDATE_SECONDS;

export default async function Home() {
  // Points (positions) and cats (avatars) are both read server-side via the
  // Admin SDK and baked into the render — the client map receives them as props.
  const [points, cats] = await Promise.all([getAllPointsServer(), getAllCatsServer()]);
  const catsByPoint = groupCatsByPoint(cats);

  return (
    <main data-oid="j:1oinn">
      {/* The map is full-bleed — it breaks out to 100vw and sets its own height
          (aspect-ratio), so no padding here: the header, map, and footer sit
          flush. (Previously had min-h-screen + pt/pb that created gaps around
          the map and pushed the footer away.) */}
      <div data-oid="f4ymkec">
        <MountainViewer points={points} catsByPoint={catsByPoint} data-oid="gs09x5x" />
      </div>
    </main>
  );
}

import MountainViewer from '@/components/MountainViewer';
import { getPointService } from '@/services';

export default async function Home() {
  const pointService = getPointService();
  const points = await pointService.getAllPoints();

  return (
    <main data-oid="j:1oinn">
      {/* The map is full-bleed — it breaks out to 100vw and sets its own height
          (aspect-ratio), so no padding here: the header, map, and footer sit
          flush. (Previously had min-h-screen + pt/pb that created gaps around
          the map and pushed the footer away.) */}
      <div data-oid="f4ymkec">
        <MountainViewer points={points} data-oid="gs09x5x" />
      </div>
    </main>
  );
}

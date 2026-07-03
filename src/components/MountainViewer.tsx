'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Point } from '@/types';
import type { CatsByPoint } from '@/lib/server/cat-reads';
import IntroCard from './IntroCard';
import Compass from './Compass';
import CatGallery from './CatGallery';
import { useIsMobile } from '@/hooks/useIsMobile';
import { thumbnailPreloader } from '@/services/thumbnailPreloader';
import { getMapConfig } from '@/utils/config';

// Leaflet touches `window`, so the map must be client-only (no SSR).
const LeafletMountainMap = dynamic(() => import('./LeafletMountainMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex justify-center items-center bg-gray-100">
      <p className="text-gray-500">지도를 불러오는 중…</p>
    </div>
  ),
});

interface MountainViewerProps {
  points: Point[];
  // §7a: cats are baked server-side and threaded in as props — no client
  // Firestore reads for the map avatars or the per-point gallery.
  catsByPoint: CatsByPoint;
}

/**
 * Host for the Leaflet map (redesign Phase 2). Owns cross-cutting concerns —
 * thumbnail preloading and the floating IntroCard overlay — and renders the
 * client-only map full-height below the sticky header. Feeding-point markers,
 * clustering and the cat-gallery modal are layered on in later Phase 2 tasks.
 */
export default function MountainViewer({ points, catsByPoint }: MountainViewerProps) {
  // Which feeding point's cat gallery is open (clicked marker → modal).
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  // Mobile uses the 90°-CW-rotated portrait map (image + coords + compass), so
  // the container flips to a portrait aspect ratio to match.
  const isMobile = useIsMobile();
  // Per-mountain map tunables (marker-clustering radius) — config-driven so the
  // value can be changed without a code edit (config/mountains/mountains.json).
  const { maxClusterRadius } = getMapConfig();

  // Warm the marker avatars into the browser cache. The cat data is already
  // baked (props) — this only preloads the image *files*, with no Firestore
  // queries (§7a: the old `preloadThumbnailsForPoints` per-point waterfall is
  // gone). URLs come straight from the baked map.
  useEffect(() => {
    const urls = Array.from(
      new Set(
        Object.values(catsByPoint)
          .flatMap((group) => group.current)
          .map((cat) => cat.thumbnailUrl)
          .filter((url) => url && url.trim() !== '')
      )
    );
    if (urls.length > 0) {
      thumbnailPreloader.preloadThumbnails(urls).catch((error) => {
        console.error('Error preloading thumbnails:', error);
      });
    }
  }, [catsByPoint]);

  return (
    // Always fill the viewport width; height follows the image's aspect ratio so
    // the map fills the frame at default zoom with no letterbox — landscape 2:1
    // on desktop, rotated portrait 1:2 on mobile (so it fills a tall screen). On
    // short windows the map can extend a little below the fold (minor scroll).
    // `left-1/2 -translate-x-1/2` breaks out of the page's horizontal padding.
    <>
      <div
        className="relative left-1/2 -translate-x-1/2"
        style={{
          width: '100vw',
          aspectRatio: isMobile ? '808 / 1616' : '1616 / 808',
        }}
      >
        <LeafletMountainMap
          points={points}
          catsByPoint={catsByPoint}
          onPointClick={setSelectedPointId}
          isMobile={isMobile}
          maxClusterRadius={maxClusterRadius}
        />

        {/* North indicator pinned top-right of the map (redesign §Engine). */}
        <Compass isMobile={isMobile} />

        {/* Dismissible nudge floating over the map's bottom-left (redesign §1) */}
        <IntroCard />
      </div>

      {/* Rendered outside the transformed container above: CatGallery is
          `position: fixed`, and a transformed ancestor would otherwise become
          its containing block and mis-position the modal. */}
      {selectedPointId && (
        <CatGallery
          key={selectedPointId}
          cats={catsByPoint[selectedPointId] ?? { current: [], former: [] }}
          onClose={() => setSelectedPointId(null)}
        />
      )}
    </>
  );
}

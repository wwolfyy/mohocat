'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, ImageOverlay, useMap } from 'react-leaflet';
import L, { CRS, type LatLngBoundsExpression } from 'leaflet';
import 'leaflet.markercluster'; // side-effect: augments L with markerClusterGroup
import type { Point } from '@/types';
import type { CatsByPoint } from '@/lib/server/cat-reads';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Two image layouts. Desktop uses the native landscape still; mobile uses a
// pre-rotated (90° CW) portrait copy so the long axis fills a tall phone screen
// (north then points right). With CRS.Simple the map plane is the image's pixel
// grid addressed as [y, x]; bounds run [0,0] → [height, width].
const LANDSCAPE = { url: '/images/screenshot_mt_geyang_50.png', width: 1616, height: 808 };
const PORTRAIT = { url: '/images/screenshot_mt_geyang_50_rot90cw.png', width: 808, height: 1616 };

function getLayout(isMobile: boolean): { url: string; bounds: LatLngBoundsExpression } {
  const img = isMobile ? PORTRAIT : LANDSCAPE;
  return {
    url: img.url,
    bounds: [
      [0, 0],
      [img.height, img.width],
    ],
  };
}

/**
 * Converts a point's stored percentages (x from left, y from top of the
 * landscape image) to a CRS.Simple [lat, lng]. On mobile the image is rotated
 * 90° CW, so the point rotates with it: x' = 1 − y (from left), y' = x (from
 * top). Either way lat is flipped (imageOverlay's [0,0] is the bottom-left).
 * Firebase / the `Point` model are untouched — this is render-time only.
 */
function pointToLatLng(point: { x: number; y: number }, isMobile: boolean): [number, number] {
  const xf = point.x / 100;
  const yf = point.y / 100;
  if (isMobile) {
    return [(1 - xf) * PORTRAIT.height, (1 - yf) * PORTRAIT.width];
  }
  return [(1 - yf) * LANDSCAPE.height, xf * LANDSCAPE.width];
}

/** A feeding point resolved for rendering: its stored %-coords plus a chosen
 *  cat thumbnail (resolved once at map level, per the divIcon strategy). */
interface ResolvedMarker {
  id: string;
  title: string;
  x: number; // percent across the image (0–100)
  y: number; // percent down the image (0–100)
  thumbnailUrl: string | null;
}

/**
 * Resolves each point's marker data from the baked `catsByPoint` map (§7a — no
 * client Firestore queries): picks a random current cat that has a thumbnail.
 * A point with no current cat / no thumbnail degrades to no avatar (matching the
 * prior behaviour) rather than blanking the whole map. Recomputed only when the
 * points or baked cats change — the random pick is stable for the mount.
 */
function usePointMarkers(points: Point[], catsByPoint: CatsByPoint): ResolvedMarker[] {
  return useMemo(
    () =>
      points.map((point): ResolvedMarker => {
        const current = catsByPoint[point.id]?.current ?? [];
        const withThumb = current.filter(
          (cat) => cat.thumbnailUrl && cat.thumbnailUrl.trim() !== ''
        );
        const thumbnailUrl =
          withThumb.length > 0
            ? withThumb[Math.floor(Math.random() * withThumb.length)].thumbnailUrl
            : null;
        return { id: point.id, title: point.title, x: point.x, y: point.y, thumbnailUrl };
      }),
    [points, catsByPoint]
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Builds the marker's inner HTML for an `L.divIcon` — avatar (cat thumbnail) +
 * white ring, a brand-yellow pointer above, the title label below, and a large
 * brand pulse ring revealed on hover. Plain HTML (no React) so it can live
 * inside a Leaflet marker and later be clustered; Tailwind classes are literal
 * so the JIT generates them. The `.mohocat-pin` root carries the `group` class,
 * so hover-scale / pulse are pure CSS `group-hover` (no React state needed).
 *
 * `animate` gates the entrance pop: true on desktop (un-clustered → DOM created
 * once, so it fires once on load), false where cluster/spiderfy rebuilds the
 * DOM (mobile) and would re-fire it. The avatar is absolutely centered with
 * `-translate-…-1/2` to match `bubble-pop-dramatic`'s keyframe transform, and
 * the pop uses `fill-mode: backwards` so it doesn't pin `group-hover:scale-125`.
 *
 * `labelAbove` flips the title label above the avatar (instead of below) for
 * pins near the bottom edge, so the label isn't clipped by the container's
 * `overflow: hidden`. Decided deterministically from the pin's position (see
 * PointMarkersLayer) — no runtime measurement.
 */
function buildMarkerHtml(marker: ResolvedMarker, animate: boolean, labelAbove: boolean): string {
  const title = escapeHtml(marker.title);
  const pop = animate ? ' animate-bubble-pop' : '';
  // Below the avatar by default; above the pointer when near the bottom edge.
  const labelPos = labelAbove ? 'bottom:calc(100% + 1.25rem)' : 'top:calc(100% + 0.25rem)';
  const avatar = marker.thumbnailUrl
    ? `<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-200 transition-transform duration-200 group-hover:scale-150${pop}">
         <img src="${escapeHtml(marker.thumbnailUrl)}" alt="${title}" class="w-full h-full object-cover" />
       </div>`
    : '';
  return `<div class="relative cursor-pointer" style="width:40px;height:40px;">
      <div class="hidden group-hover:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-brand rounded-full animate-pulse pointer-events-none"></div>
      <div class="absolute left-1/2 -translate-x-1/2 h-0 w-0 border-l-[6px] border-r-[6px] border-t-[9px] border-l-transparent border-r-transparent border-t-brand transition-transform duration-200 group-hover:scale-125" style="bottom:calc(100% + 0.25rem); filter: drop-shadow(0 0 1px rgba(0,0,0,0.85)) drop-shadow(0 1px 1.5px rgba(0,0,0,0.5));"></div>
      ${avatar}
      <div class="absolute left-1/2 -translate-x-1/2 bg-brand text-ink text-xs font-semibold px-2 py-1 rounded-md shadow-lg whitespace-nowrap border border-gray-600 transition-transform duration-200 group-hover:scale-110" style="${labelPos};">${title}</div>
    </div>`;
}

/**
 * Builds a cluster icon's HTML — a playful on-brand circle (brand→accent
 * gradient, white ring) with cat ears and the child count, scaling up on hover.
 * The native `title` is the hover tooltip. Tailwind classes are literal for JIT.
 */
function buildClusterHtml(count: number): string {
  return `<div class="relative cursor-pointer transition-transform duration-200 hover:scale-110" title="고양이 급식소 ${count}곳 — 펼치기">
      <span class="absolute -top-2 left-1.5 h-0 w-0 border-l-[7px] border-r-[7px] border-b-[10px] border-l-transparent border-r-transparent border-b-brand"></span>
      <span class="absolute -top-2 right-1.5 h-0 w-0 border-l-[7px] border-r-[7px] border-b-[10px] border-l-transparent border-r-transparent border-b-brand"></span>
      <span class="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand to-accent text-ink text-sm font-bold border-2 border-white shadow-lg">${count}</span>
    </div>`;
}

function createClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  return L.divIcon({
    className: 'mohocat-cluster',
    html: buildClusterHtml(cluster.getChildCount()),
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

/**
 * Imperatively renders the feeding-point markers. On desktop (`isMobile`
 * false) they go into a plain `L.layerGroup` (un-clustered, entrance pop on);
 * on mobile into an `L.markerClusterGroup` (clustered, pop off so cluster
 * rebuilds don't re-fire it). Each point's stored percentage coords convert to
 * CRS.Simple image-pixel LatLng via `pointToLatLng` (which also applies the
 * 90°-CW rotation on mobile). Clusters spiderfy on tap.
 */
function PointMarkersLayer({
  markers,
  onSelect,
  isMobile,
}: {
  markers: ResolvedMarker[];
  onSelect: (pointId: string) => void;
  isMobile: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    const layer = isMobile
      ? L.markerClusterGroup({
          // Spiderfy-first: tap a cluster to fan its members out, rather than
          // zooming. We trigger spiderfy manually (below) so it works at any
          // zoom; disableClusteringAtZoom is intentionally left unset.
          zoomToBoundsOnClick: false,
          spiderfyOnMaxZoom: false,
          showCoverageOnHover: false,
          maxClusterRadius: 50, // starting value; tuned in P2-8
          iconCreateFunction: createClusterIcon,
        })
      : L.layerGroup();

    // A label below the avatar needs ~52px of clearance (half-avatar + gap +
    // label height). Flip it above only for pins whose displayed position is
    // within that band of the bottom edge — derived from the actual container
    // height so it's correct for both the short desktop map and the tall
    // portrait mobile map (and adapts if either is resized on the next render).
    const containerHeight = map.getSize().y || 800;
    const bottomBand = 1 - 52 / containerHeight;

    markers.forEach((marker) => {
      const [lat, lng] = pointToLatLng(marker, isMobile);
      // Vertical position in the displayed map (0 top → 1 bottom): desktop reads
      // `y`; mobile reads `x` because the 90°-CW rotation maps landscape-x to the
      // portrait's vertical axis.
      const verticalFromTop = isMobile ? marker.x / 100 : marker.y / 100;
      const labelAbove = verticalFromTop > bottomBand;
      const icon = L.divIcon({
        // `group` makes the whole marker the hover group for `group-hover:`
        // (the label/pointer are DOM descendants, so they trigger it too even
        // though they visually overflow the 40×40 icon box).
        className: 'mohocat-pin group',
        // Entrance pop only on desktop: there the layer is built once. On mobile
        // cluster/spiderfy rebuilds would re-fire it, so it's off.
        html: buildMarkerHtml(marker, !isMobile, labelAbove),
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      const leafletMarker = L.marker([lat, lng], { icon, title: marker.title });
      leafletMarker.on('click', () => onSelect(marker.id));
      layer.addLayer(leafletMarker);
    });

    if (layer instanceof L.MarkerClusterGroup) {
      layer.on('clusterclick', (event) => {
        (event.propagatedFrom as L.MarkerCluster).spiderfy();
      });
    }

    layer.addTo(map);

    return () => {
      layer.remove();
    };
  }, [map, markers, onSelect, isMobile]);

  return null;
}

/**
 * Applies the fit-to-bounds view on mount and registers a "restore view"
 * control (stacked under the zoom buttons) that snaps back to it after the user
 * pans / zooms away. `bounds` differs between the landscape/portrait layouts.
 */
function MapViewController({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();

  useEffect(() => {
    const applyFit = () => {
      map.fitBounds(bounds);
    };
    applyFit();

    // Modifier-gated wheel zoom: plain wheel / two-finger scroll falls through
    // to the page (so the user can scroll to the footer past the full-height
    // map); only ⌘/Ctrl + wheel zooms — which on a Mac trackpad is also what a
    // pinch emits. Leaflet's own scrollWheelZoom is disabled (see MapContainer).
    const container = map.getContainer();
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; // let the page scroll
      e.preventDefault();
      const latlng = map.containerPointToLatLng(map.mouseEventToContainerPoint(e));
      // Normalize line- vs pixel-delta, then scale to a gentle zoom step.
      const lines = e.deltaMode === 1 ? 20 : 1;
      const delta = -(e.deltaY * lines) * 0.002;
      map.setZoomAround(latlng, map.getZoom() + delta, { animate: false });
    };
    container.addEventListener('wheel', onWheel, { passive: false });

    const control = new L.Control({ position: 'topleft' });
    control.onAdd = () => {
      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      const btn = L.DomUtil.create('a', '', container) as HTMLAnchorElement;
      btn.href = '#';
      btn.title = '전체 보기';
      btn.setAttribute('role', 'button');
      btn.setAttribute('aria-label', '전체 보기');
      // Feather "maximize" icon — reads as "fit / restore view".
      btn.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(btn, 'click', (e) => {
        L.DomEvent.preventDefault(e);
        applyFit();
      });
      return container;
    };
    control.addTo(map);

    return () => {
      container.removeEventListener('wheel', onWheel);
      control.remove();
    };
  }, [map, bounds]);

  return null;
}

/**
 * Client-only Leaflet map that renders the mountain satellite image as a
 * pannable / zoomable overlay on a CRS.Simple plane (no tiles, no API keys),
 * with the feeding-point markers placed on top. On mobile (`isMobile`) it uses
 * the pre-rotated portrait image + clustering; on desktop the landscape image +
 * plain markers. Must be loaded via a `dynamic(..., { ssr: false })` import —
 * Leaflet touches `window`.
 */
interface LeafletMountainMapProps {
  points: Point[];
  catsByPoint: CatsByPoint;
  onPointClick: (pointId: string) => void;
  isMobile: boolean;
}

export default function LeafletMountainMap({
  points,
  catsByPoint,
  onPointClick,
  isMobile,
}: LeafletMountainMapProps) {
  const markers = usePointMarkers(points, catsByPoint);
  const { url, bounds } = getLayout(isMobile);

  return (
    <MapContainer
      // Remount when the viewport class flips: the CRS-plane bounds and the
      // image differ between the landscape (desktop) and rotated-portrait
      // (mobile) layouts, and a live Leaflet map can't swap those in place.
      key={isMobile ? 'mobile' : 'desktop'}
      crs={CRS.Simple}
      bounds={bounds}
      maxBounds={bounds}
      maxBoundsViscosity={1}
      minZoom={-3}
      maxZoom={2}
      zoomSnap={0}
      zoomDelta={0.25}
      scrollWheelZoom={false}
      // Mobile drops the +/− buttons (pinch / double-tap still zoom) — only the
      // fill/restore control is kept. Desktop keeps +/−.
      zoomControl={!isMobile}
      attributionControl={false}
      className="h-full w-full bg-gray-100"
    >
      <ImageOverlay url={url} bounds={bounds} />
      <MapViewController bounds={bounds} />
      <PointMarkersLayer markers={markers} onSelect={onPointClick} isMobile={isMobile} />
    </MapContainer>
  );
}

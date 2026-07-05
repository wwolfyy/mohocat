'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, ImageOverlay, useMap } from 'react-leaflet';
import L, { CRS, type LatLngBoundsExpression } from 'leaflet';
import type { Point } from '@/types';
import type { CatsByPoint } from '@/lib/server/cat-reads';
import { greedyClusterByRadius, spiderfyRadius } from '@/utils/mapClustering';
import 'leaflet/dist/leaflet.css';

// Two image layouts, chosen by device (`isMobile`), not live orientation. The
// map is portrait-only on phones — a phone rotated to landscape gets a "rotate to
// portrait" notice instead of a sideways map (see MountainViewer) — so a mobile
// viewport always uses the pre-rotated (90° CW) portrait copy (long axis fills a
// tall phone screen; north then points right) and desktop uses the native
// landscape still. With CRS.Simple the map plane is the image's pixel grid
// addressed as [y, x]; bounds run [0,0] → [height, width].
const LANDSCAPE = { url: '/images/screenshot_mt_geyang_50.png', width: 1616, height: 808 };
const PORTRAIT = { url: '/images/screenshot_mt_geyang_50_rot90cw.png', width: 808, height: 1616 };

function getLayout(mobile: boolean): { url: string; bounds: LatLngBoundsExpression } {
  const img = mobile ? PORTRAIT : LANDSCAPE;
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
 * landscape image) to a CRS.Simple [lat, lng]. On mobile the image is the
 * 90°-CW-rotated portrait copy, so the point rotates with it: x' = 1 − y (from
 * left), y' = x (from top). Either way lat is flipped (imageOverlay's [0,0] is
 * the bottom-left). Firebase / the `Point` model are untouched — render-time only.
 */
function pointToLatLng(point: { x: number; y: number }, mobile: boolean): [number, number] {
  const xf = point.x / 100;
  const yf = point.y / 100;
  if (mobile) {
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

function createClusterIcon(count: number): L.DivIcon {
  return L.divIcon({
    className: 'mohocat-cluster',
    html: buildClusterHtml(count),
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

/**
 * Imperatively renders the feeding-point markers into a plain `L.layerGroup`.
 * Each point's stored percentage coords convert to a CRS.Simple image-pixel
 * LatLng via `pointToLatLng` (which also applies the 90°-CW rotation on mobile).
 *
 * Desktop is always stand-alone pins (entrance pop on). On mobile, when
 * `clustering` is on (per-mountain config), the points are **statically
 * clustered** — grouped once, by pixel proximity in the fill/default view
 * (`utils/mapClustering`), *never* re-clustered on zoom. This replaced
 * `leaflet.markercluster`, whose zoom-keyed integer cluster grid fought our
 * fractional/mutated `CRS.Simple` zoom and broke device-dependently (pins
 * vanishing / drawn outside the map / stuck pan on the S22; see DEBUG_LOG). A
 * multi-point cluster shows a count badge; tapping it fans the members out on a
 * ring (spiderfy) so each cat is reachable — the fan collapses on a background
 * tap or any zoom change (it is positioned in screen space at the open zoom).
 * When `clustering` is off, mobile falls through to the same stand-alone pins as
 * desktop (points may overlap where they sit close together).
 */
function PointMarkersLayer({
  markers,
  onSelect,
  isMobile,
  clustering,
  maxClusterRadius,
}: {
  markers: ResolvedMarker[];
  onSelect: (pointId: string) => void;
  isMobile: boolean;
  clustering: boolean;
  maxClusterRadius: number;
}) {
  const map = useMap();

  useEffect(() => {
    const layer = L.layerGroup();

    // A label below the avatar needs ~52px of clearance (half-avatar + gap +
    // label height). Flip it above only for pins whose displayed position is
    // within that band of the bottom edge — derived from the actual container
    // height so it's correct for both the short desktop map and the tall
    // portrait mobile map (and adapts if either is resized on the next render).
    const containerHeight = map.getSize().y || 800;
    const bottomBand = 1 - 52 / containerHeight;

    // Displayed vertical position (0 top → 1 bottom): desktop (landscape) reads
    // `y`; mobile (rotated portrait) reads `x` because the 90°-CW rotation maps
    // landscape-x to the portrait's vertical axis.
    const wantsLabelAbove = (m: ResolvedMarker) => (isMobile ? m.x / 100 : m.y / 100) > bottomBand;

    // A thumbnail pin at an explicit LatLng — real position for a stand-alone
    // point, spider-ring position for a fanned-out cluster member. Entrance pop
    // only on desktop (layer built once); on mobile it's off so a spiderfy
    // (which recreates the pin) doesn't re-fire it.
    const makePin = (m: ResolvedMarker, latlng: L.LatLngExpression) => {
      const icon = L.divIcon({
        // `group` makes the whole marker the hover group for `group-hover:`
        // (the label/pointer are DOM descendants, so they trigger it too even
        // though they visually overflow the 40×40 icon box).
        className: 'mohocat-pin group',
        html: buildMarkerHtml(m, !isMobile, wantsLabelAbove(m)),
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      const leafletMarker = L.marker(latlng, { icon, title: m.title });
      leafletMarker.on('click', () => onSelect(m.id));
      return leafletMarker;
    };

    // Stand-alone pins: always on desktop, and on mobile when clustering is off
    // (per-mountain config). `pointToLatLng(m, isMobile)` picks the rotated
    // portrait coords on mobile, the landscape coords on desktop.
    if (!isMobile || !clustering) {
      markers.forEach((m) => {
        const [lat, lng] = pointToLatLng(m, isMobile);
        layer.addLayer(makePin(m, [lat, lng]));
      });
      layer.addTo(map);
      return () => {
        layer.remove();
      };
    }

    // --- Mobile: static, zoom-independent clustering -----------------------
    // Project every point to a fixed pixel space (the fill/default view) and
    // group by pixel radius *once*. This never re-runs on zoom, so there is no
    // cluster grid for a device to desync (the whole point of the rewrite).
    const refZoom = map.getBoundsZoom(map.options.maxBounds as L.LatLngBounds);
    const latlngs = markers.map((m) => {
      const [lat, lng] = pointToLatLng(m, true);
      return L.latLng(lat, lng);
    });
    const pixels = latlngs.map((ll) => {
      const p = map.project(ll, refZoom);
      return { x: p.x, y: p.y };
    });
    const clusters = greedyClusterByRadius(pixels, maxClusterRadius);

    // At most one cluster is spiderfied (fanned out) at a time.
    let expanded: { owner: L.Marker; collapse: () => void } | null = null;
    const collapse = () => {
      if (expanded) {
        expanded.collapse();
        expanded = null;
      }
    };

    const spiderfy = (memberIdx: number[], centerLatLng: L.LatLng, badge: L.Marker) => {
      const n = memberIdx.length;
      const centerPt = map.latLngToLayerPoint(centerLatLng);
      const ringR = spiderfyRadius(n);
      const added: L.Layer[] = [];
      memberIdx.forEach((idx, i) => {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2; // first member points up
        const pt = L.point(
          centerPt.x + ringR * Math.cos(angle),
          centerPt.y + ringR * Math.sin(angle)
        );
        const spokeLatLng = map.layerPointToLatLng(pt);
        const leg = L.polyline([centerLatLng, spokeLatLng], {
          weight: 1.5,
          color: '#6b7280',
          opacity: 0.5,
          interactive: false,
        });
        const pin = makePin(markers[idx], spokeLatLng);
        layer.addLayer(leg);
        layer.addLayer(pin);
        added.push(leg, pin);
      });
      badge.setOpacity(0); // hide the count badge while the members are fanned out
      expanded = {
        owner: badge,
        collapse: () => {
          added.forEach((l) => layer.removeLayer(l));
          badge.setOpacity(1);
        },
      };
    };

    clusters.forEach((cluster) => {
      if (cluster.memberIndices.length === 1) {
        const idx = cluster.memberIndices[0];
        layer.addLayer(makePin(markers[idx], latlngs[idx]));
        return;
      }
      const centerLatLng = map.unproject(L.point(cluster.cx, cluster.cy), refZoom);
      const count = cluster.memberIndices.length;
      const badge = L.marker(centerLatLng, {
        icon: createClusterIcon(count),
        title: `고양이 급식소 ${count}곳 — 펼치기`,
      });
      badge.on('click', () => {
        const reopeningSame = expanded?.owner === badge;
        collapse();
        if (!reopeningSame) spiderfy(cluster.memberIndices, centerLatLng, badge);
      });
      layer.addLayer(badge);
    });

    // The spider ring is placed in screen space at the zoom it opened at, so
    // collapse it on any zoom change; also collapse on a background tap. (Marker
    // clicks don't propagate to the map, so tapping a badge/pin won't self-close.)
    map.on('zoomstart', collapse);
    map.on('click', collapse);

    layer.addTo(map);

    return () => {
      map.off('zoomstart', collapse);
      map.off('click', collapse);
      collapse();
      layer.remove();
    };
  }, [map, markers, onSelect, isMobile, clustering, maxClusterRadius]);

  return null;
}

/**
 * Applies the fit-to-bounds view on mount and registers a "restore view"
 * control (stacked under the zoom buttons) that snaps back to it after the user
 * pans / zooms away. `bounds` differs between the landscape/portrait layouts.
 */
function MapViewController({
  bounds,
  isMobile,
}: {
  bounds: LatLngBoundsExpression;
  isMobile: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    // Fill = the zoom that shows the whole image with no letterbox (the container
    // aspect matches the image); the default view sits there. Clamp minZoom to it
    // *exactly* so a pinch can't zoom out past fill and expose grey margins — a
    // true hard stop on every device (an earlier floor()+snap-back left a lingering
    // grey zoom-out on some, e.g. S22). markercluster's dependence on minZoom (which
    // would otherwise collapse all pins at this bottom zoom) is handled where the
    // cluster grid is built — see PointMarkersLayer.
    let fillZoom = map.getBoundsZoom(bounds);
    const applyFit = () => {
      fillZoom = map.getBoundsZoom(bounds);
      map.setMinZoom(fillZoom);
      map.fitBounds(bounds);
    };
    applyFit();

    // Mobile touch scroll: keep one-finger drag disabled at fill (so a swipe
    // scrolls the PAGE, not pans the map — Leaflet drag otherwise captures vertical
    // swipes and sets touch-action:none) and enable it only when zoomed in past
    // fill, where there is room to pan. Desktop keeps its default drag + the wheel
    // pass-through below.
    const syncDrag = () => {
      if (!isMobile) return;
      if (map.getZoom() > fillZoom + 1e-3) map.dragging.enable();
      else map.dragging.disable();
    };
    syncDrag();
    map.on('zoomend', syncDrag);

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

    // Re-fit the image to the viewport on window resize. Leaflet's trackResize
    // keeps the canvas size in sync (invalidateSize) but preserves zoom, which
    // leaves margins when the window grows and clips the image when it shrinks —
    // so we additionally re-fit, exactly like the 전체 보기 control. Debounced to
    // avoid thrashing fitBounds during a drag-resize; invalidateSize first so
    // fitBounds measures against the new size regardless of handler ordering.
    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        map.invalidateSize({ animate: false });
        applyFit();
      }, 150);
    };
    window.addEventListener('resize', onResize);

    return () => {
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      map.off('zoomend', syncDrag);
      clearTimeout(resizeTimer);
      control.remove();
    };
  }, [map, bounds, isMobile]);

  return null;
}

/**
 * Client-only Leaflet map that renders the mountain satellite image as a
 * pannable / zoomable overlay on a CRS.Simple plane (no tiles, no API keys),
 * with the feeding-point markers placed on top. A single `isMobile` flag drives
 * everything: on mobile it picks the rotated-portrait image + coords, clusters
 * the markers, drops the +/− buttons, and gates touch drag. (The map is
 * portrait-only on phones — a landscape phone gets a rotate notice from
 * MountainViewer — so device and orientation coincide and one flag suffices.)
 * Must be loaded via a `dynamic(..., { ssr: false })` import — Leaflet touches
 * `window`.
 */
interface LeafletMountainMapProps {
  points: Point[];
  catsByPoint: CatsByPoint;
  onPointClick: (pointId: string) => void;
  /** Mobile → rotated-portrait image + coords, clustering, no +/− buttons,
   *  gated drag; desktop → landscape image, un-clustered, +/− buttons. */
  isMobile: boolean;
  /** Whether the mobile map clusters nearby points (per-mountain; see
   *  `MountainMapConfig`). Off → stand-alone pins on mobile too. */
  clustering: boolean;
  /** Mobile marker-clustering radius in px (see `MountainMapConfig`). */
  maxClusterRadius: number;
}

export default function LeafletMountainMap({
  points,
  catsByPoint,
  onPointClick,
  isMobile,
  clustering,
  maxClusterRadius,
}: LeafletMountainMapProps) {
  const markers = usePointMarkers(points, catsByPoint);
  const { url, bounds } = getLayout(isMobile);

  return (
    <MapContainer
      // Remount when the device class flips (width crosses the mobile
      // breakpoint): the CRS-plane bounds and the image differ between the
      // landscape and rotated-portrait layouts, and a live Leaflet map can't swap
      // those in place.
      key={isMobile ? 'mobile' : 'desktop'}
      crs={CRS.Simple}
      bounds={bounds}
      maxBounds={bounds}
      maxBoundsViscosity={1}
      // Hard-stop a pinch AT the zoom limits instead of overshooting and bouncing
      // back. Default (true) lets a pinch-out travel *below* minZoom (= the fill
      // zoom) mid-gesture and briefly expose grey margins before snapping back.
      // false clamps the pinch at fill so that excursion never happens. (The pins
      // are now statically clustered — see PointMarkersLayer — so this no longer
      // has to protect a zoom-coupled cluster engine, only the fill framing.)
      bounceAtZoomLimits={false}
      // Floor before MapViewController clamps minZoom to the exact fill zoom.
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
      <MapViewController bounds={bounds} isMobile={isMobile} />
      <PointMarkersLayer
        markers={markers}
        onSelect={onPointClick}
        isMobile={isMobile}
        clustering={clustering}
        maxClusterRadius={maxClusterRadius}
      />
    </MapContainer>
  );
}

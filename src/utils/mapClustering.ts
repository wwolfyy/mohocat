/**
 * Zoom-independent proximity clustering for the mountain map.
 *
 * Replaces `leaflet.markercluster` on mobile. That library rebuilds its cluster
 * grid off the map's *live* zoom on every pan/zoom/pinch, keyed to integer zoom
 * levels — which fought our fractional `CRS.Simple` zoom and mutated fill-zoom
 * clamp and produced device-dependent breakage (pins vanishing / rendered
 * outside the map / stuck pan on the S22 but not the Note 9; see DEBUG_LOG). The
 * grouping here is computed **once**, in a fixed projected-pixel space, and never
 * re-evaluated on zoom, so no device can land on a grid boundary.
 *
 * Pure geometry (no Leaflet, no DOM) so it is unit-testable; the caller projects
 * marker LatLngs to pixels at a reference zoom and maps the returned member
 * indices back to its own marker objects.
 */

export interface PixelPoint {
  x: number;
  y: number;
}

export interface ClusterResult {
  /** Centroid of the cluster's members, in the same pixel space as the input. */
  cx: number;
  cy: number;
  /** Indices (into the input array) of the points in this cluster. */
  memberIndices: number[];
}

/**
 * Greedily groups `points` so that every member sits within `radiusPx` of its
 * cluster's seed. Deterministic: seeds are taken in input order, each unclaimed
 * point within the radius of a seed joins that seed's cluster. O(n²) — fine for
 * the handful-to-dozens of feeding points a mountain has. A lone point yields a
 * single-member cluster (the caller renders those as plain pins).
 */
export function greedyClusterByRadius(points: PixelPoint[], radiusPx: number): ClusterResult[] {
  const radius2 = radiusPx * radiusPx;
  const claimed = new Array<boolean>(points.length).fill(false);
  const clusters: ClusterResult[] = [];

  for (let i = 0; i < points.length; i++) {
    if (claimed[i]) continue;
    claimed[i] = true;

    const memberIndices = [i];
    let sumX = points[i].x;
    let sumY = points[i].y;

    for (let j = i + 1; j < points.length; j++) {
      if (claimed[j]) continue;
      const dx = points[j].x - points[i].x;
      const dy = points[j].y - points[i].y;
      if (dx * dx + dy * dy <= radius2) {
        claimed[j] = true;
        memberIndices.push(j);
        sumX += points[j].x;
        sumY += points[j].y;
      }
    }

    const n = memberIndices.length;
    clusters.push({ cx: sumX / n, cy: sumY / n, memberIndices });
  }

  return clusters;
}

/**
 * Radius (px) of the ring on which a cluster's members fan out when spiderfied,
 * sized so adjacent pins keep `separationPx` between their centres (with a floor
 * so a 2-member fan isn't cramped). Standard circle-packing spacing.
 */
export function spiderfyRadius(memberCount: number, separationPx = 46): number {
  if (memberCount <= 1) return 0;
  const ideal = separationPx / (2 * Math.sin(Math.PI / memberCount));
  return Math.max(40, ideal);
}

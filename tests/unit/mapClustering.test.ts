import { describe, it, expect } from 'vitest';
import {
  greedyClusterByRadius,
  spiderfyRadius,
  type PixelPoint,
} from '../../src/utils/mapClustering';

describe('greedyClusterByRadius', () => {
  it('returns one single-member cluster per point when all are far apart', () => {
    const points: PixelPoint[] = [
      { x: 0, y: 0 },
      { x: 500, y: 0 },
      { x: 0, y: 500 },
    ];
    const clusters = greedyClusterByRadius(points, 50);
    expect(clusters).toHaveLength(3);
    expect(clusters.every((c) => c.memberIndices.length === 1)).toBe(true);
  });

  it('groups points within the radius of a seed into one cluster', () => {
    const points: PixelPoint[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 }, // within 50 of seed 0
      { x: 20, y: 20 }, // within 50 of seed 0
      { x: 400, y: 400 }, // far away → its own cluster
    ];
    const clusters = greedyClusterByRadius(points, 50);
    expect(clusters).toHaveLength(2);
    const [near, far] = clusters;
    expect(near.memberIndices.sort()).toEqual([0, 1, 2]);
    expect(far.memberIndices).toEqual([3]);
  });

  it('places a cluster centre at the centroid of its members', () => {
    const points: PixelPoint[] = [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 0, y: 30 },
    ];
    const [cluster] = greedyClusterByRadius(points, 50);
    expect(cluster.memberIndices).toHaveLength(3);
    expect(cluster.cx).toBeCloseTo(10);
    expect(cluster.cy).toBeCloseTo(10);
  });

  it('uses distance from the seed, not transitive chaining', () => {
    // 0 seeds; 1 is within radius of 0; 2 is within radius of 1 but NOT of 0.
    const points: PixelPoint[] = [
      { x: 0, y: 0 },
      { x: 40, y: 0 }, // 40 from seed 0 → joins
      { x: 90, y: 0 }, // 90 from seed 0 → does NOT join, becomes its own seed
    ];
    const clusters = greedyClusterByRadius(points, 50);
    expect(clusters).toHaveLength(2);
    expect(clusters[0].memberIndices.sort()).toEqual([0, 1]);
    expect(clusters[1].memberIndices).toEqual([2]);
  });

  it('handles an empty input', () => {
    expect(greedyClusterByRadius([], 50)).toEqual([]);
  });
});

describe('spiderfyRadius', () => {
  it('is zero for a lone member (no ring needed)', () => {
    expect(spiderfyRadius(1)).toBe(0);
  });

  it('honours the floor for small fans', () => {
    expect(spiderfyRadius(2)).toBe(40); // ideal (23) < floor
  });

  it('grows with the member count', () => {
    expect(spiderfyRadius(8)).toBeGreaterThan(spiderfyRadius(3));
  });
});

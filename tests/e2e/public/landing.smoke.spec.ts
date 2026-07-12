/**
 * Trivial harness-proof spec (prerequisite plan WP7 / exit criterion).
 *
 * Asserts the whole emulator→seed→build→serve chain produced a working landing
 * page: the header renders, the Leaflet map mounts, and seeded feeding points
 * appear on it. Runs on both the chromium-desktop and mobile projects.
 *
 * Marker readiness: `.leaflet-marker-icon` covers every case — desktop pins,
 * mobile proximity-cluster badges, and spiderfied pins are all Leaflet marker
 * icons. The map initializes asynchronously (fit-bounds → a `useEffect` that
 * builds the layer), so we poll for the first icon rather than timing a sleep.
 */
import { test, expect } from '../setup/test';

test('landing page renders header, map, and seeded markers', async ({ page }) => {
  await page.goto('/');

  // Header (banner landmark) — present on both desktop and mobile viewports.
  await expect(page.getByRole('banner')).toBeVisible();

  // Leaflet map container mounts (deterministic readiness signal, WP7).
  await expect(page.getByTestId('mountain-map')).toBeVisible();

  // Seeded points appear as Leaflet marker icons. Generous timeout: the map's
  // async init can be slow when several browser projects share the one Next
  // server under parallel CI load.
  const markers = page.locator('.leaflet-marker-icon');
  await expect(markers.first()).toBeVisible({ timeout: 25_000 });
  expect(await markers.count()).toBeGreaterThan(0);
});

/**
 * Home landing map — mobile (main plan §5.1; runs on the `mobile` project).
 *
 * Covers the phone map surface for the seeded geyang config:
 *   - portrait: the rotated map renders its pins, and tapping one opens the
 *     CatGallery (the §4 mobile-map regression surface);
 *   - landscape: the map is portrait-only, so a phone in landscape gets the
 *     "rotate to portrait" notice instead of a sideways map.
 *
 * NOTE — proximity clustering / tap-to-spiderfy is NOT covered here: geyang sets
 * `map.clustering: false` (config/mountains/mountains.json), and that flag is a
 * static import baked at build time, so it can't be flipped at runtime. Covering
 * spiderfy e2e needs a clustering-enabled fixture mountain; tracked as a Phase-2
 * gap. The clustering math itself lives in utils/mapClustering (unit-testable).
 */
import { test, expect } from '../setup/test';
import type { Page } from '@playwright/test';

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

test.describe('home map (mobile)', () => {
  test.beforeEach(({ page }) => {
    test.skip(isDesktop(page), 'mobile project only');
  });

  test('portrait: renders pins and tap opens the cat gallery', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('mountain-map')).toBeVisible();

    // clustering off → the seeded points render as individual pins.
    const marker = page.getByTestId('map-marker').filter({ hasText: '테스트 급식소 1' });
    await expect(marker).toBeVisible({ timeout: 25_000 });

    await marker.tap();
    await expect(page.getByRole('dialog').getByText('현재 거주 중')).toBeVisible();
    await expect(page.getByRole('button', { name: '테스트냥이일' })).toBeVisible();
  });

  test('landscape: shows the rotate-to-portrait notice instead of the map', async ({ page }) => {
    // A phone in landscape: width > height, height small enough to be a phone
    // (useIsPhoneLandscape matches `(orientation: landscape) and (max-height: 540px)`).
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/');

    await expect(page.getByText('지도는 세로 모드에서만 볼 수 있어요.')).toBeVisible();
    await expect(page.getByText('기기를 세로로 돌려주세요')).toBeVisible();
    // The map itself is not mounted in this state.
    await expect(page.getByTestId('mountain-map')).toHaveCount(0);
  });
});

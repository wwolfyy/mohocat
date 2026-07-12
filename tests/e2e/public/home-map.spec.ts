/**
 * Home landing map — desktop (main plan §5.1).
 *
 * The landing page is a Server Component that bakes points + cats server-side
 * (§7a) and hands them to the client Leaflet map as props. This spec guards:
 *
 *   - every seeded feeding point renders a pin, labelled by its title;
 *   - §7a regression — the baked cat avatars mean the map fires ZERO client
 *     Firestore requests (no `getCatsByPointId` waterfall on marker click);
 *   - marker click → CatGallery (현재 거주 중 / 예전에 거주) → cat → CatInfo with
 *     the seeded cat's fields, including 작명 사유 (name_origin).
 *
 * Mobile clustering / spiderfy is a separate concern (mobile-map spec); the
 * marker-click flow here is desktop-only.
 */
import { test, expect } from '../setup/test';
import type { Page, Request } from '@playwright/test';

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

// The client Firestore SDK, when pointed at the emulator, talks to the Firestore
// emulator host (port 8088) via its `…/google.firestore.v1.Firestore/…` channel.
// A request to any of these means a client Firestore read happened.
const isFirestoreRequest = (req: Request) => {
  const url = req.url();
  return (
    url.includes(':8088') ||
    url.includes('google.firestore') ||
    url.includes('firestore.googleapis')
  );
};

test.describe('home map (desktop)', () => {
  test.beforeEach(({ page }) => {
    test.skip(!isDesktop(page), 'desktop marker flow; mobile clustering has its own spec');
  });

  test('renders one pin per seeded point, labelled by title', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('mountain-map')).toBeVisible();

    // 4 seeded points → 4 stand-alone desktop pins.
    const markers = page.locator('.leaflet-marker-icon');
    await expect(markers.first()).toBeVisible({ timeout: 25_000 });
    await expect(markers).toHaveCount(4);

    // Each pin carries its point's title label.
    for (const title of ['테스트 급식소 1', '테스트 급식소 2', '테스트 급식소 3', '빈 급식소']) {
      await expect(page.getByTestId('map-marker').filter({ hasText: title })).toBeVisible();
    }
  });

  test('avatars are baked — no client Firestore request fires for the map', async ({ page }) => {
    const firestoreCalls: string[] = [];
    page.on('request', (req) => {
      if (isFirestoreRequest(req)) firestoreCalls.push(req.url());
    });

    await page.goto('/');
    await expect(page.getByTestId('map-marker').filter({ hasText: '테스트 급식소 1' })).toBeVisible(
      {
        timeout: 25_000,
      }
    );

    // Opening the gallery is exactly where the old per-point Firestore waterfall
    // used to fire (§7a removed it); confirm the baked path stays query-free.
    await page.getByTestId('map-marker').filter({ hasText: '테스트 급식소 1' }).click();
    await expect(page.getByText('현재 거주 중')).toBeVisible();

    expect(
      firestoreCalls,
      `unexpected client Firestore calls:\n${firestoreCalls.join('\n')}`
    ).toEqual([]);
  });

  test('marker click → CatGallery → CatInfo shows the seeded cat incl. 작명 사유', async ({
    page,
  }) => {
    await page.goto('/');
    const marker = page.getByTestId('map-marker').filter({ hasText: '테스트 급식소 1' });
    await expect(marker).toBeVisible({ timeout: 25_000 });
    await marker.click();

    // CatGallery: the point's current resident appears under 현재 거주 중.
    const gallery = page.getByRole('dialog');
    await expect(gallery.getByText('현재 거주 중')).toBeVisible();
    const catCard = gallery.getByRole('button', { name: '테스트냥이일' });
    await expect(catCard).toBeVisible();

    // Click through to the cat's detail.
    await catCard.click();

    // CatInfo: name heading + the seeded 작명 사유 (name_origin).
    await expect(page.getByRole('heading', { name: '테스트냥이일' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '작명 사유' })).toBeVisible();
    await expect(page.getByText('테스트를 위해 지은 이름이에요.')).toBeVisible();
  });
});

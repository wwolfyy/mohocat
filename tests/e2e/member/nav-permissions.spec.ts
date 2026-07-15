/**
 * Phase 4 — member nav permissions (main plan §8 Phase 4; the signed-in mirror of
 * public/anonymous-gating.spec.ts). Runs in the `member` project (butler-ground:
 * view-photo / view-video / view-post-butler / view-post-feeding).
 *
 * Where an anonymous visitor sees 사진첩/동영상 as disabled spans and 집사메뉴 as a
 * disabled span, a butler-ground member sees the gallery items as real links and
 * 집사메뉴 as an openable dropdown button.
 */
import { test, expect } from '../setup/test';

test.describe('member nav permissions', () => {
  test('gallery items are links and 집사메뉴 is enabled', async ({ page }) => {
    await page.goto('/');

    // 갤러리 dropdown → its items are now permission-granted links.
    await page.getByRole('button', { name: '갤러리' }).hover();
    await expect(page.getByRole('link', { name: '사진첩' })).toBeVisible();
    await expect(page.getByRole('link', { name: '동영상' })).toBeVisible();

    // 집사메뉴 is an openable button (anon gets a disabled span → button count 0).
    await expect(page.getByRole('button', { name: '집사메뉴' })).toBeVisible();
  });
});

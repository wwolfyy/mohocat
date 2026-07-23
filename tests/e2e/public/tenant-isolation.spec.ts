/**
 * Two-tenant isolation — rendered public content (multi-mountain plan M5.4b).
 *
 * The visible half of the isolation proof: a geyang public surface shows only
 * geyang content, and the manisan surface (reached by the `/manisan` path prefix,
 * which passes through the host-rewrite middleware) shows only manisan content.
 * The API / authorization half lives in `tests/e2e/api/tenant-isolation.spec.ts`.
 *
 * Default host (no prefix) resolves to geyang in the e2e harness; `/manisan/…`
 * targets the seeded stub tenant. Content markers are the distinct fixture text
 * (geyang fixtures vs manisan.json). Absence checks use each tenant's *exclusive*
 * markers (never a substring of the other tenant's text) so they can't false-pass.
 */
import { test, expect } from '../setup/test';

test.describe('two-tenant isolation — public content', () => {
  test('photo album shows only the active tenant’s photos', async ({ page }) => {
    // geyang (default host)
    await page.goto('/pages/photo-album');
    await expect(page.getByText('픽스처 사진 1')).toBeVisible();
    await expect(page.getByText('마니산 픽스처 사진 1')).toHaveCount(0);

    // manisan (path prefix)
    await page.goto('/manisan/pages/photo-album');
    await expect(page.getByText('마니산 픽스처 사진 1')).toBeVisible();
    // '픽스처 사진 2' is a geyang-exclusive marker (not a substring of any manisan text).
    await expect(page.getByText('픽스처 사진 2')).toHaveCount(0);
  });

  test('공지사항 list shows only the active tenant’s announcements', async ({ page }) => {
    // geyang (default host)
    await page.goto('/pages/announcements');
    await expect(page.getByRole('link', { name: '테스트 공지 1' })).toBeVisible();
    await expect(page.getByText('마니산 공지 1')).toHaveCount(0);

    // manisan (path prefix)
    await page.goto('/manisan/pages/announcements');
    await expect(page.getByRole('link', { name: '마니산 공지 1' })).toBeVisible();
    await expect(page.getByText('테스트 공지 1')).toHaveCount(0);
  });
});

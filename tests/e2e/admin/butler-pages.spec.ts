/**
 * Phase 5 — butler-page CONTENT as an admin (the admin half of main plan §8
 * Phase 4, bullet 1: "butler_talk list … butler_stream render"). Runs in the
 * `admin` project.
 *
 * The butler pages gate on `isAdmin()`, so only an admin passes the "접근 제한"
 * screen (see member/butler-access.spec.ts for the non-admin denial). Here the
 * pages render their real content: 집사톡 and 급식현황.
 */
import { test, expect } from '../setup/test';

test.describe('butler pages render for an admin', () => {
  test('집사톡 (butler_talk) renders its content', async ({ page }) => {
    await page.goto('/pages/butler_talk');
    await expect(page.getByRole('heading', { name: '집사톡' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: '접근 제한' })).toHaveCount(0);
  });

  test('급식현황 (butler_stream) renders its content', async ({ page }) => {
    await page.goto('/pages/butler_stream');
    await expect(page.getByRole('heading', { name: '급식현황' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: '접근 제한' })).toHaveCount(0);
  });
});

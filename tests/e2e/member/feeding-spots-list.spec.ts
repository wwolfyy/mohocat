/**
 * The 급식소 현황 table on 급식현황 (집사톡 stream). Runs in the `member` project
 * (butler-ground storageState) — the board is permission-gated, see
 * `butler-access.spec.ts`.
 *
 * 🆕 **This is the first e2e to reach the table populated at all** (2026-08-05).
 * `scripts/test/seed-emulators.mjs` seeded no `feeding_spots` until now, so every
 * run hit the 급식소 정보가 없습니다 branch and the whole freshness ramp — the
 * colour that tells an operator which spot needs attention — was unexercised.
 *
 * 📌 The exact colours are asserted in `tests/unit/feedingFreshness.test.ts`,
 * including WCAG contrast. This spec covers what a unit test cannot: that the
 * rows render, carry an inline colour at all, and that the non-colour urgency
 * marker reaches the DOM.
 */
import { test, expect } from '../setup/test';

test.describe('급식소 현황 table', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pages/butler_stream');
    await expect(page.getByRole('heading', { name: '급식소 현황' })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('lists every seeded 급식소 by name', async ({ page }) => {
    for (const name of ['정상 급식소', '약수터 급식소', '주차장 급식소', '능선 급식소']) {
      await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
    }
    // The empty branch must not be showing — that is what this spec exists to leave behind.
    await expect(page.getByText('급식소 정보가 없습니다.')).toHaveCount(0);
  });

  test('a spot with a visit is coloured from the ramp; one without is not', async ({ page }) => {
    const fresh = page.getByRole('cell', { name: '정상 급식소', exact: true });
    const unknown = page.getByRole('cell', { name: '능선 급식소', exact: true });

    // Seeded 1h ago → an inline rgb() from the ramp, blue-dominant at the fresh end.
    const freshColor = await fresh.evaluate((el) => getComputedStyle(el).color);
    const [r, , b] = freshColor.match(/\d+/g)!.map(Number);
    expect(b).toBeGreaterThan(r);

    // No visit on record → muted grey via a class, never a ramp colour.
    await expect(unknown).toHaveClass(/text-gray-500/);
  });

  test('the 48h urgency marker renders without relying on colour', async ({ page }) => {
    // 주차장 급식소 is seeded 70h ago — past both the 48h marker and the 60h clamp.
    await expect(page.getByText(/70시간 전\) !/)).toBeVisible();
    // 정상 급식소 is 1h old and must not be marked urgent.
    await expect(page.getByText('(1시간 전)')).toBeVisible();
  });

  test('a spot with no visit shows 정보 없음 rather than a blank cell', async ({ page }) => {
    const row = page.getByRole('row').filter({ hasText: '능선 급식소' });
    await expect(row.getByText('정보 없음').first()).toBeVisible();
  });
});

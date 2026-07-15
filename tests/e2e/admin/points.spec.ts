/**
 * Phase 5 — 급식소 관리 (points CMS) + delete-guard (main plan §8 Phase 5, bullet 3).
 * Runs in the `admin` project.
 *
 * Seed: test-point-01 (테스트 급식소 1) has resident cats; 빈 급식소 has none.
 *   - list renders the seeded points;
 *   - deleting a point with residents is blocked ("삭제할 수 없어요");
 *   - editing a point's title saves and reflects in the list.
 */
import { test, expect } from '../setup/test';

test.describe('points CMS', () => {
  test('renders the seeded feeding stations', async ({ page }) => {
    await page.goto('/admin/points');
    await expect(page.getByRole('heading', { name: '급식소 관리' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('cell', { name: '테스트 급식소 1' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '빈 급식소' })).toBeVisible();
  });

  test('delete is blocked while cats still live at the point', async ({ page }) => {
    await page.goto('/admin/points');
    const row = page.getByRole('row', { name: /테스트 급식소 1/ });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.getByRole('button', { name: '삭제' }).click();

    // Blocked modal (not the plain delete-confirm) because cats reference it.
    await expect(page.getByRole('heading', { name: '삭제할 수 없어요' })).toBeVisible();
    await page.getByRole('button', { name: '확인' }).click();
  });

  test('editing a point title saves', async ({ page }) => {
    const newTitle = `빈 급식소-수정${Date.now() % 100000}`;

    await page.goto('/admin/points');
    const row = page.getByRole('row', { name: /빈 급식소/ });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.getByRole('button', { name: '수정' }).click();

    await expect(page.getByRole('heading', { name: '급식소 수정' })).toBeVisible();
    await page.locator('form').locator('input[type="text"]').first().fill(newTitle);
    await page.getByRole('button', { name: '저장' }).click();

    await expect(page.getByRole('cell', { name: newTitle })).toBeVisible({ timeout: 15_000 });
  });
});

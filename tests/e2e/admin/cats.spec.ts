/**
 * Phase 5 — 고양이 관리 card editor (main plan §8 Phase 5, bullet 2). Runs in the
 * `admin` project.
 *
 * Opens a seeded cat in the card-editor modal, renames it, marks it adoptable,
 * saves, and confirms both persist (the rename shows in the list; reopening shows
 * the adoptable box still checked). Mutates the emulator only; a re-seed resets it.
 */
import { test, expect } from '../setup/test';

test.describe('cats — card editor', () => {
  test('edit a cat name + adoptable flag and persist', async ({ page }) => {
    const newName = `테스트냥이일-수정${Date.now() % 100000}`;

    await page.goto('/admin/cats');

    // Card view is a table; open the editor from the target row's edit button.
    const row = page.getByRole('row', { name: /테스트냥이일/ });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.getByRole('button').first().click();

    const form = page.locator('form');
    await expect(page.getByRole('heading', { name: '고양이 수정' })).toBeVisible();

    await form.locator('input[type="text"]').first().fill(newName);
    await form.getByRole('checkbox').check(); // adoptable (the only checkbox in the form)
    // The seeded thumbnailUrl is a relative path served from public/, which the
    // form's type="url" field rejects (HTML5), silently blocking submit. Clear it
    // (empty is url-valid) so the save can proceed — we assert name + adoptable.
    await form.locator('input[type="url"]').fill('');
    await form.getByRole('button', { name: '저장' }).click();

    // Modal closes; the renamed row is in the list.
    await expect(page.getByRole('heading', { name: '고양이 수정' })).toHaveCount(0, {
      timeout: 15_000,
    });
    await expect(page.getByRole('row', { name: new RegExp(newName) })).toBeVisible({
      timeout: 15_000,
    });

    // Reopen the renamed cat → adoptable persisted as checked.
    await page
      .getByRole('row', { name: new RegExp(newName) })
      .getByRole('button')
      .first()
      .click();
    await expect(page.getByRole('heading', { name: '고양이 수정' })).toBeVisible();
    await expect(page.locator('form').getByRole('checkbox')).toBeChecked();
  });
});

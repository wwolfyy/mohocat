/**
 * Phase 5 — 고양이 관리 card editor (main plan §8 Phase 5, bullet 2). Runs in the
 * `admin` project.
 *
 * Opens a seeded cat in the card-editor modal, renames it, marks it adoptable,
 * saves, and confirms both persist (the rename shows in the list; reopening shows
 * the adoptable box still checked). Mutates the emulator only; a re-seed resets it.
 *
 * ⚠️ **This spec must only ever touch `이사한냥이` (test-cat-06) — the one fixture
 * cat no other spec reads.** It edits a shared emulator that every project runs
 * against in parallel (`fullyParallel: true`), and its edits are permanent for the
 * rest of the run, so any cat it renames is a cat another spec can observe
 * mid-rename.
 *
 * 🔑 **This was a real, recurring flake, not a hypothetical.** Until 2026-08-02 it
 * renamed `테스트냥이일`, which six specs read:
 *   - `api/tenant-isolation.spec.ts` asserts `toContain('테스트냥이일')` on an
 *     **exact array element**, so it failed outright once the rename landed — the
 *     documented "timing-sensitive" failure that passed in isolation was this, and
 *     no amount of waiting could have fixed it;
 *   - `public/galleries-adoption.spec.ts` asserts `테스트냥이일` is **not** on
 *     입양홍보, while this spec was busy ticking its adoptable box;
 *   - the other four survived only by accident, because `getByRole({name})` and
 *     `getByText()` match substrings and `테스트냥이일-수정12345` contains the
 *     original name. `admin/tag-images.spec.ts` and `admin/tag-videos.spec.ts`
 *     already carried comments steering around this instead of fixing it.
 *
 * If a future case needs a second mutable cat, **add a fixture** rather than
 * borrowing one — the assertion that breaks may be in another project's spec and
 * will look like flake, not like a dependency.
 */
import { test, expect } from '../setup/test';

// test-cat-06. Deliberately not 테스트냥이일 — see the header note.
const TARGET_CAT = '이사한냥이';

test.describe('cats — card editor', () => {
  test('edit a cat name + adoptable flag and persist', async ({ page }) => {
    const newName = `${TARGET_CAT}-수정${Date.now() % 100000}`;

    await page.goto('/admin/cats');

    // Card view is a table; open the editor from the target row's edit button.
    const row = page.getByRole('row', { name: new RegExp(TARGET_CAT) });
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

/**
 * `/pages/posts/{postType}/{id}` — the shared post detail route, all four types.
 *
 * 🐛 **Regression net for 2026-08-02.** The route hard-coded `getPostService`,
 * i.e. the `posts_feeding` collection, while the four post types live in four
 * separate collections. Every 집사톡 / 공지사항 / 입양홍보 post therefore opened
 * on "Post not found." — from the public 집사톡 list *and* from every tab of the
 * admin CMS. Only 급식현황 (which really is `posts_feeding`) ever worked.
 *
 * 🔑 **Why it survived so long: this route had no e2e coverage at all.** The
 * type is now a path segment, so each type gets its own case here.
 *
 * Runs in the `admin` project: the 집사톡 / 급식현황 lists gate on `isAdmin()`.
 */
import { test, expect } from '../setup/test';

const NOT_FOUND = '게시물을 찾을 수 없습니다.';

test.describe('post detail resolves the right collection', () => {
  test('집사톡 post opens from the list, not on "not found"', async ({ page }) => {
    await page.goto('/pages/butler_talk');
    await expect(page.getByRole('heading', { name: '집사톡' })).toBeVisible({ timeout: 15_000 });

    // The list links by title; clicking is the exact path the bug was reported on.
    await page.getByRole('link', { name: '집사수다 1' }).first().click();

    await expect(page.getByRole('heading', { name: '집사수다 1' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(NOT_FOUND)).toHaveCount(0);
    await expect(page).toHaveURL(/\/pages\/posts\/butler_talk\//);
  });

  // Every type by direct URL — the admin CMS links to this route for all four.
  const cases = [
    { type: 'butler_talk', id: 'test-butler-01', title: '집사수다 1' },
    { type: 'butler_stream', id: 'test-feeding-01', title: '급식 스트림 1' },
    { type: 'announcements', id: 'test-anno-01', title: '테스트 공지 1' },
    { type: 'adoption_promotion', id: 'test-adopt-01', title: '입양 소식 1' },
  ] as const;

  for (const { type, id, title } of cases) {
    test(`${type} renders its post`, async ({ page }) => {
      await page.goto(`/pages/posts/${type}/${id}`);
      await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(NOT_FOUND)).toHaveCount(0);
    });
  }

  test('a real miss still says so', async ({ page }) => {
    await page.goto('/pages/posts/butler_talk/no-such-post');
    await expect(page.getByText(NOT_FOUND)).toBeVisible({ timeout: 15_000 });
  });

  /**
   * 🔑 No guessing. An unrecognised type must not fall back to a collection —
   * a fallback is what made the original bug silent, and a real id under the
   * wrong type would then render the wrong post or a misleading "not found".
   */
  test('an unrecognised type resolves nothing rather than guessing', async ({ page }) => {
    await page.goto('/pages/posts/not_a_type/test-feeding-01');
    await expect(page.getByText(NOT_FOUND)).toBeVisible({ timeout: 15_000 });
  });
});

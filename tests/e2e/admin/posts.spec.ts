/**
 * Phase 5 — 게시물 관리: create + list (main plan §8 Phase 5, bullet 3). Runs in
 * the `admin` project.
 *
 *   - create: author a new 공지사항 → it lands on the public /pages/announcements list;
 *   - list: the admin posts surface renders the announcements tab with its
 *     "새 공지사항 작성" entry point.
 */
import { test, expect } from '../setup/test';

test.describe('게시물 관리', () => {
  test('creating an announcement publishes it to the public list', async ({ page }) => {
    const title = `E2E 공지 ${Date.now() % 100000}`;

    // Accept the "작성되었습니다" success alert the form fires before redirecting.
    page.on('dialog', (d) => void d.accept());

    await page.goto('/admin/announcements/new');
    await page.getByPlaceholder('공지사항 제목을 입력하세요').fill(title);
    await page
      .getByPlaceholder('공지사항 내용을 입력하세요')
      .fill('E2E 테스트로 작성한 공지 내용입니다.');
    await page.getByRole('button', { name: '공지사항 작성' }).click();

    // The form redirects to the public announcements page on success.
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
      .toBe('/pages/announcements');
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
  });

  test('the admin posts list renders the announcements tab', async ({ page }) => {
    await page.goto('/admin/posts');
    await expect(page.getByRole('heading', { name: '게시물 관리' })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: '공지사항' }).click();
    await expect(page.getByRole('button', { name: '새 공지사항 작성' })).toBeVisible({
      timeout: 15_000,
    });
  });
});

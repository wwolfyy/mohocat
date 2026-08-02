/**
 * 공지사항 / 입양홍보 editing, now done by the **create composer in edit mode**
 * (2026-08-02, owner). Runs in the `admin` project.
 *
 * 🔑 **What this pins.** Editing used to go through `EditPostForm`, which took
 * media only as a **pasted URL** — changing a photo meant finding its Storage URL
 * by hand. The restriction was stale: both composers moved onto the same
 * signed-URL upload path on 2026-07-30, so the pipeline was already reusable.
 * These specs hold the properties that make the converged editor correct:
 *
 *   1. the edit screen is the **same form** as create — a real file picker, not
 *      a URL box — and it arrives prefilled;
 *   2. media already on the post is listed, individually removable, and
 *      **retained** across a save that touches nothing else. A save that
 *      silently dropped it is the failure worth a regression net;
 *   3. an edit does not re-stamp authorship or 게시일 — `updatePost` merges, and
 *      re-stamping would relabel the post with whoever edited it and reorder the
 *      public list.
 *
 * ⚠️ **These specs MUTATE their fixtures, so they use their own.**
 * `test-anno-edit-01` / `test-adopt-edit-01` exist for this file alone. Editing a
 * fixture another spec reads is precisely how the 2026-08-02 "flake set" was
 * built (DEBUG_LOG) — do not repoint these at the shared posts.
 */
import { test, expect } from '../setup/test';
import type { Page } from '@playwright/test';

const alertDialog = (page: Page) => page.getByRole('dialog', { name: '알림' });

/**
 * Serve YouTube's thumbnail CDN locally.
 *
 * ⚠️ Required, not cosmetic: the fixture video id is invented, so
 * `img.youtube.com` 404s for it, and the console watchdog fails any spec that
 * logs a resource error. Both the editor's 기존 rows and the admin list render a
 * thumbnail from that host. Stubbing it keeps the failure signal about the edit
 * flow rather than about a fixture id YouTube has never heard of.
 */
const stubYouTubeThumbnails = (page: Page) =>
  page.route('https://img.youtube.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/gif', body: '' })
  );

const confirmSave = async (page: Page) => {
  await expect(alertDialog(page)).toBeVisible({ timeout: 20_000 });
  await alertDialog(page).getByRole('button', { name: '확인' }).click();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe('/admin/posts');
};

test.describe('공지사항 / 입양홍보 edit uses the create composer', () => {
  test('the announcement editor is the composer, prefilled, with a real file picker', async ({
    page,
  }) => {
    await page.goto('/admin/posts/edit/announcements/test-anno-edit-01');

    // Prefilled from the post, into the composer's own fields.
    await expect(page.getByPlaceholder('공지사항 제목을 입력하세요')).toHaveValue(
      '수정 전용 공지',
      {
        timeout: 15_000,
      }
    );
    await expect(page.getByPlaceholder('공지사항 내용을 입력하세요')).toHaveValue(
      '편집 스펙 전용 공지 본문이에요.'
    );

    // The point of the change: a file picker per medium, plus 촬영 날짜 and the
    // 팝업 toggle — none of which the URL-only editor had.
    await expect(page.locator('input[type="file"][accept="image/*"]')).toBeVisible();
    await expect(page.locator('input[type="file"][accept="video/*"]')).toBeVisible();
    await expect(page.getByRole('button', { name: '공지사항 저장' })).toBeVisible();

    // ⚠️ The old editor's URL boxes must be GONE, not merely unused.
    await expect(page.getByPlaceholder('이미지 URL을 입력하세요')).toHaveCount(0);
    await expect(page.getByPlaceholder('동영상 URL을 입력하세요')).toHaveCount(0);
  });

  test('existing media is listed and survives a text-only save', async ({ page }) => {
    await stubYouTubeThumbnails(page);
    // test-adopt-edit-01 carries two photos and one video.
    await page.goto('/admin/posts/edit/adoption_promotion/test-adopt-edit-01');

    const message = page.getByPlaceholder('입양홍보 내용을 입력하세요');
    await expect(message).toHaveValue('편집 스펙 전용 입양홍보 본문이에요.', { timeout: 15_000 });

    // Two photos and one video, each shown as a 기존 row with its own 삭제.
    await expect(page.getByText('기존')).toHaveCount(3);
    await expect(page.getByText('album-01.jpg')).toBeVisible();
    await expect(page.getByText('album-02.jpg')).toBeVisible();

    await message.fill('본문만 고쳤어요.');
    await page.getByRole('button', { name: '입양홍보 저장' }).click();
    await confirmSave(page);

    // Reopen: the edit must not have dropped the media it never touched.
    await page.goto('/admin/posts/edit/adoption_promotion/test-adopt-edit-01');
    await expect(page.getByPlaceholder('입양홍보 내용을 입력하세요')).toHaveValue(
      '본문만 고쳤어요.',
      { timeout: 15_000 }
    );
    await expect(page.getByText('기존')).toHaveCount(3);
  });

  test('removing one photo detaches only that photo', async ({ page }) => {
    await page.goto('/admin/posts/edit/announcements/test-anno-edit-01');
    await expect(page.getByPlaceholder('공지사항 제목을 입력하세요')).toHaveValue(
      '수정 전용 공지',
      {
        timeout: 15_000,
      }
    );

    await expect(page.getByText('기존')).toHaveCount(2);
    await page
      .locator('li', { has: page.getByText('album-01.jpg') })
      .getByRole('button', { name: '삭제' })
      .click();
    await expect(page.getByText('기존')).toHaveCount(1);

    await page.getByRole('button', { name: '공지사항 저장' }).click();
    await confirmSave(page);

    await page.goto('/admin/posts/edit/announcements/test-anno-edit-01');
    await expect(page.getByText('기존')).toHaveCount(1, { timeout: 15_000 });
    await expect(page.getByText('album-02.jpg')).toBeVisible();
    await expect(page.getByText('album-01.jpg')).toHaveCount(0);
  });

  test('an edit does not re-stamp authorship or 게시일', async ({ page }) => {
    // This test's own fixture carries no media, but it visits the 입양홍보 list,
    // which renders every post's thumbnail — including the fixture videos.
    await stubYouTubeThumbnails(page);

    const cardFor = (name: string | RegExp) =>
      page.locator('div.border.p-4').filter({ has: page.getByRole('link', { name }) });

    // Read what the list shows BEFORE the edit, and compare against it after.
    // ⚠️ Asserting a literal date would be asserting `formatKoreaDateTime`'s
    // output, which applies its own timezone shift — the property under test is
    // that the stamp is *unchanged*, not what it renders as.
    await page.goto('/admin/posts');
    await page.getByRole('button', { name: '입양홍보' }).click();
    const before = cardFor('작성자 보존 확인용');
    await expect(before).toBeVisible({ timeout: 15_000 });
    const originalDate = await before.locator('p').last().innerText();

    await page.goto('/admin/posts/edit/adoption_promotion/test-adopt-edit-02');
    const title = page.getByPlaceholder('입양홍보 제목을 입력하세요');
    await expect(title).toHaveValue('작성자 보존 확인용', { timeout: 15_000 });
    await title.fill('작성자 보존 확인용 (수정됨)');

    await page.getByRole('button', { name: '입양홍보 저장' }).click();
    await confirmSave(page);

    await page.getByRole('button', { name: '입양홍보' }).click();
    const after = cardFor('작성자 보존 확인용 (수정됨)');
    await expect(after).toBeVisible({ timeout: 15_000 });
    await expect(after.getByText('관리자')).toBeVisible();
    await expect(after.locator('p').last()).toHaveText(originalDate);
  });
});

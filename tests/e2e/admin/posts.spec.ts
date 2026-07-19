/**
 * Phase 5 — 게시물 관리: create + list (main plan §8 Phase 5, bullet 3). Runs in
 * the `admin` project.
 *
 * P0 characterization upgrade (complexity-retirement assessment §7 P0): the two
 * Family-B create flows (공지사항 NewAnnouncementForm, 입양홍보 NewAdoptionForm)
 * are pinned end-to-end INCLUDING one image upload each — success dialog,
 * redirect, and the created content (with its image thumbnail) visible on the
 * public surface. These specs are the parity net the P1–P3 form refactor must
 * keep green. Since P6.1 the forms fire a shared ui/Modal dialog instead of
 * native alert(), so the specs assert the modal and click 확인.
 *
 *   - create 공지사항: title + body + image → /pages/announcements list shows the
 *     post with an image thumbnail;
 *   - create 입양홍보: title + body + image → /pages/adoption feed accordion shows
 *     the post; expanding reveals body + image;
 *   - list: the admin posts surface renders the announcements tab with its
 *     "새 공지사항 작성" entry point.
 */
import path from 'path';
import { test, expect } from '../setup/test';
import type { Page } from '@playwright/test';

// The shared useDialog modal (alert mode titles itself 알림).
const alertDialog = (page: Page) => page.getByRole('dialog', { name: '알림' });

// Uploaded through the form; served back from the Storage emulator.
const IMAGE_FIXTURE = path.join(
  __dirname,
  '..',
  'fixtures',
  'images',
  'test-fixtures',
  'album-01.jpg'
);

test.describe('게시물 관리', () => {
  test('creating an announcement with an image publishes it to the public list', async ({
    page,
  }) => {
    const title = `E2E 공지 ${Date.now() % 100000}`;

    await page.goto('/admin/announcements/new');
    await page.getByPlaceholder('공지사항 제목을 입력하세요').fill(title);
    await page
      .getByPlaceholder('공지사항 내용을 입력하세요')
      .fill('E2E 테스트로 작성한 공지 내용입니다.');

    // Attach one image; the pending-upload list echoes the filename.
    await page.locator('input[type="file"][accept="image/*"]').setInputFiles(IMAGE_FIXTURE);
    await expect(page.getByText('album-01.jpg')).toBeVisible();

    await page.getByRole('button', { name: '공지사항 작성' }).click();

    // Confirm the success dialog (shared ui/Modal since P6.1); the redirect
    // happens after 확인.
    await expect(alertDialog(page)).toBeVisible({ timeout: 20_000 });
    await alertDialog(page).getByRole('button', { name: '확인' }).click();

    // The form redirects to the public announcements page on success.
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
      .toBe('/pages/announcements');

    // The created post renders with its uploaded image as the thumbnail (scoped
    // to the post's card — other posts may carry thumbnails too).
    const card = page
      .locator('div.rounded-lg')
      .filter({ has: page.getByRole('link', { name: title }) });
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.getByAltText('Image thumbnail')).toBeVisible();
  });

  test('creating an 입양홍보 post with an image publishes it to the adoption feed', async ({
    page,
  }) => {
    const title = `E2E 입양홍보 ${Date.now() % 100000}`;

    await page.goto('/admin/adoption/new');
    await page.getByPlaceholder('입양홍보 제목을 입력하세요').fill(title);
    await page
      .getByPlaceholder('입양홍보 내용을 입력하세요')
      .fill('E2E 테스트로 작성한 입양홍보 내용입니다.');

    await page.locator('input[type="file"][accept="image/*"]').setInputFiles(IMAGE_FIXTURE);
    await expect(page.getByText('album-01.jpg')).toBeVisible();

    await page.getByRole('button', { name: '입양홍보 작성' }).click();

    await expect(alertDialog(page)).toBeVisible({ timeout: 20_000 });
    await alertDialog(page).getByRole('button', { name: '확인' }).click();

    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
      .toBe('/pages/adoption');

    // The feed renders the post as a folded accordion card (header = title +
    // date, so match by substring); expanding reveals body + image.
    const header = page.getByRole('button', { name: new RegExp(title) });
    await expect(header).toBeVisible({ timeout: 15_000 });
    await expect(header).toHaveAttribute('aria-expanded', 'false');
    await header.click();
    await expect(header).toHaveAttribute('aria-expanded', 'true');

    const card = page.locator('div.rounded-lg').filter({ has: header });
    await expect(card.getByText('E2E 테스트로 작성한 입양홍보 내용입니다.')).toBeVisible();
    await expect(card.getByAltText('이미지')).toBeVisible();
  });

  // Whitespace passes the native `required` check, so these pin the forms' own
  // trim-validation dialog path (P2.4: submit/upload/preview/validation).
  test('공지사항 form rejects whitespace-only 제목/내용 with validation alerts', async ({
    page,
  }) => {
    await page.goto('/admin/announcements/new');
    await page.getByPlaceholder('공지사항 제목을 입력하세요').fill(' ');
    await page.getByPlaceholder('공지사항 내용을 입력하세요').fill(' ');
    await page.getByRole('button', { name: '공지사항 작성' }).click();
    await expect(alertDialog(page).getByText('제목을 입력해주세요.')).toBeVisible();
    await alertDialog(page).getByRole('button', { name: '확인' }).click();

    await page.getByPlaceholder('공지사항 제목을 입력하세요').fill('유효한 제목');
    await page.getByRole('button', { name: '공지사항 작성' }).click();
    await expect(alertDialog(page).getByText('내용을 입력해주세요.')).toBeVisible();
    await alertDialog(page).getByRole('button', { name: '확인' }).click();

    // No redirect happened — still on the composer.
    expect(new URL(page.url()).pathname).toBe('/admin/announcements/new');
  });

  test('입양홍보 form rejects whitespace-only 제목/내용 with validation alerts', async ({
    page,
  }) => {
    await page.goto('/admin/adoption/new');
    await page.getByPlaceholder('입양홍보 제목을 입력하세요').fill(' ');
    await page.getByPlaceholder('입양홍보 내용을 입력하세요').fill(' ');
    await page.getByRole('button', { name: '입양홍보 작성' }).click();
    await expect(alertDialog(page).getByText('제목을 입력해주세요.')).toBeVisible();
    await alertDialog(page).getByRole('button', { name: '확인' }).click();

    await page.getByPlaceholder('입양홍보 제목을 입력하세요').fill('유효한 제목');
    await page.getByRole('button', { name: '입양홍보 작성' }).click();
    await expect(alertDialog(page).getByText('내용을 입력해주세요.')).toBeVisible();
    await alertDialog(page).getByRole('button', { name: '확인' }).click();

    expect(new URL(page.url()).pathname).toBe('/admin/adoption/new');
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

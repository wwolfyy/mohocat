/**
 * P0-net extension (complexity-retirement P3.0) — Family A create flows:
 * 집사게시판 (butler_stream / NewPostForm) + 집사톡 (butler_talk /
 * NewButlerTalkForm), driven as an admin (the pages gate on isAdmin()).
 *
 * Scope note: these are TEXT-ONLY creates. Family A media paths are excluded
 * from the automated net on purpose — video upload is YouTube (manual parity,
 * P3.4/P5.4), and the signed-URL image strategy builds a production
 * `firebasestorage.googleapis.com` public URL that would pollute the shared
 * emulator seed with an unloadable image (tripping other specs' console
 * watchdogs). The strategies themselves are unit-tested
 * (tests/unit/uploadStrategies.test.ts); the full media path is part of the
 * scripted manual pass. The cat-tag modal wiring IS pinned here — selecting an
 * image file only toggles local state, so the modal can be exercised and the
 * file selection cleared before submitting.
 */
import { test, expect } from '../setup/test';
import path from 'path';
import type { Page } from '@playwright/test';

// The shared useDialog modal (alert mode titles itself 알림; P6.1).
const alertDialog = (page: Page) => page.getByRole('dialog', { name: '알림' });

const IMAGE_FIXTURE = path.join(
  __dirname,
  '..',
  'fixtures',
  'images',
  'test-fixtures',
  'album-01.jpg'
);

test.describe('집사게시판/집사톡 create flows (Family A)', () => {
  test('집사게시판: cat-tag modal wires up and a text post publishes to the stream', async ({
    page,
  }) => {
    const title = `E2E 급식글 ${Date.now() % 100000}`;

    await page.goto('/pages/butler_stream/new');
    await expect(page.getByRole('heading', { name: '새글 작성' })).toBeVisible({
      timeout: 15_000,
    });
    // Post-only extras: the feeding-spots section renders.
    await expect(page.getByRole('heading', { name: '아래 급식소를 챙겼어요!' })).toBeVisible();

    // The dynamic default title doubles as the placeholder.
    await page.getByPlaceholder(/급식소 챙기고 갑니다/).fill(title);
    await page.locator('textarea').fill('E2E 테스트로 작성한 급식 글입니다.');

    // Selecting an image reveals the cat-tag field; the shared CatSelectorModal
    // commits on 완료. Clear the file again so the submit stays text-only.
    const imageInput = page.locator('input[type="file"][accept="image/*"]');
    await imageInput.setInputFiles(IMAGE_FIXTURE);
    const tagField = page.getByPlaceholder('고양이를 선택하려면 클릭하세요');
    await expect(tagField).toBeVisible();
    await tagField.click();
    await expect(page.getByText('이미지에 등장하는 고양이 선택')).toBeVisible();
    await page.getByText('테스트냥이이', { exact: true }).click();
    // "완료 (n개 선택)" — anchored past the page's own "작성 완료" submit button.
    await page.getByRole('button', { name: /완료 \(/ }).click();
    await expect(tagField).toHaveValue('테스트냥이이');
    await imageInput.setInputFiles([]);
    await expect(tagField).toHaveCount(0);

    await page.getByRole('button', { name: '작성 완료' }).click();

    // Success dialog (shared ui/Modal since P6.1); redirect happens after 확인.
    await expect(alertDialog(page).getByText('Post created successfully!')).toBeVisible({
      timeout: 20_000,
    });
    await alertDialog(page).getByRole('button', { name: '확인' }).click();
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
      .toBe('/pages/butler_stream');
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
  });

  test('집사톡: a text post publishes to the 집사톡 list', async ({ page }) => {
    const title = `E2E 집사톡 ${Date.now() % 100000}`;

    await page.goto('/pages/butler_talk/new');
    await expect(page.getByRole('heading', { name: '새글 작성' })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByLabel('제목').fill(title);
    await page
      .getByPlaceholder('글 내용을 입력하세요')
      .fill('E2E 테스트로 작성한 집사톡 글입니다.');
    await page.getByRole('button', { name: '글 작성' }).click();

    await expect(alertDialog(page).getByText('글이 성공적으로 작성되었습니다!')).toBeVisible({
      timeout: 20_000,
    });
    await alertDialog(page).getByRole('button', { name: '확인' }).click();
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
      .toBe('/pages/butler_talk');
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
  });
});

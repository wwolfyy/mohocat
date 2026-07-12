/**
 * Anonymous gating (main plan §5.1, last bullet).
 *
 * With no signed-in user:
 *   - butler_talk / butler_stream render the "접근 제한" access-denied UI;
 *   - /mypage full-page-redirects to /login (handoff-28: a never-authed visit
 *     goes to the login page, a logout goes to '/');
 *   - the 동참 (contact) form shows the login-required prompt and a disabled 보내기;
 *   - the nav gates permission-only surfaces — 사진첩/동영상 are disabled spans
 *     (not links) and 집사메뉴 is disabled with a login tooltip.
 */
import { test, expect } from '../setup/test';
import type { Page } from '@playwright/test';

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

test.describe('anonymous gating', () => {
  for (const path of ['/pages/butler_talk', '/pages/butler_stream']) {
    test(`${path} shows the access-denied UI`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: '접근 제한' })).toBeVisible();
      await expect(
        page.getByText('이 페이지에 접근하려면 관리자 권한이 필요합니다.')
      ).toBeVisible();
    });
  }

  test('/mypage redirects an anonymous visitor to /login', async ({ page }) => {
    await page.goto('/mypage');
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe('/login');
  });

  test('동참 (contact) shows the login-required state', async ({ page }) => {
    await page.goto('/pages/contact');
    // The form's login prompt (there is a second 집사등록 link in the page intro,
    // so scope to the form).
    const form = page.locator('form');
    await expect(form.getByText('메시지를 보내려면 먼저')).toBeVisible();
    await expect(form.getByRole('link', { name: '집사등록' })).toBeVisible();
    await expect(page.getByRole('button', { name: '보내기' })).toBeDisabled();
  });

  test('desktop nav gates 갤러리 items and 집사메뉴', async ({ page }) => {
    test.skip(!isDesktop(page), 'desktop nav only');
    await page.goto('/');

    // 갤러리 opens, but its items are permission-gated → rendered as spans, not links.
    await page.getByRole('button', { name: '갤러리' }).hover();
    await expect(page.getByText('사진첩')).toBeVisible();
    await expect(page.getByRole('link', { name: '사진첩' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: '동영상' })).toHaveCount(0);

    // 집사메뉴 is disabled (a span with the login tooltip), not an open-able button.
    await expect(page.getByRole('button', { name: '집사메뉴' })).toHaveCount(0);
    await expect(page.getByText('집사메뉴')).toHaveAttribute('title', '먼저 로그인 하세요');
  });

  test('mobile menu shows the butler login hint', async ({ page }) => {
    test.skip(isDesktop(page), 'mobile menu only');
    await page.goto('/');
    await page.getByRole('button', { name: 'Open main menu' }).click();
    await expect(page.getByText('먼저 로그인 하세요')).toBeVisible();
  });
});

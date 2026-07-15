/**
 * Phase 3 — email login, bad-password, and logout (main plan §8 Phase 3, bullet 1
 * + 3). Runs in the anonymous `auth` project (no storageState); each test drives
 * the real login UI.
 *
 * Covered:
 *   - email/password login → redirect off /login + authenticated nav appears;
 *   - wrong password → the shared login-error banner (uses base test: LoginForm
 *     intentionally `console.error`s the failure, which the watchdog would flag);
 *   - logout via the top-nav modal → back to the anonymous "로그인/등록" state;
 *   - logout from /mypage (in-page button) → full-page redirect to '/';
 *   - mobile: logout via the hamburger menu → anonymous state (handoff-28 regression).
 */
import { test, expect } from '../setup/test';
import { test as baseTest } from '@playwright/test';
import { emailLogin, SEEDED } from '../setup/auth-helpers';

test.describe('email login + logout', () => {
  test('valid credentials sign in and reveal the authenticated nav', async ({ page }) => {
    await emailLogin(page, SEEDED.member.email, SEEDED.member.password);

    // Authenticated nav: the login pill is gone, the logout control is present.
    await expect(page.getByRole('button', { name: '로그아웃' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name: '로그인/등록' })).toHaveCount(0);
  });

  test('logout via the top-nav modal returns to the anonymous state', async ({ page }) => {
    await emailLogin(page, SEEDED.member.email, SEEDED.member.password);
    await expect(page.getByRole('button', { name: '로그아웃' })).toBeVisible({ timeout: 15_000 });

    // Open the confirm modal, confirm, and land back anonymous.
    await page.getByRole('button', { name: '로그아웃' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '로그아웃' }).click();

    await expect(page.getByRole('link', { name: '로그인/등록' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: '로그아웃' })).toHaveCount(0);
  });

  test('logout from /mypage redirects to the landing page', async ({ page }) => {
    await emailLogin(page, SEEDED.member.email, SEEDED.member.password);

    await page.goto('/mypage');
    // The in-page 로그아웃 button has visible text; the nav one is icon-only
    // (aria-label). `hasText` selects the mypage button unambiguously.
    const mypageSignOut = page
      .getByRole('button', { name: '로그아웃' })
      .filter({ hasText: '로그아웃' });
    await expect(mypageSignOut).toBeVisible({ timeout: 15_000 });
    await mypageSignOut.click();

    // handoff-28: a logout from mypage full-page-redirects to '/', not /login.
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe('/');
  });
});

// Negative case — LoginForm logs the failed sign-in via console.error, so use the
// plain (non-watchdog) test to avoid a false failure on that expected noise.
baseTest.describe('bad password', () => {
  baseTest('wrong password surfaces the login-error banner', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(SEEDED.member.email);
    await page.locator('input[type="password"]').fill('definitely-wrong-password');
    await page.getByRole('button', { name: '이메일로 로그인' }).click();

    // invalidCredential and wrongPassword messages both contain "올바르지 않아요".
    await expect(page.getByText(/올바르지 않아요/)).toBeVisible({ timeout: 15_000 });
    // Still on the login page (no redirect on failure).
    await expect(page).toHaveURL(/\/login/);
  });
});

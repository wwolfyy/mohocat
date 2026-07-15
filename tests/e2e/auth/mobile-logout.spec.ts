/**
 * Phase 3 — mobile hamburger-menu logout (main plan §8 Phase 3, bullet 3;
 * handoff-28 regression). Separate file because a mobile device preset must be set
 * at file top-level via `test.use` (Playwright forbids it inside a describe).
 */
import { test, expect, devices } from '@playwright/test';
import { emailLogin, SEEDED } from '../setup/auth-helpers';

test.use({ ...devices['Pixel 7'] });

test('mobile: logout via the hamburger menu returns to the anonymous state', async ({ page }) => {
  await emailLogin(page, SEEDED.member.email, SEEDED.member.password);

  await page.getByRole('button', { name: 'Open main menu' }).click();
  // The mobile logout pill (displayName + logout button) lives inside the menu.
  await page.getByRole('button', { name: '로그아웃' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '로그아웃' }).click();

  // Re-open the menu; the login entry is back.
  await page.getByRole('button', { name: 'Open main menu' }).click();
  await expect(page.getByRole('link', { name: '로그인/등록' })).toBeVisible({ timeout: 15_000 });
});

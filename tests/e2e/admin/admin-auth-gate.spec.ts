/**
 * Phase 5 — AdminAuth gate (main plan §8 Phase 5, bullet 1). Runs in the `admin`
 * project; the anonymous and non-admin cases override storageState per-describe.
 *
 * Three states of `src/components/admin/AdminAuth.tsx`:
 *   - anonymous → the admin login form ("계속하려면 로그인해 주세요");
 *   - signed-in non-admin (butler-ground member) → "접근 권한이 없어요";
 *   - admin → the CMS shell ("환영해요, …님" + the nav).
 */
import path from 'node:path';
import { test, expect } from '../setup/test';

const MEMBER_STATE = path.resolve(__dirname, '..', '.auth', 'member.json');

test.describe('anonymous visitor', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('sees the admin login form, not the CMS', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByText('계속하려면 로그인해 주세요')).toBeVisible();
    await expect(page.getByRole('heading', { name: '산냥이집냥이 관리자' })).toBeVisible();
  });
});

test.describe('signed-in non-admin', () => {
  test.use({ storageState: MEMBER_STATE });

  test('a butler-ground member is denied the CMS', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: '접근 권한이 없어요' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('관리자 권한이 필요해요.')).toBeVisible();
  });
});

test.describe('admin', () => {
  test('reaches the CMS shell', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByText(/환영해요/)).toBeVisible({ timeout: 15_000 });
  });
});

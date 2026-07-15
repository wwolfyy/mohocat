/**
 * Phase 4 — mypage nickname edit + mobile layout (main plan §8 Phase 4, bullet 2).
 * Runs in the `member` project (butler-ground storageState).
 *
 * Nickname edit: the AuthProvider deliberately does NOT `setUser` after
 * `updateProfile` (it relies on a reload), so the success signal is the
 * confirmation alert; persistence is then verified by reloading and reading the
 * refreshed displayName from Firebase Auth.
 */
import { test, expect } from '../setup/test';

test.describe('mypage — nickname edit', () => {
  test('editing the nickname saves and persists across a reload', async ({ page }) => {
    const newNick = `냥집사${Date.now() % 100000}`;

    let alertText = '';
    page.on('dialog', (d) => {
      alertText = d.message();
      void d.accept();
    });

    await page.goto('/mypage');
    await expect(page.getByRole('heading', { name: '프로필' })).toBeVisible();

    await page.getByRole('button', { name: '수정' }).click();
    await page.getByRole('textbox').first().fill(newNick);
    await page.getByRole('button', { name: '저장' }).click();

    // Success alert + edit mode closes.
    await expect.poll(() => alertText).toContain('닉네임을 변경했어요');
    await expect(page.getByRole('button', { name: '수정' })).toBeVisible();

    // Persisted: a reload rehydrates the user from Auth with the new displayName.
    await page.reload();
    await expect(page.getByText(newNick).first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('mypage — mobile layout', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('renders the profile card without horizontal overflow', async ({ page }) => {
    await page.goto('/mypage');
    await expect(page.getByRole('heading', { name: '내 집사 정보' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '프로필' })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflow).toBe(false);
  });
});

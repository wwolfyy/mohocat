/**
 * Phase 4 — mypage nickname edit + mobile layout (main plan §8 Phase 4, bullet 2).
 * Runs in the `member` project (butler-ground storageState).
 *
 * Nickname edit: the AuthProvider deliberately does NOT `setUser` after
 * `updateProfile` (it relies on a reload), so the success signal is the
 * confirmation alert; persistence is then verified by reloading and reading the
 * refreshed displayName from Firebase Auth.
 */
import path from 'node:path';
import { test, expect } from '../setup/test';

const ADMIN_STATE = path.resolve(__dirname, '..', '.auth', 'admin.json');

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

/**
 * The 관리자 shortcut is gated on the same `isAdmin(user, mountainId)` check the
 * CMS gate itself runs, so the two must agree: a butler-ground member is denied
 * at `/admin` (admin-auth-gate.spec.ts) and must not be offered the link here.
 */
test.describe('mypage — 관리자 shortcut', () => {
  test('is hidden from a butler-ground member', async ({ page }) => {
    await page.goto('/mypage');
    // Anchor on a section that always renders, so this can't pass on an
    // unloaded page.
    await expect(page.getByRole('heading', { name: '연결된 계정' })).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByRole('heading', { name: '관리자' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: '관리자 페이지로 가기' })).toHaveCount(0);
  });

  test.describe('admin', () => {
    test.use({ storageState: ADMIN_STATE });

    test('is offered to an admin and leads into the CMS', async ({ page }) => {
      await page.goto('/mypage');

      const link = page.getByRole('link', { name: '관리자 페이지로 가기' });
      await expect(link).toBeVisible({ timeout: 15_000 });
      await expect(link).toHaveAttribute('href', '/admin');

      await link.click();
      await expect(page.getByText(/환영해요/)).toBeVisible({ timeout: 15_000 });
    });
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

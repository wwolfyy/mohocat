/**
 * Phase 4 — 탈퇴 (account withdrawal) end-to-end (main plan §8 Phase 4, bullet 3).
 *
 * Uses a THROWAWAY user (signed up in-test) so it never deletes the shared seeded
 * member. Overrides the member project's storageState to an anonymous context, so
 * the signup flow starts clean. Exercises POST /api/account/delete (Admin SDK
 * hard-delete of the Auth account + users/{uid} doc) followed by the mypage
 * logout-redirect.
 */
import { test, expect } from '../setup/test';
import { freshSignupIds, signUpNewUser } from '../setup/auth-helpers';

// Start signed-out despite being in the `member` project.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('account withdrawal (탈퇴)', () => {
  test('a throwaway user withdraws and is signed out to the landing page', async ({ page }) => {
    const { email, phone } = freshSignupIds('withdraw');
    await signUpNewUser(page, { nickname: '탈퇴테스트', email, phone });

    // Signup success redirects to '/' (no ?redirect on the signup URL).
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe('/');

    await page.goto('/mypage');
    await page.getByRole('button', { name: '회원 탈퇴' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '탈퇴하기' }).click();

    // Delete succeeds → signOut → mypage redirects a once-authed session to '/'.
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe('/');
    await expect(page.getByRole('link', { name: '로그인/등록' })).toBeVisible({ timeout: 15_000 });
  });
});

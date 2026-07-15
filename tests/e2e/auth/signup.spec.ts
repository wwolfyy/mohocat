/**
 * Phase 3 — 집사등록 (signup) with PIPA consent gating (main plan §8 Phase 3,
 * bullet 1). Two cases:
 *   - consent gating: the "계속하기" submit stays disabled until both required
 *     consent boxes are checked;
 *   - full happy path: details + consent → phone-OTP verify → success screen.
 *
 * The happy path creates a brand-new user (unique email + phone, never in the
 * seed) so it can't collide with seeded accounts or run in the wrong session.
 */
import { test, expect } from '../setup/test';
import { freshSignupIds, signUpNewUser } from '../setup/auth-helpers';

test.describe('signup', () => {
  test('the continue button is gated on both consent checkboxes', async ({ page }) => {
    await page.goto('/login?tab=signup');

    await page.getByPlaceholder('어떻게 불러 드릴까요?').fill('테스트가입');
    await page.getByPlaceholder('name@example.com').fill('gate@test.local');
    const [pw, confirm] = await page.locator('input[type="password"]').all();
    await pw.fill('Passw0rd!');
    await confirm.fill('Passw0rd!');
    await page.getByPlaceholder('+82 10-1234-5678').fill('+821099887766');

    const submit = page.getByRole('button', { name: '전화번호 인증하고 계속하기' });
    await expect(submit).toBeDisabled();

    const consents = page.getByRole('checkbox');
    await consents.nth(0).check();
    await expect(submit).toBeDisabled(); // one of two — still gated
    await consents.nth(1).check();
    await expect(submit).toBeEnabled();
  });

  test('completes signup end-to-end via phone-OTP', async ({ page }) => {
    const { email, phone } = freshSignupIds();
    await signUpNewUser(page, { nickname: '가입테스트', email, phone });

    // Success screen confirms the account was created (redirect follows after 2s).
    await expect(page.getByText('계정이 만들어졌어요!')).toBeVisible({ timeout: 20_000 });
  });
});

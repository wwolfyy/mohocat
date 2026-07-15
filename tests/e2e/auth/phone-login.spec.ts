/**
 * Phase 3 — phone-OTP login (main plan §8 Phase 3, bullet 2).
 *
 * Signs in the seeded phone user (+821012345678) through the login page's phone
 * section against the Auth emulator, fetching the SMS code from the emulator's
 * verification-codes endpoint (see setup/phone-otp.ts). The emulator disables real
 * reCAPTCHA, so the invisible verifier passes without a challenge.
 */
import { test, expect } from '../setup/test';
import { getLatestPhoneCode } from '../setup/phone-otp';
import { SEEDED } from '../setup/auth-helpers';

test.describe('phone-OTP login', () => {
  test('seeded phone user signs in and reaches the authenticated state', async ({ page }) => {
    await page.goto('/login');

    // Phone section: the only tel input on the page.
    await page.locator('input[type="tel"]').fill(SEEDED.phone.phoneNumber);
    await page.getByRole('button', { name: '인증번호 받기' }).click();

    // The code input appears once the confirmation is created (labels here aren't
    // htmlFor-associated, so key on the placeholder).
    const codeInput = page.getByPlaceholder('123456');
    await expect(codeInput).toBeVisible({ timeout: 15_000 });

    const code = await getLatestPhoneCode(SEEDED.phone.phoneNumber);
    await codeInput.fill(code);
    await page.getByRole('button', { name: '인증하고 로그인' }).click();

    // handleCheckUser('phone') finds the seeded users/{uid} doc → redirect off /login.
    await expect(page).toHaveURL(/\/$|\/\?/, { timeout: 20_000 });
    await expect(page.getByRole('button', { name: '로그아웃' })).toBeVisible({ timeout: 15_000 });
  });
});

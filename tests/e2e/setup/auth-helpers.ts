/**
 * Shared UI-login helpers for the anonymous `auth` project, whose specs start
 * signed-out and drive the real login page themselves (no storageState). Mirrors
 * the email-login steps proven in `global.setup.ts`.
 */
import { type Page, expect } from '@playwright/test';
import { getLatestPhoneCode } from './phone-otp';

/** Seeded users — must match tests/e2e/fixtures/users.json. */
export const SEEDED = {
  admin: { email: 'admin@test.local', password: 'Passw0rd!admin' },
  member: { email: 'member@test.local', password: 'Passw0rd!member', displayName: '테스트회원' },
  phone: { phoneNumber: '+821012345678' },
} as const;

/**
 * Sign in through the email/password section of `/login` and wait for the
 * post-login redirect off `/login`. Assumes the account is emailVerified (the
 * seed sets it) so no verification modal intercepts.
 */
export async function emailLogin(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: '이메일로 로그인' }).click();
  await expect(page).toHaveURL(/\/$|\/\?/, { timeout: 20_000 });
}

/** Unique, never-seeded signup identifiers derived from the clock. */
export function freshSignupIds(prefix = 'signup'): { email: string; phone: string } {
  const stamp = Date.now();
  return { email: `${prefix}-${stamp}@test.local`, phone: `+8210${String(stamp).slice(-8)}` };
}

/**
 * Drive the full 집사등록 (signup) flow through the phone-OTP verify step, leaving
 * the browser on the "계정이 만들어졌어요!" success screen (a redirect follows).
 * The emulator disables real reCAPTCHA and exposes the SMS code over REST.
 */
export async function signUpNewUser(
  page: Page,
  opts: { nickname: string; email: string; phone: string; password?: string }
): Promise<void> {
  const password = opts.password ?? 'Passw0rd!';

  await page.goto('/login?tab=signup');
  await page.getByPlaceholder('어떻게 불러 드릴까요?').fill(opts.nickname);
  await page.getByPlaceholder('name@example.com').fill(opts.email);
  const [pw, confirm] = await page.locator('input[type="password"]').all();
  await pw.fill(password);
  await confirm.fill(password);
  await page.getByPlaceholder('+82 10-1234-5678').fill(opts.phone);
  await page.getByRole('checkbox').nth(0).check();
  await page.getByRole('checkbox').nth(1).check();
  await page.getByRole('button', { name: '전화번호 인증하고 계속하기' }).click();

  const codeInput = page.getByPlaceholder('123456');
  await expect(codeInput).toBeVisible({ timeout: 15_000 });
  const code = await getLatestPhoneCode(opts.phone);
  await codeInput.fill(code);
  await page.getByRole('button', { name: '집사등록 완료' }).click();
}

/**
 * Phase 4 — 동참 (contact) submission as a signed-in member (main plan §8 Phase 4,
 * bullet 3). Runs in the `member` project.
 *
 * The form is members-only: with a session the 보내기 button enables, and the POST
 * /api/contact route records the contact via the Admin SDK. Email delivery is a
 * best-effort side-effect (SMTP is unset in test → the route still returns
 * success), so the observable outcome is the green success message.
 */
import { test, expect } from '../setup/test';

test.describe('동참 (contact) submit', () => {
  test('a logged-in member can submit the form', async ({ page }) => {
    await page.goto('/pages/contact');

    // Labels here are not htmlFor-associated — target the form controls by name.
    await page.locator('input[name="name"]').fill('테스트동참');
    await page.locator('input[name="phone"]').fill('01099998888');
    await page.locator('textarea[name="message"]').fill('고양이 돌보기에 동참하고 싶어요.');

    const submit = page.getByRole('button', { name: '보내기' });
    await expect(submit).toBeEnabled({ timeout: 15_000 });
    await submit.click();

    await expect(page.getByText('메시지가 전송되었습니다. 감사합니다!')).toBeVisible({
      timeout: 15_000,
    });
  });
});

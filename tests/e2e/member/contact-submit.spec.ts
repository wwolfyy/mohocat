/**
 * Phase 4 — 동참 (contact) submission as a signed-in member (main plan §8 Phase 4,
 * bullet 3). Runs in the `member` project.
 *
 * The form is members-only: with a session the 보내기 button enables, and the POST
 * /api/contact route records the contact via the Admin SDK. Email delivery is a
 * best-effort side-effect: SMTP is unset in test, so the route still returns
 * `success` — but now also `emailDelivered: false`, which the page renders.
 *
 * 🔑 **So this spec DOES observe the notification outcome now, where it used to be
 * blind to it.** It asserts the "recorded, but the notification did not send" copy,
 * because that is the truth in this environment — SMTP is deliberately unconfigured.
 * ⚠️ **The delivered branch has no automated cover and cannot get one here:** proving
 * it needs a real SMTP session, which the hermetic harness has no credentials for.
 * `npm run smtp:verify` is the check for that half.
 *
 * ⚠️ **A failed notification must never read as a failed submission.** The contact is
 * already in Firestore, and telling the visitor otherwise would invite a resubmit and
 * duplicate the record — so this asserts the non-error copy, not an error state.
 */
import { test, expect } from '../setup/test';

test.describe('동참 (contact) submit', () => {
  test('a logged-in member can submit the form', async ({ page }) => {
    await page.goto('/pages/contact');

    // 🔑 Wait for 보내기 to enable BEFORE typing, not after. `canSubmit` is
    // `isAuthenticated && !authLoading`, so an enabled button means auth has
    // resolved and the page has settled.
    //
    // 🐛 Typing first is what made this spec flaky, and the evidence was specific:
    // the failure snapshot showed 이름 **empty** while 전화번호 and 메시지 — filled
    // immediately after it — held their values. That is a React re-render wiping
    // component state between the first fill and the second, which is what the
    // page's hydration mismatch does: hydration fails, React discards the
    // server-rendered DOM and re-renders the root client-side, and anything typed
    // before that lands is lost.
    //
    // ⚠️ The underlying mismatch is a **product** issue, not a test one — a real
    // visitor typing quickly on a slow connection loses input the same way. It is
    // pre-existing and reproduces on admin pages too (the auth-dependent header
    // renders 로그인/등록 on the server and the signed-in user on the client).
    // Fixing it here only stops the test from racing it.
    const submit = page.getByRole('button', { name: '보내기' });
    await expect(submit).toBeEnabled({ timeout: 15_000 });

    // Labels here are not htmlFor-associated — target the form controls by name.
    await page.locator('input[name="name"]').fill('테스트동참');
    await page.locator('input[name="phone"]').fill('01099998888');
    await page.locator('textarea[name="message"]').fill('고양이 돌보기에 동참하고 싶어요.');
    // Re-assert the first field actually held, so a future regression of the
    // re-render fails here — naming the cause — rather than on the success message.
    await expect(page.locator('input[name="name"]')).toHaveValue('테스트동참');

    await submit.click();

    // SMTP is unset in the test env, so the route reports `emailDelivered: false` and
    // the page sets expectations about the reply rather than claiming the mail went out.
    await expect(
      page.getByText(
        '메시지가 접수되었습니다. 다만 알림 전달에 문제가 있어 답변이 늦어질 수 있어요.'
      )
    ).toBeVisible({ timeout: 15_000 });

    // 🔑 The submission still succeeded — assert the failure copy is NOT shown, so a
    // future change that turns a missing notification into a visible error fails here.
    await expect(page.getByText('죄송합니다. 다시 시도해 주세요.')).toHaveCount(0);
  });
});

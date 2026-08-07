/**
 * Butler-page access for a non-admin member. Runs in the `member` project
 * (butler-ground storageState).
 *
 * 🔄 **Rewritten 2026-08-02.** This spec used to assert the opposite — that a
 * butler-ground member met the same 접근 제한 screen an anonymous visitor sees,
 * because both boards gated on `isAdmin()`. Its own header named this rewrite
 * as the plan: _"If the gate is ever widened to butler roles, this spec is the
 * intended failure signal."_ It was, and it fired.
 *
 * The gates are now the `view-post-*` permissions the roles already carried —
 * the same ones the nav has always used to decide whether to show these links,
 * which is why a member could previously see a link into a page that refused
 * them.
 */
import { test, expect } from '../setup/test';

test.describe('butler pages admit a butler-ground member', () => {
  test('집사톡 renders its post list, not the access-restricted screen', async ({ page }) => {
    await page.goto('/pages/butler_talk');

    await expect(page.getByRole('heading', { name: '집사톡', exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('heading', { name: '접근 제한' })).toHaveCount(0);
    await expect(page.getByText('집사수다 1')).toBeVisible();
  });

  test('급식현황 renders for a ground butler', async ({ page }) => {
    await page.goto('/pages/butler_stream');

    await expect(page.getByRole('heading', { name: '급식현황', exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('heading', { name: '접근 제한' })).toHaveCount(0);
  });

  test('both boards offer 새글 작성 — viewing and posting are separate grants', async ({
    page,
  }) => {
    for (const path of ['/pages/butler_talk', '/pages/butler_stream']) {
      await page.goto(path);
      await expect(page.getByRole('button', { name: '새글 작성' })).toBeVisible({
        timeout: 15_000,
      });
    }
  });
});

/**
 * Phase 4 — butler-page access boundary (main plan §8 Phase 4, bullet 1).
 * Runs in the `member` project (butler-ground storageState).
 *
 * ⚠️ Reflects CURRENT source behavior, not the aspirational comment in the pages:
 * `butler_talk` / `butler_stream` gate on `isAdmin()` (which requires a `manage-*`
 * permission), so a butler-ground member is denied the same "접근 제한" screen an
 * anonymous visitor sees. The actual butler-page CONTENT (list/create, feeding
 * stream) is therefore exercised from the admin suite (Phase 5), not here. If the
 * gate is ever widened to butler roles, this spec is the intended failure signal.
 */
import { test, expect } from '../setup/test';

test.describe('butler pages deny a non-admin member', () => {
  for (const path of ['/pages/butler_talk', '/pages/butler_stream']) {
    test(`${path} shows the access-restricted screen`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: '접근 제한' })).toBeVisible({
        timeout: 15_000,
      });
    });
  }
});

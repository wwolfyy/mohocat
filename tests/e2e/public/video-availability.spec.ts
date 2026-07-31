/**
 * A video deleted from YouTube must leave the public 영상첩 (owner-reported
 * 2026-08-01).
 *
 * The bug: `syncVideos` only ever computes *YouTube minus Firestore* and imports
 * the difference, so nothing ever noticed a record whose video was gone. The
 * public album kept rendering a tile for it, filled with YouTube's grey
 * "unavailable" placeholder.
 *
 * ⚠️ **What this can and cannot cover.** The classification itself
 * (`POST /api/admin/video-availability`) asks YouTube with the owner's OAuth
 * credential, which the emulator harness does not have — the same limitation as
 * every other YouTube path here (P5.4 is manual for exactly this reason). So this
 * pins the half that is testable and is where the reported symptom lived: given a
 * record already labelled `missing`, the public album hides it. The CMS side is
 * in `tests/e2e/admin/video-cleanup.spec.ts`.
 *
 * Fixture: `test-vid-03` in `media.json`, `youtubeStatus: 'missing'`.
 */
import { test, expect } from '../setup/test';

const MISSING_TITLE = '삭제된 픽스처 영상 3';

test.describe('videos that no longer exist on YouTube', () => {
  test('the public 영상첩 does not show a deleted video', async ({ page }) => {
    await page.goto('/pages/video-album');

    // The watchable fixture is there…
    await expect(page.getByRole('img', { name: '픽스처 영상 1' })).toBeVisible();

    // …and the deleted one is not — this is the regression. Before the fix it
    // rendered a tile carrying YouTube's grey placeholder thumbnail.
    await expect(page.getByText(MISSING_TITLE)).toHaveCount(0);
    await expect(page.getByAltText(MISSING_TITLE)).toHaveCount(0);
  });
});

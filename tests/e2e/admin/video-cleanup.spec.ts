/**
 * The CMS side of the deleted-video cleanup (owner-reported 2026-08-01): a record
 * whose video is gone from YouTube is surfaced for **deliberate** removal, never
 * deleted by the sync itself.
 *
 * 🔑 **Why deletion is a human decision.** The channel listing the sync reads is
 * fetched with the public API key, in which a video made *private* is
 * indistinguishable from a deleted one. Pruning on absence would therefore
 * destroy the record — and the cat tags and 설명 it carries, which exist nowhere
 * else — the moment somebody flips a video to private. So the sync labels, the
 * operator decides. This spec pins the panel that decision is made in.
 *
 * Fixture: `test-vid-03` in `media.json`, `youtubeStatus: 'missing'`.
 */
import { test, expect } from '../setup/test';

const MISSING_TITLE = '삭제된 픽스처 영상 3';

test.describe('YouTube에 없는 영상 — cleanup panel', () => {
  test('lists the deleted video and offers to remove its record', async ({ page }) => {
    await page.goto('/admin/tag-videos');
    await expect(page.getByRole('heading', { name: '동영상 태깅' })).toBeVisible();

    // The panel names the count and the video.
    await expect(page.getByText('YouTube에 없는 영상 1개')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(MISSING_TITLE).first()).toBeVisible();

    // Removal is offered, never automatic.
    await expect(page.getByRole('button', { name: /기록 삭제/ })).toBeVisible();
  });
});

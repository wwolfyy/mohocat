/**
 * Phase 4 — member nav permissions (main plan §8 Phase 4; the signed-in mirror of
 * public/anonymous-gating.spec.ts). Runs in the `member` project (butler-ground:
 * view-photo / view-video / view-post-butler / view-post-feeding).
 *
 * Where an anonymous visitor sees 사진첩/동영상 as disabled spans and 집사메뉴 as a
 * disabled span, a butler-ground member sees the gallery items as real links and
 * 집사메뉴 as an openable dropdown button.
 */
import { test, expect } from '../setup/test';

test.describe('member nav permissions', () => {
  test('gallery items are links and 집사메뉴 is enabled', async ({ page }) => {
    await page.goto('/');

    // 🔑 Assert 집사메뉴 FIRST — it is the "permissions have resolved" signal, and
    // hovering before that is what made this spec flaky. `NavItem` computes
    // `isDisabled = isLoading || !hasAccess` and renders a disabled item as a
    // **span**, so during the resolve window 사진첩 is not a link at all; a hover
    // that lands in that window opens a dropdown of spans, and the re-render on
    // resolution drops the hover state. Waiting here removes the race rather than
    // widening a timeout around it.
    // (안 로그인 상태에서는 disabled span이므로 button 조회수가 0 — 그 대비 지점.)
    await expect(page.getByRole('button', { name: '집사메뉴' })).toBeVisible({ timeout: 15_000 });

    // 갤러리 dropdown → its items are now permission-granted links.
    await page.getByRole('button', { name: '갤러리' }).hover();
    await expect(page.getByRole('link', { name: '사진첩' })).toBeVisible();
    await expect(page.getByRole('link', { name: '동영상' })).toBeVisible();
  });
});

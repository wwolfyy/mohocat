/**
 * The public post surfaces must never claim there is no content while they are
 * still fetching it (owner-reported 2026-08-01).
 *
 * The bug: 공지사항's list, its detail page and the 입양홍보 feed each kept only the
 * fetched value, so "no posts" / "찾을 수 없습니다" doubled as the loading state —
 * server-rendered into the very first paint. On the affected Safari path Firestore
 * took 30 seconds to answer, so that false message is what a reader actually sat
 * looking at. See `log/DEBUG_LOG.md` 2026-08-01.
 *
 * 🔑 **Why the fetch is delayed rather than failed.** Firestore's SDK retries
 * network errors internally instead of rejecting, so aborting its requests
 * produces a hang, not an error — which is precisely why the original bug showed
 * up as "empty" and never as a console error. Delaying the response reproduces the
 * real-world condition exactly, and it is deterministic: the assertion runs inside
 * a window the test controls.
 */
import { test, expect } from '../setup/test';

/** Hold every Firestore round trip open for `ms`, so the loading window is ours. */
const delayFirestore = async (page: any, ms: number) => {
  await page.route('**/google.firestore.v1.Firestore/**', async (route: any) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    await route.continue();
  });
};

test.describe('post surfaces while still loading', () => {
  test('공지사항 목록 shows a loading state, not "등록된 공지사항이 없어요"', async ({ page }) => {
    await delayFirestore(page, 3000);
    await page.goto('/pages/announcements');

    // The regression: this text used to be the first paint of every visit.
    await expect(page.getByText('아직 등록된 공지사항이 없어요')).not.toBeVisible();
    await expect(page.getByText('불러오는 중이에요')).toBeAttached();

    // And once the fetch lands, the real content replaces it.
    await expect(page.getByText('아직 등록된 공지사항이 없어요')).not.toBeVisible({
      timeout: 15000,
    });
  });

  test('공지사항 상세 does not claim the post is missing while fetching', async ({ page }) => {
    await delayFirestore(page, 3000);
    // Any id will do — the point is what renders *before* the answer arrives.
    await page.goto('/pages/announcements/seed-announcement-01');

    await expect(page.getByText('공지사항을 찾을 수 없습니다')).not.toBeVisible();
    await expect(page.getByText('불러오는 중이에요')).toBeAttached();
  });

  test('입양홍보 소식 shows a loading state, not "등록된 입양홍보 소식이 없어요"', async ({
    page,
  }) => {
    await delayFirestore(page, 3000);
    await page.goto('/pages/adoption');

    await expect(page.getByText('아직 등록된 입양홍보 소식이 없어요')).not.toBeVisible();
    await expect(page.getByText('불러오는 중이에요')).toBeAttached();
  });
});

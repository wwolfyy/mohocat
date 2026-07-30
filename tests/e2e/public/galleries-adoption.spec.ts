/**
 * Cat browser (냥이들) + adoption gallery (입양홍보) — main plan §5.1.
 *
 * 냥이들 (`/pages/cats`): server-baked cat list rendered as a searchable table
 * (desktop) / card grid (mobile); row/card → CatInfo modal.
 * 입양홍보 (`/pages/adoption`): only `adoptable` cats appear in the circular
 * gallery; the "새로운 입양 소식" feed is live-fetched (`posts_adoption`) with an
 * accordion + search (its "검색 결과가 없어요" is the reachable empty state — the
 * no-adoptables empty state needs a separate fixture and isn't covered here).
 */
import { test, expect } from '../setup/test';
import type { Page } from '@playwright/test';

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

// The cats page renders BOTH a desktop table (role=row) and a mobile card grid
// (role=button) into the DOM; click the one that matches the active viewport.
async function openCatDetail(page: Page, name: string) {
  const rx = new RegExp(name);
  if (isDesktop(page)) await page.getByRole('row', { name: rx }).click();
  else await page.getByRole('button', { name: rx }).click();
}

test.describe('냥이들 — cat browser', () => {
  test('renders seeded cats and opens a detail modal', async ({ page }) => {
    await page.goto('/pages/cats');
    await expect(page.getByRole('heading', { name: '냥이들', level: 1 })).toBeVisible();

    // Every seeded cat is listed. Both viewports render the name into the DOM
    // (one container is display:none), so scope to the visible one.
    for (const name of ['테스트냥이일', '입양이삼', '입양이사', '썸네일없는냥이']) {
      await expect(page.getByText(name).filter({ visible: true }).first()).toBeVisible();
    }

    await openCatDetail(page, '테스트냥이일');
    await expect(page.getByRole('heading', { name: '테스트냥이일' })).toBeVisible();
  });

  test('name search narrows the list', async ({ page }) => {
    await page.goto('/pages/cats');
    await page.getByPlaceholder('이름으로 검색').fill('입양이삼');

    await expect(page.getByText('입양이삼').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('테스트냥이일')).toHaveCount(0);
  });
});

test.describe('입양홍보 — adoption', () => {
  test('shows only adoptable cats; opens detail', async ({ page }) => {
    await page.goto('/pages/adoption');
    await expect(page.getByRole('heading', { name: '입양홍보', level: 1 })).toBeVisible();

    // Adoptable cats appear in the circular gallery; non-adoptable ones don't.
    await expect(page.getByRole('button', { name: '입양이삼' })).toBeVisible();
    await expect(page.getByRole('button', { name: '입양이사' })).toBeVisible();
    await expect(page.getByRole('button', { name: '테스트냥이일' })).toHaveCount(0);

    await page.getByRole('button', { name: '입양이삼' }).click();
    await expect(page.getByRole('heading', { name: '입양이삼' })).toBeVisible();
    // test-cat-03 carries adoption_info → the 입양정보 block renders.
    await expect(page.getByRole('heading', { name: '입양정보' })).toBeVisible();
  });

  test('소식 feed: accordion expands and search hits its empty state', async ({ page }) => {
    await page.goto('/pages/adoption');
    await expect(page.getByRole('heading', { name: '새로운 입양 소식' })).toBeVisible();

    // Live-fetched post appears; its accordion header expands on click.
    const postHeader = page.getByRole('button', { name: /입양 소식 1/ });
    await expect(postHeader).toBeVisible();
    await expect(postHeader).toHaveAttribute('aria-expanded', 'false');
    await postHeader.click();
    await expect(postHeader).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('입양 홍보 소식 본문이에요.')).toBeVisible();

    // A no-match search shows the feed's empty state.
    await page.getByPlaceholder('제목이나 내용으로 검색').fill('존재하지않는검색어zzz');
    await expect(page.getByText('검색 결과가 없어요.')).toBeVisible();
  });

  /**
   * 🐛 **Regression net for the 2026-07-31 bug (owner-reported).** Expanding a post
   * rendered ONE 80×20 thumbnail, chosen as `video ? youtubeThumb : image` — so a
   * post carrying a video never showed its photos at all, and a post with several
   * images showed only the first. `test-adopt-02` carries two images *and* a video,
   * which is the combination that was broken; nothing in the fixture set had media
   * before, which is why no spec caught it.
   */
  test('소식 feed: an expanded post shows every image AND its video, not one or the other', async ({
    page,
  }) => {
    // Keep the YouTube embed off the network: the console watchdog fails a test on
    // any non-emulator resource error, and the fixture id is not a real video.
    await page.route('**://www.youtube.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '' })
    );

    await page.goto('/pages/adoption');

    const postHeader = page.getByRole('button', { name: /입양 소식 2/ });
    await expect(postHeader).toBeVisible();
    await postHeader.click();
    await expect(postHeader).toHaveAttribute('aria-expanded', 'true');

    // Both images — the old markup could only ever show one.
    await expect(page.getByAltText('입양홍보 이미지 1')).toBeVisible();
    await expect(page.getByAltText('입양홍보 이미지 2')).toBeVisible();

    // …and the video, embedded rather than replacing the images.
    await expect(page.locator('iframe[title="입양홍보 동영상 1"]')).toBeVisible();

    /**
     * Cat tags under each item (2026-07-31). A post stores only URLs, so these are
     * resolved live from the `cat_images` / `cat_videos` records — which is what
     * makes them correct for posts created before the feature existed, and what
     * keeps them in step when someone retags in /admin/tag-images.
     *
     * The fixtures give each medium a *different* tag on purpose, so a lookup that
     * returned the same answer for everything could not pass: album-01 →
     * test-cat-01, album-02 → test-cat-03, yt-vid-01 → test-cat-01.
     */
    await expect(page.getByText('태그: test-cat-01', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('태그: test-cat-03', { exact: false })).toBeVisible();
    // One line per tagged medium: two images + one video, and album-01's tag is
    // shared with the video.
    await expect(page.getByText(/^태그: /)).toHaveCount(3);

    // Folding hides the media again.
    await postHeader.click();
    await expect(page.getByAltText('입양홍보 이미지 1')).toHaveCount(0);
    await expect(page.getByText(/^태그: /)).toHaveCount(0);
  });
});

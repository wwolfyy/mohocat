/**
 * P0 characterization net — 동영상 태깅 (/admin/tag-videos), complexity-retirement
 * assessment §7 P0 / §8 P0.2. Pins the editor's automatable surface against the
 * CURRENT (unrefactored) code as the P4–P5 recomposition baseline.
 *
 * YouTube-dependent surfaces are OUT of this net by necessity (assessment
 * P5.4): single-item save, batch tag/date save, sync, and playlist writes all
 * orchestrate the real YouTube Data API (/api/update-youtube-video etc.) —
 * their parity check is the scripted manual pass with real creds. What IS
 * automatable and pinned here: load + stats, selecting a video populates the
 * YouTube edit form, cat tagging into the tags field via the selector (local
 * state), 제목에서 날짜 인식 (local), and bulk 자동 날짜 인식 — which since
 * 2026-07-26 writes to YouTube like every other save (it used to write Firestore
 * directly, and those dates did not survive the next sync), so its test stubs the
 * two YouTube routes and asserts the page makes NO direct Firestore write.
 *
 * Also pinned: the page mounts cleanly when /api/manage-playlists fails (no
 * YouTube creds in the emulator env — playlists are optional; the console
 * watchdog allow-lists exactly that failure family in setup/test.ts).
 *
 * Fixture contract (media.json): test-vid-01 (no title → the grid falls back to
 * its description '픽스처 영상 1'; unparseable) + test-vid-02 (title
 * '픽스처 영상 2 2024-03-16' → per-video title parse; description
 * '픽스처 영상 둘 20240315' → bulk parse, which reads description||id — the two
 * dates differ on purpose so each surface pins its own source).
 *
 * Serial + commit-path-only cat-selection assertions, same rationale as
 * tag-images.spec.ts.
 */
import { test, expect } from '../setup/test';
import type { Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const VID2_TITLE = '픽스처 영상 2 2024-03-16';

// A grid card, keyed by the thumbnail alt (= video.title || video.id).
const card = (page: Page, alt: string) =>
  page.locator('div.border-2').filter({ has: page.getByAltText(alt) });

const editPanel = (page: Page) => page.locator('div.sticky');

const catSelector = (page: Page) =>
  page.locator('div.fixed').filter({ has: page.getByRole('heading', { name: /고양이 선택/ }) });

// The shared useDialog modal (P6.1): alert mode titles itself 알림, confirm 확인.
const appDialog = (page: Page) => page.getByRole('dialog', { name: /^(알림|확인)$/ });

// Wait for an alert dialog containing `text`, then dismiss it with 확인.
async function acceptAlert(page: Page, text: string | RegExp, timeout = 15_000) {
  await expect(appDialog(page).getByText(text)).toBeVisible({ timeout });
  await appDialog(page).getByRole('button', { name: '확인' }).click();
  await expect(appDialog(page)).toHaveCount(0);
}

test.describe('동영상 태깅 — characterization', () => {
  test('loads the grid with stats and both seeded videos despite the playlists 500', async ({
    page,
  }) => {
    await page.goto('/admin/tag-videos');
    await expect(page.getByRole('heading', { name: '동영상 태깅' })).toBeVisible();

    // 3, not 2, since 2026-08-01: the CMS loads with `includeUnavailable`, so it
    // also counts test-vid-03 (youtubeStatus 'missing'), which the public 영상첩
    // hides. That is the point — this page is where such a record gets removed.
    await expect(
      page
        .locator('div.bg-white')
        .filter({ hasText: '전체 동영상' })
        .getByText('3', { exact: true })
    ).toBeVisible({ timeout: 15_000 });

    // Card titles: test-vid-01 has no title → description fallback.
    await expect(page.getByRole('heading', { name: '픽스처 영상 1' })).toBeVisible();
    await expect(page.getByRole('heading', { name: VID2_TITLE })).toBeVisible();

    // Both are YouTube-type (badge + youtu.be id line on the card).
    await expect(card(page, VID2_TITLE).getByText('YouTube')).toBeVisible();
    await expect(card(page, VID2_TITLE).getByText('youtu.be/yt-vid-02')).toBeVisible();

    await expect(
      editPanel(page).getByText('동영상을 선택하면 메타데이터를 편집할 수 있어요.')
    ).toBeVisible();
  });

  test('selecting a YouTube video populates the edit form', async ({ page }) => {
    await page.goto('/admin/tag-videos');

    await card(page, VID2_TITLE).getByRole('img').click();

    await expect(editPanel(page).getByPlaceholder('동영상 제목...')).toHaveValue(VID2_TITLE);
    await expect(
      editPanel(page).getByPlaceholder('클릭해서 고양이를 선택하거나 직접 입력해요...')
    ).toHaveValue('');
    await expect(editPanel(page).locator('input[type="date"]')).toHaveValue('');
    await expect(editPanel(page).getByText('YouTube에서 보기 →')).toBeVisible();
    await expect(editPanel(page).getByRole('button', { name: '변경사항 저장' })).toBeVisible();

    // Playlists couldn't load (no creds) → the section renders its empty state.
    // (heading, not getByText — a '📋 재생목록 관리' button sits in the same panel)
    await expect(editPanel(page).getByRole('heading', { name: '재생목록 관리' })).toBeVisible();
    await expect(editPanel(page).getByText('어떤 재생목록에도 없어요')).toBeVisible();
  });

  test('cat tagging via the selector fills the YouTube tags field (no save)', async ({ page }) => {
    await page.goto('/admin/tag-videos');
    await card(page, VID2_TITLE).getByRole('img').click();

    await editPanel(page).getByRole('button', { name: '🐱 선택' }).click();
    await expect(
      page.getByRole('heading', { name: '고양이 선택 (YouTube 태그 - 개별)' })
    ).toBeVisible();
    // 테스트냥이이 is never mutated by another spec (cats.spec.ts used to rename
    // 테스트냥이일 mid-run; it now only touches 이사한냥이).
    await catSelector(page).getByText('테스트냥이이').click();
    await catSelector(page).getByRole('button', { name: /완료/ }).click();
    await expect(catSelector(page)).toHaveCount(0);

    await expect(
      editPanel(page).getByPlaceholder('클릭해서 고양이를 선택하거나 직접 입력해요...')
    ).toHaveValue('테스트냥이이');
    // Deliberately NOT saved — the save path is YouTube orchestration (manual net).
  });

  test('제목에서 날짜 인식 fills the date field from the video title (no save)', async ({
    page,
  }) => {
    await page.goto('/admin/tag-videos');
    await card(page, VID2_TITLE).getByRole('img').click();

    await editPanel(page)
      .getByRole('button', { name: /제목에서 날짜 인식/ })
      .click();

    await acceptAlert(page, /제목에서 날짜를 인식했어요: 2024-03-16/);
    await expect(editPanel(page).locator('input[type="date"]')).toHaveValue('2024-03-16');
  });

  test('자동 날짜 인식 pushes the parsed date to YouTube and never writes Firestore directly', async ({
    page,
  }) => {
    // Video data is YouTube-owned: writing a parsed date straight to Firestore does not
    // survive, because refresh-video-metadata re-reads YouTube and nulls createdTime when
    // YouTube has none (DEBUG_LOG 2026-07-26). The YouTube calls are stubbed because the
    // emulator has no credentials — stubbing is also what makes the Firestore assertion
    // below meaningful: with the refresh faked, the only way the card could gain a date is
    // a direct write, which is exactly what must never happen.
    const youtubeUpdates: Array<{ videoId: string; updates: Record<string, string> }> = [];
    await page.route('**/api/update-youtube-video', async (route) => {
      youtubeUpdates.push(route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    const refreshCalls: Array<{ videoIds: string[] }> = [];
    await page.route('**/api/refresh-video-metadata', async (route) => {
      refreshCalls.push(route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ updated: 1 }),
      });
    });

    await page.goto('/admin/tag-videos');
    await expect(card(page, VID2_TITLE)).toBeVisible();

    // Bulk parse reads description||id: only test-vid-02 ('… 20240315') matches.
    await page.getByRole('button', { name: /자동 날짜 인식/ }).click();
    await expect(appDialog(page)).toBeVisible({ timeout: 15_000 });
    await appDialog(page).getByRole('button', { name: '확인' }).click(); // confirm the run

    await expect(appDialog(page).getByText(/자동 날짜 인식 완료/)).toBeVisible({
      timeout: 30_000,
    });
    await appDialog(page).getByRole('button', { name: '확인' }).click();

    // The parsed date went to YouTube, for that video only.
    expect(youtubeUpdates).toHaveLength(1);
    expect(youtubeUpdates[0].videoId).toBe('yt-vid-02');
    // UTC midnight of the calendar date, not the local-midnight Date the parser returns —
    // .toISOString() on that would send 2024-03-14T15:00Z in KST and shift the day back.
    expect(youtubeUpdates[0].updates.createdTime).toBe('2024-03-15T00:00:00.000Z');

    // …and was then synced back from YouTube, rather than written here.
    expect(refreshCalls).toHaveLength(1);
    expect(refreshCalls[0].videoIds).toEqual(['yt-vid-02']);

    // Firestore is untouched (the sync was stubbed), so both cards stay dateless. A
    // direct service-layer write would show a real 촬영: date here.
    await expect(card(page, VID2_TITLE).getByText('촬영: 없음')).toBeVisible();
    await expect(card(page, 'test-vid-01').getByText('촬영: 없음')).toBeVisible();
  });

  test('일괄 태그 저장 syncs Firestore with the YouTube ids, not the Firestore doc ids', async ({
    page,
  }) => {
    // Regression guard: the batch mutations keyed their results by the Firestore doc id from
    // the selection, then handed those to /api/refresh-video-metadata — which looks videos up
    // on YouTube and finds each doc by `where('youtubeId','==',id)`. It 404'd and did nothing,
    // so batch edits reached YouTube but never came back to Firestore, and the completion
    // dialog still said 완료 because the failure was swallowed. The fixtures now give each
    // video a youtubeId that differs from its doc id (as production always does) — with the
    // two equal, this bug is invisible.
    const youtubeUpdates: Array<{ videoId: string }> = [];
    await page.route('**/api/update-youtube-video', async (route) => {
      youtubeUpdates.push(route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    const refreshCalls: Array<{ videoIds: string[] }> = [];
    await page.route('**/api/refresh-video-metadata', async (route) => {
      refreshCalls.push(route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ updated: 1 }),
      });
    });

    await page.goto('/admin/tag-videos');
    await expect(card(page, VID2_TITLE)).toBeVisible();

    await card(page, VID2_TITLE).locator('input[type="checkbox"]').check();

    // Batch panel → set a tag via the cat selector, then save.
    await page.getByPlaceholder('클릭해서 고양이 선택...').click();
    await catSelector(page).getByText('테스트냥이이').click();
    await catSelector(page).getByRole('button', { name: /완료/ }).click();
    await expect(catSelector(page)).toHaveCount(0);

    await page.getByRole('button', { name: '태그 저장' }).click();

    await expect(appDialog(page).getByText(/태그 업데이트를 완료했어요/)).toBeVisible({
      timeout: 30_000,
    });
    // No sync warning: the refresh was accepted.
    await expect(appDialog(page).getByText(/동기화에 실패했어요/)).toHaveCount(0);
    await appDialog(page).getByRole('button', { name: '확인' }).click();

    // Both calls must carry the YouTube id. Before the fix the refresh got 'test-vid-02'.
    expect(youtubeUpdates.map((u) => u.videoId)).toEqual(['yt-vid-02']);
    expect(refreshCalls).toHaveLength(1);
    expect(refreshCalls[0].videoIds).toEqual(['yt-vid-02']);
  });

  test('재생목록 일괄 변경 applies to every selected video, not just the one open in the form', async ({
    page,
  }) => {
    // Regression guard: until 2026-07-26 the modal's save always acted on the video open
    // in the edit form, so the batch entry point silently updated one video — or none.
    // Both playlist routes are stubbed (the emulator has no YouTube credentials, and the
    // real GET 500s), which also lets the assertions read the exact per-video calls.
    const playlistPosts: Array<{ videoId: string; playlistIds: string[] }> = [];
    await page.route('**/api/manage-playlists**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            playlists: [
              { id: 'PL-one', title: '재생목록 하나', description: '', itemCount: 0 },
              { id: 'PL-two', title: '재생목록 둘', description: '', itemCount: 0 },
            ],
          }),
        });
        return;
      }

      playlistPosts.push(route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          results: [],
          summary: { added: 1, removed: 0, failed: 0 },
        }),
      });
    });

    await page.route('**/api/refresh-video-metadata', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ updated: 2 }),
      });
    });

    await page.goto('/admin/tag-videos');
    await expect(card(page, VID2_TITLE)).toBeVisible();

    // Select both videos — and deliberately leave the edit form empty, which is what made
    // the old behavior a no-op rather than a wrong-video write.
    await card(page, VID2_TITLE).locator('input[type="checkbox"]').check();
    await card(page, 'test-vid-01').locator('input[type="checkbox"]').check();

    await page.getByRole('button', { name: /재생목록 선택/ }).click();

    const playlistModal = page
      .locator('div.fixed')
      .filter({ has: page.getByRole('heading', { name: /재생목록 선택/ }) });
    await expect(playlistModal).toBeVisible();

    await playlistModal.getByText('재생목록 하나').click();
    await playlistModal.getByRole('button', { name: /변경사항 저장/ }).click();

    // Destructive (unticked playlists are removed), so it confirms first.
    await expect(appDialog(page).getByText(/재생목록 일괄 변경/)).toBeVisible({ timeout: 15_000 });
    await appDialog(page).getByRole('button', { name: '확인' }).click();

    await expect(appDialog(page).getByText(/재생목록 일괄 변경을 완료했어요/)).toBeVisible({
      timeout: 30_000,
    });
    await appDialog(page).getByRole('button', { name: '확인' }).click();

    // One call per selected video, each carrying the ticked playlist set.
    expect(playlistPosts).toHaveLength(2);
    expect(playlistPosts.map((p) => p.videoId).sort()).toEqual(['yt-vid-01', 'yt-vid-02']);
    expect(playlistPosts.every((p) => p.playlistIds.length === 1)).toBe(true);
    expect(playlistPosts.every((p) => p.playlistIds[0] === 'PL-one')).toBe(true);
  });
});

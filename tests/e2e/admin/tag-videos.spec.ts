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
 * state), 제목에서 날짜 인식 (local), and bulk 자동 날짜 인식 — the one
 * Firestore-only write path (videoService.updateVideo).
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

function captureDialogs(page: Page): string[] {
  const messages: string[] = [];
  page.on('dialog', (d) => {
    messages.push(d.message());
    void d.accept();
  });
  return messages;
}

test.describe('동영상 태깅 — characterization', () => {
  test('loads the grid with stats and both seeded videos despite the playlists 500', async ({
    page,
  }) => {
    await page.goto('/admin/tag-videos');
    await expect(page.getByRole('heading', { name: '동영상 태깅' })).toBeVisible();

    await expect(
      page
        .locator('div.bg-white')
        .filter({ hasText: '전체 동영상' })
        .getByText('2', { exact: true })
    ).toBeVisible({ timeout: 15_000 });

    // Card titles: test-vid-01 has no title → description fallback.
    await expect(page.getByRole('heading', { name: '픽스처 영상 1' })).toBeVisible();
    await expect(page.getByRole('heading', { name: VID2_TITLE })).toBeVisible();

    // Both are YouTube-type (badge + youtu.be id line on the card).
    await expect(card(page, VID2_TITLE).getByText('YouTube')).toBeVisible();
    await expect(card(page, VID2_TITLE).getByText('youtu.be/test-vid-02')).toBeVisible();

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
    // 테스트냥이이, not 테스트냥이일 — cats.spec.ts renames the latter mid-run.
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
    const dialogs = captureDialogs(page);
    await page.goto('/admin/tag-videos');
    await card(page, VID2_TITLE).getByRole('img').click();

    await editPanel(page)
      .getByRole('button', { name: /제목에서 날짜 인식/ })
      .click();

    await expect.poll(() => dialogs.join('\n')).toContain('제목에서 날짜를 인식했어요: 2024-03-16');
    await expect(editPanel(page).locator('input[type="date"]')).toHaveValue('2024-03-16');
  });

  test('자동 날짜 인식 writes parsed 촬영일 to Firestore via the service layer', async ({
    page,
  }) => {
    const dialogs = captureDialogs(page);
    await page.goto('/admin/tag-videos');
    await expect(card(page, VID2_TITLE)).toBeVisible();

    // Bulk parse reads description||id: only test-vid-02 ('… 20240315') matches.
    await page.getByRole('button', { name: /자동 날짜 인식/ }).click();

    await expect
      .poll(() => dialogs.join('\n'), { timeout: 30_000 })
      .toMatch(/자동 날짜 인식 완료|날짜 인식이 필요한 동영상이 없어요/);

    // test-vid-02 now carries a real 촬영: date; test-vid-01 stays 촬영: 없음.
    await expect(card(page, VID2_TITLE).getByText('촬영: 없음')).toHaveCount(0);
    await expect(card(page, VID2_TITLE).getByText(/촬영:/)).toBeVisible();
    await expect(card(page, 'test-vid-01').getByText('촬영: 없음')).toBeVisible();
  });
});

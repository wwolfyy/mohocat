/**
 * P0 characterization net — 사진 태깅 (/admin/tag-images), complexity-retirement
 * assessment §7 P0 / §8 P0.2. Pins the editor's automatable behavior against the
 * CURRENT (unrefactored) code so the P4–P5 toolkit recomposition migrates against
 * a green baseline: load + stats, single-item edit (cat tag via the selector +
 * 촬영일) saved through the service layer, multi-select + batch-tag, and both
 * date-parse surfaces (per-image button, bulk 자동 날짜 인식).
 *
 * Fixture contract (media.json): 4 cat_images — album-01/02.jpg (tagged, no
 * createdTime, unparseable filenames) + test-img-03/04 (untagged, no createdTime,
 * date-pattern filenames "20240315_143045.jpg" / "2024-03-16 09.30.00.jpg" — the
 * auto-parse targets).
 *
 * Conventions/notes:
 * - Serial: the tests mutate shared seeded state (tags, createdTime) and are
 *   ordered so re-runs stay green (batch-tag is a union → idempotent; bulk parse
 *   tolerates the "nothing left to parse" alert on retry).
 * - Cat-selection is asserted through the 완료(commit) path only, which holds
 *   under BOTH today's live-toggle selector and the P4 CatSelectorModal
 *   commit-on-done swap (the accepted intentional change) — P4 updates only what
 *   it intentionally changes.
 * - The editors fire alert()/confirm(); dialogs are auto-accepted and their
 *   messages asserted (P6.1 converts these to ui/Modal and updates the specs).
 */
import { test, expect } from '../setup/test';
import type { Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

// A grid card, keyed by the image's alt (= fileName). Cards are the only
// div.border-2 elements on the page (the edit panel/batch panel use border-1).
const card = (page: Page, fileName: string) =>
  page.locator('div.border-2').filter({ has: page.getByAltText(fileName) });

// The sticky right-hand edit panel.
const editPanel = (page: Page) => page.locator('div.sticky');

// The hand-rolled cat-selector overlay (keyed on its heading).
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

test.describe('사진 태깅 — characterization', () => {
  test('loads the grid with stats, filters, and all seeded images', async ({ page }) => {
    await page.goto('/admin/tag-images');
    await expect(page.getByRole('heading', { name: '사진 태깅' })).toBeVisible();

    // Stat cards. ⚠️ **Not an exact total any more.** This asserted exactly `4` on the
    // premise that "nothing creates/deletes" images — false since 2026-07-30, when
    // 공지사항 / 입양홍보 moved onto the signed-URL strategy and began writing their own
    // `cat_images` records. Those create specs can run in a parallel worker against the
    // same emulator, so the total is ">= the 4 seeded". The per-filename card
    // assertions below are what actually pin the seed, and they still do.
    const totalTile = page.locator('div.bg-white').filter({ hasText: '전체 사진' });
    await expect(totalTile).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => Number((await totalTile.innerText()).match(/\d+/)?.[0] ?? 0), {
        timeout: 15_000,
      })
      .toBeGreaterThanOrEqual(4);
    await expect(page.getByRole('heading', { name: '태그 없는 사진' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '태그된 사진' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '사진 필터' })).toBeVisible();

    for (const fileName of [
      'album-01.jpg',
      'album-02.jpg',
      '20240315_143045.jpg',
      '2024-03-16 09.30.00.jpg',
    ]) {
      await expect(card(page, fileName)).toBeVisible();
    }

    // No selection yet → the edit panel shows its empty prompt.
    await expect(
      editPanel(page).getByText('그리드에서 사진을 선택하면 태깅을 시작할 수 있어요.')
    ).toBeVisible();
  });

  test('single edit: cat tag via the selector + 촬영일, saved through the service', async ({
    page,
  }) => {
    await page.goto('/admin/tag-images');

    // Click the image (not the checkbox) to open it in the edit panel.
    await card(page, 'album-01.jpg').getByRole('img').click();
    // (heading, not getByText — the panel also echoes the filename as the Storage path)
    await expect(editPanel(page).getByRole('heading', { name: 'album-01.jpg' })).toBeVisible();

    // Tag a cat through the selector, committing with 완료. (테스트냥이이 is chosen
    // because it is never mutated; cats.spec.ts used to rename 테스트냥이일 mid-run,
    // and now only touches 이사한냥이 — see that spec's header.)
    await editPanel(page).getByText('🐱 고양이 선택').click();
    await expect(page.getByRole('heading', { name: '고양이 선택 (개별 사진)' })).toBeVisible();
    await catSelector(page).getByText('테스트냥이이').click();
    await catSelector(page).getByRole('button', { name: /완료/ }).click();
    await expect(catSelector(page)).toHaveCount(0);
    await expect(editPanel(page).getByText('테스트냥이이')).toBeVisible();

    // Set the 촬영일 and save.
    await editPanel(page).locator('input[type="date"]').fill('2026-02-01');
    await editPanel(page).getByRole('button', { name: '변경사항 저장' }).click();
    await acceptAlert(page, '사진 정보를 저장했어요!');

    // The grid card reflects the saved tag and now carries a 촬영: line.
    await expect(card(page, 'album-01.jpg').getByText('테스트냥이이')).toBeVisible();
    await expect(card(page, 'album-01.jpg').getByText(/촬영:/)).toBeVisible();
  });

  test('multi-select + batch-tag adds a cat tag to every selected image', async ({ page }) => {
    await page.goto('/admin/tag-images');

    await card(page, '20240315_143045.jpg').getByRole('checkbox').check();
    await card(page, '2024-03-16 09.30.00.jpg').getByRole('checkbox').check();
    await expect(page.getByRole('heading', { name: /일괄 작업 \(2개 선택됨\)/ })).toBeVisible();

    // Pick the batch tag through the selector (batch context), commit with 완료.
    await page.getByPlaceholder('클릭해서 고양이 선택...').click();
    await expect(page.getByRole('heading', { name: '고양이 선택 (일괄 태깅)' })).toBeVisible();
    await catSelector(page).getByText('입양이삼').click();
    await catSelector(page).getByRole('button', { name: /완료/ }).click();
    await expect(page.getByPlaceholder('클릭해서 고양이 선택...')).toHaveValue('입양이삼');

    await page.getByRole('button', { name: '태그 저장' }).click();
    await acceptAlert(page, '2개 사진의 태그를 업데이트했어요!');

    // Batch tags ADD to existing tags; both cards now show the tag + 태그됨 badge.
    for (const fileName of ['20240315_143045.jpg', '2024-03-16 09.30.00.jpg']) {
      await expect(card(page, fileName).getByText('입양이삼')).toBeVisible();
      await expect(card(page, fileName).getByText('태그됨')).toBeVisible();
    }
    // 태그 저장 keeps the selection (only batchUpdateImages clears it): the panel
    // stays open and just the tags input resets — current behavior, pinned.
    await expect(page.getByRole('heading', { name: /일괄 작업 \(2개 선택됨\)/ })).toBeVisible();
    await expect(page.getByPlaceholder('클릭해서 고양이 선택...')).toHaveValue('');
  });

  test('per-image 파일명에서 날짜 인식 fills the date field without saving', async ({ page }) => {
    await page.goto('/admin/tag-images');

    await card(page, '20240315_143045.jpg').getByRole('img').click();
    await editPanel(page)
      .getByRole('button', { name: /파일명에서 날짜 인식/ })
      .click();

    // 14:30 local (KST locally / UTC in CI) stays on the same calendar day.
    await acceptAlert(page, /날짜를 인식했어요: 2024-03-15/);
    await expect(editPanel(page).locator('input[type="date"]')).toHaveValue('2024-03-15');
    // Local-only: nothing is saved here (the save path is covered above).
  });

  test('자동 날짜 인식 parses filename dates into 촬영일 for the images that need it', async ({
    page,
  }) => {
    await page.goto('/admin/tag-images');
    await expect(card(page, '20240315_143045.jpg')).toBeVisible();

    await page.getByRole('button', { name: /자동 날짜 인식/ }).click();

    // First run: confirm dialog → per-image service updates → result report. On a
    // serial retry the images already carry dates → the "nothing to parse" alert.
    await expect(appDialog(page)).toBeVisible({ timeout: 15_000 });
    if (await appDialog(page).getByText('날짜 인식이 필요한 사진이 없어요').isVisible()) {
      await appDialog(page).getByRole('button', { name: '확인' }).click();
    } else {
      await appDialog(page).getByRole('button', { name: '확인' }).click(); // confirm the run
      await expect(appDialog(page).getByText(/자동 날짜 인식 완료/)).toBeVisible({
        timeout: 30_000,
      });
      await appDialog(page).getByRole('button', { name: '확인' }).click();
    }

    // Both date-named images end up with a 촬영: line either way.
    await expect(card(page, '20240315_143045.jpg').getByText(/촬영:/)).toBeVisible();
    await expect(card(page, '2024-03-16 09.30.00.jpg').getByText(/촬영:/)).toBeVisible();
  });
});

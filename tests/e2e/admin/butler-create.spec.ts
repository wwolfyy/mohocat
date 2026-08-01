/**
 * P0-net extension (complexity-retirement P3.0) — Family A create flows:
 * 집사게시판 (butler_stream / NewPostForm) + 집사톡 (butler_talk /
 * NewButlerTalkForm), driven as an admin (the pages gate on isAdmin()).
 *
 * Scope note: these are TEXT-ONLY creates. 집사톡's media paths are excluded
 * from the automated net on purpose — video upload is YouTube (manual parity,
 * P3.4/P5.4), and the signed-URL image strategy builds a production
 * `firebasestorage.googleapis.com` public URL that would pollute the shared
 * emulator seed with an unloadable image (tripping other specs' console
 * watchdogs). The strategies themselves are unit-tested
 * (tests/unit/uploadStrategies.test.ts); the full media path is part of the
 * scripted manual pass.
 *
 * 집사게시판 has NO media path at all since 2026-07-27 (plan D1 — it is a 급식소
 * check-in log; 집사톡 is the media composer). The "no file inputs" assertion
 * below is the regression guard for that boundary: it is what fails if uploads
 * are ever reintroduced there.
 */
import { test, expect } from '../setup/test';
import type { Page } from '@playwright/test';

// The shared useDialog modal (alert mode titles itself 알림; P6.1).
const alertDialog = (page: Page) => page.getByRole('dialog', { name: '알림' });
// confirm mode titles itself 확인 and adds a 취소 button beside 확인.
const confirmDialog = (page: Page) => page.getByRole('dialog', { name: '확인' });

test.describe('집사게시판/집사톡 create flows (Family A)', () => {
  test('집사게시판: composes text only and publishes to the stream', async ({ page }) => {
    const title = `E2E 급식글 ${Date.now() % 100000}`;

    await page.goto('/pages/butler_stream/new');
    await expect(page.getByRole('heading', { name: '새글 작성' })).toBeVisible({
      timeout: 15_000,
    });
    // Post-only extras: the feeding-spots section renders.
    await expect(page.getByRole('heading', { name: '아래 급식소를 챙겼어요!' })).toBeVisible();

    // D1 boundary: no upload surface of any kind on this page.
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.getByPlaceholder('고양이를 선택하려면 클릭하세요')).toHaveCount(0);

    // The dynamic default title doubles as the placeholder.
    await page.getByPlaceholder(/급식소 챙기고 갑니다/).fill(title);
    await page.locator('textarea').fill('E2E 테스트로 작성한 급식 글입니다.');

    await page.getByRole('button', { name: '작성 완료' }).click();

    // Success dialog (shared ui/Modal since P6.1); redirect happens after 확인.
    await expect(alertDialog(page).getByText('Post created successfully!')).toBeVisible({
      timeout: 20_000,
    });
    await alertDialog(page).getByRole('button', { name: '확인' }).click();
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
      .toBe('/pages/butler_stream');
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
  });

  test('집사게시판: 취소 leaves immediately when nothing was typed', async ({ page }) => {
    await page.goto('/pages/butler_stream/new');
    await expect(page.getByRole('heading', { name: '새글 작성' })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: '취소' }).click();

    // Clean form → no confirmation, straight back to the stream.
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
      .toBe('/pages/butler_stream');
  });

  test('집사게시판: 취소 confirms before discarding typed content', async ({ page }) => {
    await page.goto('/pages/butler_stream/new');
    await expect(page.getByRole('heading', { name: '새글 작성' })).toBeVisible({
      timeout: 15_000,
    });

    await page.locator('textarea').fill('버리면 안 되는 내용');
    // The page's own 취소 button — anchored past the dialog's, which is not open yet.
    await page.getByRole('button', { name: '취소' }).click();

    // Dismissing the confirm keeps the user on the form with their text intact.
    await expect(confirmDialog(page)).toBeVisible();
    await confirmDialog(page).getByRole('button', { name: '취소' }).click();
    expect(new URL(page.url()).pathname).toBe('/pages/butler_stream/new');
    await expect(page.locator('textarea')).toHaveValue('버리면 안 되는 내용');

    // Confirming discards and navigates.
    await page.getByRole('button', { name: '취소' }).click();
    await expect(confirmDialog(page)).toBeVisible();
    await confirmDialog(page).getByRole('button', { name: '확인' }).click();
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
      .toBe('/pages/butler_stream');
  });

  /**
   * 집사톡 caps each media section at one file (PROJECT_PLAN §10d D2, 2026-08-02)
   * — `config/media_control.json` → `MediaItemList`'s `allowMultiple`.
   *
   * 🔑 **This asserts the cap, not the per-file sections.** Until 2026-08-02 this
   * test picked two videos here to pin the per-file 제목/설명/삭제 behaviour; that
   * became unreachable in 집사톡 once the cap shipped. No coverage was lost —
   * `admin/posts.spec.ts` ("공지사항: each picked video gets its own 제목/설명…")
   * pins exactly that on 공지사항, which stays **unrestricted** by decision and is
   * therefore the right place for it.
   *
   * ⚠️ The cap must be a *replace*, not a dead end: the assertion that 삭제 brings
   * the picker back is the part that fails if the file ever becomes unremovable.
   *
   * Picking a file is local state only — no credentials, no upload, no submit.
   */
  test('집사톡: each media section takes one file, and 삭제 frees it again', async ({ page }) => {
    await page.goto('/pages/butler_talk/new');
    await expect(page.getByRole('heading', { name: '새글 작성' })).toBeVisible({
      timeout: 15_000,
    });

    const videoPicker = () => page.locator('input[type="file"][accept="video/*"]');
    const imagePicker = () => page.locator('input[type="file"][accept="image/*"]');
    await expect(videoPicker()).toHaveCount(1);
    await expect(imagePicker()).toHaveCount(1);

    await videoPicker().setInputFiles({
      name: '첫번째.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('one'),
    });
    await expect(page.getByText('첫번째.mp4')).toBeVisible();

    // The trailing picker is gone, so there is no way to add a second video...
    await expect(videoPicker()).toHaveCount(0);
    // ...and the sections are independent: capping 동영상 leaves 사진 pickable.
    await expect(imagePicker()).toHaveCount(1);
    await expect(page.getByPlaceholder('이 동영상의 YouTube 제목')).toHaveCount(1);

    // 삭제 removes the file and restores the picker — the cap is a replace.
    await page.getByRole('button', { name: '삭제' }).click();
    await expect(page.getByText('첫번째.mp4')).toHaveCount(0);
    await expect(videoPicker()).toHaveCount(1);
  });

  test('집사톡: 취소 confirms once files have been picked, even with no text', async ({ page }) => {
    await page.goto('/pages/butler_talk/new');
    await expect(page.getByRole('heading', { name: '새글 작성' })).toBeVisible({
      timeout: 15_000,
    });

    // Files count as work in progress: picking three videos and typing nothing is
    // still something the user would not want silently dropped.
    await page.locator('input[type="file"][accept="image/*"]').setInputFiles({
      name: '사진.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('img'),
    });

    await page.getByRole('button', { name: '취소' }).click();
    await expect(confirmDialog(page)).toBeVisible();
    await confirmDialog(page).getByRole('button', { name: '확인' }).click();

    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
      .toBe('/pages/butler_talk');
  });

  test('집사톡: the video panel names the mountain’s own playlist, from config', async ({
    page,
  }) => {
    await page.goto('/pages/butler_talk/new');
    await expect(page.getByRole('heading', { name: '새글 작성' })).toBeVisible({
      timeout: 15_000,
    });

    // Picking a file only sets local state — nothing uploads until submit, so this
    // is safe without YouTube credentials.
    await page.locator('input[type="file"][accept="video/*"]').setInputFiles({
      name: '2026-03-15 산책.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('not a real video'),
    });

    // Filing is per-mountain and config-driven (plan D4). The old behavior picked
    // whichever playlist was *titled* 집사게시판, so this asserts the mountain name
    // to catch a regression back to the title match.
    await expect(page.getByText('동영상은 "계양산" 재생목록에 추가돼요')).toBeVisible();

    // 촬영 날짜 shows the day written in the filename. ⚠️ This only discriminates
    // when the browser runs east/west of UTC — the formatter used to round-trip
    // through toISOString() and land a day early in KST, while reading correctly
    // at UTC. tests/unit/dateParser.test.ts pins the timezone to cover CI.
    await expect(page.locator('#createdTime')).toHaveValue('2026-03-15');
  });

  test('집사톡: a text post publishes to the 집사톡 list', async ({ page }) => {
    const title = `E2E 집사톡 ${Date.now() % 100000}`;

    await page.goto('/pages/butler_talk/new');
    await expect(page.getByRole('heading', { name: '새글 작성' })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByLabel('제목').fill(title);
    await page
      .getByPlaceholder('글 내용을 입력하세요')
      .fill('E2E 테스트로 작성한 집사톡 글입니다.');
    await page.getByRole('button', { name: '글 작성' }).click();

    await expect(alertDialog(page).getByText('글이 성공적으로 작성되었습니다!')).toBeVisible({
      timeout: 20_000,
    });
    await alertDialog(page).getByRole('button', { name: '확인' }).click();
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
      .toBe('/pages/butler_talk');
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
  });
});

/**
 * Phase 5 — 게시물 관리: create + list (main plan §8 Phase 5, bullet 3). Runs in
 * the `admin` project.
 *
 * P0 characterization upgrade (complexity-retirement assessment §7 P0): the two
 * Family-B create flows (공지사항 NewAnnouncementForm, 입양홍보 NewAdoptionForm)
 * are pinned end-to-end INCLUDING one image upload each — success dialog,
 * redirect, and the created content (with its image thumbnail) visible on the
 * public surface. These specs are the parity net the P1–P3 form refactor must
 * keep green. Since P6.1 the forms fire a shared ui/Modal dialog instead of
 * native alert(), so the specs assert the modal and click 확인.
 *
 * 2026-07-30: both forms moved to the per-file `MediaItemList` (each file with its
 * own 제목/설명) and their images onto the signed-URL strategy, so the image legs
 * are stubbed — see `stubSignedUrlUpload` for why that is forced rather than
 * chosen.
 *
 *   - create 공지사항: title + body + image → /pages/announcements list shows the
 *     post with an image thumbnail;
 *   - create 입양홍보: title + body + image → /pages/adoption feed accordion shows
 *     the post; expanding reveals body + image;
 *   - list: the admin posts surface renders the announcements tab with its
 *     "새 공지사항 작성" entry point.
 */
import { test, expect } from '../setup/test';
import type { Page } from '@playwright/test';

// The shared useDialog modal (alert mode titles itself 알림).
const alertDialog = (page: Page) => page.getByRole('dialog', { name: '알림' });

/**
 * A picked image, under a **unique** name.
 *
 * ⚠️ It must not reuse a seeded fixture's filename. These specs now write real
 * `cat_images` records (2026-07-30), and `fileName` is what `/admin/tag-images`
 * keys its grid cards on — uploading `album-01.jpg` put three cards with that alt
 * on the page and broke that spec's strict-mode locator. A real upload brings its
 * own name anyway, so this is also the more faithful fixture.
 */
const uploadedImage = (label: string) => ({
  name: `e2e-${label}-${Date.now() % 100000}.jpg`,
  mimeType: 'image/jpeg',
  buffer: Buffer.from('not a real jpeg'),
});

/** Where the stub claims the photo landed — a real fixture image, so the rendered
 *  thumbnail on the public surface is a genuine one. Shared by both specs: the
 *  *object* may repeat, only the record's `fileName` has to be distinct. */
const STUBBED_PUBLIC_URL = '/images/test-fixtures/album-01.jpg';

/**
 * Stub the two network legs of the signed-URL image upload.
 *
 * ⚠️ **Required, not a shortcut.** Since 2026-07-30 these two composers upload
 * photos through `/api/generate-signed-url` (they moved off direct-storage so a
 * per-photo 설명 has somewhere to live — a `cat_images` record). That route mints
 * a signed URL with `file.getSignedUrl()`, which **signs locally with a service
 * account private key**. The e2e harness initializes the Admin SDK
 * credential-less on purpose (`src/lib/firebase-admin.ts`), and the Storage
 * emulator does not implement signing either — so the route can only ever 500
 * here. No emulator configuration fixes that; it is a property of signing.
 *
 * What stays covered: the per-file media UI, submit, the success dialog, the
 * redirect, the Firestore post write, and the public surface rendering the photo.
 * What is NOT covered: signing and the real bytes reaching Storage. That gap is
 * unchanged from before — the previous direct-storage path was covered here, but
 * 집사톡 has always used the signed-URL path with no e2e over it at all.
 */
async function stubSignedUrlUpload(page: Page) {
  await page.route('**/api/generate-signed-url', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        signedUrl: 'https://storage.googleapis.test/signed-put',
        publicUrl: STUBBED_PUBLIC_URL,
      }),
    })
  );
  // The PUT of the bytes goes straight to that URL, bypassing our API.
  await page.route('https://storage.googleapis.test/**', (route) =>
    route.fulfill({ status: 200, body: '' })
  );
}

test.describe('게시물 관리', () => {
  test('creating an announcement with an image publishes it to the public list', async ({
    page,
  }) => {
    const title = `E2E 공지 ${Date.now() % 100000}`;

    await stubSignedUrlUpload(page);
    await page.goto('/admin/announcements/new');
    await page.getByPlaceholder('공지사항 제목을 입력하세요').fill(title);
    await page
      .getByPlaceholder('공지사항 내용을 입력하세요')
      .fill('E2E 테스트로 작성한 공지 내용입니다.');

    // Attach one image; the pending-upload list echoes the filename.
    const image = uploadedImage('announcement');
    await page.locator('input[type="file"][accept="image/*"]').setInputFiles(image);
    await expect(page.getByText(image.name)).toBeVisible();

    await page.getByRole('button', { name: '공지사항 작성' }).click();

    // Confirm the success dialog (shared ui/Modal since P6.1); the redirect
    // happens after 확인.
    await expect(alertDialog(page)).toBeVisible({ timeout: 20_000 });
    await alertDialog(page).getByRole('button', { name: '확인' }).click();

    // The form redirects to the public announcements page on success.
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
      .toBe('/pages/announcements');

    // The created post renders with its uploaded image as the thumbnail (scoped
    // to the post's card — other posts may carry thumbnails too).
    const card = page
      .locator('div.rounded-lg')
      .filter({ has: page.getByRole('link', { name: title }) });
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.getByAltText('Image thumbnail')).toBeVisible();
  });

  test('creating an 입양홍보 post with an image publishes it to the adoption feed', async ({
    page,
  }) => {
    const title = `E2E 입양홍보 ${Date.now() % 100000}`;

    await stubSignedUrlUpload(page);
    await page.goto('/admin/adoption/new');
    await page.getByPlaceholder('입양홍보 제목을 입력하세요').fill(title);
    await page
      .getByPlaceholder('입양홍보 내용을 입력하세요')
      .fill('E2E 테스트로 작성한 입양홍보 내용입니다.');

    const image = uploadedImage('adoption');
    await page.locator('input[type="file"][accept="image/*"]').setInputFiles(image);
    await expect(page.getByText(image.name)).toBeVisible();

    await page.getByRole('button', { name: '입양홍보 작성' }).click();

    await expect(alertDialog(page)).toBeVisible({ timeout: 20_000 });
    await alertDialog(page).getByRole('button', { name: '확인' }).click();

    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
      .toBe('/pages/adoption');

    // The feed renders the post as a folded accordion card (header = title +
    // date, so match by substring); expanding reveals body + image.
    const header = page.getByRole('button', { name: new RegExp(title) });
    await expect(header).toBeVisible({ timeout: 15_000 });
    await expect(header).toHaveAttribute('aria-expanded', 'false');
    await header.click();
    await expect(header).toHaveAttribute('aria-expanded', 'true');

    const card = page.locator('div.rounded-lg').filter({ has: header });
    await expect(card.getByText('E2E 테스트로 작성한 입양홍보 내용입니다.')).toBeVisible();
    // Since 2026-07-31 the expanded card renders the whole post through the shared
    // `PostMedia` (every image, every video) rather than a single thumbnail, so the
    // alt is now indexed. Full-media behaviour is pinned in public/galleries-adoption.
    await expect(card.getByAltText('입양홍보 이미지 1')).toBeVisible();
  });

  /**
   * The capability added 2026-07-30: 공지사항 / 입양홍보 gained 집사톡's per-file
   * sections. Before, one `multiple` picker held a flat `File[]` — every video in
   * a post got the *same* YouTube title (the post's) and photos had no 설명 at all.
   *
   * Pinned here without submitting: picking a file is local state only, so this
   * needs neither YouTube credentials nor a signed URL.
   */
  test('공지사항: each picked video gets its own 제목/설명, and a fresh picker appears', async ({
    page,
  }) => {
    await page.goto('/admin/announcements/new');

    const videoPicker = () => page.locator('input[type="file"][accept="video/*"]');

    await videoPicker().setInputFiles({
      name: '첫번째.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('not a real video'),
    });
    // The trailing picker re-renders empty, so the second file is one click away.
    await videoPicker().setInputFiles({
      name: '두번째.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('not a real video either'),
    });

    await expect(page.getByText('첫번째.mp4')).toBeVisible();
    await expect(page.getByText('두번째.mp4')).toBeVisible();

    // Two independent 제목 fields — the point of the change.
    const titles = page.getByPlaceholder('이 동영상의 YouTube 제목');
    await expect(titles).toHaveCount(2);
    await titles.nth(0).fill('산책하는 냥이');
    await titles.nth(1).fill('밥 먹는 냥이');
    await expect(titles.nth(0)).toHaveValue('산책하는 냥이');
    await expect(titles.nth(1)).toHaveValue('밥 먹는 냥이');

    // 삭제 removes the section it belongs to, not the first one.
    await page.getByRole('button', { name: '삭제' }).nth(0).click();
    await expect(page.getByText('첫번째.mp4')).toHaveCount(0);
    await expect(titles).toHaveCount(1);
    await expect(titles.nth(0)).toHaveValue('밥 먹는 냥이');
  });

  /**
   * The cat selector (owner, 2026-07-30) — 공지사항 / 입양홍보 can now tag the cats
   * in their media at upload time, as 집사톡 always could. It appears only once
   * there is media to tag.
   */
  test('공지사항: the cat selector appears with media and commits a selection', async ({
    page,
  }) => {
    await page.goto('/admin/announcements/new');

    // Nothing to tag yet, so no field.
    await expect(page.locator('#imageTags')).toHaveCount(0);

    await page.locator('input[type="file"][accept="image/*"]').setInputFiles(uploadedImage('tags'));

    const field = page.locator('#imageTags');
    await expect(field).toBeVisible();
    await expect(field).toHaveValue('');

    await field.click();
    const selector = page.getByRole('dialog', { name: '이미지에 등장하는 고양이 선택' });
    await expect(selector).toBeVisible();

    // Tick the first real cat (index 0 is the 이름 없음 option) and read the name off
    // its own row rather than hard-coding it — `cats.spec.ts` renames the seeded cat
    // and can run in a parallel worker, so a literal name is flaky by construction.
    // Reading it also makes the assertion the real contract: what you tick is what lands.
    const catRow = selector.locator('label').nth(1);
    const catName = (await catRow.innerText()).trim().split('\n')[0].trim();
    await selector.getByRole('checkbox').nth(1).check();

    // Must be 완료, not the modal's X. `완료 (1개 선택)` commits; the X only closes,
    // which silently discards the selection.
    await selector.getByRole('button', { name: /^완료/ }).click();

    // The selector commits **names** — what `cat_images.tags` and `[catmodal:이름]`
    // match on.
    await expect(field).toHaveValue(catName);
  });

  // Whitespace passes the native `required` check, so these pin the forms' own
  // trim-validation dialog path (P2.4: submit/upload/preview/validation).
  test('공지사항 form rejects whitespace-only 제목/내용 with validation alerts', async ({
    page,
  }) => {
    await page.goto('/admin/announcements/new');
    await page.getByPlaceholder('공지사항 제목을 입력하세요').fill(' ');
    await page.getByPlaceholder('공지사항 내용을 입력하세요').fill(' ');
    await page.getByRole('button', { name: '공지사항 작성' }).click();
    await expect(alertDialog(page).getByText('제목을 입력해주세요.')).toBeVisible();
    await alertDialog(page).getByRole('button', { name: '확인' }).click();

    await page.getByPlaceholder('공지사항 제목을 입력하세요').fill('유효한 제목');
    await page.getByRole('button', { name: '공지사항 작성' }).click();
    await expect(alertDialog(page).getByText('내용을 입력해주세요.')).toBeVisible();
    await alertDialog(page).getByRole('button', { name: '확인' }).click();

    // No redirect happened — still on the composer.
    expect(new URL(page.url()).pathname).toBe('/admin/announcements/new');
  });

  test('입양홍보 form rejects whitespace-only 제목/내용 with validation alerts', async ({
    page,
  }) => {
    await page.goto('/admin/adoption/new');
    await page.getByPlaceholder('입양홍보 제목을 입력하세요').fill(' ');
    await page.getByPlaceholder('입양홍보 내용을 입력하세요').fill(' ');
    await page.getByRole('button', { name: '입양홍보 작성' }).click();
    await expect(alertDialog(page).getByText('제목을 입력해주세요.')).toBeVisible();
    await alertDialog(page).getByRole('button', { name: '확인' }).click();

    await page.getByPlaceholder('입양홍보 제목을 입력하세요').fill('유효한 제목');
    await page.getByRole('button', { name: '입양홍보 작성' }).click();
    await expect(alertDialog(page).getByText('내용을 입력해주세요.')).toBeVisible();
    await alertDialog(page).getByRole('button', { name: '확인' }).click();

    expect(new URL(page.url()).pathname).toBe('/admin/adoption/new');
  });

  test('the admin posts list renders the announcements tab', async ({ page }) => {
    await page.goto('/admin/posts');
    await expect(page.getByRole('heading', { name: '게시물 관리' })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: '공지사항' }).click();
    await expect(page.getByRole('button', { name: '새 공지사항 작성' })).toBeVisible({
      timeout: 15_000,
    });
  });
});

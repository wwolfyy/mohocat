/**
 * A member deletes their own post, and edits/deletes their own reply (§10q,
 * 2026-08-04). Runs in the `member` project (butler-ground storageState).
 *
 * ⚠️ **Every test here creates the fixture it destroys.** Deleting a seeded post
 * would break the specs that read it — the `admin/cats.spec` mistake, twice repeated
 * (2026-08-02, 2026-08-03). Nothing in this file touches anything it did not make.
 *
 * 🔑 The boundary under test is "author, not admin": delete used to require
 * `manage-posts`. For replies the author is the **replier**, not the post's writer —
 * except for the cascade, where deleting a post removes other people's replies too.
 */
import { test, expect } from '../setup/test';

const alertDialog = (page: import('@playwright/test').Page) =>
  page.getByRole('dialog', { name: '알림' });
/**
 * The shared confirm modal. ⚠️ Its accessible name is the **title we pass**
 * (`글 삭제` / `댓글 삭제`), not the literal '확인' — `ui/Modal` maps `title` onto
 * `aria-label`. Matching on '확인' finds nothing.
 */
const confirmDialog = (page: import('@playwright/test').Page, title: string) =>
  page.getByRole('dialog', { name: title });

/** A single reply's card, so its 수정 / 삭제 are not confused with the post's. */
const replyCard = (page: import('@playwright/test').Page, text: string) =>
  page.locator('div.bg-white.rounded-lg.border').filter({ hasText: text });

/** Create a 집사톡 post as the signed-in member and return its title. */
async function createPost(page: import('@playwright/test').Page, label: string) {
  const title = `${label} ${Date.now() % 1000000}`;
  await page.goto('/pages/butler_talk');
  await page.getByRole('button', { name: '새글 작성' }).click();
  await expect(page.getByRole('heading', { name: '새글 작성' })).toBeVisible({ timeout: 15_000 });
  await page.getByLabel('제목').fill(title);
  await page.getByPlaceholder('글 내용을 입력하세요').fill('삭제 확인용 본문이에요.');
  await page.getByRole('button', { name: '글 작성' }).click();
  await expect(alertDialog(page).getByText('글이 성공적으로 작성되었습니다!')).toBeVisible({
    timeout: 20_000,
  });
  await alertDialog(page).getByRole('button', { name: '확인' }).click();
  await expect(page.getByText(title)).toBeVisible({ timeout: 20_000 });
  return title;
}

/** The board row for a post, which is what carries its 수정 / 삭제 controls. */
const rowFor = (page: import('@playwright/test').Page, title: string) =>
  page.locator('div.border.p-4').filter({ hasText: title });

test.describe('member deletes their own 집사톡 post', () => {
  test('삭제 removes the post from the board', async ({ page }) => {
    const title = await createPost(page, 'E2E 삭제대상');

    await rowFor(page, title).getByRole('button', { name: '삭제' }).click();

    // The confirm says media survives — that is the documented behaviour, not just
    // wording: deletePost never touches cat_images / cat_videos or Storage.
    await expect(confirmDialog(page, '글 삭제').getByText(/사진과 영상은 남아요/)).toBeVisible({
      timeout: 15_000,
    });
    await confirmDialog(page, '글 삭제').getByRole('button', { name: '확인' }).click();

    await expect(page.getByText(title)).toHaveCount(0, { timeout: 20_000 });

    // Gone from the server too, not just hidden locally.
    await page.reload();
    await expect(page.getByText(title)).toHaveCount(0, { timeout: 20_000 });
  });

  test('삭제 can be cancelled and the post survives', async ({ page }) => {
    const title = await createPost(page, 'E2E 취소대상');

    await rowFor(page, title).getByRole('button', { name: '삭제' }).click();
    await confirmDialog(page, '글 삭제').getByRole('button', { name: '취소' }).click();

    await expect(page.getByText(title)).toBeVisible();
    await page.reload();
    await expect(page.getByText(title)).toBeVisible({ timeout: 20_000 });

    // Clean up after ourselves so the board does not accumulate fixtures.
    await rowFor(page, title).getByRole('button', { name: '삭제' }).click();
    await confirmDialog(page, '글 삭제').getByRole('button', { name: '확인' }).click();
    await expect(page.getByText(title)).toHaveCount(0, { timeout: 20_000 });
  });

  test("offers no 삭제 on someone else's post", async ({ page }) => {
    await page.goto('/pages/butler_talk');
    // The seeded 집사톡 fixtures are authored by the admin account.
    const other = rowFor(page, '집사수다');
    await expect(other.first()).toBeVisible({ timeout: 20_000 });
    await expect(other.first().getByRole('button', { name: '삭제' })).toHaveCount(0);
  });
});

test.describe('member edits and deletes their own reply', () => {
  test('수정 rewrites the reply, 삭제 removes it', async ({ page }) => {
    const title = await createPost(page, 'E2E 댓글대상');
    const row = rowFor(page, title);

    // Write a reply on our own post. (The author test for a reply is the replier —
    // here the same person, which is the ordinary case.)
    await row.getByRole('button', { name: /댓글/ }).first().click();
    await row.getByPlaceholder('댓글을 입력하세요').fill('원래 댓글이에요.');
    await row.getByRole('button', { name: '댓글 작성' }).click();
    await expect(page.getByText('원래 댓글이에요.')).toBeVisible({ timeout: 20_000 });

    // Edit it in place, scoped to the reply's own card.
    await replyCard(page, '원래 댓글이에요.').getByRole('button', { name: '수정' }).click();
    await page.getByLabel('댓글 수정').fill('고친 댓글이에요.');
    await page.getByRole('button', { name: '저장' }).click();
    await expect(page.getByText('고친 댓글이에요.')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('원래 댓글이에요.')).toHaveCount(0);

    // Delete it.
    await replyCard(page, '고친 댓글이에요.').getByRole('button', { name: '삭제' }).click();
    await confirmDialog(page, '댓글 삭제').getByRole('button', { name: '확인' }).click();
    await expect(page.getByText('고친 댓글이에요.')).toHaveCount(0, { timeout: 20_000 });

    // Remove the fixture post too.
    await rowFor(page, title).getByRole('button', { name: '삭제' }).click();
    await confirmDialog(page, '글 삭제').getByRole('button', { name: '확인' }).click();
    await expect(page.getByText(title)).toHaveCount(0, { timeout: 20_000 });
  });
});

/**
 * A member authors and edits their OWN post on the two boards they may write
 * (급식현황 · 집사톡). Runs in the `member` project (butler-ground storageState).
 *
 * 🔑 **The boundary these specs exist for** is "own vs anyone else's". The
 * Firestore rules are what enforce it; this drives the UI that has to agree with
 * them, so an author is never sent to a form whose save would be denied.
 *
 * 📌 Text-only, deliberately — 집사톡's media paths are excluded from the
 * automated net for the reasons `admin/butler-create.spec.ts` documents
 * (YouTube upload is manual-parity; the signed-URL image path would write an
 * unloadable production URL into the shared emulator seed).
 */
import { test, expect } from '../setup/test';

const alertDialog = (page: import('@playwright/test').Page) =>
  page.getByRole('dialog', { name: '알림' });

test.describe('member authoring on 집사톡 / 급식현황', () => {
  test('집사톡: writes a post and it appears on the board', async ({ page }) => {
    const title = `E2E 회원 집사톡 ${Date.now() % 100000}`;

    await page.goto('/pages/butler_talk');
    await page.getByRole('button', { name: '새글 작성' }).click();

    await expect(page.getByRole('heading', { name: '새글 작성' })).toBeVisible({ timeout: 15_000 });
    await page.getByLabel('제목').fill(title);
    await page.getByPlaceholder('글 내용을 입력하세요').fill('회원이 쓴 집사톡 본문이에요.');
    await page.getByRole('button', { name: '글 작성' }).click();

    await expect(alertDialog(page).getByText('글이 성공적으로 작성되었습니다!')).toBeVisible({
      timeout: 20_000,
    });
    await alertDialog(page).getByRole('button', { name: '확인' }).click();

    await expect(page.getByText(title)).toBeVisible({ timeout: 20_000 });
  });

  test('집사톡: 수정 shows on my own post and not on someone else’s', async ({ page }) => {
    await page.goto('/pages/butler_talk');
    await expect(page.getByText('집사수다 1')).toBeVisible({ timeout: 15_000 });

    // Anchored on the href rather than the surrounding card: the post markup is
    // nested divs, so a `filter({ hasText })` container match is ambiguous.
    // test-butler-01 is the member's (authorUid = test-member-uid);
    // test-butler-02 belongs to the admin.
    await expect(
      page.locator('a[href="/pages/posts/butler_talk/test-butler-01/edit"]')
    ).toBeVisible();
    await expect(
      page.locator('a[href="/pages/posts/butler_talk/test-butler-02/edit"]')
    ).toHaveCount(0);
  });

  test('집사톡: editing my own post keeps me out of /admin', async ({ page }) => {
    const edited = `수정된 집사톡 ${Date.now() % 100000}`;

    // ⚠️ Its OWN fixture. Editing renames the post, and a spec that renames a
    // fixture another spec reads by title is the exact bug `admin/cats.spec`
    // shipped once already — `post-detail.spec` reads '집사수다 1'.
    await page.goto('/pages/posts/butler_talk/test-butler-member-edit-01/edit');
    await expect(page.getByRole('heading', { name: '글 수정' })).toBeVisible({ timeout: 20_000 });

    await page.getByLabel('제목').fill(edited);
    await page.getByRole('button', { name: '글 저장' }).click();

    await expect(alertDialog(page).getByText('글이 수정되었습니다!')).toBeVisible({
      timeout: 20_000,
    });
    await alertDialog(page).getByRole('button', { name: '확인' }).click();

    // ⚠️ The regression guard: the shared edit flow redirects to /admin/posts by
    // default, which a member may not open.
    await expect(page).toHaveURL(/\/pages\/butler_talk/, { timeout: 20_000 });
  });

  test("editing someone else's post is refused", async ({ page }) => {
    await page.goto('/pages/posts/butler_talk/test-butler-02/edit');

    await expect(page.getByRole('heading', { name: '수정할 수 없어요' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('내가 쓴 글만 수정할 수 있어요.')).toBeVisible();
  });

  test('공지사항 is not member-editable through this route', async ({ page }) => {
    await page.goto('/pages/posts/announcements/test-anno-01/edit');

    await expect(page.getByRole('heading', { name: '수정할 수 없어요' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('이 게시물은 여기서 수정할 수 없어요.')).toBeVisible();
  });
});

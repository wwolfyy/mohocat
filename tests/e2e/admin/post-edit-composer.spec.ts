/**
 * 공지사항 / 입양홍보 / 집사톡 editing, now done by the **create composer in edit
 * mode** (2026-08-02, owner). Runs in the `admin` project.
 *
 * 🔑 **What this pins.** Editing used to go through `EditPostForm`, which took
 * media only as a **pasted URL** — changing a photo meant finding its Storage URL
 * by hand. The restriction was stale: all three composers were already on the
 * same signed-URL upload path as of 2026-07-30, so the pipeline was reusable.
 * (급식현황 stays on `EditPostForm` by decision — its composer uploads nothing.)
 * These specs hold the properties that make the converged editor correct:
 *
 *   1. the edit screen is the **same form** as create — a real file picker, not
 *      a URL box — and it arrives prefilled;
 *   2. media already on the post is listed, individually removable, and
 *      **retained** across a save that touches nothing else. A save that
 *      silently dropped it is the failure worth a regression net;
 *   3. an edit does not re-stamp authorship or 게시일 — `updatePost` merges, and
 *      re-stamping would relabel the post with whoever edited it and reorder the
 *      public list.
 *
 * ⚠️ **These specs MUTATE their fixtures, so they use their own.**
 * `test-anno-edit-01` / `test-adopt-edit-01` / `test-adopt-edit-02` /
 * `test-butler-edit-01` exist for this file alone. Editing a fixture another spec
 * reads is precisely how the 2026-08-02 "flake set" was built (DEBUG_LOG) — do not
 * repoint these at the shared posts.
 *
 * ⚠️⚠️ **…and each spec must also own its fixture across RETRIES OF ITSELF.**
 * `playwright.config.ts` sets `retries: CI ? 2 : 0`, and the seed runs **once per
 * job**, not per test — so a retry re-runs against the post the failed attempt
 * already wrote. 🔑 **Never assert the value a fixture was SEEDED with in a spec
 * that overwrites it**; write a unique value and assert *that*. Assert
 * `not.toHaveValue('')` if all you need is "the form loaded".
 *
 * 📌 **This is not hypothetical, and it is invisible locally.** With `retries: 0`
 * on a dev machine the failure mode cannot occur at all. On CI run 31017908440
 * (2026-08-05) one slow post-save navigation failed attempt 1 — after its write had
 * already committed — and both retries then failed on the seeded value they could
 * no longer find. Three red attempts, one real cause. A destructive step that
 * cannot be made idempotent must instead be guarded (see the photo-removal spec).
 *
 * ⚠️⚠️ **`test-butler-edit-01` is shared by TWO specs in this file, and
 * `fullyParallel` leaves their order arbitrary.** The cap spec reads its body while
 * the text-only-save spec rewrites it — so the reader asserts only that the field is
 * prefilled, never *what* it holds. 🔑 **The per-file fixture rule above is
 * necessary but not sufficient**: two specs sharing one fixture inside this file
 * reproduce the same defect a spec-vs-spec collision does. Found 2026-08-07 by
 * seeding once and running the file twice, which is the check worth repeating after
 * touching anything here:
 *   `npx playwright test tests/e2e/admin/post-edit-composer.spec.ts \
 *      --project=admin --repeat-each=2 --workers=1`
 * ⚠️ **`--workers=1` matters**: without it the two repeats run *concurrently* against
 * one document and collide, which a real (sequential) retry never does.
 */
import { test, expect } from '../setup/test';
import type { Page } from '@playwright/test';

const alertDialog = (page: Page) => page.getByRole('dialog', { name: '알림' });

/**
 * Dismiss the success 알림 and wait for the composer to hand back to the list.
 *
 * 🔑 **Waits on the destination's own content, not on `page.url()`.** The App
 * Router updates the URL only once the transition to `/admin/posts` has committed,
 * which means fetching that route's payload — so on a loaded runner a *slow* nav is
 * indistinguishable from a *failed* one when you poll the pathname. That is exactly
 * how CI run 31017908440 failed on 2026-08-05 (20s poll exceeded) while the same
 * test passed locally.
 *
 * 📌 **The save is already committed before this is called** —
 * `useSimpleContentForm` awaits `updatePost` *then* alerts *then* pushes, so a
 * failure here means the navigation was slow, never that the write was lost. Which
 * is why every test in this file must be retry-safe; see the header.
 */
const confirmSave = async (page: Page) => {
  await expect(alertDialog(page)).toBeVisible({ timeout: 20_000 });
  await alertDialog(page).getByRole('button', { name: '확인' }).click();
  await expect(page.getByRole('heading', { name: '게시물 관리' })).toBeVisible({
    timeout: 30_000,
  });
};

test.describe('post editing uses the create composer', () => {
  test('the announcement editor is the composer, prefilled, with a real file picker', async ({
    page,
  }) => {
    await page.goto('/admin/posts/edit/announcements/test-anno-edit-01');

    // Prefilled from the post, into the composer's own fields.
    await expect(page.getByPlaceholder('공지사항 제목을 입력하세요')).toHaveValue(
      '수정 전용 공지',
      {
        timeout: 15_000,
      }
    );
    await expect(page.getByPlaceholder('공지사항 내용을 입력하세요')).toHaveValue(
      '편집 스펙 전용 공지 본문이에요.'
    );

    // The point of the change: a file picker per medium, plus 촬영 날짜 and the
    // 팝업 toggle — none of which the URL-only editor had.
    await expect(page.locator('input[type="file"][accept="image/*"]')).toBeVisible();
    await expect(page.locator('input[type="file"][accept="video/*"]')).toBeVisible();
    await expect(page.getByRole('button', { name: '공지사항 저장' })).toBeVisible();

    // ⚠️ The old editor's URL boxes must be GONE, not merely unused.
    await expect(page.getByPlaceholder('이미지 URL을 입력하세요')).toHaveCount(0);
    await expect(page.getByPlaceholder('동영상 URL을 입력하세요')).toHaveCount(0);
  });

  test('existing media is listed and survives a text-only save', async ({ page }) => {
    // test-adopt-edit-01 carries two photos and one video.
    await page.goto('/admin/posts/edit/adoption_promotion/test-adopt-edit-01');

    // ⚠️ A unique value, and NO assertion on the value it starts at — this test
    // writes to its fixture, so a retry re-runs against the post it already
    // edited. Asserting the seeded body made attempt 1's flake unrecoverable:
    // the write commits before the navigation this test used to fail on, so
    // both retries then asserted a value that no longer existed. (CI run
    // 31017908440, 2026-08-05 — one slow nav, two doomed retries.)
    const edited = `입양홍보 본문만 고쳤어요 ${Date.now() % 100000}`;
    const message = page.getByPlaceholder('입양홍보 내용을 입력하세요');
    // Settle on the loaded form before touching it: a non-empty body means the
    // post has been fetched and prefilled, whatever a previous run left in it.
    await expect(message).not.toHaveValue('', { timeout: 15_000 });

    // Two photos and one video, each shown as a 기존 row with its own 삭제.
    // 🔑 The media count is the actual subject of this test and is retry-safe on
    // purpose: a text-only save must never change it, so it reads 3 on every run.
    await expect(page.getByText('기존')).toHaveCount(3);
    await expect(page.getByText('album-01.jpg')).toBeVisible();
    await expect(page.getByText('album-02.jpg')).toBeVisible();

    await message.fill(edited);
    await page.getByRole('button', { name: '입양홍보 저장' }).click();
    await confirmSave(page);

    // Reopen: the edit must not have dropped the media it never touched.
    await page.goto('/admin/posts/edit/adoption_promotion/test-adopt-edit-01');
    await expect(page.getByPlaceholder('입양홍보 내용을 입력하세요')).toHaveValue(edited, {
      timeout: 15_000,
    });
    await expect(page.getByText('기존')).toHaveCount(3);
  });

  /**
   * ⚠️ **The one destructive test here, and the only one that cannot be made
   * idempotent by writing a unique value.** Detaching a photo is one-way, and the
   * seed runs once per job — so on a Playwright retry the photo is already gone.
   *
   * It therefore performs the removal **only when there is something to remove**,
   * and asserts the end state either way. 📌 **Honest about the trade-off:** on a
   * retry this verifies the *outcome* rather than re-exercising the removal, so a
   * retry-green is weaker evidence than a first-attempt-green. That is still far
   * better than the alternative it replaces — a guaranteed failure that masks
   * whatever made attempt 1 fail.
   */
  test('removing one photo detaches only that photo', async ({ page }) => {
    await page.goto('/admin/posts/edit/announcements/test-anno-edit-01');
    // Not the seeded title — only that the post loaded and prefilled.
    await expect(page.getByPlaceholder('공지사항 제목을 입력하세요')).not.toHaveValue('', {
      timeout: 15_000,
    });

    const existingRows = page.getByText('기존');
    await expect(existingRows).not.toHaveCount(0, { timeout: 15_000 });

    if ((await existingRows.count()) === 2) {
      await page
        .locator('li', { has: page.getByText('album-01.jpg') })
        .getByRole('button', { name: '삭제' })
        .click();
      await expect(existingRows).toHaveCount(1);

      await page.getByRole('button', { name: '공지사항 저장' }).click();
      await confirmSave(page);

      await page.goto('/admin/posts/edit/announcements/test-anno-edit-01');
    }

    // The invariant, asserted on every run: exactly the removed photo is gone.
    await expect(page.getByText('기존')).toHaveCount(1, { timeout: 15_000 });
    await expect(page.getByText('album-02.jpg')).toBeVisible();
    await expect(page.getByText('album-01.jpg')).toHaveCount(0);
  });

  /**
   * 집사톡 was the last type still on the URL-only editor (owner, 2026-08-02).
   * Its fixture carries exactly one photo and one video — 집사톡's
   * `media_control` cap — so this also pins that **retained media counts against
   * the cap**: editing must not be a way around a limit creation enforces.
   */
  test('집사톡 edits in its composer, and retained media still counts against the cap', async ({
    page,
  }) => {
    await page.goto('/admin/posts/edit/butler_talk/test-butler-edit-01');

    // 제목 is safe to assert: nothing overwrites it. ⚠️ **내용 is NOT** — the
    // '집사톡 text-only save' spec below rewrites this same fixture's body, and
    // `fullyParallel` leaves the order between them arbitrary. Asserting the seeded
    // body here reads another spec's write as a failure. Prefill is all this test
    // needs from that field; its subject is the media cap.
    await expect(page.getByLabel('제목')).toHaveValue('수정 전용 집사톡', { timeout: 15_000 });
    await expect(page.getByLabel('내용')).not.toHaveValue('');
    await expect(page.getByRole('button', { name: '글 저장' })).toBeVisible();

    // The old editor's URL boxes must be gone.
    await expect(page.getByPlaceholder('이미지 URL을 입력하세요')).toHaveCount(0);

    // One photo + one video, both listed as 기존.
    await expect(page.getByText('기존')).toHaveCount(2);

    // Both caps are full, so neither picker is offered.
    await expect(page.locator('input[type="file"][accept="image/*"]')).toHaveCount(0);
    await expect(page.locator('input[type="file"][accept="video/*"]')).toHaveCount(0);

    // Removing the photo frees its slot — and only its slot.
    await page
      .locator('li', { has: page.getByText('album-01.jpg') })
      .getByRole('button', { name: '삭제' })
      .click();
    await expect(page.locator('input[type="file"][accept="image/*"]')).toBeVisible();
    await expect(page.locator('input[type="file"][accept="video/*"]')).toHaveCount(0);
  });

  test('a 집사톡 text-only save keeps both media', async ({ page }) => {
    await page.goto('/admin/posts/edit/butler_talk/test-butler-edit-01');

    // ⚠️ A unique value, and no assertion on the value it *starts* at: this test
    // writes to its fixture, so a Playwright retry re-runs against the post it
    // already edited.
    const edited = `집사톡 본문만 고쳤어요 ${Date.now() % 100000}`;
    const message = page.getByLabel('내용');
    await expect(page.getByLabel('제목')).toHaveValue('수정 전용 집사톡', { timeout: 15_000 });
    await message.fill(edited);

    await page.getByRole('button', { name: '글 저장' }).click();
    await confirmSave(page);

    await page.goto('/admin/posts/edit/butler_talk/test-butler-edit-01');
    await expect(page.getByLabel('내용')).toHaveValue(edited, { timeout: 15_000 });
    await expect(page.getByText('기존')).toHaveCount(2);
  });

  test('an edit does not re-stamp authorship or 게시일', async ({ page }) => {
    const cardFor = (name: string | RegExp) =>
      page.locator('div.border.p-4').filter({ has: page.getByRole('link', { name }) });

    // Read what the list shows BEFORE the edit, and compare against it after.
    // ⚠️ Asserting a literal date would be asserting `formatKoreaDateTime`'s
    // output, which applies its own timezone shift — the property under test is
    // that the stamp is *unchanged*, not what it renders as.
    await page.goto('/admin/posts');
    await page.getByRole('button', { name: '입양홍보' }).click();
    const before = cardFor('작성자 보존 확인용');
    await expect(before).toBeVisible({ timeout: 15_000 });
    const originalDate = await before.locator('p').last().innerText();

    await page.goto('/admin/posts/edit/adoption_promotion/test-adopt-edit-02');
    const title = page.getByPlaceholder('입양홍보 제목을 입력하세요');
    // ⚠️ Unique, and no assertion on the starting title — a retry re-runs against
    // the post this test already renamed. `cardFor` matches on substring, so the
    // pre-edit lookup above finds the card whatever suffix a previous run left.
    const editedTitle = `작성자 보존 확인용 (수정됨 ${Date.now() % 100000})`;
    await expect(title).not.toHaveValue('', { timeout: 15_000 });
    await title.fill(editedTitle);

    await page.getByRole('button', { name: '입양홍보 저장' }).click();
    await confirmSave(page);

    await page.getByRole('button', { name: '입양홍보' }).click();
    const after = cardFor(editedTitle);
    await expect(after).toBeVisible({ timeout: 15_000 });
    await expect(after.getByText('관리자')).toBeVisible();
    await expect(after.locator('p').last()).toHaveText(originalDate);
  });
});

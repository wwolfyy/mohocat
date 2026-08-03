/**
 * 사용자 관리 → 역할 / 권한 matrices (§10p, 2026-08-03). Runs in the `admin` project.
 *
 * 🔑 **Why these exist.** Both matrices used to hardcode their own copy of the
 * permission list, and that is how `upload-own-photo` / `upload-own-video` came to be
 * granted in config, enforced by `firestore.rules`, and **invisible in the UI that
 * manages them** — no operator could grant or revoke them. `tests/smoke` pins the
 * single-sourcing structurally; these prove it renders.
 *
 * 📌 The 권한 (resource) matrix is the *nav-visibility* map, so it deliberately offers
 * **view-only** permissions. A write grant there would gate a link on the ability to
 * post rather than to read.
 */
import { test, expect } from '../setup/test';

test.describe('사용자 관리 — 역할 matrix (role → permission)', () => {
  test('offers the narrow upload grants alongside the broad manage ones', async ({ page }) => {
    await page.goto('/admin/members');
    await page.getByRole('button', { name: '역할' }).click();

    // Permission names render verbatim in the first column.
    for (const permission of [
      'manage-photo',
      'manage-video',
      'upload-own-photo',
      'upload-own-video',
    ]) {
      await expect(
        page.getByRole('cell', { name: permission, exact: true }),
        `${permission} must be manageable from the 역할 matrix`
      ).toBeVisible({ timeout: 15_000 });
    }
  });

  test('every catalogued permission has a checkbox per role, including the new ones', async ({
    page,
  }) => {
    await page.goto('/admin/members');
    await page.getByRole('button', { name: '역할' }).click();

    const row = page.getByRole('row').filter({
      has: page.getByRole('cell', { name: 'upload-own-photo', exact: true }),
    });
    await expect(row).toBeVisible({ timeout: 15_000 });
    // admin / butler-ground / butler-internet / viewer — one togglable box each, or the
    // permission is displayed but not actually assignable.
    await expect(row.getByRole('checkbox')).toHaveCount(4);
  });
});

test.describe('사용자 관리 — 권한 matrix (resource → permission)', () => {
  test('lists every nav-gated resource, 냥이들 included', async ({ page }) => {
    await page.goto('/admin/members');
    await page.getByRole('button', { name: '권한' }).click();

    // The resource id renders under its Korean label. `cats` had no row until
    // 2026-08-03, so 냥이들 could never be gated from here.
    for (const id of ['cats', 'butler_talk', 'butler_stream', 'photo_album', 'video_album']) {
      await expect(
        page.getByText(id, { exact: true }),
        `${id} is gated in Navigation, so it needs a row here`
      ).toBeVisible({ timeout: 15_000 });
    }
  });

  test('offers only view permissions as nav gates', async ({ page }) => {
    await page.goto('/admin/members');
    await page.getByRole('button', { name: '권한' }).click();

    await expect(page.getByRole('columnheader', { name: 'view-post-butler' })).toBeVisible({
      timeout: 15_000,
    });
    // Write grants were offered here until 2026-08-03 and never selected in live
    // config — a category error, since this matrix decides who can *see* a nav item.
    for (const permission of [
      'write-own-post-butler',
      'write-own-post-feeding',
      'upload-own-photo',
    ]) {
      await expect(
        page.getByRole('columnheader', { name: permission }),
        `${permission} is not a visibility gate and must not be offered here`
      ).toHaveCount(0);
    }
  });
});

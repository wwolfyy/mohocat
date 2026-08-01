/**
 * Phase 5 — 사용자 관리: role assignment + Contact Management (main plan §8 Phase 5,
 * bullet 4). Runs in the `admin` project.
 *
 *   - role assignment: promote the seeded viewer to 집사 (온라인) and confirm the
 *     success message (POST /api/admin/assign-role — Admin-SDK route gated on
 *     manage-users, which admin holds; Tier 1 write migration 2026-07-18);
 *   - Contact Management: a submitted 동참 appears in the 문의 tab.
 */
import { test, expect } from '../setup/test';
import { test as baseTest } from '@playwright/test';

// Historical note: this suite uses the plain (non-watchdog) baseTest because the
// old client-SDK path emitted a non-fatal console.error (its `permission_logs`
// audit write was rule-denied). The Tier 1 migration (2026-07-18) moved the write
// — audit entry included — behind /api/admin/assign-role, so that error is gone;
// upgrading this suite to the watchdog `test` is now possible (left as-is here to
// keep the migration diff behavior-neutral for the test tier).
baseTest.describe('사용자 관리 — role assignment', () => {
  baseTest('assigns a new role to the seeded viewer', async ({ page }) => {
    await page.goto('/admin/members'); // 사용자 tab (RoleManagement) is the default

    // The viewer's card is the one carrying its email; the phone-only viewer has none.
    const viewerCard = page.locator('div.shadow-sm').filter({ hasText: 'viewer@test.local' });
    await expect(viewerCard).toBeVisible({ timeout: 15_000 });

    await viewerCard.getByRole('button', { name: '집사 (온라인)' }).click();

    // The success message is transient (loadUsers() immediately overwrites it with
    // "N명 불러왔어요"), so assert the durable outcome: after the reload the viewer's
    // card shows 집사 (온라인) as its current role — that button is now disabled.
    await expect(viewerCard.getByRole('button', { name: '집사 (온라인)' })).toBeDisabled({
      timeout: 15_000,
    });
  });
});

test.describe('사용자 관리 — contacts', () => {
  test('a submitted 동참 shows up in Contact Management', async ({ page }) => {
    const name = `관리자문의${Date.now() % 100000}`;

    // Admin is signed in → the members-only contact form is submittable.
    await page.goto('/pages/contact');
    // Wait for 보내기 to enable BEFORE typing — the page's hydration mismatch
    // re-renders the root client-side and wipes anything typed before it lands.
    // See member/contact-submit.spec.ts for the diagnosis and the product caveat.
    const submit = page.getByRole('button', { name: '보내기' });
    await expect(submit).toBeEnabled({ timeout: 15_000 });

    await page.locator('input[name="name"]').fill(name);
    await page.locator('input[name="phone"]').fill('01077776666');
    await page.locator('textarea[name="message"]').fill('연락처 관리 e2e 확인용 문의입니다.');
    await expect(page.locator('input[name="name"]')).toHaveValue(name);

    await submit.click();
    await expect(page.getByText('메시지가 전송되었습니다. 감사합니다!')).toBeVisible({
      timeout: 15_000,
    });

    // The 문의 tab lists it via the Admin-readable contacts collection.
    await page.goto('/admin/members');
    await page.getByRole('button', { name: '문의' }).click();
    await expect(page.getByRole('heading', { name: '연락처 관리' })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: '새로고침' }).click();
    await expect(page.getByRole('cell', { name })).toBeVisible({ timeout: 15_000 });
  });
});

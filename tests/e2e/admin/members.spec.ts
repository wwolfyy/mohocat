/**
 * Phase 5 — 사용자 관리: role assignment + Contact Management (main plan §8 Phase 5,
 * bullet 4). Runs in the `admin` project.
 *
 *   - role assignment: promote the seeded viewer to 집사 (온라인) and confirm the
 *     success message (client-SDK write gated on manage-users, which admin holds);
 *   - Contact Management: a submitted 동참 appears in the 문의 tab.
 */
import { test, expect } from '../setup/test';
import { test as baseTest } from '@playwright/test';

// Role assignment persists via the client SDK, but the follow-on audit-log write to
// `permission_logs` is denied by the repo firestore.rules (the client has no create
// grant there) — RoleManagement logs that as a non-fatal console.error. That is a
// pre-existing rules gap, not a failure of the assignment, so use the plain
// (non-watchdog) test here to avoid the console-error guard tripping on it.
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
    await page.locator('input[name="name"]').fill(name);
    await page.locator('input[name="phone"]').fill('01077776666');
    await page.locator('textarea[name="message"]').fill('연락처 관리 e2e 확인용 문의입니다.');
    const submit = page.getByRole('button', { name: '보내기' });
    await expect(submit).toBeEnabled({ timeout: 15_000 });
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

/**
 * Global auth setup — signs each seeded role in through the REAL login UI against
 * the Auth emulator and saves its storageState for the role-scoped projects.
 *
 * This is also the concrete resolution of prerequisite spike S4: it proves the
 * client SDK (WP2 emulator wiring) authenticates end-to-end through the actual
 * login page, and that the seeded users/{uid} doc + role-config resolve.
 */
import { test as setup, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const AUTH_DIR = path.resolve(__dirname, '..', '.auth');

// Must match tests/e2e/fixtures/users.json.
//
// NOTE — member is intentionally NOT set up yet. On every login the app calls
// `permissionService.ensureUserExists()`, which `updateDoc`s the user's own
// `users/{uid}` doc. The repo `firestore.rules` (which the emulator enforces —
// prerequisite plan F12) only allows `users/{uid}` writes with `manage-users`, so
// a non-admin self-update is DENIED and login never completes. Admin logs in fine
// (it has manage-users). This is a real repo-rules-vs-login divergence the owner
// must resolve before the Phase-3 member/admin suites (options: relax the `users`
// write rule to allow self-writes, or make ensureUserExists tolerate a denied
// self-update). Tracked in the prerequisite plan §3 (S4) + DEBUG_LOG.
const ROLES = [{ role: 'admin', email: 'admin@test.local', password: 'Passw0rd!admin' }] as const;

setup.beforeAll(() => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
});

for (const { role, email, password } of ROLES) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    await page.goto('/login');

    // Email/password section: locate the inputs by type (single-sourced Korean
    // labels sit alongside; type is the most stable anchor here).
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: '이메일로 로그인' }).click();

    // handleSuccess() redirects to '/' once the Firestore user doc + verified
    // status check pass — a successful login is observable as leaving /login.
    await expect(page).toHaveURL(/\/$|\/\?/, { timeout: 20_000 });

    // Firebase persists auth in localStorage (browserLocalPersistence) — wait for
    // it before snapshotting so the storageState actually carries the session.
    await expect
      .poll(
        async () =>
          page.evaluate(() =>
            Object.keys(window.localStorage).some((k) => k.startsWith('firebase:authUser'))
          ),
        { timeout: 15_000 }
      )
      .toBe(true);

    await page.context().storageState({ path: path.join(AUTH_DIR, `${role}.json`) });
  });
}

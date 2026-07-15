/**
 * Phase 5 — admin CMS navigation smoke (main plan §8 Phase 5). Runs in the `admin`
 * project. Proves the AdminAuth gate passes for an admin and each top-level CMS
 * surface mounts and loads its data (heading renders) without console errors.
 */
import { test, expect } from '../setup/test';

const SURFACES: { path: string; heading: string }[] = [
  { path: '/admin/cats', heading: '고양이 관리' },
  { path: '/admin/points', heading: '급식소 관리' },
  { path: '/admin/posts', heading: '게시물 관리' },
  { path: '/admin/members', heading: '사용자 관리' },
  { path: '/admin/app-management', heading: '앱 관리' },
];

test.describe('admin CMS navigation', () => {
  for (const { path, heading } of SURFACES) {
    test(`${path} renders its heading for an admin`, async ({ page }) => {
      await page.goto(path);
      // Level 1 = the page title (some surfaces repeat the label in an inner h2).
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible({
        timeout: 15_000,
      });
    });
  }
});

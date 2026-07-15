/**
 * 공지사항 list/detail + static content pages (main plan §5.1).
 *
 * 공지 (`/pages/announcements`): the seeded announcements list; a title links to
 * `/pages/announcements/[id]`, whose detail shows the message and a back button.
 * Static pages (about / FAQ / privacy / terms): each renders its key heading and
 * has zero horizontal overflow at phone width.
 *
 * Scope note: the plan pairs 공지 with "inline [img]/[video] link-tokens", but the
 * announcement detail renders `post.message` as PLAIN text — token processing
 * lives in the cat/adoption surfaces (processTextWithLinks / CatLinkedText), not
 * here, so link-token interaction is not asserted on this page.
 */
import { test, expect } from '../setup/test';
import type { Page } from '@playwright/test';

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

test.describe('공지사항 — list & detail', () => {
  test('list shows seeded announcements; title opens detail; back returns', async ({ page }) => {
    await page.goto('/pages/announcements');
    await expect(page.getByRole('heading', { name: '공지사항', level: 1 })).toBeVisible();

    await expect(page.getByRole('link', { name: '테스트 공지 1' })).toBeVisible();
    await expect(page.getByText('테스트 공지 2 (링크 토큰)')).toBeVisible();

    await page.getByRole('link', { name: '테스트 공지 1' }).click();
    await expect(page).toHaveURL(/\/pages\/announcements\/test-anno-01/);
    await expect(page.getByRole('heading', { name: '테스트 공지 1', level: 1 })).toBeVisible();
    await expect(page.getByText('첫 번째 공지 본문이에요.')).toBeVisible();

    await page.getByRole('button', { name: '← 공지사항 목록으로' }).click();
    await expect(page).toHaveURL(/\/pages\/announcements$/);
  });
});

test.describe('static content pages', () => {
  const PAGES: { path: string; heading: string }[] = [
    { path: '/pages/about', heading: '계양산 고양이들' },
    { path: '/pages/faq', heading: '자주 묻는 질문' },
    { path: '/pages/privacy', heading: '개인정보처리방침' },
    { path: '/pages/terms', heading: '이용약관' },
  ];

  for (const { path, heading } of PAGES) {
    test(`${path} renders its heading`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
    });

    test(`${path} has no horizontal overflow at phone width`, async ({ page }) => {
      test.skip(isDesktop(page), 'overflow check is phone-width only');
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();

      // The document must not scroll horizontally (a common mobile-layout bug).
      const overflow = await page.evaluate(() => {
        const el = document.documentElement;
        return el.scrollWidth - el.clientWidth;
      });
      expect(overflow, `horizontal overflow of ${overflow}px on ${path}`).toBeLessThanOrEqual(1);
    });
  }
});

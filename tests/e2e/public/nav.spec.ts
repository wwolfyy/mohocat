/**
 * Navigation & footer integrity (public / anonymous).
 *
 * Guards the "broken nav destination" class of bug (main plan §5.1): every link
 * an anonymous visitor can actually click from the top nav or footer must resolve
 * to a real page, not a 404. Two complementary angles:
 *
 *   1. Destination reachability — `goto` each anonymous-clickable href and assert
 *      the response isn't a 4xx/5xx and the page shell (banner + footer) renders.
 *      Viewport-agnostic; runs on both the desktop and mobile projects.
 *   2. Chrome integrity — the desktop dropdowns / mobile hamburger actually expose
 *      those links with the right hrefs (branch on viewport).
 *
 * Scope note: 사진첩 / 동영상 (require `view-photo` / `view-video`) and the whole
 * 집사메뉴 group are permission-gated, so for an anonymous user they render as
 * disabled spans, not links. Their gating is asserted in the anonymous-gating
 * spec, not here.
 */
import { test, expect } from '../setup/test';
import type { Page } from '@playwright/test';

// Anonymous-CLICKABLE destinations, as wired in `src/components/Navigation.tsx`
// (public resources: empty/undefined required-permissions) + `Footer.tsx`.
const PUBLIC_DESTINATIONS: { href: string; label: string }[] = [
  { href: '/pages/about', label: '산냥이와 집냥이' },
  { href: '/pages/cats', label: '냥이들' },
  { href: '/pages/contact', label: '동참' },
  { href: '/pages/adoption', label: '입양홍보' },
  { href: '/pages/announcements', label: '공지' },
  { href: '/pages/privacy', label: '개인정보처리방침' }, // footer
  { href: '/pages/terms', label: '이용약관' }, // footer
];

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

test.describe('nav/footer integrity', () => {
  for (const { href, label } of PUBLIC_DESTINATIONS) {
    test(`destination resolves: ${label} (${href})`, async ({ page }) => {
      const response = await page.goto(href);
      // Next.js renders its default not-found with a real 404 status; any 4xx/5xx
      // means the nav points somewhere broken.
      expect(response, `no response for ${href}`).not.toBeNull();
      expect(response!.status(), `${href} returned ${response!.status()}`).toBeLessThan(400);
      // The page shell mounted (header + footer live in the root layout).
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('contentinfo')).toBeVisible();
    });
  }

  test('footer exposes the policy links with correct hrefs', async ({ page }) => {
    await page.goto('/');
    const footer = page.getByRole('contentinfo');
    await expect(footer.getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute(
      'href',
      '/pages/privacy'
    );
    await expect(footer.getByRole('link', { name: '이용약관' })).toHaveAttribute(
      'href',
      '/pages/terms'
    );
  });

  test('desktop dropdowns expose their links', async ({ page }) => {
    test.skip(!isDesktop(page), 'desktop nav only renders at ≥lg (1024px)');
    await page.goto('/');

    // NavDropdown opens on hover; a Playwright `.click()` would hover-open then
    // toggle-close in the same action, so hover is the correct trigger.
    // 소개 group.
    await page.getByRole('button', { name: '소개' }).hover();
    await expect(page.getByRole('link', { name: '산냥이와 집냥이' })).toHaveAttribute(
      'href',
      '/pages/about'
    );
    await expect(page.getByRole('link', { name: '냥이들' })).toHaveAttribute('href', '/pages/cats');

    // 소식 group.
    await page.getByRole('button', { name: '소식' }).hover();
    await expect(page.getByRole('link', { name: '공지' })).toHaveAttribute(
      'href',
      '/pages/announcements'
    );
  });

  test('mobile hamburger opens and exposes its links', async ({ page }) => {
    test.skip(isDesktop(page), 'hamburger only renders below lg (1024px)');
    await page.goto('/');

    const toggle = page.getByRole('button', { name: 'Open main menu' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    // A representative public link from each anonymous-visible group resolves.
    await expect(page.getByRole('link', { name: '냥이들' })).toHaveAttribute('href', '/pages/cats');
    await expect(page.getByRole('link', { name: '동참' })).toHaveAttribute(
      'href',
      '/pages/contact'
    );
    await expect(page.getByRole('link', { name: '공지' })).toHaveAttribute(
      'href',
      '/pages/announcements'
    );
  });
});

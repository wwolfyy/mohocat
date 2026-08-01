/**
 * Shareable link to one cat's modal (`?cat=<id>`) — PROJECT_PLAN §10c.
 *
 * The cat modal had no URL of any kind before this: the only way to point
 * someone at one cat was "open 냥이들 and search for the name". These pin the
 * two halves of the contract — the link opens the right cat, and opening a cat
 * produces a link — plus the one design rule that is easy to regress:
 *
 * 🔑 **the param carries the cat `id`, never the name.** The in-content
 * `[catmodal:이름]` token matches by name, so a rename silently breaks every
 * link to it; a URL people paste into KakaoTalk and keep must not inherit that.
 * The fixtures make this checkable — `test-cat-01` is named 테스트냥이일, so a
 * name-keyed implementation would put 테스트냥이일 in the URL and fail here.
 */
import { test, expect } from '../setup/test';
import type { Page } from '@playwright/test';

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

// The cats page renders BOTH a desktop table (role=row) and a mobile card grid
// (role=button) into the DOM; click the one that matches the active viewport.
async function openCatDetail(page: Page, name: string) {
  const rx = new RegExp(name);
  if (isDesktop(page)) await page.getByRole('row', { name: rx }).click();
  else await page.getByRole('button', { name: rx }).click();
}

test.describe('냥이 deep link — ?cat=<id>', () => {
  test('a link to one cat opens that cat on arrival', async ({ page }) => {
    await page.goto('/pages/cats?cat=test-cat-01');

    await expect(page.getByRole('heading', { name: '테스트냥이일' })).toBeVisible();
    // The param survives the arrival: it is what the visitor would copy back out.
    await expect(page).toHaveURL(/[?&]cat=test-cat-01/);
  });

  test('closing a deep-linked modal clears the param and stays on the list', async ({ page }) => {
    await page.goto('/pages/cats?cat=test-cat-01');
    await expect(page.getByRole('heading', { name: '테스트냥이일' })).toBeVisible();

    await page.getByRole('button', { name: '닫기' }).click();

    // Still on 냥이들 (the close must not navigate off the site), param gone.
    await expect(page.getByRole('heading', { name: '냥이들', level: 1 })).toBeVisible();
    await expect(page).toHaveURL(/\/pages\/cats$/);
  });

  test('opening a cat from the list puts its id — not its name — in the URL', async ({ page }) => {
    await page.goto('/pages/cats');
    await openCatDetail(page, '테스트냥이일');

    await expect(page).toHaveURL(/[?&]cat=test-cat-01/);
    // Guards the rename hazard the id-keying exists to prevent.
    await expect(page).not.toHaveURL(/cat=.*%ED%85%8C%EC%8A%A4%ED%8A%B8/);
  });

  test('the browser back button closes the modal and clears the param', async ({ page }) => {
    await page.goto('/pages/cats');
    await openCatDetail(page, '테스트냥이일');
    await expect(page).toHaveURL(/[?&]cat=test-cat-01/);

    await page.goBack();

    await expect(page.getByRole('heading', { name: '테스트냥이일' })).toHaveCount(0);
    await expect(page).toHaveURL(/\/pages\/cats$/);
  });

  test('a link to a cat that no longer exists just lands on the list', async ({ page }) => {
    await page.goto('/pages/cats?cat=deleted-cat-99');

    // No modal, no error — the visitor gets the full list.
    await expect(page.getByRole('heading', { name: '냥이들', level: 1 })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('테스트냥이일').filter({ visible: true }).first()).toBeVisible();
  });
});

/**
 * The share chip is what makes the deep link usable by a human — without it,
 * producing a link means looking an id up in Firebase.
 *
 * `navigator.share` is stubbed before page scripts run: a real call opens an OS
 * share sheet, which no automated run can dismiss. The stub records what the
 * button *would* have shared, which is the part under test.
 */
test.describe('냥이 share chip', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        writable: true,
        value: (data: { title?: string; url?: string }) => {
          (window as unknown as { __shared?: unknown }).__shared = data;
          return Promise.resolve();
        },
      });
    });
  });

  test('shares a link to the cat currently open', async ({ page }) => {
    await page.goto('/pages/cats?cat=test-cat-01');
    await expect(page.getByRole('heading', { name: '테스트냥이일' })).toBeVisible();

    await page.getByRole('button', { name: /링크/ }).click();

    const shared = await page.evaluate(
      () => (window as unknown as { __shared?: { title?: string; url?: string } }).__shared
    );
    expect(shared?.title).toBe('테스트냥이일');
    expect(shared?.url).toContain('/pages/cats?cat=test-cat-01');
  });

  test('shares the 냥이들 link even when opened from another surface', async ({ page }) => {
    // 🔑 The regression this guards: `CatInfo` renders on six surfaces and only
    // 냥이들 honours `?cat=`. Copying the current URL here would share a link to
    // /pages/adoption — a share button that quietly shares the wrong thing.
    await page.goto('/pages/adoption');
    await page.getByRole('button', { name: '입양이삼' }).click();
    await expect(page.getByRole('heading', { name: '입양이삼' })).toBeVisible();

    await page.getByRole('button', { name: /링크/ }).click();

    const shared = await page.evaluate(
      () => (window as unknown as { __shared?: { url?: string } }).__shared
    );
    expect(shared?.url).toContain('/pages/cats?cat=test-cat-03');
    expect(shared?.url).not.toContain('/pages/adoption');
  });
});

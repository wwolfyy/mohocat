/**
 * Photo & video albums — Lightbox / VideoPlayer (main plan §5.1).
 *
 * Photo album (`/pages/photo-album`): seeded `cat_images` render as tiles; a tile
 * opens the Lightbox, which navigates (이전/다음) and closes via the X button AND
 * — the high-value regression — via the browser back button, which pops the
 * synthetic history entry `useModalLayer` pushes instead of navigating away.
 * Video album (`/pages/video-album`): seeded `cat_videos` render with a YouTube
 * badge; a tile opens the VideoPlayer shell. The YouTube <iframe> is external, so
 * this asserts only the player chrome, never that the embed loads.
 *
 * Album media is public/-served (spike S3); the fixtures are laid down by the
 * seed step before the build, so this needs the full `npm run test:e2e` flow
 * (not a stale reused server that snapshotted public/ without them).
 */
import { test, expect } from '../setup/test';

test.describe('photo album + Lightbox', () => {
  test('tile opens the Lightbox; 이전/다음 navigate; X closes', async ({ page }) => {
    await page.goto('/pages/photo-album');

    // Two seeded images render as tiles (captioned with their descriptions).
    await expect(page.getByText('픽스처 사진 1')).toBeVisible();
    await expect(page.getByText('픽스처 사진 2')).toBeVisible();

    // Open the first image's Lightbox.
    await page.getByRole('img', { name: 'album-01.jpg' }).click();
    const close = page.getByRole('button', { name: '닫기' });
    await expect(close).toBeVisible();
    await expect(page.getByText('픽스처 사진 1')).toBeVisible();

    // Navigate to the next image and back.
    await page.getByRole('button', { name: '다음 사진' }).click();
    await expect(page.getByText('픽스처 사진 2')).toBeVisible();
    await expect(page.getByRole('button', { name: '이전 사진' })).toBeVisible();
    // Last image → no further "다음".
    await expect(page.getByRole('button', { name: '다음 사진' })).toHaveCount(0);

    await close.click();
    await expect(close).toHaveCount(0);
  });

  test('browser back button closes the Lightbox instead of navigating away', async ({ page }) => {
    await page.goto('/pages/photo-album');
    await page.getByRole('img', { name: 'album-01.jpg' }).click();
    await expect(page.getByRole('button', { name: '닫기' })).toBeVisible();

    await page.goBack();

    // The Lightbox is gone AND we're still on the album page (the synthetic
    // history entry was consumed — useModalLayer contract).
    await expect(page.getByRole('button', { name: '닫기' })).toHaveCount(0);
    await expect(page).toHaveURL(/\/pages\/photo-album/);
  });
});

test.describe('video album + VideoPlayer', () => {
  test('tile renders with YouTube badge and opens the player shell', async ({ page }) => {
    await page.goto('/pages/video-album');

    // One seeded YouTube video.
    await expect(page.getByText('YouTube')).toBeVisible();
    const tile = page.getByRole('img', { name: '픽스처 영상 1' });
    await expect(tile).toBeVisible();

    // Opens the VideoPlayer overlay (assert only the chrome — the YouTube embed
    // is external and must not gate the test).
    await tile.click();
    const close = page.getByRole('button', { name: '닫기' });
    await expect(close).toBeVisible();

    await close.click();
    await expect(close).toHaveCount(0);
  });
});

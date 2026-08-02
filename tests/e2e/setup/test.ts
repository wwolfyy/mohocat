/**
 * Shared test fixture with a console-error watchdog.
 *
 * Any spec that imports `test` from here automatically fails if the page emits an
 * unexpected `console.error` or an uncaught `pageerror`. This catches the class of
 * regression where the UI still renders but the console is screaming (hydration
 * mismatches, thrown effects, failed fetches). Known-benign noise is allow-listed.
 */
import { test as base, expect, type ConsoleMessage } from '@playwright/test';

// Substrings of console messages that are noise in the emulator/test environment
// and must NOT fail a test. Keep this list short and justified.
const ALLOWED_ERROR_SUBSTRINGS: string[] = [
  // Firebase Auth emulator banner (informational, logged at error level by some SDK paths)
  'running in emulator mode',
  // next/image occasionally warns about the fake 1x1 fixture images; not a real failure
  'Image with src',
  // React dev "download the React DevTools" and similar are warnings, not errors — excluded by level anyway
  // A full-page redirect (e.g. /mypage → /login) or logout aborts Next.js's
  // in-flight RSC link prefetches; Next logs this and falls back to a browser
  // navigation. Benign navigation-abort noise, not an app error.
  'Failed to fetch RSC payload',
  // /admin/tag-videos loads YouTube playlists on mount; the emulator env has no
  // YouTube OAuth creds, so /api/manage-playlists 500s and the page logs this and
  // continues (playlists are optional there — source-verified in loadPlaylists()).
  // The P0 editor characterization specs pin that the page still works without it.
  'Error loading playlists',
  // The Firestore SDK's own logger for a transport hiccup against the emulator —
  // the same phenomenon as the EMULATOR_HOSTS allowance below, but logged by the
  // SDK rather than by the browser's resource loader, so it carries no URL to
  // match on. ⚠️ Benign **because the SDK retries internally and succeeds**: it
  // is a stall, never a lost read (HANDOFF: "Firestore hangs; it does not
  // throw"), which is why the assertions around it pass. Surfaces only under
  // load — a full 8-worker run against one emulator. A genuine permission or
  // index failure reports `code=permission-denied` / `failed-precondition`, not
  // `unavailable`, and still fails the test.
  'Could not reach Cloud Firestore backend',
];

function isAllowed(text: string): boolean {
  return ALLOWED_ERROR_SUBSTRINGS.some((s) => text.includes(s));
}

// Emulator hosts (auth 9099 / firestore 8088 / storage 9199). The Firebase client
// SDK talks to these over a WebChannel; during normal channel teardown/reconnect a
// request can return a non-200 (e.g. Firestore's `…/Listen/channel` 400s on a
// terminate). The browser logs a generic "Failed to load resource …" console error
// whose only distinguishing detail is the resource URL (the message text has none),
// so we allow-list those benign emulator-transport failures by host. Real app 4xx/5xx
// (next/image, /api, page assets) are NOT on these hosts and still fail the test.
const EMULATOR_HOSTS = [':9099', ':8088', ':9199'];

function isEmulatorResourceFailure(text: string, url: string): boolean {
  return /Failed to load resource/.test(text) && EMULATOR_HOSTS.some((h) => url.includes(h));
}

// The browser also logs the raw 500 for the credential-less /api/manage-playlists
// call (see the 'Error loading playlists' allowance above) as a generic
// "Failed to load resource" whose only detail is the URL. Same justification;
// every other /api failure still fails the test.
function isPlaylistApiFailure(text: string, url: string): boolean {
  return /Failed to load resource/.test(text) && url.includes('/api/manage-playlists');
}

// Projects whose tests run with a signed-in session (storageState, or a UI login).
// On these the server pre-renders the ANONYMOUS nav (no user), then the client
// hydrates to the AUTHENTICATED nav — an expected, React-recoverable hydration
// mismatch inherent to client-side Firebase auth + SSR. It surfaces
// non-deterministically as a `pageerror` (minified React #418/#421/#423/#425, the
// hydration family). We tolerate ONLY that family, ONLY on authed projects, so the
// anonymous public suite still fails hard on any hydration error.
const AUTHED_PROJECTS = ['auth', 'member', 'admin'];
const HYDRATION_ERROR_CODES = ['#418', '#421', '#423', '#425'];

function isRecoverableHydrationError(message: string): boolean {
  return (
    /Minified React error/.test(message) &&
    HYDRATION_ERROR_CODES.some((code) => message.includes(code))
  );
}

export const test = base.extend<{ youtubeThumbnails: void; consoleWatchdog: void }>({
  /**
   * Serve YouTube's thumbnail CDN locally, for every spec.
   *
   * ⚠️ **Required, and deliberately global.** Every seeded video carries an
   * INVENTED YouTube id (`yt-vid-01`), so `img.youtube.com` returns a real 404 —
   * verified with curl, not assumed. Anything rendering a fixture video hits it:
   * the 집사톡 / 급식현황 lists, the admin post tabs, the edit composer's 기존
   * rows. It is a property of the fixtures, never a signal (with no real id
   * anywhere, a 200 was impossible), and it also makes the suite depend on the
   * public internet.
   *
   * 🔑 **Why a stub and not a console allow-list.** That was tried and does not
   * work: when the `<img>` src is set by client JS, Chrome reports the failed
   * resource message's `location.url` as the **initiating chunk**, not the
   * YouTube URL — so a host-based allowance silently misses exactly the cases
   * that need it, and the failure reads as a bogus 404 on a `_next/static` chunk
   * that is in fact served 200.
   *
   * 📌 It replaced a `page.route` three specs each installed by hand; the fourth
   * spec to render a fixture video failed because it had not.
   */
  youtubeThumbnails: [
    async ({ page }, use) => {
      await page.route('https://img.youtube.com/**', (route) =>
        route.fulfill({ status: 200, contentType: 'image/gif', body: '' })
      );
      await use();
    },
    { auto: true },
  ],
  consoleWatchdog: [
    async ({ page }, use, testInfo) => {
      const errors: string[] = [];

      const onConsole = (msg: ConsoleMessage) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        if (isAllowed(text)) return;
        // For failed subresource loads the failing URL is only in the location.
        const url = msg.location()?.url ?? '';
        if (isEmulatorResourceFailure(text, url)) return;
        if (isPlaylistApiFailure(text, url)) return;
        errors.push(`console.error: ${text}${url ? ` [${url}]` : ''}`);
      };
      const authed = AUTHED_PROJECTS.includes(testInfo.project.name);
      const onPageError = (err: Error) => {
        if (isAllowed(err.message)) return;
        if (authed && isRecoverableHydrationError(err.message)) return;
        errors.push(`pageerror: ${err.message}`);
      };

      page.on('console', onConsole);
      page.on('pageerror', onPageError);

      await use();

      page.off('console', onConsole);
      page.off('pageerror', onPageError);

      if (errors.length > 0) {
        // Attach for the report, then fail.
        await testInfo.attach('console-errors', {
          body: errors.join('\n'),
          contentType: 'text/plain',
        });
        expect(errors, `Unexpected console/page errors:\n${errors.join('\n')}`).toEqual([]);
      }
    },
    { auto: true },
  ],
});

export { expect };

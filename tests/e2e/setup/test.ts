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

export const test = base.extend<{ consoleWatchdog: void }>({
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

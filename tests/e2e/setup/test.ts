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

export const test = base.extend<{ consoleWatchdog: void }>({
  consoleWatchdog: [
    async ({ page }, use, testInfo) => {
      const errors: string[] = [];

      const onConsole = (msg: ConsoleMessage) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        if (isAllowed(text)) return;
        errors.push(`console.error: ${text}`);
      };
      const onPageError = (err: Error) => {
        if (isAllowed(err.message)) return;
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

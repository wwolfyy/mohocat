import path from 'node:path';
import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Mirror tsconfig's "@/*" → "src/*" so unit tests can import src modules.
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    // Both of these need the Firestore emulator, so neither may run in the default
    // emulator-less pass (`npm test` / `test:smoke`):
    //   tests/rules/**   → `npm run test:rules`   (vitest.rules.config.ts)
    //   tests/scripts/** → `npm run test:scripts` (vitest.scripts.config.ts)
    // Each is run via `firebase emulators:exec` in its own CI job.
    exclude: [...configDefaults.exclude, 'tests/rules/**', 'tests/scripts/**'],
    environment: 'node',
  },
});

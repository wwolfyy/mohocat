import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Rules tests need the Firestore emulator (see `npm run test:rules`, which runs
    // them via `firebase emulators:exec` against vitest.rules.config.ts). Keep them
    // out of the default emulator-less run (`npm test` / `test:smoke`).
    exclude: [...configDefaults.exclude, 'tests/rules/**'],
    environment: 'node',
  },
});

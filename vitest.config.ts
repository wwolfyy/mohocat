import path from 'node:path';
import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Mirror tsconfig's "@/*" → "src/*" so unit tests can import src modules.
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    // Rules tests need the Firestore emulator (see `npm run test:rules`, which runs
    // them via `firebase emulators:exec` against vitest.rules.config.ts). Keep them
    // out of the default emulator-less run (`npm test` / `test:smoke`).
    exclude: [...configDefaults.exclude, 'tests/rules/**'],
    environment: 'node',
  },
});

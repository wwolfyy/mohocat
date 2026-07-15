import { defineConfig } from 'vitest/config';

// Firestore security-rules tests. Run ONLY via `npm run test:rules`, which starts
// the Firestore emulator (`firebase emulators:exec`) so `@firebase/rules-unit-testing`
// can load config/firebase/firestore.rules and assert them. Kept in its own config
// so the default `npm test` (no emulator) never picks these up.
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    testTimeout: 15000,
  },
});

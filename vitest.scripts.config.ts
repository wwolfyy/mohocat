import { defineConfig } from 'vitest/config';

// Emulator-backed tests for the migration scripts under `scripts/`. Run ONLY via
// `npm run test:scripts`, which starts the Firestore emulator
// (`firebase emulators:exec`) so a script can be driven end-to-end against a real
// database instead of having its parts imported.
//
// Kept in its own config for the same reason as vitest.rules.config.ts: the
// default `npm test` must stay runnable with no emulator and no JVM.
//
// ⚠️ Single-threaded on purpose. Each case reseeds the same collections and then
// spawns the script, so parallel files would race each other's fixtures — the
// failure mode that cost this repo weeks when `admin/cats.spec` renamed a fixture
// six other specs read.
export default defineConfig({
  test: {
    include: ['tests/scripts/**/*.test.ts'],
    environment: 'node',
    // Each case spawns `node scripts/migration/…` at least once; the default 5s
    // is not enough for process startup plus the emulator round-trips.
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});

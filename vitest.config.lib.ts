// Minimal vitest config for lib/ and api/ tests only — the fast subset, run by
// `pnpm test:lib`. It skips every component/hook test, so it is not a gate:
// `pnpm test` runs the full suite (vitest.config.ts) and is what to trust.
// Node environment, so server-side tests get undici's fetch primitives rather
// than jsdom's re-implementations.
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['__tests__/lib/**/*.test.ts', '__tests__/api/**/*.test.ts'],
    alias: { '@': path.resolve(__dirname, '.') },
  },
});

// Minimal vitest config for lib/ and api/ tests only.
// Used when @vitejs/plugin-react is not yet installed (component tests need it).
// Switch back to vitest.config.ts once `pnpm install` completes.
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

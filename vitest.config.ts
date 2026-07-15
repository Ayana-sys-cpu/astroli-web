import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    // Git worktrees under .claude/worktrees/ are complete checkouts of this app,
    // so their __tests__ copies get collected alongside these ones — running the
    // whole suite twice, half of it against another branch's code.
    exclude: [...configDefaults.exclude, '**/.claude/worktrees/**'],
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});

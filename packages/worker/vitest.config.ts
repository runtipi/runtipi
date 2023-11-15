import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    setupFiles: ['./tests/vite.setup.ts'],
    coverage: { all: true, reporter: ['lcov', 'text-summary'] },
  },
});

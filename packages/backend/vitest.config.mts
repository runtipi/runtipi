import swc from 'unplugin-swc';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import { type Plugin, defineConfig } from 'vitest/config';

// biome-ignore lint/style/noDefaultExport: needed for vitest config
export default defineConfig({
  plugins: [swc.vite(), viteTsconfigPaths() as unknown] as Plugin[],
  test: {
    setupFiles: ['./src/tests/vite.setup.ts'],
    coverage: { all: true, reporter: ['lcov', 'text-summary'] },
    reporters: ['default'],
  },
  resolve: {},
});

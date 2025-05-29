import swc from 'unplugin-swc';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import { type Plugin, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [swc.vite(), viteTsconfigPaths() as unknown] as Plugin[],
  test: {
    setupFiles: ['./src/tests/vite.setup.ts'],
    include: ['src/**/*.test.ts'],
    exclude: ['**/integration/**', '**/.internal/**'],
    coverage: { all: true, reporter: ['lcov', 'text-summary'] },
    reporters: ['default'],
    env: {
      NODE_OPTIONS: '--experimental-sqlite',
    },
  },
  resolve: {},
});

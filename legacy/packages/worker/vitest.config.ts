import tsconfigPaths from 'vite-tsconfig-paths';
import { type UserWorkspaceConfig, defineConfig } from 'vitest/config';

type Plugin = Exclude<UserWorkspaceConfig['plugins'], undefined>[number];

export default defineConfig({
  plugins: [tsconfigPaths() as Plugin],
  test: {
    setupFiles: ['./tests/vite.setup.ts'],
    coverage: { all: true, reporter: ['lcov', 'text-summary'] },
    reporters: ['default'],
  },
});

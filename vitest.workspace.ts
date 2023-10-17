import { defineWorkspace, UserWorkspaceConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

type Plugin = Exclude<UserWorkspaceConfig['plugins'], undefined>[number];

export default defineWorkspace([
  {
    plugins: [tsconfigPaths() as Plugin],
    test: {
      globals: true,
      name: 'server',
      root: './src/server',
      environment: 'node',
      include: ['./services/auth/auth.service.test.ts'],
      setupFiles: ['./tests/vite.setup.ts'],
    },
  },
]);

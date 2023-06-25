import { defineWorkspace } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineWorkspace([
  {
    plugins: [tsconfigPaths()],
    test: {
      globals: true,
      name: 'server',
      root: './src/server',
      environment: 'node',
      include: ['./services/auth/auth.service.test.ts', './services/apps/apps.service.test.ts'],
      setupFiles: ['./tests/vite.setup.ts'],
    },
  },
]);

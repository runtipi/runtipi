import react from '@vitejs/plugin-react';
import { type UserWorkspaceConfig, defineWorkspace } from 'vitest/config';

import tsconfigPaths from 'vite-tsconfig-paths';

type Plugins = UserWorkspaceConfig['plugins'];

export default defineWorkspace([
  {
    plugins: [tsconfigPaths()] as Plugins,
    test: {
      globals: true,
      deps: {
        inline: ['fs-extra'],
      },
      name: 'server',
      root: './',
      environment: 'node',
      include: ['./src/server/**/*.test.ts'],
      setupFiles: ['./tests/server/test.setup.ts'],
    },
  },
  {
    plugins: [tsconfigPaths(), react()] as Plugins,
    test: {
      globals: true,
      name: 'client',
      root: './',
      environment: 'jsdom',
      include: ['./src/client/**/*.{spec,test}.{ts,tsx}', './src/app/**/*.{spec,test}.{ts,tsx}', './src/lib/**/*.{spec,test}.{ts,tsx}'],
      setupFiles: ['./tests/client/test.setup.tsx'],
    },
  },
]);

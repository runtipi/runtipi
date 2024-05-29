import { defineWorkspace } from 'vitest/config';
import react from '@vitejs/plugin-react';

import tsconfigPaths from 'vite-tsconfig-paths';

export default defineWorkspace([
  {
    plugins: [tsconfigPaths()],
    test: {
      globals: true,
      name: 'server',
      root: './',
      environment: 'node',
      include: ['./src/server/**/*.test.ts'],
      setupFiles: ['./tests/server/test.setup.ts'],
    },
  },
  {
    plugins: [tsconfigPaths(), react()],
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

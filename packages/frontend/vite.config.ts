import path from 'path';
import { Features } from 'lightningcss';
import { reactRouter } from '@react-router/dev/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { defineConfig, type PluginOption } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const alias = {
  '@': path.resolve(__dirname, './src'),
};
const plugins: PluginOption[] = [reactRouter(), tsconfigPaths()];

const { NODE_ENV } = process.env;
if (NODE_ENV === 'production') {
  // @ts-expect-error
  alias['react-dom/server'] = 'react-dom/server.node';
  plugins.push(
    sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: {
        name: process.env.TIPI_VERSION,
      },
      org: 'runtipi',
      project: 'runtipi-frontend',
    }) as PluginOption,
  );
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins,
  css: {
    lightningcss: {
      // Lowering light-dark() freezes inherited Tabler colors to the root theme.
      exclude: Features.LightDark,
    },
  },
  resolve: {
    alias,
  },
  server: {
    host: true,
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
    allowedHosts: true,
  },
  build: {
    sourcemap: true,
    target: ['chrome107', 'edge107', 'firefox104', 'safari16'],
  },
});

const { build } = require('esbuild');
const { sentryEsbuildPlugin } = require('@sentry/esbuild-plugin');

const plugins = [];

if (process.env.LOCAL !== 'true') {
  plugins.push(
    sentryEsbuildPlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: {
        name: process.env.TIPI_VERSION,
      },
      org: 'runtipi',
      project: 'runtipi-worker',
    }),
  );
}

async function bundle() {
  const start = Date.now();
  const options = {
    entryPoints: ['./src/index.ts'],
    outfile: './dist/index.js',
    platform: 'node',
    target: 'node20',
    bundle: true,
    color: true,
    sourcemap: true,
    loader: {
      '.node': 'copy',
    },
    minify: true,
    plugins,
  };

  await build({
    ...options,
  });
  console.log(`Build time: ${Date.now() - start}ms`);
}

bundle();

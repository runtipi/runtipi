/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-extraneous-dependencies */
const esbuild = require('esbuild');

/* Bundle server preload */
esbuild.build({
  entryPoints: ['./server-preload.ts'],
  bundle: true,
  allowOverwrite: true,
  external: ['pg-native'],
  platform: 'node',
  target: 'node18',
  outfile: 'server-preload.js',
  logLevel: 'info',
});

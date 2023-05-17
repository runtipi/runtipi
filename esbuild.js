#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
const esbuild = require('esbuild');
const { spawn } = require('child_process');
const pkg = require('./package.json');

const isDev = process.argv[2] !== 'build';

process.env.NODE_ENV = isDev ? 'development' : 'production';

let server;
const onRebuild = () => {
  if (isDev) {
    if (server) server.kill('SIGINT');
    server = spawn('node', ['dist/index.js'], { stdio: [0, 1, 2] });
  } else {
    spawn('pnpm', ['next', 'build'], { stdio: [0, 1, 2] });
  }
};

const included = ['express', 'pg', '@runtipi/postgres-migrations', 'connect-redis', 'express-session'];
const excluded = ['pg-native', '*required-server-files.json'];
const external = Object.keys(pkg.dependencies || {}).filter((dep) => !included.includes(dep));
external.push(...excluded);

esbuild
  .build({
    entryPoints: ['src/server/index.ts'],
    external,
    define: { 'process.env.NODE_ENV': `"${process.env.NODE_ENV}"` },
    platform: 'node',
    target: 'node14',
    outfile: 'dist/index.js',
    tsconfig: 'tsconfig.json',
    bundle: true,
    minify: isDev,
    sourcemap: isDev,
    watch: false,
  })
  .finally(onRebuild);

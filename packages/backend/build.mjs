import path from 'node:path';
import { esbuildDecorators } from '@anatine/esbuild-decorators';
import { sentryEsbuildPlugin } from '@sentry/esbuild-plugin';
import * as esbuild from 'esbuild';

const cwd = process.cwd();
const tsconfig = path.resolve(cwd, 'tsconfig.json');

await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  sourcemap: true,
  keepNames: true,
  minify: true,
  format: 'cjs',
  plugins: [
    esbuildDecorators({
      tsconfig,
      cwd,
    }),
    sentryEsbuildPlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: 'runtipi',
      project: 'runtipi-backend',
    }),
  ],
  external: [
    '@nestjs/sequelize',
    '@mikro-orm/core',
    '@nestjs/mongoose',
    '@nestjs/typeorm',
    '@fastify/static',
    '@nestjs/microservices',
    '@nestjs/websockets',
    'class-transformer',
    'i18next-fs-backend',
    'sqlite3',
    'argon2',
  ],
  outfile: 'dist/main.js',
});

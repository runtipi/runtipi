import { $, build } from 'bun';

await $`rm -rf dist`;

const optionalRequirePackages = [
  'class-transformer',
  'class-validator',
  '@nestjs/microservices',
  '@nestjs/websockets',
  '@fastify/static',
  '@nestjs/sequelize',
  '@nestjs/mongoose',
  '@mikro-orm/core',
  '@nestjs/typeorm',
  'class-transformer/storage',
  'sqlite3',
];

const result = await build({
  entrypoints: ['./src/main.ts'],
  outdir: './dist',
  target: 'node',
  sourcemap: 'linked',
  minify: {
    syntax: true,
    whitespace: true,
  },
  external: optionalRequirePackages.filter((pkg) => {
    try {
      require(pkg);
      return false;
    } catch (_) {
      return true;
    }
  }),
  splitting: false,
});

if (!result.success) {
  console.log(result.logs[0]);
  process.exit(1);
}

console.log('Built successfully!');

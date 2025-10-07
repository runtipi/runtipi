await Bun.build({
  entrypoints: ['./src/main.ts'],
  outdir: './dist',
  target: 'bun',
  env: 'disable',
  sourcemap: 'linked',
  minify: {
    keepNames: true,
    whitespace: true,
    identifiers: true,
    syntax: true,
  },
  external: [
    'class-transformer',
    '@nestjs/typeorm',
    '@nestjs/mongoose',
    '@nestjs/sequelize',
    '@mikro-orm/core',
    '@fastify/static',
    '@nestjs/microservices',
    '@nestjs/websockets',
  ],
});

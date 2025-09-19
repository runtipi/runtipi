await Bun.build({
  entrypoints: ['./src/main.ts'],
  outdir: './dist',
  target: 'bun',
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

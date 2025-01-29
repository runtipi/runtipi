import './instrument';

import { patchNestJsSwagger } from 'nestjs-zod';

import fs from 'node:fs';
import path from 'node:path';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppService } from './app.service';
import { APP_DIR } from './common/constants';
import { generateSystemEnvFile } from './common/helpers/env-helpers';
import metadata from './metadata';

async function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder().setTitle('Runtipi API').setDescription('API specs for Runtipi').setVersion('1.0').build();
  await SwaggerModule.loadPluginMetadata(metadata);

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (_: string, methodKey: string) => methodKey,
  });
  SwaggerModule.setup('api/docs', app, document);

  // write the swagger.json file to the assets folder
  if (process.env.NODE_ENV !== 'production') {
    await fs.promises.writeFile(path.join(APP_DIR, 'packages', 'backend', 'src', 'swagger.json'), JSON.stringify(document, null, 2));
  }
}

async function bootstrap() {
  patchNestJsSwagger();

  await generateSystemEnvFile();

  const app = await NestFactory.create(AppModule, {
    abortOnError: true,
    logger: ['error', 'warn', 'fatal'],
  });

  const appService = app.get(AppService);
  await appService.bootstrap();

  app.setGlobalPrefix('/api');
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors();
  app.use(cookieParser());

  await setupSwagger(app);

  await app.listen(3000);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});

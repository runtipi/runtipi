import path from 'node:path';
import { APP_DIR } from '@/common/constants.js';
import { MainExceptionFilter } from '@/common/error/exception.filter.js';
import { CacheModule } from '@/core/cache/cache.module.js';
import { ConfigurationModule } from '@/core/config/configuration.module.js';
import { DatabaseModule } from '@/core/database/database.module.js';
import { FilesystemModule } from '@/core/filesystem/filesystem.module.js';
import { HealthModule } from '@/core/health/health.module.js';
import { LoggerModule } from '@/core/logger/logger.module.js';
import { LoggerService } from '@/core/logger/logger.service.js';
import { SSEModule } from '@/core/sse/sse.module.js';
import { AuthModule } from '@/modules/auth/auth.module.js';
import { I18nModule } from '@/modules/i18n/i18n.module.js';
import { type DynamicModule, type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { SentryModule } from '@sentry/nestjs/setup';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AppLifecycleModule } from './modules/app-lifecycle/app-lifecycle.module.js';
import { AppStoreModule } from './modules/app-stores/app-store.module.js';
import { AppsModule } from './modules/apps/apps.module.js';
import { AuthMiddleware } from './modules/auth/auth.middleware.js';
import { BackupsModule } from './modules/backups/backups.module.js';
import { LinksModule } from './modules/links/links.module.js';
import { MarketplaceModule } from './modules/marketplace/marketplace.module.js';
import { NetworkModule } from './modules/network/network.module.js';
import { QueueModule } from './modules/queue/queue.module.js';
import { SystemModule } from './modules/system/system.module.js';
import { UserModule } from './modules/user/user.module.js';

const imports: (DynamicModule | typeof I18nModule)[] = [
  SentryModule.forRoot(),
  SystemModule,
  I18nModule,
  AuthModule,
  UserModule,
  ConfigurationModule,
  DatabaseModule,
  CacheModule,
  LoggerModule,
  AppsModule,
  FilesystemModule,
  AppStoreModule,
  QueueModule,
  AppLifecycleModule,
  LinksModule,
  BackupsModule,
  HealthModule,
  MarketplaceModule,
  SSEModule,
  NetworkModule,
];

if (process.env.NODE_ENV === 'production') {
  imports.push(
    ServeStaticModule.forRoot({
      rootPath: path.join(APP_DIR, 'assets', 'frontend'),
      exclude: ['/api*path'],
    }),
  );
}

@Module({
  imports,
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_FILTER,
      useFactory: (logger: LoggerService) => new MainExceptionFilter(logger),
      inject: [LoggerService],
    },
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('*all');
  }
}

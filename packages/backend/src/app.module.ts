import path from 'node:path';
import { CacheModule } from '@/core/cache/cache.module';
import { ConfigurationModule } from '@/core/config/configuration.module';
import { DatabaseModule } from '@/core/database/database.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { I18nModule } from '@/modules/i18n/i18n.module';
import { type DynamicModule, type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { SentryModule } from '@sentry/nestjs/setup';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { APP_DIR } from './common/constants';
import { MainExceptionFilter } from './common/error/exception.filter';
import { FilesystemModule } from './core/filesystem/filesystem.module';
import { HealthModule } from './core/health/health.module';
import { LoggerModule } from './core/logger/logger.module';
import { LoggerService } from './core/logger/logger.service';
import { SSEModule } from './core/sse/sse.module';
import { AppLifecycleModule } from './modules/app-lifecycle/app-lifecycle.module';
import { AppsModule } from './modules/apps/apps.module';
import { AuthMiddleware } from './modules/auth/auth.middleware';
import { BackupsModule } from './modules/backups/backups.module';
import { LinksModule } from './modules/links/links.module';
import { QueueModule } from './modules/queue/queue.module';
import { ReposModule } from './modules/repos/repos.module';
import { SystemModule } from './modules/system/system.module';
import { UserModule } from './modules/user/user.module';

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
  ReposModule,
  QueueModule,
  AppLifecycleModule,
  LinksModule,
  BackupsModule,
  HealthModule,
  SSEModule,
];

if (process.env.NODE_ENV === 'production') {
  imports.push(
    ServeStaticModule.forRoot({
      rootPath: path.join(APP_DIR, 'assets', 'frontend'),
      exclude: ['/api*'],
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
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}

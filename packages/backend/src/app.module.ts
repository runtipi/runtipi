import path from 'node:path';
import { CacheModule } from '@/core/cache/cache.module';
import { ConfigurationModule } from '@/core/config/configuration.module';
import { DatabaseModule } from '@/core/database/database.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { I18nModule } from '@/modules/i18n/i18n.module';
import { type DynamicModule, type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SentryModule } from '@sentry/nestjs/setup';
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
import { AppStoreModule } from './modules/app-stores/app-store.module';
import { AppsModule } from './modules/apps/apps.module';
import { AuthMiddleware } from './modules/auth/auth.middleware';
import { BackupsModule } from './modules/backups/backups.module';
import { DebugModule } from './modules/debug/debug.module';
import { LinksModule } from './modules/links/links.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { NetworkModule } from './modules/network/network.module';
import { QueueModule } from './modules/queue/queue.module';
import { SystemModule } from './modules/system/system.module';
import { UserModule } from './modules/user/user.module';
import { UserConfigModule } from './modules/user-config/user-config.module';
import { MutexModule } from './utils/mutex/mutex.module';
import { DockerModule } from './modules/docker/docker.module';
import { GithubModule } from './utils/github/github.module';
import { ArkValidationPipe } from 'nestjs-arktype';
import { AppConfigModule } from './modules/app-config/app-config.module';
import { CustomAppsModule } from './modules/custom-apps/custom-apps.module';

const DEFAULT_THROTTLE_TTL = 60_000;
const DEFAULT_THROTTLE_LIMIT = 300;

const imports: (DynamicModule | typeof I18nModule)[] = [
  SentryModule.forRoot(),
  ThrottlerModule.forRoot([{ ttl: DEFAULT_THROTTLE_TTL, limit: DEFAULT_THROTTLE_LIMIT }]),
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
  UserConfigModule,
  MutexModule,
  DockerModule,
  GithubModule,
  CustomAppsModule,
  AppConfigModule,
];

const { NODE_ENV } = process.env;
if (NODE_ENV === 'production') {
  imports.push(
    ServeStaticModule.forRoot({
      rootPath: path.join(APP_DIR, 'assets', 'frontend'),
      exclude: ['/api*path'],
    }),
  );
} else {
  imports.push(DebugModule);
}

@Module({
  imports,
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ArkValidationPipe,
    },
    {
      provide: APP_FILTER,
      useFactory: (logger: LoggerService) => new MainExceptionFilter(logger),
      inject: [LoggerService],
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('*all');
  }
}

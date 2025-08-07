import { Global, Module } from '@nestjs/common';
import { AsyncMutex } from './async-mutex';

export const APP_ASYNC_MUTEX = 'APP_ASYNC_MUTEX';

@Global()
@Module({
  imports: [],
  providers: [
    {
      provide: APP_ASYNC_MUTEX,
      useFactory: (): AsyncMutex => new AsyncMutex(),
      inject: [],
    },
  ],
  exports: [APP_ASYNC_MUTEX],
})
export class MutexModule {}

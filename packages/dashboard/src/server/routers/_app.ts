import { router } from '../trpc';
import { systemRouter } from './system/system.router';

export const appRouter = router({
  system: systemRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;

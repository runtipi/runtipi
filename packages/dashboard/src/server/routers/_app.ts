import { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { router } from '../trpc';
import { systemRouter } from './system/system.router';

export const appRouter = router({
  system: systemRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;

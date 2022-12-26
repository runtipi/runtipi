import { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { router } from '../trpc';
import { authRouter } from './auth/auth.router';
import { systemRouter } from './system/system.router';

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;

import { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { router } from '../trpc';
import { appRouter } from './app/app.router';
import { authRouter } from './auth/auth.router';
import { systemRouter } from './system/system.router';

export const mainRouter = router({
  system: systemRouter,
  auth: authRouter,
  app: appRouter,
});

// export type definition of API
export type AppRouter = typeof mainRouter;

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;

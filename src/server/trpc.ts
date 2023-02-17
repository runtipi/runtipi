import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { type Context } from './context';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});
// Base router and procedure helpers
export const { router } = t;

/**
 * Unprotected procedure
 * */
export const publicProcedure = t.procedure;

/**
 * Reusable middleware to ensure
 * users are logged in
 */
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You need to be logged in to perform this action' });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.userId },
    },
  });
});

/**
 * Protected procedure
 * */
export const protectedProcedure = t.procedure.use(isAuthed);

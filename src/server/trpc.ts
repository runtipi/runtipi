import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { typeToFlattenedError, ZodError } from 'zod';
import { type Context } from './context';

/**
 *
 * @param errors
 */
export function zodErrorsToRecord(errors: typeToFlattenedError<string>) {
  const record: Record<string, string> = {};
  Object.entries(errors.fieldErrors).forEach(([key, value]) => {
    const error = value?.[0];
    if (error) {
      record[key] = error;
    }
  });

  return record;
}
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.code === 'BAD_REQUEST' && error.cause instanceof ZodError ? zodErrorsToRecord(error.cause.flatten()) : null,
      },
    };
  },
});
// Base router and procedure helpers
export const { router } = t;

/**
 * Unprotected procedure
 */
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
 */
export const protectedProcedure = t.procedure.use(isAuthed);

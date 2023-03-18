import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { UserPermission } from './common/user-permissions';
import { type Context } from './context';
import { prisma } from './db/client';

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

const isAuthorized = (permission: UserPermission) =>
  t.middleware(async ({ ctx, next }) => {
    const user = await prisma.user.findFirst({ where: { id: Number(ctx.session?.userId) } });

    // Operator is always authorized
    if (user?.operator) return next();

    if (!user?.permissions.includes(permission)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not authorized to perform this action' });
    }

    return next();
  });

/**
 * Protected procedure
 * */
export const protectedProcedure = t.procedure.use(isAuthed);

export const permissionProcedure = (permission: UserPermission) => t.procedure.use(isAuthed).use(isAuthorized(permission));

import { z } from 'zod';
import { AuthServiceClass } from '../../services/auth/auth.service';
import { router, publicProcedure, protectedProcedure } from '../../trpc';
import { db } from '../../db';

const AuthService = new AuthServiceClass(db);

export const authRouter = router({
  me: publicProcedure.query(async ({ ctx }) => AuthService.me(ctx.userId)),
  changeLocale: protectedProcedure.input(z.object({ locale: z.string() })).mutation(async ({ input, ctx }) => AuthService.changeLocale({ userId: Number(ctx.userId), locale: input.locale })),
});

import { z } from 'zod';
import { AuthServiceClass } from '../../services/auth/auth.service';
import { router, publicProcedure, protectedProcedure } from '../../trpc';
import { db } from '../../db';

const AuthService = new AuthServiceClass(db);

export const authRouter = router({
  me: publicProcedure.query(async ({ ctx }) => AuthService.me(ctx.userId)),
  changeLocale: protectedProcedure.input(z.object({ locale: z.string() })).mutation(async ({ input, ctx }) => AuthService.changeLocale({ userId: Number(ctx.userId), locale: input.locale })),
  // Password
  changePassword: protectedProcedure
    .input(z.object({ currentPassword: z.string(), newPassword: z.string() }))
    .mutation(({ input, ctx }) => AuthService.changePassword({ userId: Number(ctx.userId), ...input })),
  // Totp
  getTotpUri: protectedProcedure.input(z.object({ password: z.string() })).mutation(({ input, ctx }) => AuthService.getTotpUri({ userId: Number(ctx.userId), password: input.password })),
  setupTotp: protectedProcedure.input(z.object({ totpCode: z.string() })).mutation(({ input, ctx }) => AuthService.setupTotp({ userId: Number(ctx.userId), totpCode: input.totpCode })),
  disableTotp: protectedProcedure.input(z.object({ password: z.string() })).mutation(({ input, ctx }) => AuthService.disableTotp({ userId: Number(ctx.userId), password: input.password })),
});

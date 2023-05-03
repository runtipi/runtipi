import { z } from 'zod';
import { AuthServiceClass } from '../../services/auth/auth.service';
import { router, publicProcedure, protectedProcedure } from '../../trpc';
import { db } from '../../db';

const AuthService = new AuthServiceClass(db);

export const authRouter = router({
  login: publicProcedure.input(z.object({ username: z.string(), password: z.string() })).mutation(async ({ input, ctx }) => AuthService.login({ ...input }, ctx.req)),
  logout: protectedProcedure.mutation(async ({ ctx }) => AuthServiceClass.logout(ctx.req)),
  register: publicProcedure.input(z.object({ username: z.string(), password: z.string() })).mutation(async ({ input, ctx }) => AuthService.register({ ...input }, ctx.req)),
  me: publicProcedure.query(async ({ ctx }) => AuthService.me(ctx.req.session?.userId)),
  isConfigured: publicProcedure.query(async () => AuthService.isConfigured()),
  // Password
  checkPasswordChangeRequest: publicProcedure.query(AuthServiceClass.checkPasswordChangeRequest),
  changeOperatorPassword: publicProcedure.input(z.object({ newPassword: z.string() })).mutation(({ input }) => AuthService.changeOperatorPassword({ newPassword: input.newPassword })),
  cancelPasswordChangeRequest: publicProcedure.mutation(AuthServiceClass.cancelPasswordChangeRequest),
  changePassword: protectedProcedure
    .input(z.object({ currentPassword: z.string(), newPassword: z.string() }))
    .mutation(({ input, ctx }) => AuthService.changePassword({ userId: Number(ctx.req.session.userId), ...input })),
  // Totp
  verifyTotp: publicProcedure.input(z.object({ totpSessionId: z.string(), totpCode: z.string() })).mutation(({ input, ctx }) => AuthService.verifyTotp(input, ctx.req)),
  getTotpUri: protectedProcedure.input(z.object({ password: z.string() })).mutation(({ input, ctx }) => AuthService.getTotpUri({ userId: Number(ctx.req.session.userId), password: input.password })),
  setupTotp: protectedProcedure.input(z.object({ totpCode: z.string() })).mutation(({ input, ctx }) => AuthService.setupTotp({ userId: Number(ctx.req.session.userId), totpCode: input.totpCode })),
  disableTotp: protectedProcedure.input(z.object({ password: z.string() })).mutation(({ input, ctx }) => AuthService.disableTotp({ userId: Number(ctx.req.session.userId), password: input.password })),
});

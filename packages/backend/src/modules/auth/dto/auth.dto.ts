import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Login
export class LoginBody extends createZodDto(
  z.object({
    username: z.string(),
    password: z.string(),
  }),
) {}

export class VerifyTotpBody extends createZodDto(
  z.object({
    totpCode: z.string(),
    totpSessionId: z.string(),
  }),
) {}

export class LoginDto extends createZodDto(
  z.object({
    success: z.boolean(),
    totpSessionId: z.string().optional(),
  }),
) {}

// Register
export class RegisterBody extends createZodDto(
  z.object({
    username: z.string(),
    password: z.string(),
  }),
) {}

export class RegisterDto extends createZodDto(
  z.object({
    success: z.boolean(),
  }),
) {}

// Change username
export class ChangeUsernameBody extends createZodDto(
  z.object({
    newUsername: z.string(),
    password: z.string(),
  }),
) {}

// Change password
export class ChangePasswordBody extends createZodDto(
  z.object({
    currentPassword: z.string(),
    newPassword: z.string(),
  }),
) {}

// TOTP
export class GetTotpUriBody extends createZodDto(
  z.object({
    password: z.string(),
  }),
) {}

export class GetTotpUriDto extends createZodDto(
  z.object({
    key: z.string(),
    uri: z.string(),
  }),
) {}

export class SetupTotpBody extends createZodDto(
  z.object({
    code: z.string(),
  }),
) {}

export class DisableTotpBody extends createZodDto(
  z.object({
    password: z.string(),
  }),
) {}

// Reset password
export class ResetPasswordBody extends createZodDto(
  z.object({
    newPassword: z.string(),
  }),
) {}

export class ResetPasswordDto extends createZodDto(
  z.object({
    success: z.boolean(),
    email: z.string(),
  }),
) {}

export class CheckResetPasswordRequestDto extends createZodDto(
  z.object({
    isRequestPending: z.boolean(),
  }),
) {}

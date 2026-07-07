import { type } from 'arktype';
import { createArkDto } from 'nestjs-arktype';

const credentialsSchema = type({
  username: 'string',
  password: 'string',
  redirectUrl: 'string.url?',
});

const verifyTotpSchema = type({
  totpCode: 'string',
  totpSessionId: 'string',
  redirectUrl: 'string.url?',
});

const changeUsernameSchema = type({
  newUsername: 'string',
  password: 'string',
});

const changePasswordSchema = type({
  currentPassword: 'string',
  newPassword: 'string',
});

const getTotpUriSchema = type({
  password: 'string',
});

const setupTotpSchema = type({
  code: 'string',
});

const disableTotpSchema = type({
  password: 'string',
});

const resetPasswordSchema = type({
  newPassword: 'string',
});

const forwardAuthSchema = type({
  redirectUrl: 'string.url',
});

const loginResponseSchema = type({
  success: 'boolean',
  totpSessionId: 'string?',
  redirectUrl: 'string.url?',
});

const registerResponseSchema = type({
  success: 'boolean',
});

const getTotpUriResponseSchema = type({
  key: 'string',
  uri: 'string',
});

const resetPasswordResponseSchema = type({
  success: 'boolean',
  email: 'string',
});

const checkResetPasswordRequestSchema = type({
  isRequestPending: 'boolean',
});

// Login
export class LoginBody extends createArkDto(credentialsSchema, { name: 'LoginBody', input: true }) {}
export class VerifyTotpBody extends createArkDto(verifyTotpSchema, { name: 'VerifyTotpBody', input: true }) {}
export class LoginDto extends createArkDto(loginResponseSchema, { name: 'LoginDto' }) {}

// Register
export class RegisterBody extends createArkDto(credentialsSchema, { name: 'RegisterBody', input: true }) {}
export class RegisterDto extends createArkDto(registerResponseSchema, { name: 'RegisterDto' }) {}

// Change username
export class ChangeUsernameBody extends createArkDto(changeUsernameSchema, { name: 'ChangeUsernameBody', input: true }) {}

// Change password
export class ChangePasswordBody extends createArkDto(changePasswordSchema, { name: 'ChangePasswordBody', input: true }) {}

// TOTP
export class GetTotpUriBody extends createArkDto(getTotpUriSchema, { name: 'GetTotpUriBody', input: true }) {}
export class GetTotpUriDto extends createArkDto(getTotpUriResponseSchema, { name: 'GetTotpUriDto' }) {}
export class SetupTotpBody extends createArkDto(setupTotpSchema, { name: 'SetupTotpBody', input: true }) {}
export class DisableTotpBody extends createArkDto(disableTotpSchema, { name: 'DisableTotpBody', input: true }) {}

// Reset password
export class ResetPasswordBody extends createArkDto(resetPasswordSchema, { name: 'ResetPasswordBody', input: true }) {}
export class ResetPasswordDto extends createArkDto(resetPasswordResponseSchema, { name: 'ResetPasswordDto' }) {}
export class CheckResetPasswordRequestDto extends createArkDto(checkResetPasswordRequestSchema, { name: 'CheckResetPasswordRequestDto' }) {}
export class ForwardAuthBody extends createArkDto(forwardAuthSchema, { name: 'ForwardAuthBody', input: true }) {}

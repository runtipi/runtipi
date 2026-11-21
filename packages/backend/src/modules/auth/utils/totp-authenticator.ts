import { createGuardrails } from '@otplib/core';
import { Authenticator } from '@otplib/v12-adapter';

// Existing enrollments used ten-byte secrets; new secrets use the adapter's stronger default.
export const TotpAuthenticator = new Authenticator({ guardrails: createGuardrails({ MIN_SECRET_BYTES: 10 }) });

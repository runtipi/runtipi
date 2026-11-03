import { Authenticator } from '@otplib/core';
import { createDigest, createRandomBytes } from '@otplib/plugin-crypto';
import { keyDecoder, keyEncoder } from '@otplib/plugin-thirty-two';

// window: 1 accepts codes from the previous and next 30s timestep (RFC 6238 §5.2), so codes
// remain valid briefly after rollover — e.g. while an authenticator app still displays them
// or an auto-typing tool submits them (grace period).
export const TotpAuthenticator = new Authenticator({ createDigest, createRandomBytes, keyEncoder, keyDecoder, window: 1 });

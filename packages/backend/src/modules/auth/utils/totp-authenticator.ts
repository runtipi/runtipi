import { Authenticator } from '@otplib/core';
import { createDigest, createRandomBytes } from '@otplib/plugin-crypto';
import { keyDecoder, keyEncoder } from '@otplib/plugin-thirty-two';

export const TotpAuthenticator = new Authenticator({ createDigest, createRandomBytes, keyEncoder, keyDecoder });

import { Authenticator } from '@otplib/core';
import { keyDecoder, keyEncoder } from '@otplib/plugin-thirty-two';
import { createDigest, createRandomBytes } from '@otplib/plugin-crypto';

export const TotpAuthenticator = new Authenticator({ createDigest, createRandomBytes, keyEncoder, keyDecoder });

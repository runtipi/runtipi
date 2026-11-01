import { createDigest, createRandomBytes } from '@otplib/plugin-crypto';
import { keyDecoder, keyEncoder } from '@otplib/plugin-thirty-two';
import { describe, expect, it } from 'vitest';
import { TotpAuthenticator } from '../totp-authenticator';

describe('TotpAuthenticator', () => {
  const STEP_MS = 30_000;

  // Generate a token for a specific timestep offset relative to the current one.
  // Aligning to step boundaries instead of subtracting from Date.now() avoids
  // flakiness when the test runs within a second of a step rollover.
  // create() does not inherit options, so the plugin functions must be re-passed.
  const tokenForStepOffset = (secret: string, offset: number): string => {
    const currentStep = Math.floor(Date.now() / STEP_MS);
    return TotpAuthenticator.create({ createDigest, createRandomBytes, keyEncoder, keyDecoder, epoch: (currentStep + offset) * STEP_MS }).generate(
      secret,
    );
  };

  it('accepts the code for the current timestep', () => {
    const secret = TotpAuthenticator.generateSecret();

    expect(TotpAuthenticator.check(tokenForStepOffset(secret, 0), secret)).toBe(true);
  });

  it('accepts the code from the previous timestep as a grace period', () => {
    const secret = TotpAuthenticator.generateSecret();

    expect(TotpAuthenticator.check(tokenForStepOffset(secret, -1), secret)).toBe(true);
  });

  it('accepts the code from the next timestep as a grace period', () => {
    const secret = TotpAuthenticator.generateSecret();

    expect(TotpAuthenticator.check(tokenForStepOffset(secret, 1), secret)).toBe(true);
  });

  it('rejects the code from two timesteps back', () => {
    const secret = TotpAuthenticator.generateSecret();

    expect(TotpAuthenticator.check(tokenForStepOffset(secret, -2), secret)).toBe(false);
  });

  it('rejects the code from two timesteps ahead', () => {
    const secret = TotpAuthenticator.generateSecret();

    expect(TotpAuthenticator.check(tokenForStepOffset(secret, 2), secret)).toBe(false);
  });
});

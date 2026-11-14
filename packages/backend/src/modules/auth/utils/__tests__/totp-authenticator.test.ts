import { createDigest, createRandomBytes } from '@otplib/plugin-crypto';
import { keyDecoder, keyEncoder } from '@otplib/plugin-thirty-two';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TotpAuthenticator } from '../totp-authenticator';

describe('TotpAuthenticator', () => {
  const STEP_MS = 30_000;

  // Fixed fake clock, so token generation and check run at the same instant and
  // timestep rollovers can never change the expected offsets (otplib defaults
  // `epoch: Date.now()` per call). Pinned 5s into a step, away from the boundary.
  const FIXED_EPOCH = 1_700_000_015_000; // 5s into step 56_666_667 — far from any rollover

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_EPOCH);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Generate a token for a specific timestep offset relative to the fixed clock.
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

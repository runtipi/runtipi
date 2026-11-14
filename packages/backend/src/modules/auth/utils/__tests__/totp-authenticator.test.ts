import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TotpAuthenticator } from '../totp-authenticator';

afterEach(() => vi.useRealTimers());

describe('TotpAuthenticator', () => {
  it('accepts existing ten-byte secrets with the same six-digit tokens', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
    const digest = createHmac('sha1', Buffer.from('1234567890')).update(counter).digest();
    const offset = digest.readUInt8(digest.length - 1) & 15;
    const token = String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');

    expect(TotpAuthenticator.check(token, 'GEZDGNBVGY3TQOJQ')).toBe(true);
    expect(TotpAuthenticator.check(token, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')).toBe(false);
    expect(TotpAuthenticator.check('invalid', 'GEZDGNBVGY3TQOJQ')).toBe(false);
  });

  it('creates secrets and enrollment URIs usable by authenticator apps', () => {
    const secret = TotpAuthenticator.generateSecret();
    const uri = new URL(TotpAuthenticator.keyuri('test@example.com', 'Runtipi', secret));

    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(uri.protocol).toBe('otpauth:');
    expect(uri.hostname).toBe('totp');
    expect(uri.searchParams.get('secret')).toBe(secret);
    expect(uri.searchParams.get('issuer')).toBe('Runtipi');
  });
});

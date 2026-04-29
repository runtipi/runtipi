import { describe, expect, it } from 'vitest';
import { isValidIpOrCidr, parseTrustedProxyIps } from './configuration.service';

describe('isValidIpOrCidr', () => {
  it('accepts valid IPv4 and IPv6 addresses', () => {
    expect(isValidIpOrCidr('192.0.2.10')).toBe(true);
    expect(isValidIpOrCidr('2001:db8::1')).toBe(true);
  });

  it('accepts valid IPv4 and IPv6 CIDR ranges', () => {
    expect(isValidIpOrCidr('192.0.2.0/24')).toBe(true);
    expect(isValidIpOrCidr('2001:db8::/32')).toBe(true);
    expect(isValidIpOrCidr('0.0.0.0/0')).toBe(true);
    expect(isValidIpOrCidr('::/0')).toBe(true);
  });

  it('rejects malformed addresses and invalid CIDR prefixes', () => {
    expect(isValidIpOrCidr('192.0.2.999')).toBe(false);
    expect(isValidIpOrCidr('192.0.2.0/33')).toBe(false);
    expect(isValidIpOrCidr('2001:db8::/129')).toBe(false);
    expect(isValidIpOrCidr('2001:db8::/abc')).toBe(false);
    expect(isValidIpOrCidr('192.0.2.0/24/extra')).toBe(false);
  });
});

describe('parseTrustedProxyIps', () => {
  it('trims tokens and returns only valid IPs and CIDRs', () => {
    const result = parseTrustedProxyIps(' 192.0.2.10 , invalid , 2001:db8::/32, 192.0.2.0/33, , ::1 ');

    expect(result.trustedProxyIps).toEqual(['192.0.2.10', '2001:db8::/32', '::1']);
    expect(result.invalidProxyIps).toEqual(['invalid', '192.0.2.0/33']);
  });
});

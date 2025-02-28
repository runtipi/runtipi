import { CacheService } from '@/core/cache/cache.service';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AuthService } from '../auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let cacheService = mock<CacheService>();

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AuthService],
    })
      .useMocker(mock)
      .compile();

    authService = moduleRef.get(AuthService);
    cacheService = moduleRef.get(CacheService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('getCookieDomain', () => {
    it('should return undefined if the domain is localhost', async () => {
      const domain = 'localhost';
      const result = await authService.getCookieDomain(domain);
      expect(result).toBeUndefined();
    });

    it('should return undefined if the domain is an IP address', async () => {
      const domain = '192.168.3.20';
      const result = await authService.getCookieDomain(domain);
      expect(result).toBeUndefined();
    });

    it('should return with subdomain if domain is in public suffix list', async () => {
      cacheService.get.calledWith('psl:duckdns.org').mockResolvedValue('true');

      const domain = 'example.duckdns.org';
      const result = await authService.getCookieDomain(domain);

      expect(result).toBe(`.${domain}`);
    });

    it('should return without subdomain if domain is not in public suffix list', async () => {
      cacheService.get.calledWith('psl:example.com').mockResolvedValue('false');

      const domain = 'cool.example.com';
      const result = await authService.getCookieDomain(domain);

      expect(result).toBe('.example.com');
    });

    it('should return input if domain is not using a standard tld', async () => {
      const domain = 'example.whatever';
      const result = await authService.getCookieDomain(domain);

      expect(result).toBe(`.${domain}`);
    });

    it('should return main domain when using multiple levels of subdomains', async () => {
      cacheService.get.calledWith('psl:example.com').mockResolvedValue('false');
      const domain = 'sub.sub.example.com';
      const result = await authService.getCookieDomain(domain);

      expect(result).toBe('.example.com');
    });

    it('should return first available subdomain when using multiple levels of subdomains in a public suffix', async () => {
      cacheService.get.calledWith('psl:duckdns.org').mockResolvedValue('true');
      const domain = 'sub.sub.duckdns.org';
      const result = await authService.getCookieDomain(domain);

      expect(result).toBe('.sub.duckdns.org');
    });
  });
});

import { CacheService } from '@/core/cache/cache.service.js';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AuthService } from '../auth.service.js';

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
    it('should return undefined if the domain is localhost', () => {
      const domain = 'localhost';
      const result = authService.getCookieDomain(domain);
      expect(result).toBeUndefined();
    });

    it('should return undefined if the domain is an IP address', () => {
      const domain = '192.168.3.20';
      const result = authService.getCookieDomain(domain);
      expect(result).toBeUndefined();
    });

    it('should return with subdomain', () => {
      const domain = 'example.duckdns.org';
      const result = authService.getCookieDomain(domain);

      expect(result).toBe(`.${domain}`);
    });

    it('should return input if domain is not using a standard tld', () => {
      const domain = 'example.whatever';
      const result = authService.getCookieDomain(domain);

      expect(result).toBe(`.${domain}`);
    });

    it('should return all subdomains when using multiple levels of subdomains', () => {
      const domain = 'sub.sub.duckdns.org';
      const result = authService.getCookieDomain(domain);

      expect(result).toBe('.sub.sub.duckdns.org');
    });
  });
});

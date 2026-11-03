import { ConfigurationService } from '@/core/config/configuration.service';
import { AuthService } from '../auth.service';
import { Test } from '@nestjs/testing';
import { fromPartial } from '@total-typescript/shoehorn';
import type { Response } from 'express';
import { expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';

const setup = async () => {
  const config = mock<ConfigurationService>();
  config.get.mockReturnValue(fromPartial({ experimental: { insecureCookie: false } }));

  const module = await Test.createTestingModule({ providers: [AuthService, { provide: ConfigurationService, useValue: config }] })
    .useMocker(mock)
    .compile();

  return module.get(AuthService);
};

test.each(['example.com', 'example.com:443', '192.168.1.2'])('HTTPS login on %s sets a secure host-only session cookie', async (host) => {
  const service = await setup();
  const response = mock<Response>();

  await service.setSessionCookie(response, 'session-id', fromPartial({ headers: { host, 'x-forwarded-host': host, 'x-forwarded-proto': 'https' } }));

  expect(response.cookie).toHaveBeenCalledWith('runtipi-sid', 'session-id', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 86400000,
  });
});

test('removes the legacy domain cookie before setting a host-only cookie', async () => {
  const service = await setup();
  const response = mock<Response>();

  await service.setSessionCookie(response, 'session-id', fromPartial({ headers: { host: 'example.com' }, protocol: 'https' }));

  expect(response.clearCookie).toHaveBeenCalledWith('runtipi-sid', { domain: '.example.com' });
  expect(response.cookie).toHaveBeenCalledWith('runtipi-sid', 'session-id', expect.objectContaining({ secure: true }));
});

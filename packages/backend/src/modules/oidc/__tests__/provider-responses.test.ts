import { expect, test } from 'vitest';
import { OIDCProvidersLoginDto } from '../dto/oidc.dto';
import { OIDCController } from '../oidc.controller';
import { OIDCRepository } from '../oidc.repository';
import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';

const provider = {
  id: 1,
  userId: 1,
  slug: 'example',
  displayName: 'Example',
  clientId: 'private-client',
  clientSecret: 'private-secret',
  issuer: 'https://idp.example',
  discovery: 'https://idp.example/.well-known/openid-configuration',
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

test('public provider serialization strips private database fields', () => {
  const result = OIDCProvidersLoginDto.parse({ providers: [provider] });

  expect(JSON.parse(JSON.stringify(result))).toEqual({ providers: [{ slug: 'example', displayName: 'Example' }] });
});

test('provider discovery exposes only login labels and slugs', async () => {
  const repository = mock<OIDCRepository>();
  repository.getOIDCProviders.mockResolvedValue([provider]);

  const module = await Test.createTestingModule({ providers: [OIDCController, { provide: OIDCRepository, useValue: repository }] })
    .useMocker(mock)
    .compile();

  const result = await module.get(OIDCController).getLoginProviders();

  expect(JSON.parse(JSON.stringify(result))).toEqual({ providers: [{ slug: 'example', displayName: 'Example' }] });
});

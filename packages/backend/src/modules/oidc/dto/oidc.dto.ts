import { type } from 'arktype';
import { createArkDto } from 'nestjs-arktype';

export const oidcProviderSchema = type({
  id: 'number',
  name: 'string',
  clientId: 'string',
  clientSecret: 'string',
  authorizeUri: 'string',
  tokenUri: 'string',
  userInfoUri: 'string',
});

export const oidcProvidersSchema = type({
  providers: oidcProviderSchema.array(),
});

export class OidcProviderDto extends createArkDto(oidcProviderSchema, { name: 'OidcProviderDto', input: true }) {}
export class OidcProvidersDto extends createArkDto(oidcProvidersSchema, { name: 'OidcProvidersDto' }) {}

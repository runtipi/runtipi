import { type } from 'arktype';
import { createArkDto } from 'nestjs-arktype';

const providerSettings = type({
  displayName: '1 <= string <= 100',
  clientId: 'string >= 1',
  issuer: 'string.url & /^https:\\/\\//',
  discovery: 'string.url & /^https:\\/\\//',
});

const createProvider = providerSettings.and({
  slug: '1 <= string <= 64 & /^[a-z0-9]+(?:-[a-z0-9]+)*$/',
  clientSecret: 'string >= 1',
});

const editProvider = providerSettings.and({ 'clientSecret?': 'string >= 1' });
const providerResponse = providerSettings.and({ slug: 'string >= 1' }).onUndeclaredKey('delete');
const publicProvider = type({ slug: 'string >= 1', displayName: 'string >= 1' }).onUndeclaredKey('delete');

export class CreateOIDCProviderDto extends createArkDto(createProvider, { name: 'CreateOIDCProviderDto', input: true }) {}
export class EditOIDCProviderDto extends createArkDto(editProvider, { name: 'EditOIDCProviderDto', input: true }) {}
export class GetOIDCProviderDto extends createArkDto(providerResponse, { name: 'GetOIDCProviderDto' }) {}
export class GetOIDCProvidersDto extends createArkDto(type({ providers: providerResponse.array() }), { name: 'GetOIDCProvidersDto' }) {}
export class OIDCProvidersLoginDto extends createArkDto(type({ providers: publicProvider.array() }), { name: 'OIDCProvidersLoginDto' }) {}

const trustedSub = type({
  slug: 'string',
  sub: 'string',
  providerSlug: 'string',
  providerDisplayName: 'string',
  createdAt: 'number',
}).onUndeclaredKey('delete');

export class TrustedSubsDto extends createArkDto(type({ subs: trustedSub.array() }), { name: 'TrustedSubsDto' }) {}
export class GetOIDCProviderURLDto extends createArkDto(type({ url: 'string.url' }), { name: 'GetOIDCProviderURLDto' }) {}
export class StartOIDCLoginBody extends createArkDto(type({ 'redirectUrl?': 'string.url' }), { name: 'StartOIDCLoginBody', input: true }) {}
export class LinkOIDCProviderBody extends createArkDto(type({ password: 'string >= 1' }), { name: 'LinkOIDCProviderBody', input: true }) {}

import { CacheService } from '@/core/cache/cache.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { type } from 'arktype';
import * as client from 'openid-client';
import { OIDCRepository, type OIDCProvider } from './oidc.repository';

const metadataSchema = type({
  issuer: 'string.url',
  authorization_endpoint: 'string.url',
  token_endpoint: 'string.url',
  jwks_uri: 'string.url',
});

const flowSchema = type({ purpose: "'login'", 'redirectUrl?': 'string.url' }).or({
  purpose: "'link'",
  userId: 'number',
  sessionId: 'string',
});

const transactionSchema = type({
  providerId: 'number',
  providerVersion: 'number',
  callbackUrl: 'string.url',
  verifier: 'string',
  nonce: 'string',
  flow: flowSchema,
});

type AuthorizationFlow = typeof flowSchema.infer;
type Actor = { userId: number; sessionId: string };

export const OIDC_TRANSACTION_TTL = 5 * 60;
const transactionKey = (state: string) => `oidc:transaction:${state}`;

@Injectable()
export class OIDCService {
  constructor(
    private readonly repository: OIDCRepository,
    private readonly cache: CacheService,
  ) {}

  private async discover(provider: OIDCProvider) {
    const response = await fetch(provider.discovery, { redirect: 'error', signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new UnauthorizedException('OIDC discovery failed');

    const metadata = metadataSchema.assert(await response.json());
    if (metadata.issuer !== provider.issuer) {
      throw new UnauthorizedException('OIDC issuer mismatch');
    }

    const config = new client.Configuration(metadata, provider.clientId, provider.clientSecret);
    config.timeout = 10;
    client.enableNonRepudiationChecks(config);

    return config;
  }

  async authorize(slug: string, callbackUrl: URL, flow: AuthorizationFlow) {
    const provider = await this.repository.getOIDCProviderBySlug(slug);
    if (flow.purpose === 'link' && provider.userId !== flow.userId) {
      throw new UnauthorizedException('OIDC provider does not belong to this user');
    }

    const config = await this.discover(provider);
    const state = client.randomState();
    const verifier = client.randomPKCECodeVerifier();
    const nonce = client.randomNonce();
    const challenge = await client.calculatePKCECodeChallenge(verifier);
    const url = client.buildAuthorizationUrl(config, {
      state,
      nonce,
      redirect_uri: callbackUrl.href,
      scope: 'openid',
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });

    this.cache.set(
      transactionKey(state),
      JSON.stringify({
        providerId: provider.id,
        providerVersion: provider.version,
        callbackUrl: callbackUrl.href,
        verifier,
        nonce,
        flow,
      }),
      OIDC_TRANSACTION_TTL,
    );

    return { state, url: url.href };
  }

  async authenticate(slug: string, callbackUrl: URL, browserState: string | undefined, actor: Actor | undefined) {
    const states = callbackUrl.searchParams.getAll('state');
    const state = states[0];
    if (states.length !== 1 || !state || state !== browserState) {
      throw new UnauthorizedException('OIDC browser transaction mismatch');
    }

    const cached = this.cache.take(transactionKey(state));
    if (!cached) throw new UnauthorizedException('OIDC transaction expired or already used');

    const transaction = transactionSchema.assert(JSON.parse(cached));
    const expectedCallback = new URL(callbackUrl);
    expectedCallback.search = '';
    if (expectedCallback.href !== transaction.callbackUrl) {
      throw new UnauthorizedException('OIDC callback mismatch');
    }

    const { flow } = transaction;
    if (flow.purpose === 'login' && actor) {
      throw new UnauthorizedException('Login cannot become account linking');
    }
    if (flow.purpose === 'link' && (flow.userId !== actor?.userId || flow.sessionId !== actor?.sessionId)) {
      throw new UnauthorizedException('OIDC linking session changed');
    }

    const provider = await this.repository.getOIDCProviderBySlug(slug);
    if (provider.id !== transaction.providerId || provider.version !== transaction.providerVersion) {
      throw new UnauthorizedException('OIDC provider changed during authorization');
    }

    const config = await this.discover(provider);
    const tokens = await client.authorizationCodeGrant(config, callbackUrl, {
      expectedState: state,
      expectedNonce: transaction.nonce,
      pkceCodeVerifier: transaction.verifier,
      idTokenExpected: true,
    });

    const sub = tokens.claims()?.sub;
    if (!sub) throw new UnauthorizedException('OIDC subject missing');

    if (flow.purpose === 'link') {
      await this.repository.linkIdentity(provider.id, provider.version, sub, flow.userId);
      return { purpose: 'link' as const };
    }

    const userId = await this.repository.getTrustedUserId(provider.id, provider.version, sub);

    return { purpose: 'login' as const, userId, redirectUrl: flow.redirectUrl };
  }
}

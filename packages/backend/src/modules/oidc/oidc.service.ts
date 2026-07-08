import { Injectable } from '@nestjs/common';
import { OIDCRepository } from './oidc.repository';
import * as client from 'openid-client';
import { LoggerService } from '@/core/logger/logger.service';
import {
  CreateOIDCProviderDto,
  EditOIDCProviderDto,
  GetOIDCProviderDto,
  GetOIDCProvidersDto,
  OIDCProviderDto,
  OIDCProviderLoginDto,
  OIDCProvidersLoginDto,
  TrustedSubDto,
  TrustedSubsDto,
} from '@/modules/oidc/dto/oidc.dto';
import { CacheService } from '@/core/cache/cache.service';
import { type } from 'arktype';

const trustedStateSchema = type({
  clientId: 'string',
  flowType: "'sub_register' | 'login'",
  providerId: 'number',
  url: 'string',
});

type TrustedStateSchema = typeof trustedStateSchema.infer;

@Injectable()
export class OIDCService {
  constructor(
    private readonly oidcRepository: OIDCRepository,
    private readonly logger: LoggerService,
    private readonly cacheService: CacheService,
  ) {}

  private buildClientConfig(provider: OIDCProviderDto) {
    const providerURL = new URL(provider.authorizeUrl);
    const issuer = providerURL.href.substring(0, providerURL.href.lastIndexOf('/'));

    const server: client.ServerMetadata = {
      issuer: issuer,
      authorization_endpoint: provider.authorizeUrl,
      token_endpoint: provider.tokenUrl,
      userinfo_endpoint: provider.userInfoUrl,
    };

    return new client.Configuration(server, provider.clientId, provider.clientSecret);
  }

  public async getProviderAuthURL(slug: string, reqURL: URL, hasUser: boolean): Promise<string | undefined> {
    try {
      const provider = await this.oidcRepository.getOIDCProviderBySlug(slug);

      if (!provider) {
        throw new Error('Provider not found');
      }

      const config = this.buildClientConfig(provider);
      const state = client.randomState();

      let flowType: 'sub_register' | 'login' = 'login';

      if (hasUser) {
        flowType = 'sub_register';
      }

      const trustedState: TrustedStateSchema = {
        clientId: provider.clientId,
        providerId: provider.id,
        flowType: flowType,
        url: reqURL.href,
      };

      this.cacheService.set(state, JSON.stringify(trustedState), Date.now() + 3600000);

      const redirectURL = `${reqURL.origin}/api/oidc/providers/${provider.slug}/callback`;
      const authURL = client.buildAuthorizationUrl(config, { state, redirect_uri: redirectURL, scope: 'openid' });

      return authURL.href;
    } catch (error) {
      this.logger.error('Failed to get auth URL: ', error);
      return undefined;
    }
  }

  public async getTokenFromCallback(state: string, reqURL: URL, hasUser: boolean): Promise<client.TokenEndpointResponse | undefined> {
    try {
      const trustedState = this.cacheService.get(state);

      if (!trustedState) {
        throw new Error('Invalid state');
      }

      this.cacheService.del(state);

      const out = trustedStateSchema(JSON.parse(trustedState));

      if (out instanceof type.errors) {
        throw new Error('Got errors parsing trusted state cache');
      }

      const outURLObj = new URL(out.url);

      if (outURLObj.protocol !== reqURL.protocol && outURLObj.host !== reqURL.host) {
        throw new Error('Invalid redirect URI');
      }

      const provider = await this.oidcRepository.getOIDCProviderById(out.providerId);

      if (!provider) {
        throw new Error('Invalid provider');
      }

      if (out.clientId !== provider.clientId) {
        throw new Error('Client ID mismatch');
      }

      if (!hasUser && out.flowType === 'sub_register') {
        throw new Error('Sub register requested but no user was found');
      }

      const config = this.buildClientConfig(provider);

      return await client.authorizationCodeGrant(config, reqURL, {
        expectedState: state,
        idTokenExpected: true,
      });
    } catch (error) {
      this.logger.error('Failed to get token from callback', error);
      return undefined;
    }
  }

  public async fetchUserInfo(providerId: number, access_token: string): Promise<{ sub: string } | undefined> {
    try {
      const provider = await this.oidcRepository.getOIDCProviderById(providerId);

      if (!provider) {
        throw new Error('Provider not found');
      }

      const config = this.buildClientConfig(provider);
      const userInfoResponse = await client.fetchProtectedResource(config, access_token, new URL(provider.userInfoUrl), 'GET');
      const bodyJSON = (await userInfoResponse.json()) as { sub?: string };

      if (!bodyJSON?.sub) {
        throw new Error('Sub claim not found');
      }

      return {
        sub: bodyJSON.sub,
      };
    } catch (error) {
      this.logger.error('Failed to fetch user info', error);
      return undefined;
    }
  }

  public async createOIDCProvider(input: CreateOIDCProviderDto, userId: number): Promise<CreateOIDCProviderDto | undefined> {
    return await this.oidcRepository.createOIDCProvider(input, userId);
  }

  public async createOIDCTrustedSub(sub: string, userId: number, providerId: number) {
    try {
      const provider = await this.oidcRepository.getOIDCProviderById(providerId);

      if (!provider) {
        throw new Error('Provider not found');
      }

      const subSlug = `${provider.slug}-${sub.slice(-4)}`;

      await this.oidcRepository.storeOIDCTrustedSub(sub, userId, providerId, subSlug);
    } catch (error) {
      this.logger.error('Failed to create an OIDC trusted sub', error);
    }
  }

  public async deleteOIDCProvider(slug: string): Promise<void> {
    try {
      const provider = await this.oidcRepository.getOIDCProviderBySlug(slug);

      if (!provider) {
        throw new Error('Provider not found');
      }

      await this.oidcRepository.deleteOIDCProvider(provider.id);
    } catch (error) {
      this.logger.error('Failed to delete OIDC provider', error);
    }
  }

  public async editOIDCProvider(slug: string, input: EditOIDCProviderDto): Promise<OIDCProviderDto | undefined> {
    try {
      const provider = await this.oidcRepository.getOIDCProviderBySlug(slug);

      if (!provider) {
        throw new Error('Provider not found');
      }

      return await this.oidcRepository.editOIDCProvider(provider.id, input);
    } catch (error) {
      this.logger.error('Failed to edit OIDC provider', error);
      return undefined;
    }
  }

  public async deleteTrustedSub(slug: string): Promise<void> {
    try {
      const trustedSub = await this.oidcRepository.getOIDCTrustedSubBySlug(slug);

      if (!trustedSub) {
        throw new Error('Trusted sub not found.');
      }

      await this.oidcRepository.deleteOIDCTrustedSub(trustedSub.id);
    } catch (error) {
      this.logger.error('Failed to delete trusted sub', error);
    }
  }

  public async getTrustedSubsForUser(userId: number): Promise<TrustedSubsDto | undefined> {
    try {
      const oidcProviders = await this.oidcRepository.getOIDCProvidersForUser(userId);

      if (!oidcProviders) {
        return TrustedSubsDto.parse({ subs: [] });
      }

      const trustedSubsDto: TrustedSubDto[] = [];

      for (const provider of oidcProviders) {
        const trustedSubs = await this.oidcRepository.getOIDCTrustedSubsForOIDCProvider(provider.id);

        if (!trustedSubs) {
          continue;
        }

        for (const trustedSub of trustedSubs) {
          trustedSubsDto.push({
            slug: trustedSub.slug,
            sub: trustedSub.sub,
            providerDisplayName: provider.displayName,
            createdAt: trustedSub.createdAt,
          });
        }
      }

      return TrustedSubsDto.parse({ subs: trustedSubsDto });
    } catch (error) {
      this.logger.error('Failed to get provider trusted subs', error);
      return undefined;
    }
  }

  public async getUserOIDCProviders(userId: number): Promise<GetOIDCProvidersDto | undefined> {
    try {
      const oidcProviders = await this.oidcRepository.getOIDCProvidersForUser(userId);

      if (!oidcProviders) {
        return GetOIDCProvidersDto.parse({ providers: [] });
      }

      const providers: GetOIDCProviderDto[] = [];

      for (const provider of oidcProviders) {
        providers.push(
          GetOIDCProviderDto.parse({
            slug: provider.slug,
            displayName: provider.displayName,
            clientId: provider.clientId,
            clientSecret: provider.clientSecret,
            authorizeUrl: provider.authorizeUrl,
            tokenUrl: provider.tokenUrl,
            userInfoUrl: provider.userInfoUrl,
          }),
        );
      }

      return GetOIDCProvidersDto.parse({ providers: oidcProviders });
    } catch (error) {
      this.logger.error('Failed to get user providers', error);
      return undefined;
    }
  }

  public async getOIDCProvidersLogin(): Promise<OIDCProvidersLoginDto | undefined> {
    try {
      const oidcProviders = await this.oidcRepository.getOIDCProviders();

      if (!oidcProviders) {
        return OIDCProvidersLoginDto.parse({ providers: [] });
      }

      const providers: OIDCProviderLoginDto[] = [];

      for (const provider of oidcProviders) {
        providers.push(
          OIDCProviderLoginDto.parse({
            slug: provider.slug,
            displayName: provider.displayName,
          }),
        );
      }

      return OIDCProvidersLoginDto.parse({ providers: oidcProviders });
    } catch (error) {
      this.logger.error('Failed to get OIDC providers', error);
      return undefined;
    }
  }

  public async getOIDCProviderBySlug(slug: string) {
    try {
      return await this.oidcRepository.getOIDCProviderBySlug(slug);
    } catch (_error) {
      this.logger.error('Failed to get OIDC provider by slug', slug);
      return undefined;
    }
  }

  public async getTrustedSub(providerId: number, sub: string) {
    try {
      return await this.oidcRepository.getOIDCTrustedSubBySub(providerId, sub);
    } catch (_error) {
      this.logger.error('Failed to get trusted sub from provider', providerId);
      return undefined;
    }
  }
}

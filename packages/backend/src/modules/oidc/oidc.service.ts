import { Injectable } from '@nestjs/common';
import { OidcRepository } from './oidc.repository';
import { OidcProviderDto } from './dto/oidc.dto';
import * as client from 'openid-client';
import { LoggerService } from '@/core/logger/logger.service';

type TrustedState = {
  clientId: string;
  expiresAt: number;
  flowType: 'sub_register' | 'login';
  url: string;
};

@Injectable()
export class OidcService {
  private trustedStatesStore: Map<string, TrustedState> = new Map();

  constructor(
    private readonly oidcRepository: OidcRepository,
    private readonly logger: LoggerService,
  ) {}

  private buildClientConfig(provider: OidcProviderDto) {
    const providerUrl = new URL(provider.authorizeUri);
    const issuer = providerUrl.origin;

    const server: client.ServerMetadata = {
      issuer: issuer,
      authorization_endpoint: provider.authorizeUri,
      token_endpoint: provider.tokenUri,
      userinfo_endpoint: provider.userinfoUri,
    };

    const config = new client.Configuration(server, provider.clientId, provider.clientSecret);
    return config;
  }

  public async getProviderAuthUrl(id: number, reqUrl: URL, hasUser: boolean): Promise<string | null> {
    try {
      const provider = await this.oidcRepository.getProviderById(id);

      if (!provider) {
        throw new Error('Provider not found');
      }

      const config = this.buildClientConfig(provider);
      const state = client.randomState();
      const expiresAt = Date.now() + 3600000;

      let flowType: 'sub_register' | 'login';

      if (hasUser) {
        flowType = 'sub_register';
      } else {
        flowType = 'login';
      }

      this.trustedStatesStore.set(state, { clientId: provider.clientId, expiresAt, url: reqUrl.origin, flowType: flowType });

      const redirectUri = `${reqUrl.origin}/api/oidc/providers/${provider.id}/callback`;
      const authUrl = client.buildAuthorizationUrl(config, { state, redirect_uri: redirectUri, scope: 'openid' });

      return authUrl.href;
    } catch (error) {
      this.logger.error('Failed to get auth url', error);
      return null;
    }
  }

  public async getTokenFromCallback(state: string, reqUrl: URL, hasUser: boolean): Promise<client.TokenEndpointResponse | null> {
    try {
      const trustedState = this.trustedStatesStore.get(state);

      if (!trustedState) {
        throw new Error('Invalid state');
      }

      if (trustedState.expiresAt < Date.now()) {
        this.trustedStatesStore.delete(state);
        throw new Error('State expired');
      }

      if (trustedState.url !== reqUrl.origin) {
        this.trustedStatesStore.delete(state);
        throw new Error('Invalid redirect URI');
      }

      const provider = await this.oidcRepository.getProviderByClientId(trustedState.clientId);

      if (!provider) {
        this.trustedStatesStore.delete(state);
        throw new Error('Invalid provider');
      }

      if (!hasUser && trustedState.flowType === 'sub_register') {
        this.trustedStatesStore.delete(state);
        throw new Error('Sub register requested but no user was found');
      }

      const config = this.buildClientConfig(provider);

      const tokenResponse = await client.authorizationCodeGrant(config, reqUrl, {
        expectedState: state,
        idTokenExpected: true,
      });

      this.trustedStatesStore.delete(state);

      return tokenResponse;
    } catch (error) {
      this.logger.error('Failed to get token from callback', error);
      return null;
    }
  }

  public async fetchUserInfo(id: number, access_token: string): Promise<{ sub: string } | null> {
    try {
      const provider = await this.oidcRepository.getProviderById(id);

      if (!provider) {
        throw new Error('Invalid provider');
      }

      const config = this.buildClientConfig(provider);
      const userInfoResponse = await client.fetchProtectedResource(config, access_token, new URL(provider.userinfoUri), 'GET');
      const bodyJson = (await userInfoResponse.json()) as { sub?: string };

      if (!bodyJson?.sub) {
        throw new Error('Sub claim not found');
      }

      return {
        sub: bodyJson.sub,
      };
    } catch (error) {
      this.logger.error('Failed to fetch user info', error);
      return null;
    }
  }

  public async storeTrustedSub(sub: string, userId: number, providerId: number) {
    return await this.oidcRepository.storeTrustedSub(sub, userId, providerId);
  }

  public async getTrustedSubsByUserId(userId: number) {
    return await this.oidcRepository.getTrustedSubsByUserId(userId);
  }

  public async deleteTrustedSub(id: number) {
    return await this.oidcRepository.deleteTrustedSub(id);
  }

  public async getTrustedSub(sub: string, providerId: number) {
    return await this.oidcRepository.getTrustedSub(sub, providerId);
  }

  public async createOidcProvider(provider: OidcProviderDto) {
    return await this.oidcRepository.createProvider(provider);
  }

  public async editOidcProvider(providerId: number, provider: OidcProviderDto) {
    return await this.oidcRepository.editProvider(providerId, provider);
  }

  public async deleteOidcProvider(providerId: number) {
    return await this.oidcRepository.deleteProvider(providerId);
  }

  public async getOidcProviders() {
    return await this.oidcRepository.getProviders();
  }

  public async getOidcProviderById(id: number) {
    return await this.oidcRepository.getProviderById(id);
  }

  public async deleteTrustedSubsByProviderId(providerId: number) {
    return await this.oidcRepository.deleteTrustedSubsByProviderId(providerId);
  }

  public async getOidcProvidersPublic() {
    const providers = await this.oidcRepository.getProviders();
    return providers.map((p) => {
      return {
        id: p.id,
        name: p.name,
      };
    });
  }
}

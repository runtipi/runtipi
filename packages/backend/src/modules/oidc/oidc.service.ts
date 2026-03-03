import { Injectable } from '@nestjs/common';
import type { OidcRepository } from './oidc.repository';
import { OidcProviderDto } from './dto/oidc.dto';
import * as client from 'openid-client';

type TrustedState = {
  clientId: string;
  expiresAt: number;
  url: string;
};

@Injectable()
export class OidcService {
  // Trusted states will hold all of the available states for OIDC authentication
  private trustedStatesStore: Map<string, TrustedState> = new Map();

  constructor(private readonly oidcRepository: OidcRepository) {}

  private buildClientConfig(provider: OidcProviderDto) {
    // We will extract the issuer from the provider's authorize URI
    const providerUrl = new URL(provider.authorizeUri);
    const issuer = providerUrl.origin;

    // Build basic metadata since we cannot rely on discovery
    const server: client.ServerMetadata = {
      issuer: issuer,
      authorization_endpoint: provider.authorizeUri,
      token_endpoint: provider.tokenUri,
      userinfo_endpoint: provider.userInfoUri,
    };

    // Finally, create the configuration with the client secret
    const config = new client.Configuration(server, provider.clientId, provider.clientSecret);
    return config;
  }

  public async getProviderAuthUrl(name: string, url: string) {
    const provider = await this.oidcRepository.getProviderByName(name);

    if (!provider) return null;

    const config = this.buildClientConfig(provider);

    // We will use the state as the lookup key since you can have multiple
    // sessions trying to authenticate with the same provider
    const state = client.randomState();
    const expiresAt = Date.now() + 3600000; // 1 hour
    this.trustedStatesStore.set(state, { clientId: provider.clientId, expiresAt, url });

    // We will use the request domain to avoid needing a static domain set
    const redirectUri = `${url}/api/oidc/callback/${provider.name}`;
    const authUrl = client.buildAuthorizationUrl(config, { state, redirect_uri: redirectUri });
    return authUrl;
  }

  public async handleCallback(clientId: string, code: string, state: string, url: string) {
    // Try to load a state from the store
    const trustedState = this.trustedStatesStore.get(state);

    if (!trustedState) return null;

    // Ensure the state is still valid, the url matches, and the client id matches
    if (trustedState.expiresAt < Date.now()) {
      this.trustedStatesStore.delete(state);
      return null;
    }

    if (trustedState.url !== url) {
      this.trustedStatesStore.delete(state);
      return null;
    }

    if (trustedState.clientId !== clientId) {
      this.trustedStatesStore.delete(state);
      return null;
    }

    // Load provider information
    const provider = await this.oidcRepository.getProviderByClientId(clientId);

    if (!provider) return null;

    const config = this.buildClientConfig(provider);
    const urlObj = new URL(url);

    // Exchange the authorization code for a token
    const tokenResponse = await client.authorizationCodeGrant(
      config,
      urlObj,
      {
        expectedState: state,
      },
      { code },
    );

    // Clean up the state after successful exchange
    this.trustedStatesStore.delete(state);

    return tokenResponse;
  }

  public async fetchUserInfo(token: string, sub: string, clientId: string) {
    // Load provider information
    const provider = await this.oidcRepository.getProviderByClientId(clientId);

    if (!provider) return null;

    const config = this.buildClientConfig(provider);

    // Fetch user info
    const userInfoResponse = await client.fetchUserInfo(config, token, sub);
    return userInfoResponse;
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
}

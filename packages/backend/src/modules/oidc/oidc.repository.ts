import { DATABASE, type Database } from '@/core/database/database.module';
import { Inject, Injectable } from '@nestjs/common';
import type { OidcProviderDto } from './dto/oidc.dto';
import { oidc as oidcTable, oidcTrustedSubs } from '@/core/database/drizzle/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class OidcRepository {
  constructor(@Inject(DATABASE) private db: Database) {}

  /**
   * Adds a new OIDC provider to the database.
   * @param {OidcProviderDto} provider - The provider information to be added.
   * @returns The newly added provider.
   */
  public async createProvider(provider: OidcProviderDto) {
    const { name, clientId, clientSecret, authorizeUri, tokenUri, userinfoUri } = provider;
    const newProviders = await this.db.insert(oidcTable).values({ name, clientId, clientSecret, authorizeUri, tokenUri, userinfoUri }).returning();
    return newProviders[0];
  }

  /**
   * Edits an existing OIDC provider in the database.
   * @param {OidcProviderDto} provider - The updated provider information.
   * @returns The updated provider.
   * @throws Error if no id is provided.
   */
  public async editProvider(providerId: number, provider: OidcProviderDto) {
    const { name, clientId, clientSecret, authorizeUri, tokenUri, userinfoUri } = provider;
    const updatedProviders = await this.db
      .update(oidcTable)
      .set({ name, clientId, clientSecret, authorizeUri, tokenUri, userinfoUri })
      .where(eq(oidcTable.id, providerId))
      .returning();
    return updatedProviders[0];
  }

  /**
   * Deletes an OIDC provider from the database.
   * @param {number} providerId - The id of the provider to be deleted.
   */
  public async deleteProvider(providerId: number) {
    await this.db.delete(oidcTable).where(eq(oidcTable.id, providerId));
  }

  /**
   * Retrieves all OIDC providers from the database.
   * @returns An array of providers.
   */
  public async getProviders() {
    return await this.db.select().from(oidcTable).orderBy(oidcTable.id);
  }

  /**
   * Retrieves a single OIDC provider by client ID.
   * @param {string} clientId - The client ID of the provider to be retrieved.
   * @returns The provider.
   */
  public async getProviderByClientId(clientId: string) {
    const provider = await this.db.select().from(oidcTable).where(eq(oidcTable.clientId, clientId));
    return provider[0];
  }

  /**
   * Retrieves a single OIDC provider by its ID.
   * @param {number} id - The ID of the provider to be retrieved.
   * @returns The provider.
   */
  public async getProviderById(id: number) {
    const provider = await this.db.select().from(oidcTable).where(eq(oidcTable.id, id));
    return provider[0];
  }

  /**
   * Retrieves a single trusted sub entry by the sub itself.
   * @param {string} sub - The sub of the trusted entry to be retrieved.
   * @returns The trusted sub entry.
   */
  public async getTrustedSub(sub: string) {
    const trustedSub = await this.db.select().from(oidcTrustedSubs).where(eq(oidcTrustedSubs.sub, sub));
    return trustedSub[0];
  }

  /**
   * Retrieves all trusted sub entries for a given user ID.
   * @param {number} userId - The ID of the user to retrieve trusted sub entries for.
   * @returns An array of trusted sub entries.
   */
  public async getTrustedSubsByUserId(userId: number) {
    const trustedSubs = await this.db.select().from(oidcTrustedSubs).where(eq(oidcTrustedSubs.userId, userId));
    return trustedSubs;
  }

  /**
   * Deletes a trusted sub entry by its ID.
   * @param {number} id - The ID of the trusted entry to be deleted.
   */
  public async deleteTrustedSub(id: number) {
    await this.db.delete(oidcTrustedSubs).where(eq(oidcTrustedSubs.id, id));
  }

  /**
   * Stores a new trusted sub entry.
   * @param {string} sub - The sub of the trusted entry to be stored.
   * @param {number} userId - The ID of the user to associate the trusted sub entry with.
   */
  public async storeTrustedSub(sub: string, userId: number, providerId: number) {
    await this.db.insert(oidcTrustedSubs).values({ sub, userId, providerId });
  }

  /**
   * Deletes all trusted sub entries for a given provider ID.
   * @param {number} providerId - The ID of the provider to delete trusted sub entries for.
   */
  public async deleteTrustedSubsByProviderId(providerId: number) {
    await this.db.delete(oidcTrustedSubs).where(eq(oidcTrustedSubs.providerId, providerId));
  }
}

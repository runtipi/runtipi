import { DATABASE, type Database } from '@/core/database/database.module';
import { Inject, Injectable } from '@nestjs/common';
import type { OidcProviderDto } from './dto/oidc.dto';
import { oidc as oidcTable } from '@/core/database/drizzle/schema';
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
    const { name, clientId, clientSecret, authorizeUri, tokenUri, userInfoUri } = provider;
    const newProviders = await this.db.insert(oidcTable).values({ name, clientId, clientSecret, authorizeUri, tokenUri, userInfoUri }).returning();
    return newProviders[0];
  }

  /**
   * Edits an existing OIDC provider in the database.
   * @param {OidcProviderDto} provider - The updated provider information.
   * @returns The updated provider.
   * @throws Error if no id is provided.
   */
  public async editProvider(providerId: number, provider: OidcProviderDto) {
    const { name, clientId, clientSecret, authorizeUri, tokenUri, userInfoUri } = provider;
    const updatedProviders = await this.db
      .update(oidcTable)
      .set({ name, clientId, clientSecret, authorizeUri, tokenUri, userInfoUri })
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
    return this.db.select().from(oidcTable).orderBy(oidcTable.id);
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
   * Retrieves a single OIDC provider by its name.
   * @param {string} name - The name of the provider to be retrieved.
   * @returns The provider.
   */
  public async getProviderByName(name: string) {
    const provider = await this.db.select().from(oidcTable).where(eq(oidcTable.name, name));
    return provider[0];
  }
}

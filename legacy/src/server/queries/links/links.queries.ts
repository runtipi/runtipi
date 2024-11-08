import { type IDbClient, type Link, linkTable } from '@runtipi/db';
import type { LinkInfoInput } from '@runtipi/shared';
import { and, eq } from 'drizzle-orm';
import { inject, injectable } from 'inversify';

export interface ILinkQueries {
  addLink: (link: LinkInfoInput, userId: number) => Promise<Link | undefined>;
  editLink: (link: LinkInfoInput, userId: number) => Promise<Link | undefined>;
  deleteLink: (linkId: number, userId: number) => Promise<void>;
  getLinks: (userId: number) => Promise<Link[]>;
}

@injectable()
export class LinkQueries implements ILinkQueries {
  constructor(@inject('IDbClient') private dbClient: IDbClient) {}

  /**
   * Adds a new link to the database.
   * @param {LinkInfo} link - The link information to be added.
   * @returns The newly added link.
   */
  public async addLink(link: LinkInfoInput, userId: number) {
    const { title, description, url, iconUrl } = link;
    const newLinks = await this.dbClient.db.insert(linkTable).values({ title, description, url, iconUrl, userId }).returning();
    return newLinks[0];
  }

  /**
   * Edits an existing link in the database.
   * @param {LinkInfo} link - The updated link information.
   * @returns The updated link.
   * @throws Error if no id is provided.
   */
  public async editLink(link: LinkInfoInput, userId: number) {
    const { id, title, description, url, iconUrl } = link;

    if (!id) throw new Error('No id provided');

    const updatedLinks = await this.dbClient.db
      .update(linkTable)
      .set({ title, description, url, iconUrl, updatedAt: new Date() })
      .where(and(eq(linkTable.id, id), eq(linkTable.userId, userId)))
      .returning();

    return updatedLinks[0];
  }

  /**
   * Deletes a link from the database.
   * @param {number} linkId - The id of the link to be deleted.
   */
  public async deleteLink(linkId: number, userId: number) {
    await this.dbClient.db.delete(linkTable).where(and(eq(linkTable.id, linkId), eq(linkTable.userId, userId)));
  }

  /**
   * Retrieves all links for a given user from the database.
   * @param {number} userId - The id of the user.
   * @returns An array of links belonging to the user.
   */
  public async getLinks(userId: number) {
    return this.dbClient.db.select().from(linkTable).where(eq(linkTable.userId, userId)).orderBy(linkTable.id);
  }
}

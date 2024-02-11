import { Database } from '@/server/db';
import { linkTable } from '@/server/db/schema';
import { LinkInfoInput } from '@runtipi/shared';
import { eq, and } from 'drizzle-orm';

export class LinkQueries {
  private db;

  constructor(p: Database) {
    this.db = p;
  }

  /**
   * Adds a new link to the database.
   * @param {LinkInfo} link - The link information to be added.
   * @returns The newly added link.
   */
  public async addLink(link: LinkInfoInput, userId: number) {
    const { title, description, url, iconUrl } = link;
    const newLinks = await this.db.insert(linkTable).values({ title, description, url, iconUrl, userId }).returning().execute();
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

    const updatedLinks = await this.db
      .update(linkTable)
      .set({ title, description, url, iconUrl, updatedAt: new Date() })
      .where(and(eq(linkTable.id, id), eq(linkTable.userId, userId)))
      .returning()
      .execute();

    return updatedLinks[0];
  }

  /**
   * Deletes a link from the database.
   * @param {number} linkId - The id of the link to be deleted.
   */
  public async deleteLink(linkId: number, userId: number) {
    await this.db
      .delete(linkTable)
      .where(and(eq(linkTable.id, linkId), eq(linkTable.userId, userId)))
      .returning()
      .execute();
  }

  /**
   * Retrieves all links for a given user from the database.
   * @param {number} userId - The id of the user.
   * @returns An array of links belonging to the user.
   */
  public async getLinks(userId: number) {
    const links = await this.db.select().from(linkTable).where(eq(linkTable.userId, userId)).orderBy(linkTable.id);
    return links;
  }
}

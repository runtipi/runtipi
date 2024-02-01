import { Database, db } from '@/server/db';
import { LinkInfo } from '@runtipi/shared';
import { LinkQueries } from '@/server/queries/links/links.queries';

export class CustomLinksServiceClass {
  private queries;

  constructor(p: Database = db) {
    this.queries = new LinkQueries(p);
  }

  public add = async (link: LinkInfo) => {
    const linkResponse = await this.queries.addLink(link);
    return linkResponse;
  }

  public edit = async (link: LinkInfo) => {
    const linkResponse = await this.queries.editLink(link);
    return linkResponse;
  }

  public delete = async (linkId: number) => {
    const deletedLink = await this.queries.deleteLink(linkId);
    return deletedLink;
  }

  public async getLinks(userId: number | undefined) {
    if (!userId) return [];

    return this.queries.getLinks(userId);
  }
}
import { Database, db } from '@/server/db';
import { LinkInfo } from '@runtipi/shared';
import { LinkQueries } from '@/server/queries/links/links.queries';

export class CustomLinksServiceClass {
  private queries;

  constructor(p: Database = db) {
    this.queries = new LinkQueries(p);
  }

  public add(link: LinkInfo) {
    return this.queries.addLink(link);
  }

  public async getLinks(userId: number | undefined) {
    if (!userId) return [];

    return this.queries.getLinks(userId);
  }
}
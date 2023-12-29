import { Database, db } from '@/server/db';
import { LinkQueries } from '@/server/queries/links/links.queries';

export class CustomLinksServiceClass {
  private queries;

  constructor(p: Database = db) {
    this.queries = new LinkQueries(p);
  }

  public async add(title: string, url: string, userId: number) {
    const link = await this.queries.addLink(title, url, userId);

    return link;
  }
}
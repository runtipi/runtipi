import { type IDbClient, type NewUser, type User, userTable } from '@runtipi/db';
import { eq } from 'drizzle-orm';
import { inject, injectable } from 'inversify';

export interface IAuthQueries {
  getUserByUsername: (username: string) => Promise<User | undefined>;
  getUserById: (id: number) => Promise<User | undefined>;
  getUserDtoById: (id: number) => Promise<Pick<User, 'id' | 'username' | 'totpEnabled' | 'locale' | 'operator'> | undefined>;
  updateUser: (id: number, data: Partial<NewUser>) => Promise<User | undefined>;
  getOperators: () => Promise<User[]>;
  getFirstOperator: () => Promise<User | undefined>;
  createUser: (data: NewUser) => Promise<User | undefined>;
}

@injectable()
export class AuthQueries implements IAuthQueries {
  constructor(@inject('IDbClient') private dbClient: IDbClient) {}

  /**
   * Given a username, return the user associated to it
   *
   * @param {string} username - The username of the user to return
   */
  public async getUserByUsername(username: string) {
    return this.dbClient.db.query.userTable.findFirst({ where: eq(userTable.username, username.trim().toLowerCase()) });
  }

  /**
   * Given a userId, return the user associated to it
   *
   * @param {number} id - The id of the user to return
   */
  public async getUserById(id: number) {
    return this.dbClient.db.query.userTable.findFirst({ where: eq(userTable.id, Number(id)) });
  }

  /**
   * Given a userId, return the user associated to it with only the id, username, and totpEnabled fields
   *
   * @param {number} id - The id of the user to return
   */
  public async getUserDtoById(id: number) {
    return this.dbClient.db.query.userTable.findFirst({
      where: eq(userTable.id, Number(id)),
      columns: { id: true, username: true, totpEnabled: true, locale: true, operator: true },
    });
  }

  /**
   * Given a userId, update the user with the given data
   *
   * @param {number} id - The id of the user to update
   * @param {Partial<NewUser>} data - The data to update the user with
   */
  public async updateUser(id: number, data: Partial<NewUser>) {
    const updatedUsers = await this.dbClient.db
      .update(userTable)
      .set(data)
      .where(eq(userTable.id, Number(id)))
      .returning();

    return updatedUsers[0];
  }

  /**
   * Returns all operators registered in the system
   */
  public async getOperators() {
    return this.dbClient.db.select().from(userTable).where(eq(userTable.operator, true));
  }

  /**
   * Returns the first operator found in the system
   */
  public async getFirstOperator() {
    return this.dbClient.db.query.userTable.findFirst({ where: eq(userTable.operator, true) });
  }

  /**
   * Given user data, creates a new user
   *
   * @param {NewUser} data - The data to create the user with
   */
  public async createUser(data: NewUser) {
    const newUsers = await this.dbClient.db.insert(userTable).values(data).returning();
    return newUsers[0];
  }
}

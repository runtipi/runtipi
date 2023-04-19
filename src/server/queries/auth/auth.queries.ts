import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { asc, eq } from 'drizzle-orm';
import { userTable, NewUser } from '../../db/schema';

export class AuthQueries {
  private db;

  constructor(p: NodePgDatabase) {
    this.db = p;
  }

  /**
   * Given a username, return the user associated to it
   *
   * @param {string} username - The username of the user to return
   */
  public async getUserByUsername(username: string) {
    const users = await this.db.select().from(userTable).where(eq(userTable.username, username.trim().toLowerCase()));
    return users[0];
  }

  /**
   * Given a userId, return the user associated to it
   *
   * @param {number} id - The id of the user to return
   */
  public async getUserById(id: number) {
    const users = await this.db
      .select()
      .from(userTable)
      .where(eq(userTable.id, Number(id)));

    return users[0];
  }

  /**
   * Given a userId, return the user associated to it with only the id, username, and totpEnabled fields
   *
   * @param {number} id - The id of the user to return
   */
  public async getUserDtoById(id: number) {
    const users = await this.db
      .select({ id: userTable.id, username: userTable.username, totpEnabled: userTable.totpEnabled })
      .from(userTable)
      .where(eq(userTable.id, Number(id)));

    return users[0];
  }

  /**
   * Given a userId, update the user with the given data
   *
   * @param {number} id - The id of the user to update
   * @param {Partial<NewUser>} data - The data to update the user with
   */
  public async updateUser(id: number, data: Partial<NewUser>) {
    const updatedUsers = await this.db
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
    return this.db.select().from(userTable).where(eq(userTable.operator, true));
  }

  /**
   * Returns the first operator found in the system
   */
  public async getFirstOperator() {
    const users = await this.db.select().from(userTable).where(eq(userTable.operator, true)).orderBy(asc(userTable.id)).limit(1);
    return users[0];
  }

  /**
   * Given user data, creates a new user
   *
   * @param {NewUser} data - The data to create the user with
   */
  public async createUser(data: NewUser) {
    const newUsers = await this.db.insert(userTable).values(data).returning();
    return newUsers[0];
  }
}

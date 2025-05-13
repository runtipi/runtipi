import { DATABASE, type Database } from '@/core/database/database.module.js';
import { user } from '@/core/database/drizzle/schema.js';
import type { NewUser } from '@/core/database/drizzle/types.js';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm/sql';

@Injectable()
export class UserRepository {
  constructor(@Inject(DATABASE) private db: Database) {}

  /**
   * Given a username, return the user associated to it
   *
   * @param {string} username - The username of the user to return
   */
  public async getUserByUsername(username: string) {
    return this.db.query.user.findFirst({ where: eq(user.username, username.trim().toLowerCase()) });
  }

  /**
   * Given a userId, return the user associated to it
   *
   * @param {number} id - The id of the user to return
   */
  public async getUserById(id: number) {
    return this.db.query.user.findFirst({ where: eq(user.id, Number(id)) });
  }

  /**
   * Given a userId, return the user associated to it with only the id, username, and totpEnabled fields
   *
   * @param {number} id - The id of the user to return
   */
  public async getUserDtoById(id: number) {
    return this.db.query.user.findFirst({
      where: eq(user.id, Number(id)),
      columns: { id: true, username: true, totpEnabled: true, locale: true, operator: true, hasSeenWelcome: true },
    });
  }

  /**
   * Given a userId, update the user with the given data
   *
   * @param {number} id - The id of the user to update
   * @param {Partial<NewUser>} data - The data to update the user with
   */
  public async updateUser(id: number, data: Partial<NewUser>) {
    const updatedUsers = await this.db
      .update(user)
      .set(data)
      .where(eq(user.id, Number(id)))
      .returning();

    return updatedUsers[0];
  }

  /**
   * Returns all operators registered in the system
   */
  public async getOperators() {
    return this.db.select().from(user).where(eq(user.operator, true));
  }

  /**
   * Returns the first operator found in the system
   */
  public async getFirstOperator() {
    return this.db.query.user.findFirst({ where: eq(user.operator, true) });
  }

  /**
   * Given user data, creates a new user
   *
   * @param {NewUser} data - The data to create the user with
   */
  public async createUser(data: NewUser) {
    const newUsers = await this.db.insert(user).values(data).returning();
    return newUsers[0];
  }
}

import { faker } from '@faker-js/faker';
import { type User, userTable } from '@runtipi/db';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import type { TestDatabase } from './test-utils';

/**
 *
 * @param {User} params - user params
 * @param {TestDatabase} database - database client
 */
async function createUser(params: Partial<User & { email?: string }>, database?: TestDatabase) {
  const { email, operator = true, ...rest } = params;
  const hash = await argon2.hash('password');

  const username = email?.toLowerCase().trim() || faker.internet.email().toLowerCase().trim();

  if (database) {
    const users = await database.dbClient.db
      .insert(userTable)
      .values({ username, password: hash, operator, ...rest })
      .returning();
    const user = users[0];

    return user as User;
  }

  const id = faker.number.int();
  return { username, id, password: hash, operator, ...rest } as User;
}

const getUserById = async (id: number, database: TestDatabase) => {
  const usersFromDb = await database.dbClient.db.select().from(userTable).where(eq(userTable.id, id));
  const userFromDb = usersFromDb[0];

  return userFromDb as User;
};

const getUserByEmail = async (email: string, database: TestDatabase) => {
  const usersFromDb = await database.dbClient.db.select().from(userTable).where(eq(userTable.username, email));
  const userFromDb = usersFromDb[0];

  return userFromDb as User;
};

export { createUser, getUserById, getUserByEmail };

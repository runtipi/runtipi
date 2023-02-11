// eslint-disable-next-line import/no-extraneous-dependencies
import { faker } from '@faker-js/faker';
import * as argon2 from 'argon2';
import { prisma } from '../db/client';

const createUser = async (email?: string, db = prisma) => {
  const hash = await argon2.hash('password');

  const username = email?.toLowerCase().trim() || faker.internet.email().toLowerCase().trim();
  const user = await db.user.create({ data: { username, password: hash } });

  return user;
};

export { createUser };

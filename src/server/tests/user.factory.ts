// eslint-disable-next-line import/no-extraneous-dependencies
import { faker } from '@faker-js/faker';
import * as argon2 from 'argon2';
import { prisma } from '../db/client';

type CreateUserParams = {
  email?: string;
  operator?: boolean;
};

const createUser = async (params: CreateUserParams, db = prisma) => {
  const { email, operator = true } = params;
  const hash = await argon2.hash('password');

  const username = email?.toLowerCase().trim() || faker.internet.email().toLowerCase().trim();
  const user = await db.user.create({ data: { username, password: hash, operator } });

  return user;
};

export { createUser };

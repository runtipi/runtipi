import * as argon2 from 'argon2';
import { faker } from '@faker-js/faker';
import User from '../user.entity';

const createUser = async (email?: string) => {
  const hash = await argon2.hash('password');

  const user = await User.create({
    username: email?.toLowerCase().trim() || faker.internet.email().toLowerCase().trim(),
    password: hash,
  }).save();

  return user;
};

export { createUser };

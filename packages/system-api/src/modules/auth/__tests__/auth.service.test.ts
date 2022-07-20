import * as argon2 from 'argon2';
import AuthService from '../auth.service';
import { createUser } from './user.factory';
import User from '../user.entity';
import { faker } from '@faker-js/faker';
import { setupConnection, teardownConnection } from '../../../test/connection';
import { DataSource } from 'typeorm';

let db: DataSource | null = null;
const TEST_SUITE = 'authservice';

beforeAll(async () => {
  db = await setupConnection(TEST_SUITE);
});

beforeEach(async () => {
  await User.clear();
});

afterAll(async () => {
  await db?.destroy();
  await teardownConnection(TEST_SUITE);
});

describe('Login', () => {
  it('Should return user after login', async () => {
    const email = faker.internet.email();
    await createUser(email);

    const { user } = await AuthService.login({ username: email, password: 'password' });

    expect(user).toBeDefined();
    expect(user?.id).toBe(1);
  });

  it('Should throw if user does not exist', async () => {
    await expect(AuthService.login({ username: 'test', password: 'test' })).rejects.toThrowError('User not found');
  });

  it('Should throw if password is incorrect', async () => {
    const email = faker.internet.email();
    await createUser(email);
    await expect(AuthService.login({ username: email, password: 'wrong' })).rejects.toThrowError('Wrong password');
  });
});

describe('Register', () => {
  it('Should return new user after register', async () => {
    const email = faker.internet.email();
    const { user } = await AuthService.register({ username: email, password: 'test' });

    expect(user).toBeDefined();
  });

  it('Should correctly trim and lowercase email', async () => {
    const email = faker.internet.email();
    await AuthService.register({ username: email, password: 'test' });

    const user = await User.findOne({ where: { username: email.toLowerCase().trim() } });

    expect(user).toBeDefined();
    expect(user?.username).toBe(email.toLowerCase().trim());
  });

  it('Should throw if user already exists', async () => {
    const email = faker.internet.email();

    await createUser(email);
    await expect(AuthService.register({ username: email, password: 'test' })).rejects.toThrowError('User already exists');
  });

  it('Should throw if email is not provided', async () => {
    await expect(AuthService.register({ username: '', password: 'test' })).rejects.toThrowError('Missing email or password');
  });

  it('Should throw if password is not provided', async () => {
    await expect(AuthService.register({ username: faker.internet.email(), password: '' })).rejects.toThrowError('Missing email or password');
  });

  it('Password is correctly hashed', async () => {
    const email = faker.internet.email();
    const { user } = await AuthService.register({ username: email, password: 'test' });

    const isPasswordValid = await argon2.verify(user?.password || '', 'test');

    expect(isPasswordValid).toBe(true);
  });
});

import fs from 'fs';
import jsonwebtoken from 'jsonwebtoken';
import * as argon2 from 'argon2';
import config from '../../../config';
import AuthService from '../auth.service';
import { IUser } from '../../../config/types';

jest.mock('fs');

let user: any;

const MOCK_USER_REGISTERED = () => ({
  [`${config.ROOT_FOLDER}/state/users.json`]: `[${user}]`,
});

const MOCK_NO_USER = {
  [`${config.ROOT_FOLDER}/state/users.json`]: '[]',
};

beforeAll(async () => {
  const hash = await argon2.hash('password');
  user = JSON.stringify({
    email: 'username',
    password: hash,
  });
});

describe('Login', () => {
  beforeEach(() => {
    // @ts-ignore
    fs.__createMockFiles(MOCK_USER_REGISTERED());
  });

  it('Should return token after login', async () => {
    const token = await AuthService.login('username', 'password');

    const { email } = jsonwebtoken.verify(token, config.JWT_SECRET) as { email: string };

    expect(token).toBeDefined();
    expect(email).toBe('username');
  });

  it('Should throw if user does not exist', async () => {
    await expect(AuthService.login('username1', 'password')).rejects.toThrowError('User not found');
  });

  it('Should throw if password is incorrect', async () => {
    await expect(AuthService.login('username', 'password1')).rejects.toThrowError('Wrong password');
  });
});

describe('Register', () => {
  beforeEach(() => {
    // @ts-ignore
    fs.__createMockFiles(MOCK_NO_USER);
  });

  it('Should return token after register', async () => {
    const token = await AuthService.register('username', 'password', 'name');

    const { email } = jsonwebtoken.verify(token, config.JWT_SECRET) as { email: string };

    expect(token).toBeDefined();
    expect(email).toBe('username');
  });

  it('Should correctly write user to file', async () => {
    await AuthService.register('username', 'password', 'name');

    const users: IUser[] = JSON.parse(fs.readFileSync(`${config.ROOT_FOLDER}/state/users.json`, 'utf8'));

    expect(users.length).toBe(1);
    expect(users[0].email).toBe('username');
    expect(users[0].name).toBe('name');

    const valid = await argon2.verify(users[0].password, 'password');

    expect(valid).toBeTruthy();
  });

  it('Should throw if user already exists', async () => {
    await AuthService.register('username', 'password', 'name');

    await expect(AuthService.register('username', 'password', 'name')).rejects.toThrowError('There is already an admin user');
  });

  it('Should throw if email is not provided', async () => {
    await expect(AuthService.register('', 'password', 'name')).rejects.toThrowError('Missing email or password');
  });

  it('Should throw if password is not provided', async () => {
    await expect(AuthService.register('username', '', 'name')).rejects.toThrowError('Missing email or password');
  });

  it('Does not throw if name is not provided', async () => {
    await AuthService.register('username', 'password', '');

    const users: IUser[] = JSON.parse(fs.readFileSync(`${config.ROOT_FOLDER}/state/users.json`, 'utf8'));

    expect(users.length).toBe(1);
  });
});

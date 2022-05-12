import * as argon2 from 'argon2';
import fs from 'fs';
import config from '../../../config';
import { IUser } from '../../../config/types';
import AuthHelpers from '../auth.helpers';

let user: IUser;

beforeAll(async () => {
  const hash = await argon2.hash('password');
  user = { email: 'username', password: hash, name: 'name' };
});

jest.mock('fs');

const MOCK_USER_REGISTERED = () => ({
  [`${config.ROOT_FOLDER}/state/users.json`]: `[${JSON.stringify(user)}]`,
});

describe('TradeTokenForUser', () => {
  beforeEach(() => {
    // @ts-ignore
    fs.__createMockFiles(MOCK_USER_REGISTERED());
  });

  it('Should return null if token is invalid', () => {
    const result = AuthHelpers.tradeTokenForUser('invalid token');
    expect(result).toBeNull();
  });

  it('Should return user if token is valid', async () => {
    const token = await AuthHelpers.getJwtToken(user, 'password');
    const result = AuthHelpers.tradeTokenForUser(token);

    expect(result).toEqual(user);
  });
});

describe('GetJwtToken', () => {
  beforeEach(() => {
    // @ts-ignore
    fs.__createMockFiles(MOCK_USER_REGISTERED());
  });

  it('Should return token if user and password are valid', async () => {
    const token = await AuthHelpers.getJwtToken(user, 'password');
    expect(token).toBeDefined();
  });

  it('Should throw if password is invalid', async () => {
    await expect(AuthHelpers.getJwtToken(user, 'invalid password')).rejects.toThrow('Wrong password');
  });
});

describe('getUser', () => {
  beforeEach(() => {
    // @ts-ignore
    fs.__createMockFiles(MOCK_USER_REGISTERED());
  });

  it('Should return null if user is not found', () => {
    const result = AuthHelpers.getUser('invalid token');
    expect(result).toBeUndefined();
  });

  it('Should return user if token is valid', async () => {
    const result = AuthHelpers.getUser('username');

    expect(result).toEqual(user);
  });
});

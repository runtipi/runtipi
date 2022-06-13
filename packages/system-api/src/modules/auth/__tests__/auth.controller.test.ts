import { Request, Response } from 'express';
import fs from 'fs';
import * as argon2 from 'argon2';
import config from '../../../config';
import AuthController from '../auth.controller';

let user: any;

jest.mock('fs');

const next = jest.fn();

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

  it('Should put cookie in response after login', async () => {
    const json = jest.fn();
    const res = { cookie: jest.fn(), status: jest.fn(() => ({ json })), json: jest.fn() } as unknown as Response;
    const req = { body: { email: 'username', password: 'password' } } as Request;

    await AuthController.login(req, res, next);

    expect(res.cookie).toHaveBeenCalledWith('tipi_token', expect.any(String), expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ token: expect.any(String) });
    expect(next).not.toHaveBeenCalled();
  });

  it('Should throw if username is not provided in request', async () => {
    const res = { cookie: jest.fn(), status: jest.fn(), json: jest.fn() } as unknown as Response;
    const req = { body: { password: 'password' } } as Request;

    await AuthController.login(req, res, next);

    expect(res.cookie).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('Should throw if password is not provided in request', async () => {
    const res = { cookie: jest.fn(), status: jest.fn(), json: jest.fn() } as unknown as Response;
    const req = { body: { email: 'username' } } as Request;

    await AuthController.login(req, res, next);

    expect(res.cookie).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('Register', () => {
  beforeEach(() => {
    // @ts-ignore
    fs.__createMockFiles(MOCK_NO_USER);
  });

  it('Should put cookie in response after register', async () => {
    const json = jest.fn();
    const res = { cookie: jest.fn(), status: jest.fn(() => ({ json })), json: jest.fn() } as unknown as Response;
    const req = { body: { email: 'username', password: 'password', name: 'name' } } as Request;

    await AuthController.register(req, res, next);

    expect(res.cookie).toHaveBeenCalledWith('tipi_token', expect.any(String), expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ token: expect.any(String) });
  });
});

describe('Me', () => {
  beforeEach(() => {
    // @ts-ignore
    fs.__createMockFiles(MOCK_USER_REGISTERED());
  });

  it('Should return user if present in request', async () => {
    const json = jest.fn();
    const res = { status: jest.fn(() => ({ json })) } as unknown as Response;
    const req = { user } as unknown as Request;

    await AuthController.me(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ user });
  });

  it('Should return null if user is not present in request', async () => {
    const json = jest.fn();
    const res = { status: jest.fn(() => ({ json })) } as unknown as Response;
    const req = {} as Request;

    await AuthController.me(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ user: null });
  });
});

describe('isConfigured', () => {
  beforeEach(() => {
    // @ts-ignore
    fs.__createMockFiles(MOCK_NO_USER);
  });

  it('Should return false if no user is registered', async () => {
    const json = jest.fn();
    const res = { status: jest.fn(() => ({ json })) } as unknown as Response;
    const req = {} as Request;

    await AuthController.isConfigured(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ configured: false });
  });

  it('Should return true if user is registered', async () => {
    // @ts-ignore
    fs.__createMockFiles(MOCK_USER_REGISTERED());

    const json = jest.fn();
    const res = { status: jest.fn(() => ({ json })) } as unknown as Response;
    const req = { user } as unknown as Request;

    await AuthController.isConfigured(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ configured: true });
  });
});

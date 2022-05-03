import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { IUser } from '../../config/types';
import { readJsonFile, writeFile } from '../fs/fs.helpers';
import { getJwtToken, getUser } from './auth.helpers';

const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new Error('Missing id or password');
    }

    const user = getUser(email);

    if (!user) {
      throw new Error('User not found');
    }

    const token = await getJwtToken(user, password);

    res.cookie('tipi_token', token, {
      httpOnly: false,
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.status(200).json({ token });
  } catch (e) {
    next(e);
  }
};

const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users: IUser[] = readJsonFile('/state/users.json');

    if (users.length > 0) {
      throw new Error('There is already an admin user');
    }

    const { email, password, name } = req.body;

    if (!email || !password) {
      throw new Error('Missing email or password');
    }

    if (users.find((user) => user.email === email)) {
      throw new Error('User already exists');
    }

    const hash = await bcrypt.hash(password, 10);
    const newuser: IUser = { email, name, password: hash };

    const token = await getJwtToken(newuser, password);

    res.cookie('tipi_token', token, {
      httpOnly: false,
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    writeFile('/state/users.json', JSON.stringify([newuser]));

    res.status(200).json({ token });
  } catch (e) {
    next(e);
  }
};

const me = async (req: Request, res: Response) => {
  const { user } = req;

  if (user) {
    res.status(200).json({ user });
  } else {
    res.status(200).json({ user: null });
  }
};

const isConfigured = async (req: Request, res: Response) => {
  const users: IUser[] = readJsonFile('/state/users.json');

  res.status(200).json({ configured: users.length > 0 });
};

export default { login, me, register, isConfigured };

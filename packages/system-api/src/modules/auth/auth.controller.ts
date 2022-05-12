import { NextFunction, Request, Response } from 'express';
import { IUser } from '../../config/types';
import { readJsonFile } from '../fs/fs.helpers';
import AuthService from './auth.service';

const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new Error('Missing id or password');
    }

    const token = await AuthService.login(email, password);

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
    const { email, password, name } = req.body;

    const token = await AuthService.register(email, password, name);

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

const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req;

    if (user) {
      res.status(200).json({ user });
    } else {
      res.status(200).json({ user: null });
    }
  } catch (e) {
    next(e);
  }
};

const isConfigured = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users: IUser[] = readJsonFile('/state/users.json');

    res.status(200).json({ configured: users.length > 0 });
  } catch (e) {
    next(e);
  }
};

export default { login, me, register, isConfigured };

import jsonwebtoken from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { IUser, Maybe } from '../../config/types';
import { readJsonFile } from '../fs/fs.helpers';
import config from '../../config';

export const getUser = (email: string): Maybe<IUser> => {
  const savedUser: IUser[] = readJsonFile('/state/users.json');

  const user = savedUser.find((u) => u.email === email);

  return user;
};

const compareHashPassword = (password: string, hash = ''): Promise<boolean> => {
  return bcrypt.compare(password, hash || '');
};

const getJwtToken = async (user: IUser, password: string) => {
  const validPassword = await compareHashPassword(password, user.password || '');

  if (validPassword) {
    if (config.JWT_SECRET) {
      return jsonwebtoken.sign({ email: user.email }, config.JWT_SECRET, {
        expiresIn: '7d',
      });
    }
  }

  throw new Error('Wrong password');
};

const tradeTokenForUser = (token: string): Maybe<IUser> => {
  try {
    const { email } = jsonwebtoken.verify(token, config.JWT_SECRET) as { email: string };
    const users: IUser[] = readJsonFile('/state/users.json');

    return users.find((user) => user.email === email);
  } catch (error) {
    return null;
  }
};

export { tradeTokenForUser, getJwtToken };

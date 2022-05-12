import jsonwebtoken from 'jsonwebtoken';
import * as argon2 from 'argon2';
import { IUser, Maybe } from '../../config/types';
import { readJsonFile } from '../fs/fs.helpers';
import config from '../../config';

const getUser = (email: string): Maybe<IUser> => {
  const savedUser: IUser[] = readJsonFile('/state/users.json');

  const user = savedUser.find((u) => u.email === email);

  return user;
};

const compareHashPassword = (password: string, hash = ''): Promise<boolean> => {
  return argon2.verify(hash, password);
};

const getJwtToken = async (user: IUser, password: string) => {
  const validPassword = await compareHashPassword(password, user.password);

  if (validPassword) {
    if (config.JWT_SECRET) {
      return jsonwebtoken.sign({ email: user.email }, config.JWT_SECRET, {
        expiresIn: '7d',
      });
    } else {
      throw new Error('JWT_SECRET is not set');
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

export default { tradeTokenForUser, getJwtToken, getUser };

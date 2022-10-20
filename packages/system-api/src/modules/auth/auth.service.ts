import * as argon2 from 'argon2';
import { v4 } from 'uuid';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import { getConfig } from '../../core/config/TipiConfig';
import { TokenResponse, UsernamePasswordInput } from './auth.types';
import User from './user.entity';
import TipiCache from '../../config/TipiCache';

const login = async (input: UsernamePasswordInput): Promise<TokenResponse> => {
  const { password, username } = input;

  const user = await User.findOne({ where: { username: username.trim().toLowerCase() } });

  if (!user) {
    throw new Error('User not found');
  }

  const isPasswordValid = await argon2.verify(user.password, password);

  if (!isPasswordValid) {
    throw new Error('Wrong password');
  }

  const session = v4();
  const token = jwt.sign({ id: user.id, session }, getConfig().jwtSecret, { expiresIn: '7d' });

  await TipiCache.set(session, user.id.toString());

  return { token };
};

const register = async (input: UsernamePasswordInput): Promise<TokenResponse> => {
  const { password, username } = input;
  const email = username.trim().toLowerCase();

  if (!username || !password) {
    throw new Error('Missing email or password');
  }

  if (username.length < 3 || !validator.isEmail(email)) {
    throw new Error('Invalid username');
  }

  const user = await User.findOne({ where: { username: email } });

  if (user) {
    throw new Error('User already exists');
  }

  const hash = await argon2.hash(password);
  const newUser = await User.create({ username: email, password: hash }).save();

  const session = v4();
  const token = jwt.sign({ id: newUser.id, session }, getConfig().jwtSecret, { expiresIn: '1d' });

  await TipiCache.set(session, newUser.id.toString());

  return { token };
};

const me = async (userId?: number): Promise<User | null> => {
  if (!userId) return null;

  const user = await User.findOne({ where: { id: userId } });

  if (!user) return null;

  return user;
};

const logout = async (session?: string): Promise<boolean> => {
  if (!session) return false;

  await TipiCache.del(session);

  return true;
};

const refreshToken = async (session?: string): Promise<TokenResponse | null> => {
  if (!session) return null;

  const userId = await TipiCache.get(session);
  if (!userId) return null;

  await TipiCache.del(session);

  const newSession = v4();
  const token = jwt.sign({ id: userId, session: newSession }, getConfig().jwtSecret, { expiresIn: '1d' });
  await TipiCache.set(newSession, userId);

  return { token };
};

const AuthService = {
  login,
  register,
  me,
  logout,
  refreshToken,
};

export default AuthService;

import * as argon2 from 'argon2';
import { v4 } from 'uuid';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import { User } from '@prisma/client';
import { getConfig } from '../../core/TipiConfig';
import TipiCache from '../../core/TipiCache';
import { Context } from '../../context';

type UsernamePasswordInput = {
  username: string;
  password: string;
};

type TokenResponse = {
  token: string;
};

const login = async (input: UsernamePasswordInput, ctx: Context): Promise<TokenResponse> => {
  const { password, username } = input;

  const user = await ctx.prisma.user.findUnique({ where: { username: username.trim().toLowerCase() } });

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

const register = async (input: UsernamePasswordInput, ctx: Context): Promise<TokenResponse> => {
  const { password, username } = input;
  const email = username.trim().toLowerCase();

  if (!username || !password) {
    throw new Error('Missing email or password');
  }

  if (username.length < 3 || !validator.isEmail(email)) {
    throw new Error('Invalid username');
  }

  const user = await ctx.prisma.user.findUnique({ where: { username: email } });

  if (user) {
    throw new Error('User already exists');
  }

  const hash = await argon2.hash(password);
  const newUser = await ctx.prisma.user.create({ data: { username: email, password: hash } });

  const session = v4();
  const token = jwt.sign({ id: newUser.id, session }, getConfig().jwtSecret, { expiresIn: '1d' });

  await TipiCache.set(session, newUser.id.toString());

  return { token };
};

const me = async (ctx: Context): Promise<Pick<User, 'id' | 'username'> | null> => {
  if (!ctx.session?.userId) return null;

  const user = await ctx.prisma.user.findUnique({ where: { id: Number(ctx.session?.userId) }, select: { id: true, username: true } });

  if (!user) return null;

  return user;
};

const logout = async (session?: string): Promise<boolean> => {
  if (session) {
    await TipiCache.del(session);
  }

  return true;
};

const refreshToken = async (session?: string): Promise<TokenResponse | null> => {
  if (!session) return null;

  const userId = await TipiCache.get(session);
  if (!userId) return null;

  // Expire token in 6 seconds
  await TipiCache.set(session, userId, 6);

  const newSession = v4();
  const token = jwt.sign({ id: userId, session: newSession }, getConfig().jwtSecret, { expiresIn: '1d' });
  await TipiCache.set(newSession, userId);

  return { token };
};

const isConfigured = async (ctx: Context): Promise<boolean> => {
  const count = await ctx.prisma.user.count();

  return count > 0;
};

const AuthService = {
  login,
  register,
  me,
  logout,
  refreshToken,
  isConfigured,
};

export default AuthService;

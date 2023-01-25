import * as argon2 from 'argon2';
import { v4 } from 'uuid';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import { getConfig } from '../../core/TipiConfig';
import TipiCache from '../../core/TipiCache';
import { prisma } from '../../db/client';

type UsernamePasswordInput = {
  username: string;
  password: string;
};

type TokenResponse = {
  token: string;
};

/**
 * Authenticate user with given username and password
 *
 * @param {UsernamePasswordInput} input - An object containing the user's username and password
 * @return {Promise<{token:string}>} - A promise that resolves to an object containing the JWT token
 */
const login = async (input: UsernamePasswordInput) => {
  const { password, username } = input;

  const user = await prisma.user.findUnique({ where: { username: username.trim().toLowerCase() } });

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

/**
 * Creates a new user with the provided email and password and returns a session token
 *
 * @param {UsernamePasswordInput} input - An object containing the email and password fields
 * @returns {Promise<{token: string}>} - An object containing the session token
 * @throws {Error} - If the email or password is missing, the email is invalid or the user already exists
 */
const register = async (input: UsernamePasswordInput) => {
  const { password, username } = input;
  const email = username.trim().toLowerCase();

  if (!username || !password) {
    throw new Error('Missing email or password');
  }

  if (username.length < 3 || !validator.isEmail(email)) {
    throw new Error('Invalid username');
  }

  const user = await prisma.user.findUnique({ where: { username: email } });

  if (user) {
    throw new Error('User already exists');
  }

  const hash = await argon2.hash(password);
  const newUser = await prisma.user.create({ data: { username: email, password: hash } });

  const session = v4();
  const token = jwt.sign({ id: newUser.id, session }, getConfig().jwtSecret, { expiresIn: '1d' });

  await TipiCache.set(session, newUser.id.toString());

  return { token };
};

/**
 * Retrieves the user with the provided ID
 *
 * @param {number|undefined} userId - The user ID to retrieve
 * @returns {Promise<{id: number, username: string} | null>} - An object containing the user's id and email, or null if the user is not found
 */
const me = async (userId: number | undefined) => {
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: Number(userId) }, select: { id: true, username: true } });

  if (!user) return null;

  return user;
};

/**
 * Logs out the current user by removing the session token
 *
 * @param {string} [session] - The session token to log out
 * @returns {Promise<boolean>} - Returns true if the session token is removed successfully
 */
const logout = async (session?: string): Promise<boolean> => {
  if (session) {
    await TipiCache.del(session);
  }

  return true;
};

/**
 * Refreshes a user's session token
 *
 * @param {string} [session] - The current session token
 * @returns {Promise<{token: string} | null>} - An object containing the new session token, or null if the session is invalid
 */
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

/**
 * Check if the system is configured and has at least one user
 *
 * @returns {Promise<boolean>} - A boolean indicating if the system is configured or not
 */
const isConfigured = async (): Promise<boolean> => {
  const count = await prisma.user.count();

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

import crypto from 'node:crypto';
import { CacheService } from '@/core/cache/cache.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SessionManager {
  constructor(
    private cache: CacheService,
    private config: ConfigurationService,
  ) {}

  public getSessionMaxAgeInSeconds() {
    return this.config.get('userSettings').sessionMaxAgeInDays * 24 * 60 * 60;
  }

  /**
   * Create a new session for the given user.
   * @param userId - The ID of the user to create a session for.
   * @returns The session ID.
   */
  public async createSession(userId: number) {
    const sessionId = crypto.randomUUID();
    const sessionKey = `session:${sessionId}`;
    const maxAge = this.getSessionMaxAgeInSeconds();

    this.cache.set(sessionKey, userId.toString(), maxAge);
    this.cache.set(`session:${userId}:${sessionId}`, sessionKey, maxAge);

    return sessionId;
  }

  public refreshSession(sessionId: string) {
    const sessionKey = `session:${sessionId}`;
    const userId = this.cache.get(sessionKey);

    if (!userId) {
      return;
    }

    const maxAge = this.getSessionMaxAgeInSeconds();

    this.cache.set(sessionKey, userId, maxAge);
    this.cache.set(`session:${userId}:${sessionId}`, sessionKey, maxAge);
  }

  public generateSalt() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Delete a session by its ID.
   * @param sessionId - The ID of the session to delete.
   */
  public async deleteSession(sessionId: string) {
    const sessionKey = `session:${sessionId}`;
    const userId = this.cache.get(sessionKey);

    this.cache.del(sessionKey);
    if (userId) {
      this.cache.del(`session:${userId}:${sessionId}`);
    }
  }

  /**
   * Given a user ID, destroy all sessions for that user
   *
   * @param {number} userId - The user ID
   */
  public destroyAllSessionsByUserId = async (userId: number) => {
    const sessions = await this.cache.getByPrefix(`session:${userId}:`);

    await Promise.all(
      sessions.map(async (session) => {
        this.cache.del(session.key);
        if (session.val) this.cache.del(session.val);
      }),
    );
  };
}

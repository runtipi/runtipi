import { TranslatableError } from '@/common/error/translatable-error';
import { CacheService } from '@/core/cache/cache.service';
import { HttpStatus, Injectable } from '@nestjs/common';
import { PasswordService } from './password.service';

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60;

@Injectable()
export class PasswordConfirmationService {
  constructor(
    private readonly cache: CacheService,
    private readonly passwords: PasswordService,
  ) {}

  async verify(userId: number, password: string, hash: string) {
    const key = `password-confirmation:${userId}`;
    const generation = this.cache.reserveAttempt(key, MAX_ATTEMPTS, WINDOW_SECONDS);
    if (!generation) throw new TranslatableError('AUTH_ERROR_PASSWORD_TOO_MANY_ATTEMPTS', {}, HttpStatus.TOO_MANY_REQUESTS);

    let valid: boolean;
    try {
      valid = await this.passwords.verify(password, hash);
    } catch (error) {
      this.cache.refundAttempt(key, generation);
      throw error;
    }

    if (valid) this.cache.refundAttempt(key, generation);

    return valid;
  }
}

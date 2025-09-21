import { Injectable } from '@nestjs/common';

@Injectable()
export class PasswordService {
  /**
   * Hash a password asynchronously
   * @param password - The plain text password to hash
   * @returns Promise resolving to the hashed password
   */
  public async hash(password: string): Promise<string> {
    return Bun.password.hash(password);
  }

  /**
   * Verify a password against a hash
   * @param password - The plain text password to verify
   * @param hash - The hash to verify against
   * @returns Promise resolving to true if the password matches the hash, false otherwise
   */
  public async verify(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash);
  }
}

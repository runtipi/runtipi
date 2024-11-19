import crypto from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigurationService } from '../config/configuration.service';

@Injectable()
export class EncryptionService {
  algorithm = 'aes-256-gcm' as const;
  keyLength = 32;

  constructor(private readonly config: ConfigurationService) {}

  /**
   * Given a string, encrypts it using the provided salt
   */
  encrypt = (data: string, salt: string) => {
    const jwtSecret = this.config.get('jwtSecret');

    const key = crypto.pbkdf2Sync(jwtSecret, salt, 100000, this.keyLength, 'sha256');
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
  };

  /**
   * Given an encrypted string, decrypts it using the provided salt
   */
  decrypt = (encryptedData: string, salt: string) => {
    const jwtSecret = this.config.get('jwtSecret');

    const key = crypto.pbkdf2Sync(jwtSecret, salt, 100000, this.keyLength, 'sha256');
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts.shift() as string, 'hex');
    const encrypted = Buffer.from(parts.shift() as string, 'hex');
    const tag = Buffer.from(parts.shift() as string, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  };
}

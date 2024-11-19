import { Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import os from 'node:os';
import webpush from 'web-push';
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '@/common/constants';

type RandomFieldEncoding = 'hex' | 'base64';

@Injectable()
export class EnvUtils {
  public generateVapidKeys = () => {
    const vapidKeys = webpush.generateVAPIDKeys();
    return {
      publicKey: vapidKeys.publicKey,
      privateKey: vapidKeys.privateKey,
    };
  };

  private getSeed = (): string => {
    const seedFilePath = path.join(DATA_DIR, 'state', 'seed');
    if (!fs.existsSync(seedFilePath)) {
      throw new Error('Seed file not found');
    }
    return fs.readFileSync(seedFilePath, 'utf-8');
  };

  public getArchitecture = () => {
    const arch = os.arch();

    if (arch === 'arm64') return 'arm64';
    if (arch === 'x64') return 'amd64';

    throw new Error(`Unsupported architecture: ${arch}`);
  };

  /**
   *  This function generates a random string of the provided length by using the SHA-256 hash algorithm.
   *  It takes the provided name and a seed value, concatenates them, and uses them as input for the hash algorithm.
   *  It then returns a substring of the resulting hash of the provided length.
   *
   *  @param {string} name - A name used as input for the hash algorithm.
   *  @param {number} length - The desired length of the random string.
   */
  public createRandomString = (name: string, length: number, encoding: RandomFieldEncoding = 'hex') => {
    const seed = this.getSeed();
    const hash = crypto.createHash('sha256');

    hash.update(name + seed.toString());

    if (encoding === 'base64') {
      // Generate the hash and slice the buffer to get the exact number of bytes
      const randomBytes = hash.digest().slice(0, length);
      return randomBytes.toString('base64');
    }

    return hash.digest('hex').substring(0, length);
  };

  /**
   * Derives a new entropy value from the provided entropy and the seed
   * @param {string} entropy - The entropy value to derive from
   */
  public deriveEntropy = (entropy: string): string => {
    const seed = this.getSeed();
    const hmac = crypto.createHmac('sha256', seed);
    hmac.update(entropy);
    return hmac.digest('hex');
  };

  /**
   * Convert a Map of environment variables to a valid string of environment variables
   * that can be used in a .env file
   *
   * @param {Map<string, string>} envMap - Map of environment variables
   */
  public envMapToString = (envMap: Map<string, string>) => {
    const envArray = Array.from(envMap).map(([key, value]) => `${key}=${value}`);
    return envArray.join('\n');
  };

  /**
   * Convert a string of environment variables to a Map
   *
   * @param {string} envString - String of environment variables
   */
  public envStringToMap = (envString: string) => {
    const envMap = new Map<string, string>();
    const envArray = envString.split('\n');

    for (const env of envArray) {
      if (env.startsWith('#')) continue;

      const [key, ...rest] = env.split('=');

      if (key && rest.length) envMap.set(key, rest.join('='));
    }

    return envMap;
  };
}

import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const keyLength = 32;

/**
 * Given a string, encrypts it using the provided salt
 *
 * @param {string} data - The data to encrypt
 * @param {string} salt - The salt to use to encrypt the data
 * @returns {string} - The encrypted data
 */
export const encrypt = (data: string, salt: string) => {
  const key = crypto.pbkdf2Sync(process.env.JWT_SECRET, salt, 100000, keyLength, 'sha256');
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
};

/**
 * Given an encrypted string, decrypts it using the provided salt
 *
 * @param {string} encryptedData - The data to decrypt
 * @param {string} salt - The salt used to encrypt the data
 * @returns {string} - The decrypted data
 */
export const decrypt = (encryptedData: string, salt: string) => {
  const key = crypto.pbkdf2Sync(process.env.JWT_SECRET, salt, 100000, keyLength, 'sha256');
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts.shift() as string, 'hex');
  const encrypted = Buffer.from(parts.shift() as string, 'hex');
  const tag = Buffer.from(parts.shift() as string, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);

  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
};

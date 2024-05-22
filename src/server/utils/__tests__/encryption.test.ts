import { faker } from '@faker-js/faker';
import { describe, it, expect } from 'vitest';
import { TipiConfig } from '../../core/TipiConfig';
import { encrypt, decrypt } from '../encryption';

describe('Test: encrypt', () => {
  it('should encrypt the provided data', async () => {
    // arrange
    await TipiConfig.setConfig('jwtSecret', faker.lorem.word());
    const data = faker.lorem.word();
    const salt = faker.lorem.word();

    // act
    const encryptedData = encrypt(data, salt);

    // assert
    expect(encryptedData).not.toEqual(data);
  });

  it('should decrypt the provided data', async () => {
    // arrange
    await TipiConfig.setConfig('jwtSecret', faker.lorem.word());
    const data = faker.lorem.word();
    const salt = faker.lorem.word();

    // act
    const encryptedData = encrypt(data, salt);
    const decryptedData = decrypt(encryptedData, salt);

    // assert
    expect(decryptedData).toEqual(data);
  });

  it('should throw an error if jwtSecret has changed', async () => {
    // arrange
    await TipiConfig.setConfig('jwtSecret', faker.lorem.word());
    const data = faker.lorem.word();
    const salt = faker.lorem.word();

    // act
    const encryptedData = encrypt(data, salt);
    await TipiConfig.setConfig('jwtSecret', faker.lorem.word());
    const decrypting = () => decrypt(encryptedData, salt);

    // assert
    expect(decrypting).toThrow();
  });

  it('should throw an error if salt has changed', async () => {
    // arrange
    await TipiConfig.setConfig('jwtSecret', faker.lorem.word());
    const data = faker.lorem.word();
    const salt = faker.lorem.word();

    // act
    const encryptedData = encrypt(data, salt);
    const decrypting = () => decrypt(encryptedData, faker.lorem.word());

    // assert
    expect(decrypting).toThrow();
  });
});

import { faker } from '@faker-js/faker';
import { setConfig } from '../../core/TipiConfig';
import { encrypt, decrypt } from '../encryption';

describe('Test: encrypt', () => {
  it('should encrypt the provided data', () => {
    // arrange
    setConfig('jwtSecret', faker.random.word());
    const data = faker.random.word();
    const salt = faker.random.word();

    // act
    const encryptedData = encrypt(data, salt);

    // assert
    expect(encryptedData).not.toEqual(data);
  });

  it('should decrypt the provided data', () => {
    // arrange
    setConfig('jwtSecret', faker.random.word());
    const data = faker.random.word();
    const salt = faker.random.word();

    // act
    const encryptedData = encrypt(data, salt);
    const decryptedData = decrypt(encryptedData, salt);

    // assert
    expect(decryptedData).toEqual(data);
  });
});

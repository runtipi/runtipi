import { faker } from '@faker-js/faker';

const internalIp: { v4: typeof v4Mock } = jest.genMockFromModule('internal-ip');

const v4Mock = () => {
  return faker.internet.ipv4();
};

internalIp.v4 = v4Mock;

module.exports = internalIp;

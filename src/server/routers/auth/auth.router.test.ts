import { PrismaClient } from '@prisma/client';
import { authRouter } from './auth.router';
import { getTestDbClient } from '../../../../tests/server/db-connection';

let db: PrismaClient;
const TEST_SUITE = 'authrouter';

beforeAll(async () => {
  db = await getTestDbClient(TEST_SUITE);
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

beforeEach(async () => {
  await db.user.deleteMany();
  // Mute console.log
});

afterAll(async () => {
  await db.user.deleteMany();
  await db.$disconnect();
});

describe('Test: verifyTotp', () => {
  it('should be accessible without an account', async () => {
    // arrange
    const caller = authRouter.createCaller({ session: null });
    let error;

    // act
    try {
      await caller.verifyTotp({ totpCode: '123456', totpSessionId: '123456' });
    } catch (e) {
      error = e as { code: string };
    }

    // assert
    expect(error?.code).not.toBe('UNAUTHORIZED');
    expect(error?.code).toBeDefined();
    expect(error?.code).not.toBe(null);
  });
});

describe('Test: getTotpUri', () => {
  it('should not be accessible without an account', async () => {
    // arrange
    const caller = authRouter.createCaller({ session: null });
    let error;

    // act
    try {
      await caller.getTotpUri({ password: '123456' });
    } catch (e) {
      error = e as { code: string };
    }

    // assert
    expect(error?.code).toBe('UNAUTHORIZED');
  });

  it('should be accessible with an account', async () => {
    // arrange
    const caller = authRouter.createCaller({ session: { userId: 123456 } });
    let error;

    // act
    try {
      await caller.getTotpUri({ password: '123456' });
    } catch (e) {
      error = e as { code: string };
    }

    // assert
    expect(error?.code).not.toBe('UNAUTHORIZED');
  });
});

describe('Test: setupTotp', () => {
  it('should not be accessible without an account', async () => {
    // arrange
    const caller = authRouter.createCaller({ session: null });
    let error;

    // act
    try {
      await caller.setupTotp({ totpCode: '123456' });
    } catch (e) {
      error = e as { code: string };
    }

    // assert
    expect(error?.code).toBe('UNAUTHORIZED');
  });

  it('should be accessible with an account', async () => {
    // arrange
    const caller = authRouter.createCaller({ session: { userId: 123456 } });
    let error;

    // act
    try {
      await caller.setupTotp({ totpCode: '123456' });
    } catch (e) {
      error = e as { code: string };
    }

    // assert
    expect(error?.code).not.toBe('UNAUTHORIZED');
  });
});

describe('Test: disableTotp', () => {
  it('should not be accessible without an account', async () => {
    // arrange
    const caller = authRouter.createCaller({ session: null });
    let error;

    // act
    try {
      await caller.disableTotp({ password: '123456' });
    } catch (e) {
      error = e as { code: string };
    }

    // assert
    expect(error?.code).toBe('UNAUTHORIZED');
  });

  it('should be accessible with an account', async () => {
    // arrange
    const caller = authRouter.createCaller({ session: { userId: 122 } });
    let error;

    // act

    try {
      await caller.disableTotp({ password: '112321' });
    } catch (e) {
      error = e as { code: string };
    }

    // assert
    expect(error?.code).not.toBe('UNAUTHORIZED');
  });
});

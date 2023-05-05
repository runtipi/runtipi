import { fromPartial } from '@total-typescript/shoehorn';
import { TestDatabase, clearDatabase, closeDatabase, setupTestSuite } from '@/server/tests/test-utils';
import { createUser } from '@/server/tests/user.factory';
import { AuthRouter } from './auth.router';

let db: TestDatabase;
let authRouter: AuthRouter;
const TEST_SUITE = 'authrouter';
jest.mock('fs-extra');

beforeAll(async () => {
  const testSuite = await setupTestSuite(TEST_SUITE);
  db = testSuite;
  authRouter = (await import('./auth.router')).authRouter;
});

beforeEach(async () => {
  await clearDatabase(db);
});

afterAll(async () => {
  await closeDatabase(db);
});

describe('Test: login', () => {
  it('should be accessible without an account', async () => {
    // arrange
    const caller = authRouter.createCaller(fromPartial({ req: { session: {} } }));
    let error;

    // act
    try {
      await caller.login({ password: '123456', username: 'test' });
    } catch (e) {
      error = e as { code: string };
    }

    // assert
    expect(error?.code).not.toBe('UNAUTHORIZED');
  });
});

describe('Test: logout', () => {
  it('should not be accessible without an account', async () => {
    // arrange
    // @ts-expect-error - we're testing the error case
    const caller = authRouter.createCaller(fromPartial({ req: { session: { userId: 123456, destroy: (cb) => cb() } } }));
    let error;

    // act
    try {
      await caller.logout();
    } catch (e) {
      error = e as { code: string };
    }

    // assert
    expect(error?.code).toBe('UNAUTHORIZED');
  });

  it('should be accessible with an account', async () => {
    // arrange
    await createUser({ id: 123456 }, db);
    const caller = authRouter.createCaller(fromPartial({ req: { session: { userId: 123456 } } }));
    let error;

    // act
    try {
      await caller.logout();
    } catch (e) {
      error = e as { code: string };
    }

    // assert
    expect(error?.code).not.toBe('UNAUTHORIZED');
  });
});

describe('Test: register', () => {
  it('should be accessible without an account', async () => {
    // arrange
    const caller = authRouter.createCaller(fromPartial({ req: { session: {} } }));
    let error;

    // act
    try {
      await caller.register({ username: 'test@test.com', password: '123' });
    } catch (e) {
      error = e as { code: string };
    }

    // assert
    expect(error?.code).not.toBe('UNAUTHORIZED');
  });
});

describe('Test: me', () => {
  it('should be accessible without an account', async () => {
    // arrange
    const caller = authRouter.createCaller(fromPartial({ req: { session: {} } }));

    // act
    const result = await caller.me();

    // assert
    expect(result).toBe(null);
  });

  it('should be accessible with an account', async () => {
    // arrange
    await createUser({ id: 123456 }, db);
    const caller = authRouter.createCaller(fromPartial({ req: { session: { userId: 123456 } } }));

    // act
    const result = await caller.me();

    // assert
    expect(result).not.toBe(null);
    expect(result?.id).toBe(123456);
  });
});

describe('Test: isConfigured', () => {
  it('should be accessible without an account', async () => {
    // arrange
    const caller = authRouter.createCaller(fromPartial({ req: { session: {} } }));

    // act
    const result = await caller.isConfigured();

    // assert
    expect(result).toBe(false);
  });
});

describe('Test: verifyTotp', () => {
  it('should be accessible without an account', async () => {
    // arrange
    const caller = authRouter.createCaller(fromPartial({ req: { session: {} } }));
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
    const caller = authRouter.createCaller(fromPartial({ req: { session: {} } }));
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
    await createUser({ id: 123456 }, db);
    const caller = authRouter.createCaller(fromPartial({ req: { session: { userId: 123456 } } }));
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
    const caller = authRouter.createCaller(fromPartial({ req: { session: {} } }));
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
    await createUser({ id: 123456 }, db);
    const caller = authRouter.createCaller(fromPartial({ req: { session: { userId: 123456 } } }));
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
    const caller = authRouter.createCaller(fromPartial({ req: { session: {} } }));
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
    await createUser({ id: 123456 }, db);
    const caller = authRouter.createCaller(fromPartial({ req: { session: { userId: 123456 } } }));
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

describe('Test: changeOperatorPassword', () => {
  it('should be accessible without an account', async () => {
    // arrange
    const caller = authRouter.createCaller(fromPartial({ req: { session: {} } }));
    let error;

    // act
    try {
      await caller.changeOperatorPassword({ newPassword: '222' });
    } catch (e) {
      error = e as { code: string };
    }

    // assert
    expect(error?.code).not.toBe('UNAUTHORIZED');
  });

  it('should be accessible with an account', async () => {
    // arrange
    const caller = authRouter.createCaller(fromPartial({ req: { session: { userId: 122 } } }));
    let error;

    // act
    try {
      await caller.changeOperatorPassword({ newPassword: '222' });
    } catch (e) {
      error = e as { code: string };
    }

    // assert
    expect(error?.code).not.toBe('UNAUTHORIZED');
  });
});

describe('Test: resetPassword', () => {
  it('should not be accessible without an account', async () => {
    // arrange
    const caller = authRouter.createCaller(fromPartial({ req: { session: {} } }));
    let error;

    // act
    try {
      await caller.changePassword({ currentPassword: '111', newPassword: '222' });
    } catch (e) {
      error = e as { code: string };
    }

    // assert
    expect(error?.code).toBe('UNAUTHORIZED');
  });

  it('should be accessible with an account', async () => {
    // arrange
    await createUser({ id: 122 }, db);
    const caller = authRouter.createCaller(fromPartial({ req: { session: { userId: 122 } } }));
    let error;

    // act
    try {
      await caller.changePassword({ currentPassword: '111', newPassword: '222' });
    } catch (e) {
      error = e as { code: string };
    }

    // assert
    expect(error?.code).not.toBe('UNAUTHORIZED');
  });
});

import { authRouter } from './auth.router';

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

describe('Test: changeOperatorPassword', () => {
  it('should be accessible without an account', async () => {
    // arrange
    const caller = authRouter.createCaller({ session: null });
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
    const caller = authRouter.createCaller({ session: { userId: 122 } });
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
    const caller = authRouter.createCaller({ session: null });
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
    const caller = authRouter.createCaller({ session: { userId: 122 } });
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

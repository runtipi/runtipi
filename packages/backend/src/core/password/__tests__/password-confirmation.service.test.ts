import { createTestCache } from '@/core/cache/__tests__/cache-test-utils';
import { CacheService } from '@/core/cache/cache.service';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { PasswordConfirmationService } from '../password-confirmation.service';
import { PasswordService } from '../password.service';

const passwords = mock<PasswordService>();
let cache: CacheService;
let confirmation: PasswordConfirmationService;

beforeEach(() => {
  vi.useFakeTimers();
  passwords.verify.mockReset();
  cache = createTestCache().cache;
  confirmation = new PasswordConfirmationService(cache, passwords);
});
afterEach(() => vi.useRealTimers());

test('reserves the shared user budget before asynchronous verification', async () => {
  passwords.verify.mockImplementation(() => new Promise(() => {}));
  for (let attempt = 0; attempt < 5; attempt++) void confirmation.verify(1, 'guess', 'hash');

  await expect(confirmation.verify(1, 'correct', 'hash')).rejects.toMatchObject({ status: 429 });
  expect(passwords.verify).toHaveBeenCalledTimes(5);
  void confirmation.verify(2, 'guess', 'hash');
  expect(passwords.verify).toHaveBeenCalledTimes(6);
});

test('a successful concurrent request refunds only its own slot', async () => {
  let succeed!: (valid: boolean) => void;
  passwords.verify
    .mockReturnValueOnce(
      new Promise((resolve) => {
        succeed = resolve;
      }),
    )
    .mockResolvedValue(false);
  const correct = confirmation.verify(1, 'correct', 'hash');
  for (let attempt = 0; attempt < 4; attempt++) await confirmation.verify(1, 'guess', 'hash');
  succeed(true);
  await expect(correct).resolves.toBe(true);
  await expect(confirmation.verify(1, 'guess', 'hash')).resolves.toBe(false);

  await expect(confirmation.verify(1, 'correct', 'hash')).rejects.toMatchObject({ status: 429 });
  expect(passwords.verify).toHaveBeenCalledTimes(6);
});

test.each(['success', 'exception'] as const)('a slow %s cannot refund a newer window', async (outcome) => {
  let complete!: (valid: boolean) => void;
  let fail!: (error: Error) => void;
  passwords.verify
    .mockReturnValueOnce(
      new Promise((resolve, reject) => {
        complete = resolve;
        fail = reject;
      }),
    )
    .mockResolvedValue(false);
  const old = confirmation.verify(1, 'old', 'hash');
  vi.advanceTimersByTime(15 * 60 * 1000);
  for (let attempt = 0; attempt < 5; attempt++) await confirmation.verify(1, 'guess', 'hash');

  if (outcome === 'success') {
    complete(true);
    await expect(old).resolves.toBe(true);
  } else {
    fail(new Error('Verifier failed'));
    await expect(old).rejects.toThrow('Verifier failed');
  }

  await expect(confirmation.verify(1, 'correct', 'hash')).rejects.toMatchObject({ status: 429 });
  vi.advanceTimersByTime(15 * 60 * 1000);
  await expect(confirmation.verify(1, 'guess', 'hash')).resolves.toBe(false);
});

test('verifier failures and successful confirmations do not consume the failed-attempt budget', async () => {
  passwords.verify.mockRejectedValueOnce(new Error('Verifier failed')).mockResolvedValue(true);
  await expect(confirmation.verify(1, 'correct', 'hash')).rejects.toThrow('Verifier failed');
  for (let attempt = 0; attempt < 10; attempt++) await expect(confirmation.verify(1, 'correct', 'hash')).resolves.toBe(true);
});

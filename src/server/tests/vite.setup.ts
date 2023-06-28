import { vi } from 'vitest';
import { redisMock } from '../../../tests/mocks/redis';

vi.mock('../core/Logger', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('redis', () => redisMock);

vi.mock('fs-extra', async () => {
  const { fsExtraMock } = await import('@/tests/mocks/fs-extra');
  return {
    ...fsExtraMock,
  };
});

import { redisMock } from '@/tests/mocks/redis';
import { vi } from 'vitest';

vi.mock('../core/Logger', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('redis', () => redisMock);

import { vi } from 'vitest';

export const mockSelect = <T>(returnValue: T) => vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => returnValue) })) }));

export const mockInsert = <T>(returnValue: T) => vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(() => returnValue) })) }));

export const mockQuery = <T>(returnValue: T) => ({ userTable: { findFirst: vi.fn(() => returnValue) } });

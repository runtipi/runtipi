import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUpdateAllApps } from '../use-update-all-apps';

const toastMock = vi.hoisted(() => Object.assign(vi.fn(), { loading: vi.fn(), error: vi.fn() }));

vi.mock('react-hot-toast', () => ({ default: toastMock }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, params?: { count?: number }) => (params?.count === undefined ? key : `${key}:${params.count}`) }),
}));
vi.mock('@/api-client/@tanstack/react-query.gen', () => ({ updateAllAppsMutation: () => ({}) }));
vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: { onSuccess: (data: unknown) => void }) => options,
}));

const runSuccess = (data: unknown) => {
  const { result } = renderHook(() => useUpdateAllApps());
  act(() => (result.current as unknown as { onSuccess: (data: unknown) => void }).onSuccess(data));
};

describe('useUpdateAllApps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('warns about apps skipped because their update notices require confirmation', () => {
    runSuccess([
      { urn: 'galette:store', status: 'skipped', message: 'UPDATE_NOTICES_REQUIRE_CONFIRMATION' },
      { urn: 'other:store', status: 'accepted', requestId: 'request-id' },
    ]);

    expect(toastMock).toHaveBeenCalledWith('APP_UPDATE_ALL_SKIPPED_NOTICES:1', expect.objectContaining({ duration: 8000 }));
    expect(toastMock.loading).toHaveBeenCalledWith('MY_APPS_UPDATE_ALL_IN_PROGRESS', { duration: 3000 });
  });

  it('only reports progress when no app is skipped', () => {
    runSuccess([{ urn: 'other:store', status: 'accepted', requestId: 'request-id' }]);

    expect(toastMock).not.toHaveBeenCalled();
    expect(toastMock.loading).toHaveBeenCalledTimes(1);
  });

  it('does not report progress when every app is skipped', () => {
    runSuccess([{ urn: 'galette:store', status: 'skipped', message: 'UPDATE_NOTICES_REQUIRE_CONFIRMATION' }]);

    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock.loading).not.toHaveBeenCalled();
  });
});

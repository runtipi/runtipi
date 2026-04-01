import type { ChangeEvent } from 'react';
import { fireEvent, render, screen, waitFor } from '@/tests/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMultiServiceStore } from '@/stores/multiServiceStore';
import CustomAppCreatePage from './custom-app-create-page';

const mutate = vi.fn();
const navigate = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');

  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock('@tanstack/react-query', () => ({
  useMutation: () => ({
    isPending: false,
    mutate,
  }),
}));

vi.mock('@/api-client/@tanstack/react-query.gen', () => ({
  createCustomAppMutation: () => ({}),
}));

vi.mock('@/components/ui/Input/Input', () => ({
  Input: ({ disabled, error, onChange }: { disabled?: boolean; error?: string; onChange?: (event: ChangeEvent<HTMLInputElement>) => void }) => (
    <div>
      <input aria-label="app-name" disabled={disabled} onChange={onChange} />
      {error && <span>{error}</span>}
    </div>
  ),
}));

vi.mock('@/components/multi-service-form/multi-service-form', () => ({
  MultiServiceForm: ({ onSubmit }: { onSubmit?: (data: { schemaVersion: 2; services: [] }) => void }) => (
    <button type="button" onClick={() => onSubmit?.({ schemaVersion: 2, services: [] })}>
      submit-services
    </button>
  ),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('CustomAppCreatePage', () => {
  beforeEach(() => {
    mutate.mockReset();
    navigate.mockReset();
    useMultiServiceStore.getState().resetToDefaults();
    useMultiServiceStore.getState().setComposeExtras({
      volumes: {
        stale_data: null,
      },
    });
  });

  it('does not submit stale compose extras carried over from another page', async () => {
    render(<CustomAppCreatePage />);

    await waitFor(() => {
      expect(useMultiServiceStore.getState().composeExtras).toEqual({});
    });

    fireEvent.change(screen.getByLabelText('app-name'), { target: { value: 'my-custom-app' } });
    fireEvent.click(screen.getByRole('button', { name: 'submit-services' }));

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledTimes(1);
    });

    const firstCall = mutate.mock.calls[0];
    expect(firstCall).toBeDefined();

    if (!firstCall) {
      throw new Error('Expected mutation to be called');
    }

    expect(firstCall[0].body.config).not.toHaveProperty('volumes');
  });
});

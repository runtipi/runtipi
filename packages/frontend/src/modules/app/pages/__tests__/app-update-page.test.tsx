import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { fireEvent, render, screen } from '@/tests/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import AppUpdatePage from '../app-update-page';

const navigate = vi.fn();

afterEach(cleanup);

vi.mock('@/api-client/@tanstack/react-query.gen', () => ({
  getAppComposeDiffOptions: () => ({ queryKey: ['compose-diff'] }),
  getAppConfigDiffOptions: () => ({ queryKey: ['config-diff'] }),
  getAppOptions: () => ({ queryKey: ['app'] }),
  updateAppMutation: () => ({}),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
  useQuery: ({ queryKey, initialData }: { queryKey: string[]; initialData?: unknown }) => {
    if (queryKey[0] === 'app') {
      return { data: initialData };
    }

    if (queryKey[0] === 'config-diff') {
      return {
        data: { current: '', new: '' },
        isLoading: false,
      };
    }

    return {
      data: { current: '{}', new: '{}' },
      isLoading: false,
    };
  },
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');

  return {
    ...actual,
    redirect: vi.fn(),
    useLocation: () => ({ state: { from: '/apps' } }),
    useNavigate: () => navigate,
    useParams: () => ({ appId: 'app-id', storeId: 'store-id' }),
  };
});

vi.mock('@/components/app-logo/app-logo', () => ({
  AppLogo: ({ alt }: { alt: string }) => <div>{alt}</div>,
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, ...props }: { children: ReactNode }) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/ScrollArea', () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/Stepper/Stepper', () => ({
  StepContent: ({ children }: { children: ReactNode; step: number }) => <div>{children}</div>,
  Stepper: ({ children }: { children: ReactNode; currentStep: number }) => <div>{children}</div>,
  StepTrigger: ({ title }: { title: string; onStepChange: (step: number) => void; step: number }) => <button type="button">{title}</button>,
  StepTriggerList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/Switch', () => ({
  Switch: ({ label, checked, onCheckedChange }: { label: string; checked?: boolean; onCheckedChange?: (checked: boolean) => void }) => (
    <label>
      <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange?.(e.target.checked)} />
      {label}
    </label>
  ),
}));

vi.mock('@uiw/react-codemirror', () => ({
  default: () => <div />,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
  },
}));

const i18n = i18next.createInstance();

beforeEach(async () => {
  navigate.mockReset();

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
      lng: 'en',
      react: {
        useSuspense: false,
      },
      resources: {
        en: {
          translation: {
            APP_ACTION_CANCEL: 'Cancel',
            APP_UPDATE_BACKUP_SUBTITLE: 'Backup before updating.',
            APP_UPDATE_BACKUP_TITLE: 'Backup',
            APP_UPDATE_COMPOSE_SUBTITLE: 'Compose review.',
            APP_UPDATE_COMPOSE_TITLE: 'Compose',
            APP_UPDATE_CONFIGURATION_SUBTITLE: 'Configuration review.',
            APP_UPDATE_CONFIGURATION_TITLE: 'Configuration',
            APP_UPDATE_FORM_BACK: 'Back',
            APP_UPDATE_FORM_BACKUP: 'Create a backup',
            APP_UPDATE_FORM_NEXT: 'Next',
            APP_UPDATE_FORM_SUBMIT: 'Update',
            APP_UPDATE_FORM_TITLE: 'Update {{name}}',
            APP_UPDATE_INFORMATION_SUBTITLE: 'To update <name/> to version <strong/>, follow the steps to review and apply the update.',
            APP_UPDATE_INFORMATION_TITLE: 'Information',
            APP_UPDATE_WARNINGS_TITLE: 'Warnings',
            APP_UPDATE_WARNINGS_SUBTITLE: 'Important changes and required steps for this update.',
            APP_UPDATE_WARNINGS_BEFORE: 'Before the update',
            APP_UPDATE_WARNINGS_AFTER: 'After the update',
            APP_UPDATE_WARNINGS_ACKNOWLEDGE: 'I have read the warnings and completed the required preparations.',
            LOADING: 'Loading',
          },
        },
      },
    });
  }
});

describe('AppUpdatePage', () => {
  it('renders malicious update metadata as text instead of parsing it as HTML', () => {
    const maliciousVersion = '</strong><strong>pwned</strong><strong>';
    const appData = {
      info: {
        name: 'Example App',
        urn: 'example-app:store-id',
        version: '1.0.0',
      },
      metadata: {
        latestDockerVersion: maliciousVersion,
        latestVersion: null,
      },
    } as unknown as Parameters<typeof AppUpdatePage>[0]['loaderData'];

    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <AppUpdatePage {...({ loaderData: appData } as unknown as Parameters<typeof AppUpdatePage>[0])} />
      </I18nextProvider>,
    );

    expect(screen.queryByText('pwned')).not.toBeInTheDocument();
    expect(container.querySelectorAll('strong')).toHaveLength(1);
    expect(container).toHaveTextContent(`To update Example App to version ${maliciousVersion}, follow the steps to review and apply the update.`);
  });

  it('does not render a warnings step when no update notices apply', () => {
    const appData = {
      info: {
        name: 'Example App',
        urn: 'example-app:store-id',
        version: '1.0.0',
      },
      metadata: {
        latestDockerVersion: '2.0.0',
        latestVersion: 2,
        updateNotices: [],
        updateNoticesFingerprint: 'fingerprint',
      },
    } as unknown as Parameters<typeof AppUpdatePage>[0]['loaderData'];

    render(
      <I18nextProvider i18n={i18n}>
        <AppUpdatePage {...({ loaderData: appData } as unknown as Parameters<typeof AppUpdatePage>[0])} />
      </I18nextProvider>,
    );

    expect(screen.queryByText('Warnings')).not.toBeInTheDocument();
    expect(screen.getByText('Information')).toBeInTheDocument();
  });

  it('renders applicable notices as the first step and blocks progression until acknowledged', () => {
    const appData = {
      info: {
        name: 'Example App',
        urn: 'example-app:store-id',
        version: '1.0.0',
      },
      metadata: {
        latestDockerVersion: '2.0.0',
        latestVersion: 2,
        updateNotices: [
          {
            id: 'database-migration-2',
            tipi_version: 2,
            severity: 'warning',
            title: 'Database migration',
            message: 'The first startup may take several minutes.',
            before_update: ['Check available disk space.'],
            after_update: ['Do not restart during the migration.'],
            require_confirmation: true,
          },
        ],
        updateNoticesFingerprint: 'fingerprint',
      },
    } as unknown as Parameters<typeof AppUpdatePage>[0]['loaderData'];

    render(
      <I18nextProvider i18n={i18n}>
        <AppUpdatePage {...({ loaderData: appData } as unknown as Parameters<typeof AppUpdatePage>[0])} />
      </I18nextProvider>,
    );

    expect(screen.getByText('Warnings')).toBeInTheDocument();
    expect(screen.getByText('Database migration')).toBeInTheDocument();
    expect(screen.getByText('The first startup may take several minutes.')).toBeInTheDocument();
    expect(screen.getByText('Check available disk space.')).toBeInTheDocument();
    expect(screen.getByText('Do not restart during the migration.')).toBeInTheDocument();

    // Next is disabled while the required notice is not acknowledged
    const nextButton = screen.getByText('Next').closest('button') as HTMLButtonElement;
    expect(nextButton).toHaveProperty('disabled', true);

    // Acknowledging the notice unlocks the next step
    // (the first checkbox is the notice acknowledgement; the second one is
    // the backup switch of the last step, all rendered by the step mocks)
    const acknowledgeCheckbox = screen.getAllByRole('checkbox')[0];
    if (!acknowledgeCheckbox) throw new Error('Notice acknowledgement checkbox not found');
    fireEvent.click(acknowledgeCheckbox);
    expect(nextButton).toHaveProperty('disabled', false);
  });

  it('localizes notices using the matching translation with fallback to the English reference', async () => {
    const appData = {
      info: {
        name: 'Example App',
        urn: 'example-app:store-id',
        version: '1.0.0',
      },
      metadata: {
        latestDockerVersion: '2.0.0',
        latestVersion: 2,
        updateNotices: [
          {
            id: 'database-migration-2',
            tipi_version: 2,
            severity: 'info',
            title: 'Database migration',
            message: 'The first startup may take several minutes.',
            before_update: [],
            after_update: ['Verify the logs.'],
            require_confirmation: false,
            translations: {
              fr: {
                title: 'Migration de la base',
                message: 'Le premier démarrage peut prendre plusieurs minutes.',
                after_update: ['Vérifiez les journaux.'],
              },
            },
          },
        ],
        updateNoticesFingerprint: 'fingerprint',
      },
    } as unknown as Parameters<typeof AppUpdatePage>[0]['loaderData'];

    render(
      <I18nextProvider i18n={i18n}>
        <AppUpdatePage {...({ loaderData: appData } as unknown as Parameters<typeof AppUpdatePage>[0])} />
      </I18nextProvider>,
    );

    // English reference is displayed for the English locale
    expect(screen.getByText('Database migration')).toBeInTheDocument();

    // ... and the French translation is used when the language is French
    await i18n.changeLanguage('fr-FR');
    expect(await screen.findByText('Migration de la base')).toBeInTheDocument();
    expect(screen.getByText('Le premier démarrage peut prendre plusieurs minutes.')).toBeInTheDocument();
    expect(screen.getByText('Vérifiez les journaux.')).toBeInTheDocument();
    await i18n.changeLanguage('en');
  });

  it('discards previous acknowledgements and blocks navigation when the notice snapshot changes', async () => {
    const buildAppData = (fingerprint: string) =>
      ({
        info: {
          name: 'Example App',
          urn: 'example-app:store-id',
          version: '1.0.0',
        },
        metadata: {
          latestDockerVersion: '2.0.0',
          latestVersion: 2,
          updateNotices: [
            {
              id: 'notice-1',
              tipi_version: 2,
              severity: 'warning',
              title: 'First warning',
              message: 'First warning message.',
              before_update: [],
              after_update: [],
              require_confirmation: true,
            },
            {
              id: 'notice-2',
              tipi_version: 2,
              severity: 'warning',
              title: 'Second warning',
              message: 'Second warning message.',
              before_update: [],
              after_update: [],
              require_confirmation: true,
            },
          ],
          updateNoticesFingerprint: fingerprint,
        },
      }) as unknown as Parameters<typeof AppUpdatePage>[0]['loaderData'];

    const view = render(
      <I18nextProvider i18n={i18n}>
        <AppUpdatePage {...({ loaderData: buildAppData('fingerprint-a') } as unknown as Parameters<typeof AppUpdatePage>[0])} />
      </I18nextProvider>,
    );

    // Acknowledge both notices on the first snapshot
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    const [firstNoticeCheckbox, secondNoticeCheckbox] = checkboxes;
    if (!firstNoticeCheckbox || !secondNoticeCheckbox) throw new Error('Notice checkboxes not found');
    fireEvent.click(firstNoticeCheckbox);
    fireEvent.click(secondNoticeCheckbox);
    expect(screen.getByText('Next').closest('button')).toHaveProperty('disabled', false);

    // The catalog refreshed: the notice content changed under the same ids
    view.rerender(
      <I18nextProvider i18n={i18n}>
        <AppUpdatePage {...({ loaderData: buildAppData('fingerprint-b') } as unknown as Parameters<typeof AppUpdatePage>[0])} />
      </I18nextProvider>,
    );

    // Both confirmations were discarded and navigation is blocked again
    // (only the first two checkboxes are the notice acknowledgements; the last
    // one is the backup switch of the final step)
    const nextButton = screen.getByText('Next').closest('button');
    expect(nextButton).toHaveProperty('disabled', true);
    const noticeCheckboxes = screen.getAllByRole('checkbox').slice(0, 2) as HTMLInputElement[];
    expect(noticeCheckboxes.every((c) => !c.checked)).toBe(true);

    // Checking one notice does not silently restore the other old confirmation
    fireEvent.click(noticeCheckboxes[0] as HTMLInputElement);
    expect((noticeCheckboxes[0] as HTMLInputElement).checked).toBe(true);
    expect((noticeCheckboxes[1] as HTMLInputElement).checked).toBe(false);
    expect(nextButton).toHaveProperty('disabled', true);
  });
});

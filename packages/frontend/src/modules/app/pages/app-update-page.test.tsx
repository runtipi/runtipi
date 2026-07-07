import type { ReactNode } from 'react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { render, screen } from '@/tests/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppUpdatePage from './app-update-page';

const navigate = vi.fn();

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
  Switch: ({ label }: { label: string }) => (
    <label>
      <input type="checkbox" />
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
});

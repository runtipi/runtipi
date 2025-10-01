import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StoreTile } from './store-tile';
import type { AppInfoSimple } from '@/types/app.types';
import { BrowserRouter } from 'react-router';

// Mock the translation hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'APP_NEW': 'NEW',
        'APP_INSTALLED': 'INSTALLED',
        'APP_CATEGORY_MEDIA': 'Media',
        'APP_CATEGORY_NETWORK': 'Network',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock the app logo component
vi.mock('@/components/app-logo/app-logo', () => ({
  AppLogo: ({ urn }: { urn: string }) => <div data-testid="app-logo">{urn}</div>,
}));

const mockApp: AppInfoSimple = {
  id: 'test-app',
  urn: 'test-app:main',
  name: 'Test Application',
  short_desc: 'A test application for unit testing',
  categories: ['media', 'network'],
  available: true,
  deprecated: false,
  created_at: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
};

const mockNewApp: AppInfoSimple = {
  ...mockApp,
  id: 'new-app',
  urn: 'new-app:main',
  created_at: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago (new)
};

describe('StoreTile component', () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  it('should render without crashing', () => {
    renderWithRouter(<StoreTile app={mockApp} isLoading={false} />);
    expect(screen.getByText('Test Application')).toBeInTheDocument();
  });

  it('should display app name and description', () => {
    renderWithRouter(<StoreTile app={mockApp} isLoading={false} />);
    expect(screen.getByText('Test Application')).toBeInTheDocument();
    expect(screen.getByText('A test application for unit testing')).toBeInTheDocument();
  });

  it('should not show installed badge when isInstalled is false', () => {
    renderWithRouter(<StoreTile app={mockApp} isLoading={false} isInstalled={false} />);
    expect(screen.queryByText(/INSTALLED/)).not.toBeInTheDocument();
  });

  it('should show installed badge when isInstalled is true', () => {
    renderWithRouter(<StoreTile app={mockApp} isLoading={false} isInstalled={true} />);
    expect(screen.getByText(/INSTALLED/)).toBeInTheDocument();
  });

  it('should apply installed class when isInstalled is true', () => {
    renderWithRouter(<StoreTile app={mockApp} isLoading={false} isInstalled={true} />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('app-tile');
    expect(link).toHaveClass('installed');
  });

  it('should not apply installed class when isInstalled is false', () => {
    renderWithRouter(<StoreTile app={mockApp} isLoading={false} isInstalled={false} />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('app-tile');
    expect(link).not.toHaveClass('installed');
  });

  it('should show NEW badge for recently created apps', () => {
    renderWithRouter(<StoreTile app={mockNewApp} isLoading={false} />);
    expect(screen.getByText('NEW')).toBeInTheDocument();
  });

  it('should show both NEW and INSTALLED badges when applicable', () => {
    renderWithRouter(<StoreTile app={mockNewApp} isLoading={false} isInstalled={true} />);
    expect(screen.getByText('NEW')).toBeInTheDocument();
    expect(screen.getByText(/INSTALLED/)).toBeInTheDocument();
  });

  it('should render app categories', () => {
    renderWithRouter(<StoreTile app={mockApp} isLoading={false} />);
    expect(screen.getByText('Media')).toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
  });

  it('should use correct link URL', () => {
    renderWithRouter(<StoreTile app={mockApp} isLoading={false} />);
    const link = screen.getByRole('link') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/app-store/main/test-app');
  });

  it('should have correct aria-label', () => {
    renderWithRouter(<StoreTile app={mockApp} isLoading={false} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('aria-label', 'Test Application');
  });

  it('should default isInstalled to false when not provided', () => {
    renderWithRouter(<StoreTile app={mockApp} isLoading={false} />);
    const link = screen.getByRole('link');
    expect(link).not.toHaveClass('installed');
    expect(screen.queryByText(/INSTALLED/)).not.toBeInTheDocument();
  });
});

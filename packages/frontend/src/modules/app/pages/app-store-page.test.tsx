import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import AppStorePage from './app-store-page';

// Mock the store state
vi.mock('@/stores/app-store', () => ({
  useAppStoreState: () => ({
    category: undefined,
    search: '',
    storeId: undefined,
  }),
}));

// Mock the infinite scroll hook
vi.mock('@/lib/hooks/use-infinite-scroll', () => ({
  useInfiniteScroll: () => ({
    lastElementRef: vi.fn(),
  }),
}));

// Mock the StoreTile component
vi.mock('../components/store-tile/store-tile', () => ({
  StoreTile: ({ app, isInstalled }: { app: any; isInstalled: boolean }) => (
    <div data-testid={`app-tile-${app.id}`} data-installed={isInstalled}>
      {app.name}
      {isInstalled && <span data-testid="installed-indicator">Installed</span>}
    </div>
  ),
}));

describe('AppStorePage component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{component}</BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('should render without crashing', () => {
    renderWithProviders(<AppStorePage />);
  });

  it('should mark installed apps correctly', async () => {
    // Mock the API responses
    queryClient.setQueryData(['searchApps', 'infinite', expect.anything()], {
      pages: [
        {
          data: [
            { id: 'app1', urn: 'app1:main', name: 'App 1' },
            { id: 'app2', urn: 'app2:main', name: 'App 2' },
            { id: 'app3', urn: 'app3:main', name: 'App 3' },
          ],
          nextCursor: null,
        },
      ],
      pageParams: [undefined],
    });

    queryClient.setQueryData(['getInstalledApps'], {
      installed: [
        {
          info: { urn: 'app1:main' },
          app: { id: 1 },
        },
        {
          info: { urn: 'app3:main' },
          app: { id: 3 },
        },
      ],
    });

    renderWithProviders(<AppStorePage />);

    await waitFor(() => {
      expect(screen.getByTestId('app-tile-app1')).toBeInTheDocument();
    });

    // Check that app1 and app3 are marked as installed
    const app1Tile = screen.getByTestId('app-tile-app1');
    const app2Tile = screen.getByTestId('app-tile-app2');
    const app3Tile = screen.getByTestId('app-tile-app3');

    expect(app1Tile).toHaveAttribute('data-installed', 'true');
    expect(app2Tile).toHaveAttribute('data-installed', 'false');
    expect(app3Tile).toHaveAttribute('data-installed', 'true');
  });

  it('should handle empty installed apps list', async () => {
    queryClient.setQueryData(['searchApps', 'infinite', expect.anything()], {
      pages: [
        {
          data: [{ id: 'app1', urn: 'app1:main', name: 'App 1' }],
          nextCursor: null,
        },
      ],
      pageParams: [undefined],
    });

    queryClient.setQueryData(['getInstalledApps'], {
      installed: [],
    });

    renderWithProviders(<AppStorePage />);

    await waitFor(() => {
      expect(screen.getByTestId('app-tile-app1')).toBeInTheDocument();
    });

    const app1Tile = screen.getByTestId('app-tile-app1');
    expect(app1Tile).toHaveAttribute('data-installed', 'false');
  });

  it('should handle undefined installed apps data', async () => {
    queryClient.setQueryData(['searchApps', 'infinite', expect.anything()], {
      pages: [
        {
          data: [{ id: 'app1', urn: 'app1:main', name: 'App 1' }],
          nextCursor: null,
        },
      ],
      pageParams: [undefined],
    });

    queryClient.setQueryData(['getInstalledApps'], undefined);

    renderWithProviders(<AppStorePage />);

    await waitFor(() => {
      expect(screen.getByTestId('app-tile-app1')).toBeInTheDocument();
    });

    const app1Tile = screen.getByTestId('app-tile-app1');
    expect(app1Tile).toHaveAttribute('data-installed', 'false');
  });
});

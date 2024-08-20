import type { GetAppCommand } from '@/server/services/app-catalog/commands';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, userEvent, waitFor } from '../../../../../../../tests/test-utils';
import { AppActions } from './AppActions';

afterEach(cleanup);

const useAppStatusMock = vi.fn();
vi.mock('@/hooks/useAppStatus', async (importOriginal) => {
  const original = (await importOriginal()) as typeof importOriginal;
  return {
    ...original,
    useAppStatus: () => useAppStatusMock(),
  };
});

describe('Test: AppActions', () => {
  const app = {
    id: 'test',
    info: {
      port: 3000,
      id: 'test',
      name: 'My App',
      form_fields: [],
      exposable: [],
    },
  } as unknown as Awaited<ReturnType<GetAppCommand['execute']>>;

  it('should render the correct buttons when app status is running', () => {
    // arrange
    useAppStatusMock.mockImplementation(() => 'running');

    render(<AppActions app={app} />);

    // assert
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is starting', () => {
    // arrange
    useAppStatusMock.mockImplementation(() => 'starting');
    render(<AppActions app={app} />);

    // assert
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is stopping', () => {
    // arrange
    useAppStatusMock.mockImplementation(() => 'stopping');
    render(<AppActions app={app} />);

    // assert
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is removing', () => {
    // arrange
    useAppStatusMock.mockImplementation(() => 'uninstalling');
    render(<AppActions app={app} />);

    // assert
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is installing', () => {
    // arrange
    useAppStatusMock.mockImplementation(() => 'installing');
    render(<AppActions app={app} />);

    // assert
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is updating', () => {
    // arrange
    useAppStatusMock.mockImplementation(() => 'updating');
    render(<AppActions app={app} />);

    // assert
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is missing', () => {
    // arrange
    useAppStatusMock.mockImplementation(() => 'missing');
    render(<AppActions app={app} />);

    // assert
    expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument();
  });

  it('should render update button if app is running and has an update available', () => {
    // arrange
    useAppStatusMock.mockImplementation(() => 'running');
    render(<AppActions app={{ ...app, version: 1, latestVersion: 2 }} />);

    // assert
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
  });

  it('should render update button if app is stopped and has an update available', () => {
    // arrange
    useAppStatusMock.mockImplementation(() => 'stopped');
    render(<AppActions app={{ ...app, version: 1, latestVersion: 2 }} />);

    // assert
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
  });

  it('should render domain button if app is running and has a domain', async () => {
    // arrange
    const appWithDomain = {
      ...app,
      exposed: true,
      domain: 'myapp.example.com',
    };
    window.open = vi.fn();
    useAppStatusMock.mockImplementation(() => 'running');
    render(<AppActions app={appWithDomain} />);

    // act
    const openButton = screen.getByRole('button', { name: 'Open' });
    await userEvent.type(openButton, '{arrowdown}');
    await waitFor(() => {
      expect(screen.getByText(/myapp.example.com/)).toBeInTheDocument();
    });
    const domainButton = screen.getByText(/myapp.example.com/);

    // assert
    await userEvent.click(domainButton);
    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith('https://myapp.example.com', '_blank', 'noreferrer');
    });
  });

  it('should render local_domain open button when exposed locally', async () => {
    // arrange
    window.open = vi.fn();
    useAppStatusMock.mockImplementation(() => 'running');
    render(<AppActions localDomain="tipi.lan" app={{ ...app, exposedLocal: true }} />);

    // act
    const openButton = screen.getByRole('button', { name: 'Open' });
    await userEvent.type(openButton, '{arrowdown}');
    await waitFor(() => {
      expect(screen.getByText(/test.tipi.lan/)).toBeInTheDocument();
    });
    const localButton = screen.getByText(/test.tipi.lan/);

    // assert
    await userEvent.click(localButton);
    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith('https://test.tipi.lan', '_blank', 'noreferrer');
    });
  });

  it('should render local open button when port is open', async () => {
    // arrange
    window.open = vi.fn();
    useAppStatusMock.mockImplementation(() => 'running');
    render(<AppActions app={{ ...app, openPort: true }} />);

    // act
    const openButton = screen.getByRole('button', { name: 'Open' });
    await userEvent.type(openButton, '{arrowdown}');
    await waitFor(() => {
      expect(screen.getByText(/localhost:3000/)).toBeInTheDocument();
    });
    const localButton = screen.getByText(/localhost:3000/);

    // assert
    await userEvent.click(localButton);
    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith('http://localhost:3000', '_blank', 'noreferrer');
    });
  });
});

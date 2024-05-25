import React from 'react';
import { AppInfo } from '@runtipi/shared';
import { vi, afterEach, describe, it, expect } from 'vitest';
import { AppActions } from './AppActions';
import { cleanup, fireEvent, render, screen, waitFor, userEvent } from '../../../../../../../tests/test-utils';

afterEach(cleanup);

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
  } as unknown as AppInfo;

  it('should call the callbacks when buttons are clicked', () => {
    // arrange
    const onStart = vi.fn();
    const onRemove = vi.fn();
    // @ts-expect-error - we don't need to pass all props for this test
    render(<AppActions status="stopped" app={app} onStart={onStart} onUninstall={onRemove} />);

    // act
    const startButton = screen.getByRole('button', { name: 'Start' });
    fireEvent.click(startButton);
    const removeButton = screen.getByText('Remove');
    fireEvent.click(removeButton);

    // assert
    expect(onStart).toHaveBeenCalled();
    expect(onRemove).toHaveBeenCalled();
  });

  it('should render the correct buttons when app status is running', () => {
    // arrange
    // @ts-expect-error - we don't need to pass all props for this test
    render(<AppActions status="running" app={app} />);

    // assert
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is starting', () => {
    // arrange
    // @ts-expect-error - we don't need to pass all props for this test
    render(<AppActions status="starting" app={app} />);

    // assert
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is stopping', () => {
    // arrange
    // @ts-expect-error - we don't need to pass all props for this test
    render(<AppActions status="stopping" app={app} />);

    // assert
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is removing', () => {
    // arrange
    // @ts-expect-error - we don't need to pass all props for this test
    render(<AppActions status="uninstalling" app={app} />);

    // assert
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is installing', () => {
    // arrange
    // @ts-expect-error - we don't need to pass all props for this test
    render(<AppActions status="installing" app={app} />);

    // assert
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is updating', () => {
    // arrange
    // @ts-expect-error - we don't need to pass all props for this test
    render(<AppActions status="updating" app={app} />);

    // assert
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is missing', () => {
    // arrange
    // @ts-expect-error - we don't need to pass all props for this test
    render(<AppActions status="missing" app={app} />);

    // assert
    expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument();
  });

  it('should render update button if app is running and has an update available', () => {
    // arrange
    // @ts-expect-error - we don't need to pass all props for this test
    render(<AppActions status="running" updateAvailable app={app} />);

    // assert
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
  });

  it('should render update button if app is stopped and has an update available', () => {
    // arrange
    // @ts-expect-error - we don't need to pass all props for this test
    render(<AppActions status="stopped" updateAvailable app={app} />);

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
    const openFn = vi.fn();
    // @ts-expect-error - we don't need to pass all props for this test
    render(<AppActions onOpen={openFn} status="running" app={appWithDomain} />);

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
      expect(openFn).toHaveBeenCalledWith('domain');
    });
  });

  it('should render local_domain open button when exposed locally', async () => {
    // arrange
    const openFn = vi.fn();
    // @ts-expect-error - we don't need to pass all props for this test
    render(<AppActions localDomain="tipi.lan" onOpen={openFn} status="running" app={{ ...app, exposedLocal: true }} />);

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
      expect(openFn).toHaveBeenCalledWith('local_domain');
    });
  });

  it('should render local open button when port is open', async () => {
    // arrange
    const openFn = vi.fn();
    // @ts-expect-error - we don't need to pass all props for this test
    render(<AppActions localUrl="http://localhost:3000" onOpen={openFn} status="running" app={{ ...app, openPort: true }} />);

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
      expect(openFn).toHaveBeenCalledWith('local');
    });
  });
});

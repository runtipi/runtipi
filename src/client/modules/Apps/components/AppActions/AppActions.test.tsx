/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react';
import { AppActions } from './AppActions';
import { cleanup, fireEvent, render, screen } from '../../../../../../tests/test-utils';
import { AppInfo } from '../../../../core/types';

afterEach(cleanup);

describe('Test: AppActions', () => {
  const app = {
    name: 'My App',
    form_fields: [],
    exposable: [],
  } as unknown as AppInfo;

  it('should render the correct buttons when app status is stopped', () => {
    // Arrange
    const onStart = jest.fn();
    const onRemove = jest.fn();
    // @ts-expect-error
    const { getByText } = render(<AppActions status="stopped" info={app} onStart={onStart} onUninstall={onRemove} />);

    // Act
    fireEvent.click(getByText('Start'));
    fireEvent.click(getByText('Remove'));

    // Assert
    expect(getByText('Start')).toBeInTheDocument();
    expect(getByText('Remove')).toBeInTheDocument();
    expect(onStart).toHaveBeenCalled();
    expect(onRemove).toHaveBeenCalled();
  });

  it('should render the correct buttons when app status is running', () => {
    // @ts-expect-error
    const { getByText } = render(<AppActions status="running" info={app} />);
    expect(getByText('Stop')).toBeInTheDocument();
    expect(getByText('Open')).toBeInTheDocument();
    expect(getByText('Settings')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is starting', () => {
    // @ts-expect-error
    render(<AppActions status="starting" info={app} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is stopping', () => {
    // @ts-expect-error
    render(<AppActions status="stopping" info={app} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is removing', () => {
    // @ts-expect-error
    render(<AppActions status="uninstalling" info={app} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is installing', () => {
    // @ts-ignore
    render(<AppActions status="installing" info={app} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is updating', () => {
    // @ts-expect-error
    render(<AppActions status="updating" info={app} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is missing', () => {
    // @ts-expect-error
    render(<AppActions status="missing" info={app} />);
    expect(screen.getByText('Install')).toBeInTheDocument();
  });
});

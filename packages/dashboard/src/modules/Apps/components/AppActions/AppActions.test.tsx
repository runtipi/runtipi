/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { AppActions } from './AppActions';
import { AppInfo, AppStatusEnum } from '../../../../generated/graphql';
import { cleanup, fireEvent, render, screen } from '../../../../../tests/test-utils';

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
    const { getByText } = render(<AppActions status={AppStatusEnum.Stopped} app={app} onStart={onStart} onUninstall={onRemove} />);

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
    const { getByText } = render(<AppActions status={AppStatusEnum.Running} app={app} />);
    expect(getByText('Stop')).toBeInTheDocument();
    expect(getByText('Open')).toBeInTheDocument();
    expect(getByText('Settings')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is starting', () => {
    // @ts-expect-error
    render(<AppActions status={AppStatusEnum.Starting} app={app} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is stopping', () => {
    // @ts-expect-error
    render(<AppActions status={AppStatusEnum.Stopping} app={app} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is removing', () => {
    // @ts-expect-error
    render(<AppActions status={AppStatusEnum.Uninstalling} app={app} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is installing', () => {
    // @ts-ignore
    render(<AppActions status={AppStatusEnum.Installing} app={app} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is updating', () => {
    // @ts-expect-error
    render(<AppActions status={AppStatusEnum.Updating} app={app} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is missing', () => {
    // @ts-expect-error
    render(<AppActions status={AppStatusEnum.Missing} app={app} />);
    expect(screen.getByText('Install')).toBeInTheDocument();
  });
});

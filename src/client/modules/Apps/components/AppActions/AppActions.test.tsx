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

  it('should call the callbacks when buttons are clicked', () => {
    // arrange
    const onStart = jest.fn();
    const onRemove = jest.fn();
    // @ts-expect-error
    render(<AppActions status="stopped" info={app} onStart={onStart} onUninstall={onRemove} />);

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
    // @ts-expect-error
    render(<AppActions status="running" info={app} />);

    // assert
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is starting', () => {
    // arrange
    // @ts-expect-error
    render(<AppActions status="starting" info={app} />);

    // assert
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is stopping', () => {
    // arrange
    // @ts-expect-error
    render(<AppActions status="stopping" info={app} />);

    // assert
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is removing', () => {
    // arrange
    // @ts-expect-error
    render(<AppActions status="uninstalling" info={app} />);

    // assert
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is installing', () => {
    // arrange
    // @ts-ignore
    render(<AppActions status="installing" info={app} />);

    // assert
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is updating', () => {
    // arrange
    // @ts-expect-error
    render(<AppActions status="updating" info={app} />);

    // assert
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByTestId('action-button-loading')).toBeInTheDocument();
  });

  it('should render the correct buttons when app status is missing', () => {
    // arrange
    // @ts-expect-error
    render(<AppActions status="missing" info={app} />);

    // assert
    expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument();
  });
});

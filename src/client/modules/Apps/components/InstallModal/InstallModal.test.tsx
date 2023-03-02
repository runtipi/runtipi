import React from 'react';
import { InstallModal } from './InstallModal';
import { fireEvent, render, screen, waitFor } from '../../../../../../tests/test-utils';
import { AppInfo } from '../../../../core/types';

describe('InstallModal', () => {
  const app = {
    name: 'My App',
    form_fields: [
      { name: 'hostname', label: 'Hostname', type: 'text', required: true, env_variable: 'test_hostname' },
      { name: 'password', label: 'Password', type: 'text', required: true, env_variable: 'test_password' },
    ],
    exposable: true,
  } as unknown as AppInfo;

  it('renders with the correct title', () => {
    render(<InstallModal info={app} isOpen onClose={jest.fn()} onSubmit={jest.fn()} />);

    expect(screen.getByText(`Install ${app.name}`)).toBeInTheDocument();
  });

  it('renders the InstallForm with the correct props', () => {
    render(<InstallModal info={app} isOpen onClose={jest.fn()} onSubmit={jest.fn()} />);

    expect(screen.getByLabelText(app.form_fields[0]?.label || '')).toBeInTheDocument();
    expect(screen.getByLabelText(app.form_fields[1]?.label || '')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn();
    render(<InstallModal info={app} isOpen onClose={onClose} onSubmit={jest.fn()} />);

    fireEvent.click(screen.getByTestId('modal-close-button'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onSubmit with the correct values when the form is submitted', async () => {
    const onSubmit = jest.fn();
    render(<InstallModal info={app} isOpen onClose={jest.fn()} onSubmit={onSubmit} />);

    const hostnameInput = screen.getByLabelText(app.form_fields[0]?.label || '');
    const passwordInput = screen.getByLabelText(app.form_fields[1]?.label || '');

    fireEvent.change(hostnameInput, { target: { value: 'test-hostname' } });
    expect(hostnameInput).toHaveValue('test-hostname');
    fireEvent.change(passwordInput, { target: { value: 'test-password' } });
    expect(passwordInput).toHaveValue('test-password');

    fireEvent.click(screen.getByText('Install'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });

    expect(onSubmit).toHaveBeenCalledWith({
      test_hostname: 'test-hostname',
      test_password: 'test-password',
      exposed: false,
    });
  });
});

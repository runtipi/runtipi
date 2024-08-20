import type { AppInfo } from '@runtipi/shared';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../../../../../../tests/test-utils';
import { InstallModal } from './InstallModal';

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
    render(<InstallModal info={app} isOpen onClose={vi.fn()} />);

    expect(screen.getByText(`Install ${app.name}`)).toBeInTheDocument();
  });

  it('renders the InstallForm with the correct props', () => {
    render(<InstallModal info={app} isOpen onClose={vi.fn()} />);

    expect(screen.getByRole('textbox', { name: app.form_fields[0]?.env_variable })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: app.form_fields[1]?.env_variable })).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<InstallModal info={app} isOpen onClose={onClose} />);

    fireEvent.click(screen.getByTestId('modal-close-button'));
    expect(onClose).toHaveBeenCalled();
  });
});

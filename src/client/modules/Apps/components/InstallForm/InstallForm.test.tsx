import React from 'react';
import { fireEvent, render, screen, waitFor } from '../../../../../../tests/test-utils';
import { FormField } from '../../../../core/types';
import { InstallForm } from './InstallForm';

describe('Test: InstallForm', () => {
  it('should render the form', () => {
    render(<InstallForm formFields={[]} onSubmit={jest.fn} />);

    expect(screen.getByText('Install')).toBeInTheDocument();
  });

  it('should render fields with correct types', () => {
    const formFields: FormField[] = [
      { env_variable: 'test', label: 'test', type: 'text', required: false },
      { env_variable: 'test2', label: 'test2', type: 'password', required: false },
      { env_variable: 'test3', label: 'test3', type: 'email', required: false },
      { env_variable: 'test4', label: 'test4', type: 'url', required: false },
      { env_variable: 'test5', label: 'test5', type: 'number', required: false },
    ];

    render(<InstallForm formFields={formFields} onSubmit={jest.fn} />);

    expect(screen.getByLabelText('test')).toBeInTheDocument();
    expect(screen.getByLabelText('test2')).toBeInTheDocument();
    expect(screen.getByLabelText('test3')).toBeInTheDocument();
    expect(screen.getByLabelText('test4')).toBeInTheDocument();
    expect(screen.getByLabelText('test5')).toBeInTheDocument();
  });

  it('should call submit function with correct values', async () => {
    const formFields: FormField[] = [{ env_variable: 'test-env', label: 'test-field', type: 'text', required: false }];

    const onSubmit = jest.fn();

    render(<InstallForm formFields={formFields} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('test-field'), { target: { value: 'test' } });
    screen.getByText('Install').click();

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        'test-env': 'test',
      });
    });
  });

  it('should show validation error when required field is empty', async () => {
    const formFields: FormField[] = [{ env_variable: 'test-env', label: 'test-field', type: 'text', required: true }];

    const onSubmit = jest.fn();

    render(<InstallForm formFields={formFields} onSubmit={onSubmit} />);

    screen.getByText('Install').click();

    await waitFor(() => {
      expect(screen.getByText('test-field is required')).toBeInTheDocument();
    });
  });

  it('should pre-fill fields if initialValues are provided', () => {
    const formFields: FormField[] = [{ env_variable: 'test-env', label: 'test-field', type: 'text', required: true }];

    const onSubmit = jest.fn();

    render(<InstallForm formFields={formFields} onSubmit={onSubmit} initalValues={{ 'test-env': 'test' }} />);

    expect(screen.getByLabelText('test-field')).toHaveValue('test');
  });

  it('should render expose switch when app is exposable', () => {
    const formFields: FormField[] = [{ env_variable: 'test-env', label: 'test-field', type: 'text', required: true }];

    const onSubmit = jest.fn();

    render(<InstallForm formFields={formFields} onSubmit={onSubmit} exposable />);

    expect(screen.getByLabelText('Expose app')).toBeInTheDocument();
  });
});

import React from 'react';
import { faker } from '@faker-js/faker';
import { fromPartial } from '@total-typescript/shoehorn';
import { FormField } from '@runtipi/shared';
import { fireEvent, render, screen, waitFor } from '../../../../../../../tests/test-utils';
import { InstallForm } from './InstallForm';

let useClientSettingsMock = { guestDashboard: false };
jest.mock('../../../../../hooks/use-client-settings.ts', () => ({
  useClientSettings: () => useClientSettingsMock,
}));

beforeEach(() => {
  useClientSettingsMock = { guestDashboard: false };
});

describe('Test: InstallForm', () => {
  it('should render the form', () => {
    render(<InstallForm formFields={[]} onSubmit={jest.fn} info={fromPartial({})} />);

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

    render(<InstallForm info={fromPartial({})} formFields={formFields} onSubmit={jest.fn} />);

    expect(screen.getByLabelText('test')).toBeInTheDocument();
    expect(screen.getByLabelText('test2')).toBeInTheDocument();
    expect(screen.getByLabelText('test3')).toBeInTheDocument();
    expect(screen.getByLabelText('test4')).toBeInTheDocument();
    expect(screen.getByLabelText('test5')).toBeInTheDocument();
  });

  it('should call submit function with correct values', async () => {
    const formFields: FormField[] = [{ env_variable: 'test-env', label: 'test-field', type: 'text', required: false }];

    const onSubmit = jest.fn();

    render(<InstallForm info={fromPartial({})} formFields={formFields} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('test-field'), { target: { value: 'test' } });
    screen.getByText('Install').click();

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        'test-env': 'test',
      });
    });
  });

  it('should show validation error when required field is empty', async () => {
    const formFields: FormField[] = [
      { env_variable: 'test-env', label: 'test-field', type: 'text', required: true },
      {
        env_variable: 'test-select',
        label: 'test-select',
        type: 'text',
        required: true,
        options: [
          { label: '1', value: '1' },
          { label: '2', value: '2' },
        ],
      },
    ];

    const onSubmit = jest.fn();

    render(<InstallForm info={fromPartial({})} formFields={formFields} onSubmit={onSubmit} />);

    screen.getByText('Install').click();

    await waitFor(() => {
      expect(screen.getByText('test-field is required')).toBeInTheDocument();
    });
    expect(screen.getByText('test-select is required')).toBeInTheDocument();
  });

  it('should pre-fill fields if initialValues are provided', () => {
    const selectValue = faker.lorem.word();

    const formFields: FormField[] = [
      { env_variable: 'test-env', label: 'test-field', type: 'text', required: true },
      {
        env_variable: 'test-select',
        label: 'test-select',
        type: 'text',
        required: false,
        options: [
          { label: '1', value: '1' },
          { label: 'Should appear', value: selectValue },
        ],
      },
      { env_variable: 'test-boolean', label: 'test-boolean', type: 'boolean', required: true },
    ];

    const onSubmit = jest.fn();

    render(
      <InstallForm
        info={fromPartial({})}
        formFields={formFields}
        onSubmit={onSubmit}
        initialValues={{ 'test-env': 'test', 'test-select': selectValue, 'test-boolean': true }}
      />,
    );

    expect(screen.getByRole('textbox', { name: 'test-env' })).toHaveValue('test');
    expect(screen.getByRole('combobox', { name: 'test-select' })).toHaveTextContent('Should appear');
    expect(screen.getByRole('switch', { name: 'test-boolean' })).toBeChecked();
  });

  it('should render expose switch when app is exposable', () => {
    const formFields: FormField[] = [{ env_variable: 'test-env', label: 'test-field', type: 'text', required: true }];

    const onSubmit = jest.fn();

    render(<InstallForm formFields={formFields} onSubmit={onSubmit} info={fromPartial({ exposable: true })} />);

    expect(screen.getByLabelText('Expose app on the internet')).toBeInTheDocument();
  });

  it('should render the domain form and disable the expose switch when info has force_expose set to true', () => {
    const formFields: FormField[] = [{ env_variable: 'test-env', label: 'test-field', type: 'text', required: true }];

    const onSubmit = jest.fn();

    render(<InstallForm formFields={formFields} onSubmit={onSubmit} info={fromPartial({ force_expose: true, exposable: true })} />);

    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByRole('switch')).toBeChecked();
    expect(screen.getByRole('textbox', { name: 'domain' })).toBeInTheDocument();
  });

  it('should disable the open port switch when info has force_expose set to true', () => {
    const formFields: FormField[] = [{ env_variable: 'test-env', label: 'test-field', type: 'text', required: true }];

    const onSubmit = jest.fn();

    render(<InstallForm formFields={formFields} onSubmit={onSubmit} info={fromPartial({ force_expose: true, dynamic_config: true })} />);

    expect(screen.getByRole('switch', { name: 'openPort' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'openPort' })).not.toBeChecked();
  });

  it('should show display on guest dashboard switch when guest dashboard setting is true', async () => {
    // Arrange
    useClientSettingsMock = { guestDashboard: true };
    const onSubmit = jest.fn();

    // Act
    render(<InstallForm formFields={[]} onSubmit={onSubmit} info={fromPartial({})} />);
    fireEvent.click(screen.getByRole('switch', { name: 'isVisibleOnGuestDashboard' }));
    screen.getByText('Install').click();

    // Assert
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ isVisibleOnGuestDashboard: true });
    });
  });

  it('should not show display on guest dashboard switch when guest dashboard setting is false', async () => {
    // Arrange
    useClientSettingsMock = { guestDashboard: false };
    const onSubmit = jest.fn();

    // Act
    render(<InstallForm formFields={[]} onSubmit={onSubmit} info={fromPartial({})} />);
    screen.getByText('Install').click();

    // Assert
    expect(screen.queryByRole('switch', { name: 'isVisibleOnGuestDashboard' })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({});
    });
  });
});

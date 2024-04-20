import React from 'react';
import { faker } from '@faker-js/faker';
import { SettingsForm } from './SettingsForm';
import { fireEvent, render, screen, waitFor } from '../../../../../../tests/test-utils';

describe('Test: SettingsForm', () => {
  it('should render without error', () => {
    render(<SettingsForm onSubmit={jest.fn()} />);

    expect(screen.getByText('General settings')).toBeInTheDocument();
  });

  it('should put initial values in the fields', async () => {
    // arrange
    const initialValues = {
      dnsIp: faker.internet.ipv4(),
      domain: faker.internet.domainName(),
      internalIp: faker.internet.ipv4(),
      appsRepoUrl: faker.internet.url(),
      appDataPath: faker.system.directoryPath(),
    };
    render(<SettingsForm onSubmit={jest.fn()} initalValues={initialValues} />);

    // assert
    await waitFor(() => {
      expect(screen.getByDisplayValue(initialValues.dnsIp)).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue(initialValues.domain)).toBeInTheDocument();
    expect(screen.getByDisplayValue(initialValues.internalIp)).toBeInTheDocument();
    expect(screen.getByDisplayValue(initialValues.appsRepoUrl)).toBeInTheDocument();
    expect(screen.getByDisplayValue(initialValues.appDataPath)).toBeInTheDocument();
  });

  it('should put submit errors in the fields', async () => {
    // arrange
    const submitErrors = {
      dnsIp: 'invalid ip',
      domain: 'invalid domain',
      internalIp: 'invalid internal ip',
      appsRepoUrl: 'invalid url',
      appDataPath: 'invalid path',
      localDomain: 'invalid local domain',
    };
    render(<SettingsForm onSubmit={jest.fn()} submitErrors={submitErrors} />);

    // assert
    await waitFor(() => {
      expect(screen.getByText(submitErrors.dnsIp)).toBeInTheDocument();
    });
    expect(screen.getByText(submitErrors.domain)).toBeInTheDocument();
    expect(screen.getByText(submitErrors.internalIp)).toBeInTheDocument();
    expect(screen.getByText(submitErrors.appsRepoUrl)).toBeInTheDocument();
    expect(screen.getByText(submitErrors.appDataPath)).toBeInTheDocument();
    expect(screen.getByText(submitErrors.localDomain)).toBeInTheDocument();
  });

  it('should correctly validate the form', async () => {
    // arrange
    render(<SettingsForm onSubmit={jest.fn()} />);
    const submitButton = screen.getByRole('button', { name: 'Save' });
    const dnsIpInput = screen.getByRole('textbox', { name: 'dnsIp' });
    const domainInput = screen.getByRole('textbox', { name: 'domain' });
    const internalIpInput = screen.getByRole('textbox', { name: 'internalIp' });
    const appsRepoUrlInput = screen.getByRole('textbox', { name: 'appsRepoUrl' });
    const localDomainInput = screen.getByRole('textbox', { name: 'localDomain' });

    // act
    fireEvent.change(dnsIpInput, { target: { value: 'invalid ip' } });
    fireEvent.change(domainInput, { target: { value: 'invalid domain' } });
    fireEvent.change(internalIpInput, { target: { value: 'invalid internal ip' } });
    fireEvent.change(appsRepoUrlInput, { target: { value: 'invalid url' } });
    fireEvent.change(localDomainInput, { target: { value: 'invalid local domain' } });
    fireEvent.click(submitButton);

    // assert
    await waitFor(() => {
      expect(screen.getAllByText('Invalid IP address')).toHaveLength(2);
    });
    expect(screen.getAllByText('Invalid domain')).toHaveLength(2);
    expect(screen.getByText('Invalid URL')).toBeInTheDocument();
  });

  it('should call onSubmit when the form is submitted', async () => {
    // arrange
    const onSubmit = jest.fn();
    render(<SettingsForm onSubmit={onSubmit} />);
    const submitButton = screen.getByRole('button', { name: 'Save' });

    // act
    fireEvent.click(submitButton);

    // assert
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it('should download the certificate when the download button is clicked', async () => {
    // arrange
    const spy = jest.spyOn(window, 'open').mockImplementation();
    render(<SettingsForm onSubmit={jest.fn} />);
    const downloadButton = screen.getByRole('button', { name: 'Download certificate' });

    // act
    fireEvent.click(downloadButton);

    // assert
    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});

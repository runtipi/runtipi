import { FormField } from '@runtipi/shared';
import { describe, it, expect } from 'vitest';
import { validateAppConfig, validateField } from './validators';

describe('Test: validateField', () => {
  it('should return "field label is required" if the field is required and no value is provided', () => {
    const field: FormField = {
      label: 'Username',
      required: true,
      env_variable: 'test',
      type: 'text',
    };
    const value: string | undefined | boolean = undefined;
    const result = validateField(field, value);
    expect(result).toEqual('Username is required');
  });

  it('should return "field label must be less than field.max characters" if the field type is text and the value is longer than the max value', () => {
    const field: FormField = {
      label: 'Description',
      type: 'text',
      max: 10,
      env_variable: 'test',
      required: false,
    };
    const value: string | undefined | boolean = 'This value is too long';
    const result = validateField(field, value);
    expect(result).toEqual('Description must be less than 10 characters');
  });

  it('should return "field label must be at least field.min characters" if the field type is text and the value is shorter than the min value', () => {
    const field: FormField = {
      label: 'Description',
      type: 'text',
      min: 20,
      env_variable: 'test',
      required: false,
    };
    const value: string | undefined | boolean = 'This is too short';
    const result = validateField(field, value);

    expect(result).toEqual('Description must be at least 20 characters');
  });

  it('should return "field label must be between field.min and field.max characters" if the field type is password and the value is not between the min and max values', () => {
    const field: FormField = {
      label: 'Password',
      type: 'password',
      min: 6,
      max: 10,
      env_variable: 'test',
      required: false,
    };
    const value: string | undefined | boolean = 'pass';
    const result = validateField(field, value);
    expect(result).toEqual('Password must be between 6 and 10 characters');
  });

  it('should return "field label must be a valid email address" if the field type is email and the value is not a valid email', () => {
    const field: FormField = {
      label: 'Email',
      type: 'email',
      env_variable: 'test',
      required: false,
    };
    const value: string | undefined | boolean = 'invalid-email';
    const result = validateField(field, value);
    expect(result).toEqual('Email must be a valid email address');
  });

  it('should return "field label must be a number" if the field type is number and the value is not a number', () => {
    const field: FormField = {
      label: 'Age',
      type: 'number',
      env_variable: 'test',
      required: false,
    };
    const value: string | undefined | boolean = 'not a number';
    const result = validateField(field, value);
    expect(result).toEqual('Age must be a number');
  });

  it('should return "field label must be a valid domain" if the field type is fqdn and the value is not a valid domain', () => {
    const field: FormField = {
      label: 'Domain',
      type: 'fqdn',
      env_variable: 'test',
      required: false,
    };
    const value: string | undefined | boolean = 'not.a.valid.c';
    const result = validateField(field, value);
    expect(result).toEqual('Domain must be a valid domain');
  });

  it('should return "field label must be a valid IP address" if the field type is ip and the value is not a valid IP address', () => {
    const field: FormField = {
      label: 'IP Address',
      type: 'ip',
      env_variable: 'test',
      required: false,
    };
    const value: string | undefined | boolean = 'not a valid IP';
    const result = validateField(field, value);
    expect(result).toEqual('IP Address must be a valid IP address');
  });

  it('should return "field label must be a valid domain or IP address" if the field type is fqdnip and the value is not a valid domain or IP address', () => {
    const field: FormField = {
      label: 'Domain or IP',
      type: 'fqdnip',
      env_variable: 'test',
      required: false,
    };
    const value: string | undefined | boolean = 'not a valid domain or IP';
    const result = validateField(field, value);
    expect(result).toEqual('Domain or IP must be a valid domain or IP address');
  });

  it('should return "field label must be a valid URL" if the field type is url and the value is not a valid URL', () => {
    const field: FormField = {
      label: 'Website',
      type: 'url',
      env_variable: 'test',
      required: false,
    };
    const value: string | undefined | boolean = 'not a valid URL';
    const result = validateField(field, value);
    expect(result).toEqual('Website must be a valid URL');
  });

  it('should return undefined if the field is not required and no value is provided', () => {
    const field: FormField = {
      label: 'Username',
      required: false,
      env_variable: 'test',
      type: 'text',
    };
    const value: string | undefined | boolean = undefined;
    const result = validateField(field, value);
    expect(result).toBeUndefined();
  });

  it('should return undefined if the value is not a string', () => {
    const field: FormField = {
      label: 'Username',
      required: true,
      env_variable: 'test',
      type: 'text',
    };
    const value: string | undefined | boolean = true;
    const result = validateField(field, value);
    expect(result).toBeUndefined();
  });
});

describe('Test: validateAppConfig', () => {
  it('should return an object containing validation errors for each field in the config', () => {
    const values = {
      exposed: true,
      domain: 'not a valid domain',
      username: '',
      password: 'pass',
      email: 'invalid-email',
    };
    const fields: FormField[] = [
      {
        label: 'Username',
        type: 'text',
        required: true,
        env_variable: 'username',
      },
      {
        label: 'Password',
        type: 'password',
        required: true,
        min: 6,
        max: 10,
        env_variable: 'password',
      },
      {
        label: 'Email',
        type: 'email',
        required: true,
        env_variable: 'email',
      },
    ];
    const result = validateAppConfig(values, fields);
    expect(result).toEqual({
      username: 'Username is required',
      password: 'Password must be between 6 and 10 characters',
      email: 'Email must be a valid email address',
      domain: 'not a valid domain must be a valid domain',
    });
  });

  it('should return an empty object if all fields are valid', () => {
    const values = {
      exposed: true,
      domain: 'valid.domain',
      username: 'username',
      password: 'password',
      email: 'valid@email.com',
    };
    const fields: FormField[] = [
      {
        label: 'Username',
        type: 'text',
        required: true,
        env_variable: 'username',
      },
      {
        label: 'Password',
        type: 'password',
        required: true,
        min: 6,
        max: 10,
        env_variable: 'password',
      },
      {
        label: 'Email',
        type: 'email',
        required: true,
        env_variable: 'email',
      },
    ];
    const result = validateAppConfig(values, fields);
    expect(result).toEqual({});
  });

  it('should not return validation errors for fields that are not required and no value is provided', () => {
    const values = {
      exposed: true,
      domain: 'valid.domain',
      username: '',
    };
    const fields: FormField[] = [
      {
        label: 'Username',
        type: 'text',
        required: false,
        env_variable: 'username',
      },
    ];
    const result = validateAppConfig(values, fields);
    expect(result).toEqual({});
  });

  it('should not return validation errors for domain if the app is not exposed', () => {
    const values = {
      exposed: false,
      domain: '',
      username: 'hello',
    };

    const fields: FormField[] = [
      {
        label: 'Username',
        type: 'text',
        required: true,
        env_variable: 'username',
      },
    ];
    const result = validateAppConfig(values, fields);
    expect(result).toEqual({});
  });

  it('should validate field against the provided regex', () => {
    // arrange
    const valuesCorrect = {
      version: '1.20.0',
    };

    const valuesIncorrect = {
      version: 'abs',
    };

    const fields: FormField[] = [
      {
        label: 'Version',
        type: 'text',
        required: true,
        regex: '^[0-9]+.[0-9]+.[0-9]+$', // only numbers and dots
        pattern_error: 'Version must be in the format x.y.z',
        env_variable: 'version',
      },
    ];

    // act
    const resultCorrect = validateAppConfig(valuesCorrect, fields);
    const resultIncorrect = validateAppConfig(valuesIncorrect, fields);

    // assert
    expect(resultCorrect).toEqual({});
    expect(resultIncorrect).toEqual({ version: 'Version must be in the format x.y.z' });
  });
});

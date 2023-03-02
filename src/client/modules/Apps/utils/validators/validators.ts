import validator from 'validator';
import type { FormField } from '../../../../core/types';

export const validateField = (field: FormField, value: string | undefined | boolean): string | undefined => {
  if (field.required && !value) {
    return `${field.label} is required`;
  }

  if (!value || typeof value !== 'string') {
    return undefined;
  }

  switch (field.type) {
    case 'text':
      if (field.max && value.length > field.max) {
        return `${field.label} must be less than ${field.max} characters`;
      }
      if (field.min && value.length < field.min) {
        return `${field.label} must be at least ${field.min} characters`;
      }
      break;
    case 'password':
      if (!validator.isLength(value, { min: field.min || 0, max: field.max || 100 })) {
        return `${field.label} must be between ${String(field.min)} and ${String(field.max)} characters`;
      }
      break;
    case 'email':
      if (!validator.isEmail(value)) {
        return `${field.label} must be a valid email address`;
      }
      break;
    case 'number':
      if (!validator.isNumeric(value)) {
        return `${field.label} must be a number`;
      }
      break;
    case 'fqdn':
      if (!validator.isFQDN(value)) {
        return `${field.label} must be a valid domain`;
      }
      break;
    case 'ip':
      if (!validator.isIP(value)) {
        return `${field.label} must be a valid IP address`;
      }
      break;
    case 'fqdnip':
      if (!validator.isFQDN(value || '') && !validator.isIP(value)) {
        return `${field.label} must be a valid domain or IP address`;
      }
      break;
    case 'url':
      if (!validator.isURL(value)) {
        return `${field.label} must be a valid URL`;
      }
      break;
    default:
      break;
  }

  return undefined;
};

const validateDomain = (domain?: string | boolean): string | undefined => {
  if (typeof domain !== 'string' || !validator.isFQDN(domain || '')) {
    return `${String(domain)} must be a valid domain`;
  }

  return undefined;
};

export const validateAppConfig = (values: Record<string, string | boolean | undefined>, fields: FormField[]) => {
  const { exposed, domain, ...config } = values;

  const errors: Record<string, string | undefined> = {};

  fields.forEach((field) => {
    const error = validateField(field, config[field.env_variable]);

    if (error) {
      errors[field.env_variable] = validateField(field, config[field.env_variable]);
    }
  });

  if (exposed) {
    const error = validateDomain(domain);

    if (error) {
      errors.domain = error;
    }
  }

  return errors;
};

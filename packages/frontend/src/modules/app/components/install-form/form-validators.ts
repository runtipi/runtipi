import type { FormField } from '@/types/app.types';
import validator from 'validator';

type ValidationError = {
  messageKey: string;
  params?: Record<string, string>;
};

export const validateField = (field: FormField, value: string | undefined | boolean): ValidationError | undefined => {
  if (field.required && !value && typeof value !== 'boolean') {
    return { messageKey: 'APP_INSTALL_FORM_ERROR_REQUIRED', params: { label: field.label } };
  }

  if (!value || typeof value !== 'string') {
    return undefined;
  }

  if (field.regex && !validator.matches(value, field.regex)) {
    return { messageKey: field.pattern_error ?? 'APP_INSTALL_FORM_ERROR_REGEX', params: { label: field.label, pattern: field.regex } };
  }

  switch (field.type) {
    case 'text':
      if (field.max && value.length > field.max) {
        return { messageKey: 'APP_INSTALL_FORM_ERROR_MAX_LENGTH', params: { label: field.label, max: String(field.max) } };
      }
      if (field.min && value.length < field.min) {
        return { messageKey: 'APP_INSTALL_FORM_ERROR_MIN_LENGTH', params: { label: field.label, min: String(field.min) } };
      }
      break;
    case 'password':
      if (!validator.isLength(value, { min: field.min || 0, max: field.max || 100 })) {
        return {
          messageKey: 'APP_INSTALL_FORM_ERROR_BETWEEN_LENGTH',
          params: { label: field.label, min: String(field.min), max: String(field.max) },
        };
      }
      break;
    case 'email':
      if (!validator.isEmail(value)) {
        return { messageKey: 'APP_INSTALL_FORM_ERROR_INVALID_EMAIL', params: { label: field.label } };
      }
      break;
    case 'number':
      if (!validator.isNumeric(value)) {
        return { messageKey: 'APP_INSTALL_FORM_ERROR_NUMBER', params: { label: field.label } };
      }
      break;
    case 'fqdn':
      if (!validator.isFQDN(value)) {
        return { messageKey: 'APP_INSTALL_FORM_ERROR_FQDN', params: { label: field.label } };
      }
      break;
    case 'ip':
      if (!validator.isIP(value)) {
        return { messageKey: 'APP_INSTALL_FORM_ERROR_IP', params: { label: field.label } };
      }
      break;
    case 'fqdnip':
      if (!validator.isFQDN(value || '') && !validator.isIP(value)) {
        return { messageKey: 'APP_INSTALL_FORM_ERROR_FQDNIP', params: { label: field.label } };
      }
      break;
    case 'url':
      if (!validator.isURL(value)) {
        return { messageKey: 'APP_INSTALL_FORM_ERROR_URL', params: { label: field.label } };
      }
      break;
    default:
      break;
  }

  return undefined;
};

const validateDomain = (domain?: string | boolean): ValidationError | undefined => {
  if (typeof domain !== 'string' || !validator.isFQDN(domain || '')) {
    return { messageKey: 'APP_INSTALL_FORM_ERROR_FQDN', params: { label: String(domain) } };
  }

  return undefined;
};

export const validateAppConfig = (values: Record<string, string | boolean | undefined>, fields: FormField[]) => {
  const { exposed, domain, ...config } = values;

  const errors: Record<string, ValidationError | undefined> = {};

  for (const field of fields) {
    const error = validateField(field, config[field.env_variable]);

    if (error) {
      errors[field.env_variable] = validateField(field, config[field.env_variable]);
    }
  }

  if (exposed) {
    const error = validateDomain(domain);

    if (error) {
      errors.domain = error;
    }
  }

  return errors;
};

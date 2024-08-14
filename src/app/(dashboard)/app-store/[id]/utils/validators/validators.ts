import { useUIStore } from '@/client/state/uiStore';
import type { FormField } from '@runtipi/shared';
import validator from 'validator';

export const validateField = (field: FormField, value: string | undefined | boolean): string | undefined => {
  const { translator } = useUIStore.getState();

  if (field.required && !value && typeof value !== 'boolean') {
    return translator('APP_INSTALL_FORM_ERROR_REQUIRED', { label: field.label });
  }

  if (!value || typeof value !== 'string') {
    return undefined;
  }

  if (field.regex && !validator.matches(value, field.regex)) {
    return field.pattern_error || translator('APP_INSTALL_FORM_ERROR_REGEX', { label: field.label, pattern: field.regex });
  }

  switch (field.type) {
    case 'text':
      if (field.max && value.length > field.max) {
        return translator('APP_INSTALL_FORM_ERROR_MAX_LENGTH', { label: field.label, max: field.max });
      }
      if (field.min && value.length < field.min) {
        return translator('APP_INSTALL_FORM_ERROR_MIN_LENGTH', { label: field.label, min: field.min });
      }
      break;
    case 'password':
      if (!validator.isLength(value, { min: field.min || 0, max: field.max || 100 })) {
        return translator('APP_INSTALL_FORM_ERROR_BETWEEN_LENGTH', { label: field.label, min: field.min, max: field.max });
      }
      break;
    case 'email':
      if (!validator.isEmail(value)) {
        return translator('APP_INSTALL_FORM_ERROR_INVALID_EMAIL', { label: field.label });
      }
      break;
    case 'number':
      if (!validator.isNumeric(value)) {
        return translator('APP_INSTALL_FORM_ERROR_NUMBER', { label: field.label });
      }
      break;
    case 'fqdn':
      if (!validator.isFQDN(value)) {
        return translator('APP_INSTALL_FORM_ERROR_FQDN', { label: field.label });
      }
      break;
    case 'ip':
      if (!validator.isIP(value)) {
        return translator('APP_INSTALL_FORM_ERROR_IP', { label: field.label });
      }
      break;
    case 'fqdnip':
      if (!validator.isFQDN(value || '') && !validator.isIP(value)) {
        return translator('APP_INSTALL_FORM_ERROR_FQDNIP', { label: field.label });
      }
      break;
    case 'url':
      if (!validator.isURL(value)) {
        return translator('APP_INSTALL_FORM_ERROR_URL', { label: field.label });
      }
      break;
    default:
      break;
  }

  return undefined;
};

const validateDomain = (domain?: string | boolean): string | undefined => {
  if (typeof domain !== 'string' || !validator.isFQDN(domain || '')) {
    const { translator } = useUIStore.getState();
    return translator('APP_INSTALL_FORM_ERROR_FQDN', { label: String(domain) });
  }

  return undefined;
};

export const validateAppConfig = (values: Record<string, string | boolean | undefined>, fields: FormField[]) => {
  const { exposed, domain, ...config } = values;

  const errors: Record<string, string | undefined> = {};

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

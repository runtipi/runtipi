import validator from 'validator';
import { useUIStore } from '@/client/state/uiStore';
import type { FormField } from '../../../../core/types';

export const validateField = (field: FormField, value: string | undefined | boolean): string | undefined => {
  const { translator } = useUIStore.getState();

  if (field.required && !value && typeof value !== 'boolean') {
    return translator('apps.app-details.install-form.errors.required', { label: field.label });
  }

  if (!value || typeof value !== 'string') {
    return undefined;
  }

  if (field.regex && !validator.matches(value, field.regex)) {
    return field.pattern_error || translator('apps.app-details.install-form.errors.regex', { label: field.label, pattern: field.regex });
  }

  switch (field.type) {
    case 'text':
      if (field.max && value.length > field.max) {
        return translator('apps.app-details.install-form.errors.max-length', { label: field.label, max: field.max });
      }
      if (field.min && value.length < field.min) {
        return translator('apps.app-details.install-form.errors.min-length', { label: field.label, min: field.min });
      }
      break;
    case 'password':
      if (!validator.isLength(value, { min: field.min || 0, max: field.max || 100 })) {
        return translator('apps.app-details.install-form.errors.between-length', { label: field.label, min: field.min, max: field.max });
      }
      break;
    case 'email':
      if (!validator.isEmail(value)) {
        return translator('apps.app-details.install-form.errors.invalid-email', { label: field.label });
      }
      break;
    case 'number':
      if (!validator.isNumeric(value)) {
        return translator('apps.app-details.install-form.errors.number', { label: field.label });
      }
      break;
    case 'fqdn':
      if (!validator.isFQDN(value)) {
        return translator('apps.app-details.install-form.errors.fqdn', { label: field.label });
      }
      break;
    case 'ip':
      if (!validator.isIP(value)) {
        return translator('apps.app-details.install-form.errors.ip', { label: field.label });
      }
      break;
    case 'fqdnip':
      if (!validator.isFQDN(value || '') && !validator.isIP(value)) {
        return translator('apps.app-details.install-form.errors.fqdnip', { label: field.label });
      }
      break;
    case 'url':
      if (!validator.isURL(value)) {
        return translator('apps.app-details.install-form.errors.url', { label: field.label });
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
    return translator('apps.app-details.install-form.errors.fqdn', { label: String(domain) });
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

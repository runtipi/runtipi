import validator from 'validator';
import { AppConfig, FieldTypes } from '@runtipi/common';

const validateField = (field: AppConfig['form_fields'][0], value: string): string | undefined => {
  if (field.required && !value) {
    return `${field.label} is required`;
  }

  if (!value) {
    return;
  }

  switch (field.type) {
    case FieldTypes.text:
      if (field.max && value.length > field.max) {
        return `${field.label} must be less than ${field.max} characters`;
      }
      if (field.min && value.length < field.min) {
        return `${field.label} must be at least ${field.min} characters`;
      }
      break;
    case FieldTypes.password:
      if (!validator.isLength(value, { min: field.min, max: field.max })) {
        return `${field.label} must be between ${field.min} and ${field.max} characters`;
      }
      break;
    case FieldTypes.email:
      if (!validator.isEmail(value)) {
        return `${field.label} must be a valid email address`;
      }
      break;
    case FieldTypes.number:
      if (!validator.isNumeric(value)) {
        return `${field.label} must be a number`;
      }
      break;
    case FieldTypes.fqdn:
      if (!validator.isFQDN(value)) {
        return `${field.label} must be a valid domain`;
      }
      break;
    case FieldTypes.ip:
      if (!validator.isIP(value)) {
        return `${field.label} must be a valid IP address`;
      }
      break;
    case FieldTypes.fqdnip:
      if (!validator.isFQDN(value || '') && !validator.isIP(value)) {
        return `${field.label} must be a valid domain or IP address`;
      }
      break;
    case FieldTypes.url:
      if (!validator.isURL(value)) {
        return `${field.label} must be a valid URL`;
      }
      break;
    default:
      break;
  }
};

export const validateAppConfig = (values: Record<string, string>, fields: (AppConfig['form_fields'][0] & { id: string })[]) => {
  const errors: any = {};

  fields.forEach((field) => {
    errors[field.id] = validateField(field, values[field.id]);
  });

  return errors;
};
